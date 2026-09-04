#Requires -Version 5.1
<#
.SYNOPSIS
  촬영 영상을 고화질·용량 최적화로 변환하고
  yymmdd_카메라기종_렌즈기종_번호 형식으로 NAS에 저장합니다.

.DESCRIPTION
  - ExifTool로 촬영일/카메라/렌즈 메타데이터 추출
  - FFmpeg로 H.265(HEVC) 고화질 인코딩 (용량 최적화)
  - NVIDIA GPU가 있으면 hevc_nvenc 자동 사용 (codec=auto)
  - 완료 파일을 NAS 공유 폴더로 복사

.EXAMPLE
  .\Process-Videos.ps1
  .\Process-Videos.ps1 -ConfigPath .\config\config.json -WhatIf
  .\Process-Videos.ps1 -File "D:\DCIM\C0001.MP4"
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot "..\config\config.json"),
    [string]$File,
    [switch]$Watch,
    [int]$WatchIntervalSeconds = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "OK"    { "Green" }
        default { "Cyan" }
    }
    Write-Host "[$ts][$Level] $Message" -ForegroundColor $color
}

function Assert-Command {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' 를 찾을 수 없습니다. $Hint"
    }
}

function Get-Config {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        $example = Join-Path (Split-Path $Path -Parent) "config.example.json"
        throw "설정 파일이 없습니다: $Path`n$example 를 복사해 config.json 으로 만든 뒤 NAS/소스 경로를 수정하세요."
    }
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Sanitize-Token {
    param([string]$Value, [string]$Fallback)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $Fallback }
    $t = $Value.Trim()
    $t = $t -replace '[\\/:*?"<>|]', ''
    $t = $t -replace '\s+', ''
    $t = $t -replace '[^\w\-\.\+]', ''
    if ([string]::IsNullOrWhiteSpace($t)) { return $Fallback }
    return $t.ToUpperInvariant()
}

function Apply-Alias {
    param(
        [string]$Value,
        $AliasMap,
        [string]$Fallback
    )
    if ([string]::IsNullOrWhiteSpace($Value)) { return $Fallback }
    $raw = $Value.Trim()
    if ($null -ne $AliasMap) {
        foreach ($prop in $AliasMap.PSObject.Properties) {
            if ($raw -ieq $prop.Name) {
                return (Sanitize-Token -Value $prop.Value -Fallback $Fallback)
            }
        }
        foreach ($prop in $AliasMap.PSObject.Properties) {
            if ($raw -like "*$($prop.Name)*") {
                return (Sanitize-Token -Value $prop.Value -Fallback $Fallback)
            }
        }
    }
    return (Sanitize-Token -Value $raw -Fallback $Fallback)
}

function Get-VideoMetadata {
    param([string]$Path)
    $json = & exiftool -json -n `
        -CreateDate -DateTimeOriginal -MediaCreateDate -TrackCreateDate `
        -Make -Model -LensModel -LensID -Lens `
        -CameraModelName `
        -api largefilesupport=1 `
        -- "$Path" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
        throw "ExifTool 메타데이터 추출 실패: $Path"
    }
    $meta = ($json | ConvertFrom-Json)[0]

    $dateRaw = @(
        $meta.DateTimeOriginal,
        $meta.CreateDate,
        $meta.MediaCreateDate,
        $meta.TrackCreateDate
    ) | Where-Object { $_ } | Select-Object -First 1

    $shootDate = $null
    if ($dateRaw) {
        $normalized = ($dateRaw -replace '^(\d{4}):(\d{2}):(\d{2})', '$1-$2-$3')
        try { $shootDate = [datetime]::Parse($normalized) } catch { $shootDate = $null }
    }
    if (-not $shootDate) {
        $shootDate = (Get-Item -LiteralPath $Path).LastWriteTime
        Write-Step "촬영일 메타 없음 → 파일 수정일 사용: $shootDate" "WARN"
    }

    $camera = @(
        $meta.CameraModelName,
        $meta.Model,
        $meta.Make
    ) | Where-Object { $_ } | Select-Object -First 1

    $lens = @(
        $meta.LensModel,
        $meta.LensID,
        $meta.Lens
    ) | Where-Object { $_ } | Select-Object -First 1

    [pscustomobject]@{
        ShootDate = $shootDate
        Camera    = $camera
        Lens      = $lens
    }
}

function Test-NvencAvailable {
    $probe = & ffmpeg -hide_banner -encoders 2>&1 | Out-String
    return ($probe -match 'hevc_nvenc')
}

function Get-EncoderArgs {
    param($EncodingCfg)
    $codec = $EncodingCfg.codec
    if ($codec -eq "auto") {
        if (Test-NvencAvailable) { $codec = "hevc_nvenc" }
        else { $codec = "libx265" }
    }

    switch ($codec) {
        "hevc_nvenc" {
            Write-Step "인코더: NVIDIA hevc_nvenc (CQ=$($EncodingCfg.nvencCq))"
            return @(
                "-c:v", "hevc_nvenc",
                "-preset", "$($EncodingCfg.nvencPreset)",
                "-rc", "vbr",
                "-cq", "$($EncodingCfg.nvencCq)",
                "-b:v", "0",
                "-pix_fmt", "$($EncodingCfg.pixelFormat)",
                "-tag:v", "hvc1"
            )
        }
        "libx265" {
            Write-Step "인코더: libx265 (CRF=$($EncodingCfg.crf), preset=$($EncodingCfg.preset))"
            return @(
                "-c:v", "libx265",
                "-crf", "$($EncodingCfg.crf)",
                "-preset", "$($EncodingCfg.preset)",
                "-pix_fmt", "$($EncodingCfg.pixelFormat)",
                "-tag:v", "hvc1",
                "-x265-params", "log-level=error"
            )
        }
        default {
            throw "지원하지 않는 codec: $codec (auto|libx265|hevc_nvenc)"
        }
    }
}

function Get-NextSequence {
    param(
        [string[]]$Directories,
        [string]$Prefix
    )
    $pattern = "^" + [regex]::Escape($Prefix) + "_(\d{2,})$"
    $max = 0
    foreach ($dir in $Directories) {
        if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { continue }
        Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue | ForEach-Object {
            $base = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
            $m = [regex]::Match($base, $pattern)
            if ($m.Success) {
                $n = [int]$m.Groups[1].Value
                if ($n -gt $max) { $max = $n }
            }
        }
    }
    return ($max + 1)
}

function Build-TargetName {
    param(
        $Meta,
        $Config,
        [string]$Extension
    )
    $yymmdd = $Meta.ShootDate.ToString("yyMMdd")
    $camera = Apply-Alias -Value $Meta.Camera -AliasMap $Config.naming.cameraAliases -Fallback $Config.naming.unknownCamera
    $lens = Apply-Alias -Value $Meta.Lens -AliasMap $Config.naming.lensAliases -Fallback $Config.naming.unknownLens
    $prefix = "{0}_{1}_{2}" -f $yymmdd, $camera, $lens
    $seq = Get-NextSequence -Directories @($Config.nasFolder, $Config.processedFolder, $Config.workFolder) -Prefix $prefix
    $seqStr = "{0:D2}" -f $seq
    return "{0}_{1}{2}" -f $prefix, $seqStr, $Extension
}

function Test-FileReady {
    param(
        [string]$Path,
        [int]$SettleSeconds = 3
    )
    $a = Get-Item -LiteralPath $Path
    Start-Sleep -Seconds $SettleSeconds
    $b = Get-Item -LiteralPath $Path
    return ($a.Length -eq $b.Length -and $a.LastWriteTime -eq $b.LastWriteTime)
}

function Invoke-VideoProcess {
    param(
        [string]$InputPath,
        $Config
    )

    $item = Get-Item -LiteralPath $InputPath
    Write-Step "처리 시작: $($item.FullName)"

    if (-not (Test-FileReady -Path $item.FullName)) {
        Write-Step "파일이 아직 기록 중 → 다음 회차에 재시도: $($item.Name)" "WARN"
        return
    }

    $meta = Get-VideoMetadata -Path $item.FullName
    Write-Step ("메타: {0:yyyy-MM-dd HH:mm:ss} / CAM={1} / LENS={2}" -f $meta.ShootDate, $meta.Camera, $meta.Lens)

    $ext = "." + $Config.encoding.container.TrimStart(".")
    $targetName = Build-TargetName -Meta $meta -Config $Config -Extension $ext
    $workOut = Join-Path $Config.workFolder $targetName
    $nasOut = Join-Path $Config.nasFolder $targetName
    $localOut = Join-Path $Config.processedFolder $targetName

    if ((Test-Path -LiteralPath $nasOut) -or (Test-Path -LiteralPath $localOut)) {
        Write-Step "이미 존재 → 건너뜀: $targetName" "WARN"
        return
    }

    Ensure-Directory $Config.workFolder
    Ensure-Directory $Config.processedFolder
    Ensure-Directory $Config.nasFolder

    $vArgs = Get-EncoderArgs -EncodingCfg $Config.encoding
    $ffArgs = @(
        "-hide_banner", "-y",
        "-i", $item.FullName
    ) + $vArgs + @(
        "-c:a", "aac",
        "-b:a", "$($Config.encoding.audioBitrate)",
        "-movflags", "+faststart",
        "-map_metadata", "0",
        $workOut
    )

    Write-Step "FFmpeg 인코딩 → $workOut"
    if ($PSCmdlet.ShouldProcess($item.FullName, "Encode to $workOut")) {
        & ffmpeg @ffArgs
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $workOut)) {
            throw "FFmpeg 인코딩 실패: $($item.Name)"
        }
    }

    Write-Step "NAS 복사 → $nasOut"
    if ($PSCmdlet.ShouldProcess($workOut, "Copy to NAS $nasOut")) {
        Copy-Item -LiteralPath $workOut -Destination $nasOut -Force

        if ($Config.keepLocalCopy) {
            Copy-Item -LiteralPath $workOut -Destination $localOut -Force
        }

        Remove-Item -LiteralPath $workOut -Force -ErrorAction SilentlyContinue

        if ($Config.deleteSourceAfterSuccess) {
            Remove-Item -LiteralPath $item.FullName -Force
            Write-Step "원본 삭제: $($item.FullName)" "WARN"
        }
    }

    $srcSize = [math]::Round($item.Length / 1MB, 1)
    $dstSize = if (Test-Path -LiteralPath $nasOut) {
        [math]::Round((Get-Item -LiteralPath $nasOut).Length / 1MB, 1)
    } else { 0 }
    Write-Step "완료: $targetName (원본 ${srcSize}MB → ${dstSize}MB)" "OK"
}

function Get-PendingVideos {
    param($Config)
    $exts = @($Config.extensions | ForEach-Object { $_.ToLowerInvariant() })
    Get-ChildItem -LiteralPath $Config.sourceFolder -File -Recurse -ErrorAction Stop |
        Where-Object { $exts -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object LastWriteTime
}

# --- main ---
Assert-Command -Name "ffmpeg" -Hint "winget install Gyan.FFmpeg 또는 https://ffmpeg.org 설치 후 PATH에 추가하세요."
Assert-Command -Name "exiftool" -Hint "winget install OliverBetz.ExifTool 또는 https://exiftool.org 설치 후 PATH에 추가하세요."

$Config = Get-Config -Path $ConfigPath
Ensure-Directory $Config.sourceFolder
Ensure-Directory $Config.workFolder
Ensure-Directory $Config.processedFolder

Write-Step "설정: $ConfigPath"
Write-Step "소스: $($Config.sourceFolder)"
Write-Step "NAS : $($Config.nasFolder)"

function Process-Batch {
    if ($File) {
        if (-not (Test-Path -LiteralPath $File)) { throw "파일 없음: $File" }
        Invoke-VideoProcess -InputPath $File -Config $Config
        return
    }

    $files = @(Get-PendingVideos -Config $Config)
    if ($files.Count -eq 0) {
        Write-Step "처리할 영상 없음" "WARN"
        return
    }

    Write-Step ("대기 파일 {0}개" -f $files.Count)
    foreach ($f in $files) {
        try {
            Invoke-VideoProcess -InputPath $f.FullName -Config $Config
        }
        catch {
            Write-Step ("실패: {0} → {1}" -f $f.Name, $_.Exception.Message) "ERROR"
        }
    }
}

if ($Watch) {
    Write-Step "감시 모드 시작 (간격 ${WatchIntervalSeconds}s). Ctrl+C 로 종료."
    while ($true) {
        Process-Batch
        Start-Sleep -Seconds $WatchIntervalSeconds
    }
}
else {
    Process-Batch
    Write-Step "작업 종료" "OK"
}

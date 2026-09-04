#Requires -Version 5.1
<#
.SYNOPSIS
  FFmpeg / ExifTool 설치 안내 및 PATH 확인
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Test-Tool([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "[OK] $Name : $($cmd.Source)" -ForegroundColor Green
        return $true
    }
    Write-Host "[MISS] $Name 미설치" -ForegroundColor Yellow
    return $false
}

Write-Host "=== 의존성 확인 ===" -ForegroundColor Cyan

$hasFfmpeg = Test-Tool "ffmpeg"
$hasExif = Test-Tool "exiftool"
$hasWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)

if (-not $hasFfmpeg -or -not $hasExif) {
    Write-Host ""
    Write-Host "설치 방법 (관리자 PowerShell 권장):" -ForegroundColor Cyan
    if ($hasWinget) {
        if (-not $hasFfmpeg) {
            Write-Host '  winget install --id Gyan.FFmpeg -e'
        }
        if (-not $hasExif) {
            Write-Host '  winget install --id OliverBetz.ExifTool -e'
        }
        Write-Host "설치 후 새 터미널을 열고 다시 실행하세요."
    }
    else {
        Write-Host "  FFmpeg : https://www.gyan.dev/ffmpeg/builds/ (PATH 추가)"
        Write-Host "  ExifTool: https://exiftool.org/ (exiftool.exe 를 PATH에 추가)"
    }
    exit 1
}

Write-Host ""
Write-Host "NVIDIA HEVC 인코더:" -ForegroundColor Cyan
$enc = & ffmpeg -hide_banner -encoders 2>&1 | Out-String
if ($enc -match "hevc_nvenc") {
    Write-Host "[OK] hevc_nvenc 사용 가능 (GPU 가속)" -ForegroundColor Green
}
else {
    Write-Host "[INFO] hevc_nvenc 없음 → CPU libx265 사용" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1) config\config.example.json → config\config.json 복사"
Write-Host "  2) sourceFolder / nasFolder 경로 수정"
Write-Host "  3) .\scripts\Process-Videos.ps1 실행"

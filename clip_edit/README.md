# cheil — Windows 영상 NAS 아카이브

촬영 영상을 **Windows PC**에서 고화질·용량 최적화로 변환한 뒤, 파일명을  
`yymmdd_카메라기종_렌즈기종_번호` 형식으로 바꿔 **NAS**에 저장합니다.

예: `240915_A7IV_FE2470GM2_01.mp4`

## 동작 요약

1. `sourceFolder`에서 영상 수집 (`.mp4` `.mov` `.mts` 등)
2. ExifTool로 **촬영일 / 카메라 / 렌즈** 메타데이터 추출
3. FFmpeg로 **H.265(HEVC)** 인코딩  
   - 해상도·프레임레이트 유지 (다운스케일 없음)  
   - CRF/CQ ≈ 18~19 → 체감 최고 화질 + 용량 절감  
   - NVIDIA GPU 있으면 `hevc_nvenc` 자동 사용
4. NAS 경로로 복사, 로컬 `processedFolder`에도 보관(설정)

## 사전 요구

| 도구 | 용도 |
|------|------|
| [FFmpeg](https://ffmpeg.org) | 인코딩 |
| [ExifTool](https://exiftool.org) | 카메라/렌즈/촬영일 |
| Windows 10/11 + PowerShell 5.1+ | 실행 |
| NAS SMB 공유 | `\\NAS\...` 접근 |

```powershell
cd scripts
.\Install-Dependencies.ps1
# 또는
winget install --id Gyan.FFmpeg -e
winget install --id OliverBetz.ExifTool -e
```

## 설정

```powershell
copy config\config.example.json config\config.json
notepad config\config.json
```

주요 항목:

| 키 | 설명 |
|----|------|
| `sourceFolder` | 카메라/카드에서 복사한 원본 폴더 |
| `nasFolder` | NAS 저장 경로 (`\\서버\공유\...`) |
| `workFolder` | 인코딩 임시 폴더 |
| `processedFolder` | 로컬 완료본 |
| `encoding.crf` | CPU(x265) 품질 (낮을수록 고화질, 기본 18) |
| `encoding.nvencCq` | GPU 품질 (기본 19) |
| `encoding.codec` | `auto` / `libx265` / `hevc_nvenc` |
| `naming.cameraAliases` | 카메라 모델 → 짧은 이름 |
| `naming.lensAliases` | 렌즈 모델 → 짧은 이름 |
| `deleteSourceAfterSuccess` | 성공 후 원본 삭제 (기본 false) |

메타에 렌즈가 없으면 `UNKNOWNLENS`가 들어갑니다. 자주 쓰는 기종은 `cameraAliases` / `lensAliases`에 등록하세요.

## 사용

```powershell
# 한 번 실행
.\scripts\Process-Videos.ps1

# 특정 파일만
.\scripts\Process-Videos.ps1 -File "D:\DCIM\C0001.MP4"

# 폴더 감시 (자동)
.\scripts\Process-Videos.ps1 -Watch

# 미리보기 (실제 변환/복사 안 함)
.\scripts\Process-Videos.ps1 -WhatIf
```

더블클릭:

- `scripts\Run-Once.bat` — 1회 처리  
- `scripts\Run-Watch.bat` — 감시 모드  

### 작업 스케줄러 (카드 꽂을 때마다 등)

1. 작업 스케줄러 → 기본 작업 만들기  
2. 동작: `powershell.exe`  
3. 인수:  
   `-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\cheil\scripts\Process-Videos.ps1"`

## 파일명 규칙

```
yymmdd _ 카메라기종 _ 렌즈기종 _ 번호 .mp4
```

- 날짜: 영상 메타데이터의 촬영일 (`yyMMdd`)
- 카메라/렌즈: 메타 → alias 적용 → 영문·숫자만 남김
- 번호: 같은 접두어가 NAS에 있으면 `01`, `02`… 자동 증가

## 품질·용량 가이드

| 목적 | 설정 |
|------|------|
| 기본 (추천) | `crf: 18`, `preset: slow` 또는 GPU `nvencCq: 19` |
| 더 작게 | `crf: 20~22` / `nvencCq: 21~23` |
| 거의 무손실 | `crf: 15~16` (용량 증가) |

원본 코덱(XAVC, ProRes 등) 대비 보통 **크게 줄어들면서** 화면 차이는 거의 없습니다.

## 폴더 구조

```
cheil/
  config/
    config.example.json
    config.json          ← 직접 생성 (gitignore)
  scripts/
    Install-Dependencies.ps1
    Process-Videos.ps1
    Run-Once.bat
    Run-Watch.bat
  README.md
```

## 문제 해결

- **실행 정책**: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **NAS 접근 실패**: 탐색기에서 `\\NAS\...` 먼저 로그인
- **렌즈가 UNKNOWN**: 해당 카메라가 렌즈 태그를 안 심는 경우 → alias 또는 수동 이름 규칙 추가
- **인코딩 느림**: `codec: hevc_nvenc` (NVIDIA) 또는 `preset: medium`

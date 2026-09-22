# 서귀포제일교회 (CHEIL) 실시간 통역 시스템

예배 설교를 한국어로 인식하고, AI로 교정·다국어 번역한 뒤 성도 휴대폰·OBS 오버레이로 실시간 송출합니다.

JIFC와 동일 기능이며, Firebase 경로(`/cheil`)와 localStorage 키(`cheil_*`)로 데이터가 분리됩니다.

## 구성

| 페이지 | 용도 |
|--------|------|
| `index.html` | 성도 언어 선택 · 운영 메뉴 (QR 대상) |
| `listen.html?lang=en` | 모바일 실시간 통역 자막 |
| `overlay.html?lang=ko` | OBS 브라우저 소스용 투명 오버레이 |
| `broadcast.html` | 송출기 (Chrome + 마이크) |
| `admin.html` | 언어 on/off · 글자 크기 · 배치 |
| `monitor.html` | 8개 언어 멀티뷰 |

공통 로직은 `js/` 모듈로 분리되어 있습니다.

## 사용 방법

### 1. Firebase

1. [Firebase Console](https://console.firebase.google.com/)에서 Realtime Database를 준비합니다.
2. `js/config.js`의 `firebase.databaseURL`을 교회 프로젝트 URL로 바꿉니다.
3. 전용 프로젝트면 `rootPath`를 `""`로, 공유 DB면 `"cheil"`처럼 네임스페이스를 둡니다.
4. 예배 중 읽기/쓰기가 가능하도록 규칙을 설정합니다. (운영 환경에서는 인증을 권장)

기본값은 기존 `overlay-lab` DB의 `/cheil` 경로입니다.

### 2. 송출 (방송실)

1. **Chrome**으로 `broadcast.html` 열기
2. OpenAI API 키 저장
3. 저장 폴더 연결 → **방송 시작**
4. 마이크에 설교 오디오가 들어가게 믹서/루프백 연결

### 3. 성도

- QR → `index.html` → 언어 선택 → `listen.html`
- 또는 `listen.html?lang=vi`처럼 언어별 링크 직접 배포

### 4. OBS

브라우저 소스 URL 예:

```
https://anyplan75.github.io/cheil/overlay.html?lang=en
```

배경 투명, 원하는 해상도로 추가합니다. 배치는 `admin.html`에서 실시간 변경됩니다.

## 로컬 미리보기

```bash
python3 -m http.server 8080
# http://localhost:8080
```

마이크·폴더 선택은 브라우저 권한이 필요하므로 HTTPS 또는 localhost에서 사용하세요.

## GitHub Pages

배포 URL: https://anyplan75.github.io/cheil/

jifc와 같이 **`pages` 브랜치**에서 정적 파일을 제공합니다.

**최초 1회 (저장소 소유자):**  
https://github.com/anyplan75/cheil/settings/pages  
→ Deploy from a branch → Branch **`pages`** → `/ (root)` → Save

이후 `pages` 브랜치에 푸시하면 사이트가 갱신됩니다.

## 지원 언어

한국어, English, 中文, Tiếng Việt, Bahasa Indonesia, नेपाली, Tagalog, Русский

언어 추가/삭제는 `js/config.js`의 `languages` 배열만 수정하면 됩니다.

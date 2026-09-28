# AWANA English Club

어느 교회 어와나 프로그램에서도 쓸 수 있는 영어 대화 지원 웹 앱입니다.

## 기능

- **교사용 링크**: 마이크로 영어를 말하면 실시간 자막 생성 (Chrome / Edge)
- **학생용 링크**: 교사 자막을 실시간으로 보기
- **영한 사전**: 모르는 단어를 누르면 뜻 + 발음
- **말하기 도우미**: 하고 싶은 말을 한국어로 적으면 영어 표현 제안
- **교회/클럽 이름(선택)**: 방 만들 때 입력하면 화면에 표시

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.

## 배포 (Vercel)

1. 이 저장소를 Vercel에 Import
2. Framework: **Next.js** (자동 감지)
3. Deploy

배포 주소에서 수업 방을 만들고 교사용/학생용 링크를 공유하면 됩니다.

기존 `cheil-awana` Vercel 프로젝트가 있다면:
- Settings → Git → 이 저장소로 다시 연결
- Production Branch: `main`

## 기술

- Next.js App Router
- Web Speech API (교사 음성 → 자막)
- 공유 룸 상태로 교사/학생 동기화

# AWANA English Club

어느 교회 어와나 프로그램에서도 쓸 수 있는 영어 대화 지원 웹 앱입니다.

- 교사가 영어로 말하면 실시간 자막 생성
- 학생이 모르는 단어를 누르면 영한 사전 + 발음
- 하고 싶은 말을 한국어로 적으면 영어 표현 제안
- 방 만들 때 **교회/클럽 이름(선택)**을 넣으면 화면에 표시됩니다

## 웹에서 바로 쓰기

현재 배포: 연결된 Vercel 프로젝트에서 Production Branch `cursor/awana-english-app-5cb8` 를 사용하세요.

또는:

1. https://vercel.com/new 접속
2. 이 저장소 Import
3. Branch: `cursor/awana-english-app-5cb8`
4. Deploy

## 로컬 실행

```bash
npm install
npm run dev
```

교사용 음성 인식은 **Chrome / Edge** 에서 가장 잘 동작합니다.

## 사용 방법

1. 홈에서 교회/클럽 이름(선택) 입력 후 **수업 방 만들기**
2. 교사용 / 학생용 링크를 공유
3. 교사: Start microphone → 영어로 말하기
4. 학생: 단어 탭으로 사전 확인, 아래에서 영어 표현 받기

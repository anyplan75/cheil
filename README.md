# 서귀포 제일교회 AWANA English

교사가 영어로 말하면 실시간 자막이 생기고, 학생은 단어를 눌러 사전을 보고, 하고 싶은 말을 적으면 영어 표현을 받는 웹 앱입니다.

## 웹에서 바로 쓰기 (배포)

GitHub 저장소를 Vercel에 연결하면 `https://....vercel.app` 주소로 바로 사용할 수 있습니다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anyplan75/cheil/tree/cursor/awana-english-app-5cb8)

또는:

1. https://vercel.com/new 접속
2. GitHub로 로그인
3. `anyplan75/cheil` 저장소 Import
4. Branch를 `cursor/awana-english-app-5cb8` (또는 `main`에 머지 후) 선택
5. **Deploy** 클릭

배포가 끝나면 나오는 주소가 교사용/학생용 링크의 기준 주소입니다.

## 기능

- **교사용 링크**: 마이크로 영어를 말하면 실시간 자막 생성
- **학생용 링크**: 교사 자막을 실시간으로 보기
- **단어 사전**: 자막의 모르는 단어를 누르면 영어 사전 뜻 표시
- **말하기 도우미**: 하고 싶은 말을 한국어로 적으면 영어 표현 제안

## 로컬 실행 (개발용)

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.  
교사용 음성 인식은 **Chrome / Edge** 에서 가장 잘 동작합니다.

## 사용 방법

1. 홈에서 **수업 방 만들기**
2. **교사용 링크**를 교사 기기에, **학생용 링크**를 학생 기기에 공유
3. 교사 화면에서 **Start microphone** 후 영어로 말하기
4. 학생은 자막 단어를 눌러 사전을 보고, 아래 칸에 하고 싶은 말을 적어 영어 표현을 확인

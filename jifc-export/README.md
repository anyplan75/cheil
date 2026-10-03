# JIFC 안정화 배포본 (cheil에서 export)

제주 국제순복음교회 실시간 통역 — CHEIL과 동일한 STT·Firebase 안정화 패치입니다.

이 Cloud Agent는 `anyplan75/cheil`에만 push 권한이 있어 `anyplan75/jifc`에 직접 올리지 못했습니다.

## Firebase Rules (둘 다 필수)
`permission_denied at /jifc/settings` 또는 `/cheil/settings` 가 뜨면 **코드 버그가 아니라 Rules** 문제입니다.
JIFC·CHEIL이 같은 `overlay-lab` DB를 쓰므로 **한 번 Publish**하면 둘 다 해결됩니다.

Firebase Console → Realtime Database → Rules → 아래 붙여넣기 → **Publish**  
(동일 내용: `docs/firebase-rules.json`)

```json
{
  "rules": {
    "jifc": {
      ".read": true,
      ".write": true
    },
    "cheil": {
      ".read": true,
      ".write": true
    }
  }
}
```

코드는 Rules가 없어도 방송 시작이 막히지 않도록 soft-fail 합니다.  
다만 성도 listen·OBS 실시간 동기화는 Rules Publish 후에만 됩니다.

## jifc에 넣는 방법
Cursor에서 **anyplan75/jifc** Agent로  
「cheil의 `jifc-export`를 jifc `pages` 루트로 복사해 배포해줘」요청

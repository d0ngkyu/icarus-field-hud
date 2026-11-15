# 게임 소식 · 번역 API (2026-11-16)

공식 Steam ISteamNews(앱1149460, steam_community_announcements만)의 최근8개 글과 이미지 표시. 탭을 열 때 최대1시간 캐시, 수동확인은1분 제한. 숨은 탭에서 폴링하지 않는다. 원문 HTML/스크립트는 실행하지 않으며 이미지 HTTPS Steam CDN 허용 목록, 응답3MB/시간15초 제한. 사진은 대표1장/나머지접기·지연로딩.

## 번역 연결
소식 → 번역 설정 → Google Cloud Translation Basic(v2) API 키 입력. Cloud Translation API 활성화 및 Google 계정의 결제/할당량 설정은 사용자가 해야 한다. API 키를 채팅·저장소·공용 배포파일에 넣지 않는다. Electron safeStorage로 현재 Windows 계정에 암호화, renderer에는 키를 다시 반환하지 않는다. 암호화 불가하면 평문 저장으로 전환하지 않는다. API키 사용 제한을 Cloud Translation API에 적용할 것을 권장한다.

한국어로 번역 버튼을 눌렀을 때 공식 원문 텍스트만 Google에 전송. 4000 Unicode문자씩 순차 요청, 동시 번역차단, 자동 재시도없음. 이미지속문자는 번역하지 않음. 번역 캐시는 본문SHA256 기준 최대64개. 글내용이 바뀌면 새 번역 필요. 재열람/재시작/키삭제 뒤 저장번역 읽기에는 API호출없음. 계정별공용캐시/친구PC공유는 구현하지 않음.

## 사용량
이 PC UTC달력월 요청45만자 제한. HTTP요청 전 원문전체문자 예약 저장, 실패/시간초과도 청구가능하므로 차감복원하지 않음. 다른 PC/앱 사용량 및 캐시파일 삭제/PC시간변경은 감시하지 못하므로 계정의 무료50만자/무과금을 보장하지 않음. 공급자할당량과 결제설정을 별도관리한다. 승인 없이 계정 생성/결제 활성화하지 않음.

## 검증
Node/Fengari162개 검사(기존158+뉴스4): 공식출처/이미지필터·스크립트제거, 키미연결/캐시재사용·재시작, 실패사용량예약/동시호출방지, 월제한/오프라인캐시. 실제Steam 최신8건/Week258 원문9496자·이미지3개 수신 확인. 브라우저 원문/사진/키미연결 안내와 탭0단축키 확인. 실제Google번역은 키가없어 미실행; mock응답으로 번역캐시 경로 검증. 설치적용은 TASKS의후속결과를참조.

공식문서: https://partner.steamgames.com/doc/webapi/ISteamNews / https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate

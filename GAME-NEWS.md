# 게임 소식 · 번역 API (2026-11-16)

공식 Steam ISteamNews(앱1149460, steam_community_announcements만)의 최근8개 글과 이미지 표시. 탭을 열 때 최대1시간 캐시, 수동확인은1분 제한. 숨은 탭에서 폴링하지 않는다. 원문 HTML/스크립트는 실행하지 않으며 이미지 HTTPS Steam CDN 허용 목록, 응답3MB/시간15초 제한. 사진은 대표1장/나머지접기·지연로딩.

## 번역 연결
소식 → 번역 설정 → Google Cloud Translation Basic(v2) API 키 입력. Cloud Translation API 활성화 및 Google 계정의 결제/할당량 설정은 사용자가 해야 한다. API 키를 채팅·저장소·공용 배포파일에 넣지 않는다. Electron safeStorage로 현재 Windows 계정에 암호화, renderer에는 키를 다시 반환하지 않는다. 암호화 불가하면 평문 저장으로 전환하지 않는다. API키 사용 제한을 Cloud Translation API에 적용할 것을 권장한다.

한국어로 번역 버튼을 눌렀을 때 공식 원문 텍스트만 Google에 전송. 4000 Unicode문자씩 순차 요청, 동시 번역차단, 자동 재시도없음. 이미지속문자는 번역하지 않음. 번역 캐시는 본문SHA256 기준 최대64개. 글내용이 바뀌면 새 번역 필요. 재열람/재시작/키삭제 뒤 저장번역 읽기에는 API호출없음. 개인 번역과 별개로 아래 공개 공유 캐시를 우선 사용한다.

## 사용량
이 PC UTC달력월 요청45만자 제한. HTTP요청 전 원문전체문자 예약 저장, 실패/시간초과도 청구가능하므로 차감복원하지 않음. 다른 PC/앱 사용량 및 캐시파일 삭제/PC시간변경은 감시하지 못하므로 계정의 무료50만자/무과금을 보장하지 않음. 공급자할당량과 결제설정을 별도관리한다. 승인 없이 계정 생성/결제 활성화하지 않음.

## 검증
Node/Fengari162개 검사(기존158+뉴스4): 공식출처/이미지필터·스크립트제거, 키미연결/캐시재사용·재시작, 실패사용량예약/동시호출방지, 월제한/오프라인캐시. 실제Steam 최신8건/Week258 원문9496자·이미지3개 수신 확인. 브라우저 원문/사진/키미연결 안내와 탭0단축키 확인. 실제Google번역은 키가없어 미실행; mock응답으로 번역캐시 경로 검증. 설치적용은 TASKS의후속결과를참조.

공식문서: https://partner.steamgames.com/doc/webapi/ISteamNews / https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate


## 공유 한국어 · GAME-NEWS-SHARED-044
- 기본 동작: 소식 탭에서 공개 번역을 자동 표시. 친구 PC에는 API 키가 필요 없다. API 키는 기존 소유자 PC 암호화 저장소에만 남고 배포/공유하지 않는다.
- `news/ko.json`은 공식 글 ID·원문 SHA256·한국어 번역·번역 시각만 담는다. 소스 본문이 달라지면 옛 번역을 붙이지 않는다. `source/app/news-ko.js`에 같은 데이터를 번들해 최초 네트워크 장애에도 현재 번역을 쓸 수 있다. 공식 원문 목록은 Steam에서 받는다.
- 온라인 공유본은 소식 탭에서만 최대1시간/수동1분 간격으로 확인한다. 고정 GitHub HTTPS 주소, 3MB/15초 제한, 원격 코드를 실행하지 않고 plain text로만 표시. 수신 실패 시 저장 번역 유지. 공유 번역 열람은 Google API 요청/사용량 증가 없음.
- 현재 공개본은 Week258 1건. 다른 글/향후 글은 운영자가 번역하고 공개해야 한다. 무인 자동번역 서버/정기 발행은 구축하지 않았다. 공유 글만 추가할 때는 앱 재배포 불필요. 친구는 새 소식 확인을 누르면 받는다.
- 발행 절차: 소유자 HUD에서 글을 번역한 뒤 `node source/tools/export-news.cjs <userData>/game-news.json news/ko.json source/app/news-ko.js`. 이 도구는 공식 글과 해시가 일치하는 번역만 내보내며 키·사용량·설정 전체파일은 절대 업로드하지 않는다. 변경 데이터를 검토·검사한 뒤 GitHub에 공개한다. 최신8건을 내보내므로 이전 번역 보존이 필요하면 기존 데이터와 ID/해시 기준 병합한다.
- 166검사: 키 없는 친구의 공유 번역/Google 호출0/사용량0/오프라인/본문수정 거부/잘못된 응답/신규공유본 우선/내보내기 비밀정보 제외/번들 일치. 소유자 실제 Google번역 9,496자 성공은 선행작업에서 확인.


## 번역 후 자동 업로드 · NEWS-AUTO-PUBLISH-045
- 운영자 PC 소식 → 번역 자동 공유에서 GitHub fine-grained 토큰을 한 번 연결. 연결 시 기존 미공유 번역, 이후 번역 성공 때 새 번역을 자동 공개한다. 친구는 토큰/Google키 불필요. 공식 소식은 탭 열기/수동 확인 때 갱신하며 상시 푸시 수신은 아니다.
- 권한: 소유자 d0ngkyu, Only select repositories → icarus-field-hud, Contents read/write만 추가(Metadata read는 GitHub 필수). 토큰은 저장소 전체 콘텐츠 권한이므로 파일별 보안 경계가 아니다. 앱의 URL·경로는 news/ko.json으로 고정, 설정으로 바꿀 수 없다. 토큰 유효기간 만료 시 재연결한다. 계정 token 생성은 사용자 확인 후 진행.
- news-publisher.dat에 Electron safeStorage 암호화 보관. renderer에 반환하지 않고 저장 입력은 비움. 공유 payload는 공식글 ID·본문해시·번역·시각만. 키/사용량/개인정보 전체캐시 업로드 금지. 연결 해제는 로컬 인증만 제거하며 GitHub 토큰 자체 폐기는 GitHub 설정에서 한다.
- 번역 저장 후 업로드. 실패해도 번역과 사용량 유지, 재시작/소식탭 확인 때 최소1분 간격 또는 공유 재시도 버튼으로 재전송. 숨은 탭 타이머 없음. 재전송에 Google 재요청 없음. GitHub 409/422 충돌 시 최신SHA 다시 읽고 최대3회 병합; 기존 같은 ID/해시 번역 유지, 다른 글 보존. 오래된64건/파일800KB 한도. 비정상 원격 파일은 덮어쓰지 않는다.
- 공유 데이터 업데이트는 앱 배포와 별개이다. source/app/news-ko.js는 배포 시점 오프라인 보조본이므로 news/ko.json이 더 최신이어도 정상. 회귀검사는 양쪽 유효성을 확인하며 동일성은 요구하지 않는다. 자동 업로드와 Actions 발행 동시 main 변경은 GitHub push 충돌로 배포가 실패할 수 있으므로 기록 확인 후 기존 release workflow 재실행한다.
- 171검사 통과. 동시수정 병합/중복업로드 방지/잘못된 원격 보호/토큰보관/전송중 연결변경 차단/업로드실패 뒤 재시작 재전송 및 Google호출1회 확인. 실제 계정 토큰연결·실업로드 결과는 TASKS 후속기록.
- API 근거: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents · https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

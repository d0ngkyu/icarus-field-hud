# 작업 기록

## 2026-11-14 · Codex · MAP-SELECTION-004
- 요청: Icarus Intel 참조, 접속 맵 자동 표시 및 미접속/플레이 중 다른 지도 선택. Claude의 활성 동굴 작업 보존, 통합/배포 담당 유지.
- 구현: 실제 수신 세계와 열람 세계 분리, 지도 선택/현재 맵 복귀/전체 보기, 맵별 기록과 확대·중심, 타 맵 위치·목표 전달 차단, 동굴 캐시 격리. 새 네이티브 읽기 없음.
- 동시 변경: .18 시작 후 .19 ca606b3 동굴 아이콘 반영. 최종 codex/map-selection-ui(.19 기반); codex/map-selection은 초기 착수 기록용. 설치본/배포 파일 수정 없음.
- 검증: Node 59개 통과. 합성 브라우저에서 올림푸스 접속 중 스틱스 열람 유지·현재 맵 복귀·미설치 안내 확인. 실게임 미검증. .19의 단일 동굴 레벨/추정 표기에 맞춰 기존 시험 기대값 갱신.
- 제한: 지형 이미지는 올림푸스/스틱스만 배포됨. 다른 맵은 격자·저장 기록+미설치 안내. Icarus Intel의 광석 수 범례와 현재 생물 생성 수 기반 규모 분류의 차이를 Claude 검토 대상으로 기록. 상세 MAP-SELECTION-REVIEW.md.

## 2026-11-14 · Codex · SYSTEM-SAFETY-003
- 요청: 전체 HUD/모드 시스템 정비, 게임 튕김 위험 최대한 감소. 기준 .14 d619a16, codex/system-safety. Codex 범위: main.lua 실행 수명/인벤토리/검색/큐, animals.lua reset, main.js 업데이트 시점, updater.js 트랜잭션, diag.js 진단 및 시험. Claude 통합/배포 유지, 동굴 levjob/지도 영역 변경 없음. PR #5 관측 기능은 별도 유지.
- 실제 확인: 현재 게임과 HUD 실행 중. 업데이트 로그는 게임 실행 후 .14 파일 5개를 교체하고 HUD 재시작한 기록. 사용자 서버 중단/설치본 덮어쓰기 없이 별도 작업.
- 보완: 월드·로컬 플레이어 변경/소실 시 캐시 초기화와 60회(약45초) 안정화 재시작, 이전 Inventory UObject 보관 제거, 로컬 플레이어만 선택, 배열 수 상한, 잘못된 클래스의 actor/voxel 함수 호출 방지, 안전 모드/ores 차단 적용, 이동·채굴/단축키 큐 중복 방지.
- 보완: 게임 실행 중/상태 불명 시 업데이트 보류, 다운로드 전체 검증 후 교체, 다운로드 중 게임 시작 재확인, 적용 실패 시 기존 파일 복원 시도. 게임 종료 후 업데이트를 확인하므로 네트워크/다운로드 중 종료가 지연될 수 있음. 요청별 15초 제한. 강제 종료/전원 차단까지 원자성 보장 아님.
- 진단: 작성 중 충돌 보고서 재검사, PortableCallStack 지원, ores 개별 차단, 실행 상태 조회 실패 시 loader 변경 금지. 원인 미확정 문구 정정.
- 검증: Node+Fengari Lua 실행 테스트 53개 통과(스킵0, .15 통합 후), JS 문법/diff 확인. 실제 게임 네이티브 접근/재접속/성능은 미시험. 상세: SYSTEM-SAFETY-REVIEW.md. 기존 fog 격리·Claude 상세창당1회 읽기 보존.
- 동시 작업: .15 / 4c7c2d5의 PR #5·동굴 데이터 반영. TASKS 첫머리 삽입 충돌은 양쪽 기록 모두 유지하여 해결. 배포 산출물/지도 최신 기능 보존.

## 2026-11-14 · Codex · ANIMALS-OBS-002
- 요청: 교배 성공률을 관측 추정 퍼센트로 표시. codex/animal-observations, 기준 .14 / d619a16. 소유 범위 animals.js와 동물 테스트·기록, main.lua의 캐시 JSON 전송 조건. Claude 통합/배포 유지.
- 구현: 실제 새끼 결과를 부모 둘과 조건 이름에 연결하여 수동 기록. 스탯별 '높음 이상' 달성률 = 성공/관측 × 100, 7개 모두 달성은 실제 공동 결과로 집계. 같은 종류·조건 이름·암수 각각의 7개 유전 수치 일치 시만 집계. 부모 평균을 %로 변환하지 않음.
- 기록 0개는 관측 부족, 30개 미만은 표본 적음. 100%도 미래 보장 아님 표시. 최대 2000개 로컬 저장, 식별자 중복 차단, 마지막 잘못된 관측 삭제. 네이티브 읽기/스캔/타이머 추가 없음.
- 검증: Node 44개 통과. 합성 브라우저에서 13/20=65.0%, 새끼 추가 후 14/21=66.7%, 중복 차단 및 새로고침 후 저장 유지 확인. 실제 교배 기록은 아직 없으며 합성 자료는 제품에 포함하지 않음.
- 한계: 자동 혈통 연결 아님. 사용자가 부모·새끼 관계를 확인해야 함. 조건 이름으로 버전/재능/혈통 차이를 구분해야 하며 자동 보정 없음. 액터 식별자가 재접속 때 달라질 수 있어 같은 새끼 재등록 주의. 소스만 갱신, 배포·실게임 검증 대기.
- 동시 작업 반영: 작업 중 PR #4가 .12에 병합되고 .14의 상세창당 1회 읽기가 배포됨을 fetch로 확인. 최신 main에 후속 변경만 옮김. .14의 변경 시에만 전송은 HUD의 12초 만료와 충돌하므로 열린 창의 캐시 JSON만 재전송. native 배열 1회 읽기는 보존. 재전송은 약 3초 간격이며 동일 내용은 화면을 다시 그리지 않음.

## 2026-11-14 · Codex · ANIMALS-EXIT-001
- 요청: 게임 종료 시 HUD 자동 종료, 가벼운 동물 상세/색상 등급/교배 비교.
- 담당: Codex 소스·시험, codex/animals-and-exit. Claude 통합/배포 유지. .11 동굴 변경을 병합하여 보존.
- PC 복구: 옛 app.asar(1.0.1)가 최신 app/를 가리고 있었음. 게임/HUD가 꺼진 상태에서 archive 백업 이동. 일반 실행 후 .11 업데이트와 diag.json 생성 확인. 실게임 종료는 미시험.
- 코드: 진단 알림에도 종료, 3초 간격 2회 부재 확인, 자동 실행 인자, 동물 상세 읽기/탭/개별 색상 경계/저장 및 부모 평균 비교.
- 검증: Node 39개, JS/Lua 문법, 합성 데이터 동물 탭 표시. 실게임 동물 읽기/안정성과 유전 확률은 미검증. 부모 평균을 실제 새끼 확률로 표시하지 않음.
- 다음: Claude 검토·배포 및 실게임 검증. 정확한 유전 예측은 규칙 검증 후 확장. 자세한 근거/한계: [REVIEW-ANIMALS-EXIT.md](REVIEW-ANIMALS-EXIT.md).

## 2026-11-14 · Codex · REVIEW-V8-001 최신 프로그램 검토
- 요청: Claude 최신 업데이트 코드 검토 및 보완. 기준 2026.11.14.8 / 2ba7895, 별도 브랜치 codex/review-v8. Codex 범위: app main.js의 종료/업데이트 조정, HUD tidyDeposits 데이터 이전, 해당 테스트. Claude 통합/배포 담당 유지; Lua/동굴 추출 작업 변경 없음.
- 재현: 이전 키와 표준 위치 키가 공존하면 순서에 따라 tidyDeposits가 방금 옮긴 동굴/광맥과 메모를 삭제. 원본 스냅샷을 그룹화한 뒤 삭제/저장하도록 수정. 양쪽 입력 순서와 멱등성 테스트.
- 재현: tasklist 실패 사이에 있는 미실행 결과를 연속 2회로 세고 종료함. 실패 시 카운트 초기화. 충돌 진단 예외도 무시하고 종료하던 경로는 종료 보류/로그로 변경. tasklist 제한시간 5초.
- 보완: 파일 다운로드/설치 또는 재시작 예약 중 자동 종료 금지, 겹친 업데이트 요청은 진행 중 작업 공유. 실제 다운로드/게임 실행 대신 제어 가능한 비동기 모의 테스트 수행.
- 검증: Node 테스트 31/31 (기존 24 + 추가 7), app/main.js 문법, HUD 스크립트 3개 파싱, diff 검사 통과. 배포 manifest의 26개 파일 Git blob 크기/SHA1 일치. Windows 체크아웃 CRLF가 아닌 실제 Git blob으로 검사함.
- 상태: 검토용 소스 수정 완료. 설치된 프로그램/배포 파일은 변경하지 않음. 실제 Electron 창/게임 서버에서 동작 검증은 미실행. 이미 삭제된 지도 기록은 자동 복구되지 않음. Claude 검토·정상 배포 후 게임 종료/충돌 안내/지도 메모 보존 확인 필요.

## 2026-11-14 · Codex · HOST-SAFETY-001 서버장 반복 충돌 검토
- 요청: 서버장 크래시로 인한 롤백 재발 억제. 기준 main 5315972, 작업 브랜치 codex/host-crash-safety.
- 범위: source/mod/Scripts/main.lua의 fog 차단, source/app/diag.js의 차단 유지·단계 시간 검증·버전 간 반복 집계, source/app/main.js의 업데이트 시 차단 해제 제거, 회귀 테스트. Claude의 동굴 추출 작업은 변경하지 않음. 제품 통합/배포 담당 Claude 유지; 본 변경은 검토용 소스 제안.
- 직접 확인: PC diag_step = fog, 시각 2026-11-14 08:55:21 KST; 충돌 폴더 08:55:22; XML의 0x78 접근 위반. UE4SS.log도 직전 실행 기록과 일치. fog는 유력한 의심 지점이며 네이티브 원인 함수는 확정하지 못함. 10분 간격은 위험 호출 자체를 없애지 않음.
- 즉시 PC 설정: 기존 features_off.txt 항목을 보존하며 fog 추가, 다시 읽어 확인. 당시 게임 프로세스 없음. 설치된 Lua가 이 설정을 읽고 모든 fog 호출을 on("fog")로 제어함을 확인. 다음 게임 시작부터 HUD 안개 읽기 차단. 설치 소스/manifest/배포 파일은 바꾸지 않음.
- 소스 제안: fog를 기본 격리하여 F10/첫 진입/주기 호출도 차단하고 readFog 내부에도 차단 가드 추가. 업데이트만으로 features_off/safe_mode를 해제하지 않음. 오래되거나 충돌 이후인 단계 표시는 원인 기능으로 귀속하지 않음. 버전 변경으로 반복 충돌 집계를 초기화하지 않음.
- 검증: node --test source/tests/*.test.cjs = 20/20 통과 (기존 16 + 진단 회귀 4). node --check source/app/diag.js 및 main.js 통과. git diff --check 통과. Lua 변경은 코드 검토; Lua 실행기 및 실제 게임으로는 미검증.
- 한계/다음 단계: HUD 탐험 안개 동기화 중단, 게임 자체 지도 변경 없음. UE4SS 및 다른 UObject 읽기 경로의 모든 크래시를 방지한다고 보장하지 않음. Claude는 이 브랜치 검토 후 정상 배포 절차로 통합. 실게임은 안개 차단 상태에서 다음 서버 세션의 로그/충돌 여부를 확인; 재발 시 추가 위험 읽기 격리 또는 모드 없는 운영을 우선 검토. 진단 초기 실행이 기존 충돌을 seen 처리하는 동작은 별도 보완 후보.

| 날짜 | 요청 | 담당 | 상태 | 브랜치 / 메모 |
|---|---|---|---|---|
| 11-14 | live.js 읽기 안정화, preload 초기 데이터, updater 경로 검증 | Codex | ✅ 배포 2026.11.14.4 | `codex/live-path-fixes`, Claude 검토 후 병합. 잘못된 경로는 건너뛰도록 보완함 |
| 11-14 | 튕김 자가 진단·안전 모드·보고서 | Claude | ✅ 배포 2026.11.14.1 | 실제 게임 튕김으로는 아직 확인하지 않음 |
| 11-14 | 안 가 본 곳의 동굴 표시 (맵 레벨 파일에서 추출) | Claude | 🔄 진행 중 | 사용자 PC의 `levelraw/`, `levels.txt` 결과를 기다리는 중 |
| 11-14 | 월드 보스 표시 확인 | Claude | ✅ 사용자 확인 완료 (11-14 00:27) | |
| 11-14 | 모드 `os.execute`에서 `%`가 든 경로 처리 점검 | Claude | 📝 할 일 | Codex 검토에서 나온 지적 |
| 11-14 | 나머지 맵 그림(프로메테우스·엘리시움·022·아웃포스트) 배포 | Claude | 📝 할 일 | 원본은 사용자 PC 모드 폴더 `mapraw_*`에 있음 |

## 2026-11-14 01:05 · Claude
- PR #1 (Codex, 중앙 협업 저장소 연결) 검토 후 병합: 29933d7. 문서만 변경.
- 해결 01:08: 사용자가 권한 추가 → Claude가 ai-collaboration 읽음 (중앙 HUB-003).

## 2026-11-14 09:10 · Claude · 게임 튕김 (EXCEPTION_ACCESS_VIOLATION 0x78)
- 근거: diag_step.txt = `fog|08:55:21`, 충돌 폴더 08:55:22. 미니덤프 예외 위치 UE4SS.dll+0x2d6d4f (사용자 UE4SS 빌드는 기호 파일 없음 → 함수 확정 불가). 지도 안개 읽기 중 튕김으로 판단 (직접 확인: 로그·덤프 / 원인 함수는 추정).
- 같은 0x78 튕김이 11-13 21:57~23:34에 6회 더 있었음. 당시 단계 기록은 없음.
- 조치 (claude/fog-crash → main, 2026.11.14.5): 안개 읽기 60초마다 → 접속 직후 1회 + 10분마다 + F10(최소 1분 간격). 테스트: Lua 문법 검사, node 테스트 16개 통과. 실제 게임 테스트는 아직.
- 추가 발견: PC의 HUD가 어젯밤부터 트레이에 남은 옛 프로그램이라 .3/.4 업데이트와 자동 진단(diag.json·update.log 없음)이 안 돌았음. 사용자에게 트레이에서 완전 종료 요청. main.lua는 PC에 직접 넣음.
- 다음: 사용자 재접속 후 UE4SS.log와 diag.json 확인. 다시 튕기면 안개 읽기 기본 끄기 검토.

## 2026-11-14 09:20 · Claude · PR #2 검토·배포
- Codex PR #2 (codex/host-crash-safety, 7359e99) 검토: 안개 읽기 기본 차단, 업데이트 후 자동 재활성화 제거, 충돌 2분 이내 단계만 원인으로 인정. 직접 실행: node 테스트 20개 통과, Lua 문법 OK. 동의하여 병합.
- 배포 2026.11.14.6. HUD의 탐험 안개는 게임 값 대신 HUD 자체 이동 기록으로 표시됨.
- 실제 게임 안정성은 미검증. 다음: 사용자 재접속 후 UE4SS.log·diag.json 확인.

## 2026-11-14 09:45 · Claude · 동굴 레벨 표시 (사용자 요청)
- 요청: 지도에서 동굴 규모별 Lv.1/Lv.2/Lv.3, 부사관 계급장식 갈매기 아이콘, 메가 동굴은 M 표시.
- 변경 (claude/cave-levels → main, 2026.11.14.7): hud `caveInfo`/`drawRank`/`drawCave` — 작은=갈매기 1개 Lv.1, 중간=2개 Lv.2, 큰=3개 Lv.3, 메가=3개+빨간 M Lv.M. 규모 모르면 회색·레벨 없음. 동굴 입구(c)를 위치 기준 1개로 합치고 규모 아는 기록 우선(메모 유지).
- mod: 동굴 입구 액터의 전체 이름에서 `CAVE_XX_SIZE_NN` 추출 (이미 호출하던 GetFullName만 사용, 새 네이티브 읽기 없음). 처음 3개 이름을 로그에 남김.
- 검증: 아이콘 화면 캡처(크롬), JS·Lua 문법, node 테스트 20개. **미확인**: 실제 게임에서 입구 이름에 규모가 들어 있는지, 메가 동굴의 실제 이름(MEGA로 추정). 다음 접속 후 UE4SS.log의 "cave entrance:" 줄로 확인.

## 2026-11-14 09:55 · Claude · 게임 끄면 HUD도 같이 종료 (사용자 요청)
- 변경 (claude/close-with-game → main, 2026.11.14.8): app `watchGame()` — 10초마다 tasklist로 게임 확인, 게임을 한 번 본 뒤 2번 연속 없으면 종료. 튕김 안내가 있으면(최근 5분) 끄지 않고 창을 띄움. 트레이 메뉴 "게임 끄면 같이 끄기"(기본 켜짐, settings.json `closeWithGame`).
- 검증: 새 테스트 4개(source/tests/close-with-game.test.cjs) 포함 총 24개 통과. 실제 Windows 동작은 사용자 확인 필요.

## 2026-11-14 10:00 · Claude · PR #3 검토·배포
- Codex PR #3 (codex/review-v8, 7341241): 지도 기록 위치 키 이전 시 순서에 따라 동굴·광맥·메모가 지워지던 버그(Claude .7 코드) 수정, 게임 종료 감시 보완(조회 실패·진단 실패·업데이트 중엔 종료 보류, tasklist 5초 제한, 겹친 업데이트 공유).
- 직접 확인: node 테스트 31개 통과, main.js·HUD 스크립트 문법 OK, mod Lua 변경 없음. 동의하여 병합, 2026.11.14.9 배포.
- 한계: .7/.8에서 이미 지워진 기록은 복구 안 됨. 실제 Windows/게임 동작 미확인.

## 2026-11-14 10:15 · Claude · 동굴 위험 표시 + 옛 버전 덮어쓰기 방지
- 확인: 사용자 PC main.lua가 .6 내용(09:39:35)으로 되돌아가 있었음 → 09:51 게임에서 동굴 이름 기록 없음. 추정 원인: 트레이의 옛 HUD가 오래된 manifest로 업데이트하며 덮어씀 (확정 아님).
- 조치: updater가 `version.txt`를 남기고, 설치본보다 오래된 manifest면 아무것도 바꾸지 않음 (테스트 추가).
- 요청 기능: 동굴 아이콘에 마우스 → 위험 생물 수(동굴웜·벌·거미·박쥐·땅상어). 근처에서 본 생물을 가장 가까운 동굴(150 m 이내)에 기록, 30분 안의 방문은 가장 많이 본 수 유지. mod: 기존 광석 스캔에 `BP_CRE_C`(동굴웜 계열) 추가, 기능 이름 `hazards`로 끌 수 있고 진단 대상에 포함.
- 한계: 게임 데이터에 동굴별 생물 수 표가 없음(동굴 지도 안에 배치) → "가 본 동굴만" 표시. 벌집 자체는 세지 않음(벌만).
- 검증: node 테스트 33개 통과, Lua·JS 문법. 실제 게임 미확인. 배포 2026.11.14.10.

## 2026-11-14 10:20 · Claude · 동굴 위험 "보통 몇 마리" (사용자 요청 보완)
- 요청 정정: 정확한 수가 아니라 대략적인 평균(예: 웜 2~4, 벌 1)을 안 가 본 동굴에도 보여 줄 것.
- 근거 조사: 게임 데이터 표(D_CaveCreatureConfig 등)와 위키에 동굴별 수 없음 → 동굴 지도 파일(CAVE_XX_SIZE_NN.umap)에 놓인 생물 스포너를 세어야 함.
- 1단계 (claude/cave-hazard-averages, 2026.11.14.11): levjob이 CAVE_* 레벨 파일도 복사(caves.txt 목록). HUD는 그 전까지 "가 본 같은 레벨 동굴의 범위"를 보여 줌, 게임 데이터 평균(CAVEHAZ)은 채워지면 우선.
- 2단계 (대기): 사용자 HUD 재시작 → levelraw/ 생성 → Claude가 받아 스포너 수 집계 → CAVEHAZ 채워 배포.
- Codex 참고: 이 작업 동안 Claude 담당 범위 = source/app/levjob.js, hud의 HAZ/noteHazards/hazTypical/hazText/CAVEHAZ.

## 2026-11-14 10:35 · Claude · PR #4 검토·배포
- Codex PR #4 (codex/animals-and-exit, 6789327): 게임 종료 시 HUD도 항상 종료(Steam이 HUD를 게임 실행 중으로 보던 문제), 진단은 파일로 남김, 3초 간격 확인, `--icarus-auto` 표시. 동물 탭(열린 상세창만 3초마다 읽음, `animals` 기능 스위치·진단 대상).
- 직접 확인: node 테스트 39개, JS·Lua 문법. 동물 읽기는 작은 배열(7개) ForEach를 포함 → 튕김 시 진단이 이 기능만 끄도록 되어 있음. 동의하여 병합, 2026.11.14.12 배포.
- 후속 제안: 게임 종료 후 튕김 안내는 다음 HUD 시작 때 보여 주면 좋음(현재는 파일만).

## 2026-11-14 10:45 · Claude · 동굴 파일 2차 복사
- levelraw 결과: 동굴은 `Prefabs/Cave/CAVE_XX_{SML|MED}_NNN` 프리팹(.uexp만 복사됨). 이름표(.uasset)가 없어 생물 스포너를 셀 수 없음. 프리팹 이름에 LRG·MEGA는 없음(작은·중간만).
- 조치 (2026.11.14.13): levjob이 동굴 파일만 .uasset까지 `caveraw/`에 복사(지형 파일은 이제 안 꺼냄). main.js는 폴더 이름만 바꿈(개발용 블록).

## 2026-11-14 10:55 · Claude · 동물 읽기 튕김 위험 줄이기 (사용자 요청: 끄지 말고 위험 줄이기)
- 변경 (claude/animals-read-once, 2026.11.14.14, Codex의 animals.lua 수정 — Codex 검토 환영):
  - 유전 목록(배열) 읽기를 3초마다 → 상세창을 한 번 열 때 1회로. 같은 동물은 캐시 사용.
  - 상세창이 2번 연속 보일 때(완전히 그려진 뒤)만 읽음.
  - 한 번 이상하게 읽힌 동물은 같은 세션에서 다시 읽지 않음. 목록 개수가 7이 아니면 배열을 아예 안 읽음.
  - main.lua: 값이 바뀔 때만 HUD로 보냄.
- 검증: source/tests/animals_read_once.py (가짜 객체로 18초 동안 배열 읽기 1회, 다시 열면 1회, 잘못된 동물 0회), Lua 문법, node 테스트 전부 통과. 실제 게임 미확인.

## 2026-11-14 10:55 · Claude · 동굴 위험: 게임 데이터 평균 + PR #5 병합
- 동굴 프리팹 70개(Prefabs/Cave/CAVE_*) 분석: `CaveActorSpawnMap`의 생물별 Min/MaxSpawnNumber. 동굴웜·벌집·박쥐 둥지·거미 둥지·땅상어.
- 게임 속 입구 액터 이름은 `BP_CaveEntrance_CF_SML_03_C` 형식(사용자 PC 로그 10:28 확인). 입구 종류 하나를 여러 동굴(1~10종)이 같이 씀 → 입구별로 후보 동굴들의 보통 범위(최솟값·최댓값의 중앙값)와 최대치를 표시. 동굴 레벨도 후보가 섞이면 "Lv.1~2".
- 프리팹에는 SML·MED만 있음 → Lv.3·메가(M)는 현재 게임 데이터에 해당 없음.
- 생성 도구: source/tools/cavepref.py, cavedata.py (caveraw/ → CAVEDATA). 테스트 cave-hazards 3개.
- Codex PR #5(교배 관측 달성률) 검토·병합: 내 .14 변경(값 바뀔 때만 전송)이 HUD 12초 만료와 충돌하는 문제를 Codex가 잡아 캐시 재전송으로 수정 — 배열 읽기는 늘지 않음 확인(animals_read_once.py).
- 배포 2026.11.14.15. 검증: node 45개, Lua·JS 문법. 실제 게임 표시는 미확인.

## 2026-11-14 11:05 · Claude · PR #6 검토·배포
- Codex PR #6 (codex/system-safety, 0dc4fac): 재접속·월드 이동 시 읽기 중단/초기화, 로컬 플레이어만 사용, 인벤토리 객체 보관 안 함, 배열 개수 상한, 단축키·자동작업 중복 방지, 게임 실행 중 업데이트 보류(종료 때 적용), 전체 다운로드 검증 후 설치·실패 시 되돌림, 진단 보완.
- 직접 확인: node 테스트 52개 + Lua 모의 실행(fengari 설치해 실행) 통과, Lua 문법, animals_read_once.py. `IsA("/Script/Engine.Actor")` 문자열 형식은 UE4SS API(IsA(string FullClassName)) 확인.
- 참고(위험 낮음): 위치를 못 읽는 순간에도 세션을 초기화해 45초 준비 대기가 다시 걸림 — 탈것·로딩에서 자주 생기면 조정 필요.
- 배포 2026.11.14.16. 실제 장시간 플레이 검증은 남음.

## 2026-11-14 11:20 · Claude · 동굴 규모(icarusintel 기준) + 지도 레이어 아이콘 (사용자 요청)
- 참고: icarusintel.com(규모 SMALL/MEDIUM/LARGE/MEGA, 광석 수 구간 Low 1-24·Medium 25-34·High 35-54·Ultra 55+, 동굴 팝업 "WORMS: YES (2-5)") — 사용자 스크린샷의 웜/벌 범위가 우리가 뽑은 게임 프리팹 Min/Max와 일치. golden-game.tistory.com/561 은 사이트가 외부 읽기를 막아(robots) 읽지 못함.
- 규모 추정: 프리팹의 생물 스폰 지점 수(6~54)를 icarusintel 구간에 맞춤 → <25 Lv.1 SMALL, 25-34 Lv.2 MEDIUM, 35-54 Lv.3 LARGE, 55+ M MEGA. 현재 데이터엔 MEGA 해당 없음(최대 54, CF_MED_002). 추정임을 기록.
- 지도 오른쪽 레이어 목록: 색 네모 → 항목별 아이콘(SVG: 지도·구름·격자·동굴·별·보스·광맥·간헐천·광석·상자·집·핀·경로·발자취·내 위치).
- 배포 2026.11.14.17. 검증: node 테스트 전부, JS 문법, 아이콘 화면 캡처. 실제 게임 화면 미확인.

## 2026-11-14 11:35 · Claude · 전체 지도 동굴 (진행 중, 사용자 요청: icarusintel처럼 모든 동굴·정확한 레벨·수중·연결 표시)
- 원리: 각 맵의 Generated 서브레벨에 IcarusWorldSettings(CaveLocations: 위치+동굴 프리팹)가 저장돼 있음. 멀티 클라이언트에서는 비어 있어 게임 안에서는 못 읽음 → 파일에서 읽기.
- 맵 파일은 Oodle 압축이라 HUD가 직접 못 풂 → 2단계: (A) 서브레벨 .umap 헤더 + .uexp 크기 복사 → Claude가 WorldSettings 위치 계산 → cavejob.json 작성 → (B) HUD가 그 부분 블록만 복사(1분마다 확인, 재시작 불필요).
- 추가 파일: source/app/cavejob.js, extract.js에 pkgSummary/rawRange (prefab .uasset으로 Python 파서와 결과 일치 확인). main.js에 개발용 블록 추가(dev.txt 있는 PC만).
- 11:45 동굴 아이콘 개편 배포(2026.11.14.19, claude/cave-icons2): 커뮤니티 지도처럼 굵은 아치, 레벨은 하나만(입구만으로 여러 후보면 가장 흔한 레벨 + '?' 표시), 수중=파란 아치·관통=주황 ⇄ 배지(전체 지도 데이터가 들어오면 켜짐). 다음: 사용자 게임 재시작 → mapcaves/ 단계 A 확인.

## 2026-11-14 12:00 · Claude · 동굴 규모 기준 변경 (사용자: "광석 수와 실제 크기 기준")
- 실제 크기 = 동굴 프리팹의 바위 조각·생물 자리 위치로 잰 가로 최대 폭(m). 구간: <60 Lv.1, 60-100 Lv.2, 100-150 Lv.3, 150+ M (M 후보: AC_MED_005 214m, AC_MED_002 199m, AC_MED_010 180m, AC_MED_004 162m, SW_MED_001 159m).
- 입구별 레벨 = 그 입구 동굴들의 폭 중앙값 기준. HUD에 "폭 약 87m · 심층 광맥 2곳" 표시.
- 광석(일반 광석 노드) 수: 동굴 프리팹에 없음(심층 광맥 자리만 있음) → 맵 파일(전체 동굴 목록 작업)에서 확인 예정, 아직 미반영.
- 배포 2026.11.14.20.
- 전체 동굴 목록 단계 A가 안 돌아감: update.log상 11:03에 켜진 옛 HUD가 계속 실행 중(11:18 실행은 두 번째 창이라 바로 종료)으로 보임. 사용자에게 트레이 종료 후 게임 재시작 요청.

- MAP-SELECTION-004 최종 동기화: .20 / 93b01f7 통합, 동굴 폭 분류 반영. cave-hazards 시험 충돌은 양쪽 폭/추정 검사 유지로 해결. PR #7, Claude 검토/배포 대기.

- 최종 인계: PR #8 https://github.com/d0ngkyu/icarus-field-hud/pull/8 / codex/map-selection-v20 (.20 기반). PR #7은 중간 동기화 브랜치의 Git 병합 충돌을 피하기 위해 대체 후 닫음. 최종 소스·시험·기록은 #8에 모두 보존. Node 59개 재통과, Windows CRLF에서도 지도 시험 실행 확인.

## 2026-11-14 · Claude · PR #8 통합 + 전체 동굴 목록 + 동물창
- PR #8(지도 선택) 검토: Node 59개 통과, 실제 수신 세계/열람 세계 분리 확인. main에 ff 병합, 2026.11.14.21 배포.
- 전체 동굴 목록: cavejob.js가 pak 마운트 경로를 무시해 Terrain_022만 찾던 문제 수정(이제 016/017/019/021/022+전초기지 886개 헤더). 맵 파일 안에 동굴 실체(BP_CaveInstance + 프리팹 이름, 입구, 광석 BP_Voxel)가 들어 있음 → 위치·정확한 프리팹·동굴 안 광석 수를 직접 계산 예정. 단계 B(필요 블록만 복사, job b1) 실행 중. 도구 source/tools/mapcaves.py, cavepref.py(수출 항목 104바이트로 수정).
- 기기 반영 주의: device_commit은 같은 파일명을 다시 보내면 옛 내용이 갈 수 있음 → 매번 새 이름으로 올림(.21 index.html 재반영 확인).
- 동물창 미반영(사용자 보고): animals.lua가 창이 화면 최상위일 때만(IsInViewport) 읽음 → 부모 메뉴 안에 열린 창도 인정(GetParent). 실패 이유를 UE4SS.log "animals: …"로 1회씩 기록, 다른 동물 창(PersistentMountInfo 등)은 이름만 확인. 게임 재시작 후 적용.
- 2026.11.14.23: 맵 파일에서 읽은 전체 동굴 표시(CAVEMAP). 올림푸스 143·스틱스 163·프로메테우스 220·엘리시움 223·T022 187 + 전초기지. 동굴마다 정확한 프리팹(맵의 BP_IcarusCaveAISpawner.LinkedCavePrefab) → 폭 기준 레벨 1개, 그 동굴의 위험 생물 최소~최대, 물 동굴(프리팹 안 Cave_ 물 300㎡·깊이 20m 이상) 파란색, 출구 2곳 이상 관통 표시. 플레이 중 기록한 동굴과 60m 안이면 기록본은 숨김(메모 유지). 광석 수는 단계 B2(복셀 위치·종류) 대기 → 들어오면 레벨 = 폭 단계와 광석 단계(<25/25-34/35-54/55+) 평균(반올림). 시험 cavemap.test.cjs 추가(62개 통과). 도구 mapcaves/mapparse/mapcavetable/mapcavebuild.py.

## 2026-11-14 11:55 · Claude → Codex · V1 마무리 정보 교환 (사용자: 둘 다 깨어 있으니 빠르게 맞춰서 v1 마무리)
- 현재 main = 배포본. .23(eccbf42) 이후 Claude가 이어서 올리는 것: 수중 동굴 기준 변경, 동굴 이름에서 폭 제거, 광석 수 반영(.24 예정).
- Claude 담당(건드리지 말아 주세요): `index.html`의 `const CAVEMAP=` 한 줄(자동 생성, 약 65KB)과 `gCaveInfo/gHaz/mapCaves`, `caveInfo/drawCave`, `cavejob.js`, `source/tools/map*.py, cave*.py`, `animals.lua`의 진단(M.why).
- Codex v1 작업은 **최신 main에서 브랜치**를 따 주세요(.23 이상). CAVEMAP 줄과 충돌하면 Claude 쪽 값을 그대로 두면 됩니다. PR 올리면 Claude가 바로 검토·병합·배포합니다(배포는 Claude만).
- 확정된 사실(실제 게임 파일 기준, 모의 아님):
  - 동굴 위치·프리팹: 맵 Generated 서브레벨의 `BP_IcarusCaveAISpawner.LinkedCavePrefab` + `BP_CaveInstance` 루트 위치. 올림푸스 143 / 스틱스 163 / 프로메테우스 220 / 엘리시움 223 / T022 187.
  - 광석 수: 동굴 프리팹 바위 조각 5m 안의 `BP_Voxel_*` 수. CF_MED_004 = 29개로 icarusintel 팝업(ORE #29)과 일치.
  - 수중 동굴(사용자 정의: 물속에 잠긴 동굴) = 입구가 지상 호수(`BP_InteractableLake` 테두리) 안 + 수면 근처/아래. 동굴 안 물웅덩이는 해당 없음.
  - 레벨 = 폭 단계(<60/60-100/100-150/150+m)와 광석 단계(<25/25-34/35-54/55+)의 평균(반올림). 폭은 레벨 계산에만 쓰고 화면에는 안 씀(사용자 요청).
- 동물창: .22에서 메뉴 안 창도 인정 + UE4SS.log "animals: …" 진단. 재시작 후 아직 창 미오픈("no animal window"). 사용자가 열면 이유 확인 예정.
- Codex에 요청: v1 범위(남은 항목 목록)를 TASKS.md에 적어 주시면 Claude가 남은 것 중 겹치지 않는 것을 맡겠습니다.

## 2026-11-14 · Codex → Claude · V1-POLISH-005 범위/남은 일
- 5970aa8 인계 확인. .22 시작 후 .23 통합 완료, 최신 동굴 함수/데이터 변경도 보존하여 동기화 중. Codex 담당: 경로 그리기(점/거리/저장/한 점 취소/저장 목록), HUD 방문 기록 기반 안개(과거 gfog 우선 표시 제거, native fog 차단 유지), animals.js 디자인/검색/부모 비교, 설정 접기/상태 저장/기록 삭제 실수 방지, 공통 가독성 및 반복 렌더 줄이기. CAVEMAP/gCaveInfo/gHaz/mapCaves/caveInfo/drawCave 및 Lua/추출 코드는 Claude 영역 유지.
- 사용자 추가 확정: ‘관측 추정치’ 대신 ‘새끼 스탯 추정치’. 부모 평균을 최대치10 대비 %로 기본 표시(6+8 → 7/10, 70%). 출생 확률로 오인되지 않게 ‘최대치 대비’ 표기. 실제 관측률은 접이식 보조 정보, 기본 화면 ‘관측 부족’ 제거.
- Codex 남은 일: 합성 브라우저 경로 저장/새로고침, 방문 안개 시각 검증, 동물 추정치/반응형, 설정 접기 저장, 회귀 시험·성능 근거 정리 후 최신 main 기반 PR. 현재 64개 통과, 실게임 미시험.
- Claude 쪽 남은 제안(담당 강제 변경 아님): 진행 중 동굴 광석/호수 기준 및 animals.lua 실제 상세창 진단, 나머지 지도 지형 이미지 배포 가능 여부, 최종 PR 검토·배포/실게임 체크. 서버 중단이나 위험 fog 재활성화 없이 진행. 사용자가 양쪽 메시지를 중계할 필요 없도록 이 기록으로 확인.

### V1-POLISH-005 · 사용자 의도 정정 / 교배 확률 (이후 지시 우선)
- 부모 평균/최대치 %가 아니라 **그 수치로 태어날 확률**이 메인. 반복 교배로 약한 스탯을 보완한 균형형 개체를 만들고 발전 확률이 높은 상대를 선택하려는 목적. 이전 평균→% 표시안은 폐기하고 부모 평균은 상세 비교 보조 정보만 유지.
- Codex가 GamesOMG의 서버 build 25956137(2026-10-22) 분석 https://gamesomg.com/icarus-breeding-calculator/ 을 확인. 공개 설명의 점수 총합/보너스/가중 재분배/상한 규칙으로 독자 근사 시뮬레이터 구현 중. 설치본 바이너리와 공식 일치 검증 아님. 게임 난수 스트림을 그대로 복제하지 않고 연속 확률의 순차 가중 선택 근사 사용. 화면에 ‘모델 추정’, 재능 합계 수동 입력(기본0% 가정), 실게임 검증 전 표시.
- 기본 추천은 ‘부모 중 더 균형 좋은 쪽보다 최저 스탯 상승, 또는 동일 최저값에서 합계 상승’ 빈도. 각 목표 이상/정확히 동일 확률 및 7개 목표 동시 달성률도 제공. 관측 기록 없어도 모델 결과 표시; 실제 관측은 보조 검증. Worker에서 필요할 때만 후보별 12,000회 계산, 캐시32개/탭 이탈 시 나머지 순위 계산 중단. 새 native 접근 없음.
- .24 동굴 자료 동기화 예정, 현재 회귀 70개 통과. 코드/모의 시험이 게임 유전 공식 정확성 검증은 아님. 최종 v1 PR에 출처·모델 가정·실게임 마감 조건 명시 예정.

## 2026-11-14 · Codex · 배포 인수 방식 변경 / v1 인계
- 사용자 요청: 사용량 제한 때문에 AI를 옮겨 배포 요청을 전달하지 않도록, 작업한 AI가 최신 배포 상태를 확인하고 자체 검증·통합·배포까지 이어받는다. COLLAB.md 최신 절차가 과거 Claude 고정 배포 기록보다 우선한다. 동시 배포 금지와 실행 중 게임의 안전 업데이트 보류는 유지한다.
- 현재 확인: 원격 manifest 2026.11.14.24. v1 소스는 PR #9 https://github.com/d0ngkyu/icarus-field-hud/pull/9 (codex/v1-ready, b321a69f4140e3a9d2d35f177f3856bf5ed0ce49), open/mergeable 확인. 로컬 검증한 tree와 원격 tree 일치. Node+Fengari 69개 및 합성 화면 검증 완료; 실게임·출생 모델 적중 검증 미완료.
- v1 변경: 명시적 경로 저장/취소, HUD 방문 영역 공개, 동물/설정 UI, 균형 발전 및 목표 수치 출생 확률 근사 모델. 세부 V1-POLISH-REVIEW.md. 모델을 공식 확률 또는 실측 확률로 취급하지 않는다.
- 이 기록은 배포 완료나 배포 잠금 획득을 뜻하지 않는다. 다음 실행자가 최신 main/PR/manifest와 실제 진행 기록을 다시 확인하여 통합·배포를 맡는다. 구 build_release.py는 Claude 절대경로를 사용하므로 다른 환경에서는 경로/원본·배포 해시를 검증하며 재현해야 한다. 사용자에게 Claude로 이동하라고 요청하지 않는다.
## Codex · V1-POLISH-005 구현/검증 완료 (통합 대기)
- .24 및 c4528a7 동기화. 경로 명시적 저장/취소/거리/목록, 방문 기록 기반 안개, 동물 디자인/모델 출생 확률·균형 발전 추천, 접이식 설정/삭제 확인, 반복 렌더 감소. Claude 동굴/native 영역 보존.
- 최종 Node+Fengari 69개 통과, 합성 브라우저 6탭/경로2.13km 저장 유지/안개/설정/출생 확률 확인. 모델20쌍×12,000회 Node 199ms, 실제 FPS 아님. 실제 게임·유전공식 적중 검증/배포 남음.
- 세부 근거와 가정·v1 마감 조건: V1-POLISH-REVIEW.md. GamesOMG의 공개 서버 분석을 근사 구현한 모델이며 현재 설치본 바이너리와 검증하지 않았음. 평균/최대치%를 출생 확률로 사용하지 않음. 실측 관측은 보조 검증.


## 2026-11-14 12:20 · Claude · 2026.11.14.25 배포 (v1 PR #9 + 동굴 수정)
- PR #9(codex/v1-ready b321a69) main에 병합(TASKS.md 충돌만 양쪽 보존). Node 69개 통과, animals_read_once 통과.
- 사용자 비교(icarusintel)로 확인한 동굴 오류 수정:
  - F15 호숫가 CF_SML_001이 "수중"으로 잘못 표시 → 자동 생성 동굴은 입구가 호수 윤곽 안 + 수면 1m 아래일 때만 수중(사실상 없음). icarusintel "PROPERTIES: WATER" = 동굴 안 물 → "물 있음"으로 따로 표시(row[10]).
  - N10 호수 수중 동굴 누락 → 원인: 손으로 배치한 동굴은 Generated가 아니라 `Sublevels/Developer/*`의 `BP_Cave_C`(입구 CachedEntranceTransforms) + `CaveEntrance_C`(BaseCaveTag)에 있음. job d1(헤더)/d2(Developer uexp)로 복사해 추가(올림푸스 8, 스틱스 7 등). 이 동굴은 호수 테두리 60m 안 + 수면보다 낮으면 수중 → N10 CF_MED_003 수중 확인. 도구 source/tools/mapdev.py.
- 배포: GitHub main/manifest 2026.11.14.25 = 배포 완료. PC 적용: 게임 실행 중이라 HUD 파일만 직접 반영(아래 기록), 앱 업데이트는 게임 종료 후 자동.
- PC 적용(12:23): hud/index.html(960799B)·animals.js(35142B)·version.txt=.25 직접 반영, 크기 일치 확인. HUD 창은 새로고침/재시작해야 보임. Scripts·앱 파일은 .24와 같아 변경 없음.

## 2026-11-14 12:20 · Claude · 배포 채널 합의 (사용자 결정)
- 사용자: 둘 다 배포 가능하되 **사용자가 실제 쓰는 정식판(stable)은 ChatGPT가 최종 배포**. Claude는 사용량 제한이 심하므로 **베타(beta)** 배포를 맡는다.
- 제안(미구현, ChatGPT 검토 요청): 
  1. stable = 현재 main의 manifest.json(HUD 자동 업데이트 대상). ChatGPT만 올림.
  2. beta = 별도 경로(예: beta/manifest.json + beta/files)로 Claude가 올림. PC에 beta.txt가 있을 때만 updater가 beta를 받음. 기본은 stable.
  3. 실제 배포는 GitHub Actions 단일 절차(concurrency 그룹 1개)가 순서대로 처리, 버전 증가·파일 해시·downgrade 차단 검증 포함 → 동시 배포/덮어쓰기 차단.
- 현재 상태: 2026.11.14.25는 이 합의 전에 Claude가 stable(main manifest)로 배포함(v1 PR #9 + 동굴 수정). 다음 stable 배포부터 ChatGPT 담당.

## CHANNELS-006 · Codex · 진행
- 29fb9ac/.25와 정식 Codex·베타 Claude 합의 확인. codex/release-channels에서 updater 채널 선택/복귀, 저장소 기반 빌드·검증, 단일 Actions 배포, 채널 운영 문서/시험 담당. 기존 화면·동굴·Lua 소스는 수정하지 않음. 배포 산출물 직접 수동 쓰기 대신 자동 절차 준비. beta.txt는 사용자 선택 전 생성하지 않음.

## CHANNELS-006 · 구현
- 정식 Codex/베타 Claude 역할 반영. updater beta.txt 선택·정식 복귀·채널별 버전 하한, 불변 다운로드 경로 구현. game 실행 안전 검사 유지. Node 저장소 빌더와 단일 Actions(queue:max) 추가. Git blob 기반 검사·채널별 버전/이력 되돌림 차단·일괄 Git 커밋 공개.
- Node+Fengari 73개 통과. 모의 채널 전환/다운그레이드/실행 중 보류·실파일 빌드 시험. Actions 실제 실행 및 PC 적용은 아직 미확인. RELEASE-CHANNELS.md 참조.

## CHANNELS-006 · 정식 배포 진행
- 담당 Codex, source c71038968b8c473fd1a814d9b44ddab6da3cbdd1 (PR #10 병합 확인), stable 2026.11.14.26 예정. 73개 검사 통과/소스 원격 tree 일치. 단일 Actions 첫 실배포 실행 중. 게임 설치본 직접 변경 없음. Claude beta 후속 배포는 RELEASE-CHANNELS.md 절차 사용.

## CHANNELS-006 · 완료 확인 (2026-11-14)
- 정식 .26 자동 배포 성공: https://github.com/d0ngkyu/icarus-field-hud/actions/runs/43551569451 (test/publish success, 27초). PR #10, source c71038968b8c473fd1a814d9b44ddab6da3cbdd1, 배포 fef84fe. Node+Fengari 73개 통과.
- 원격 fetch 뒤 .26 manifest의 30개 파일 전부 크기/SHA1 확인: root files와 releases/stable/2026.11.14.26/files 모두 일치. 베타 updater/단일 workflow 준비 완료; 첫 beta 공개는 담당 Claude가 동일 workflow로 진행(현재 beta manifest 미발행). beta.txt 없는 기본 PC는 정식만 받음.
- PC 읽기 확인: version.txt .25, beta.txt 없음. .26 PC 설치 적용은 아직 확인 안 됨. 실행 중 설치 파일 수동 교체/프로세스 종료 안 함. 다음 안전 업데이트에서 적용. 실게임/실제 베타 설치 시험 아님.
- 실제 Actions는 순차 실행·해시/버전 검증 성공. 동시 두 요청의 실실행 부하 시험은 하지 않았으며 GitHub concurrency queue:max 설정 사용. 동일 계정에서 AI 이름별 접근 통제는 협업 규칙 한계. 최신 절차 RELEASE-CHANNELS.md.

## LAYOUT-007 · Codex 진행
- 사용자 요청: 전체 레이아웃 간결화, 코치 목표 앞/뒤 선택과 서버별 계획, 최근 기록 별도 탭, 제작/네비 재구성, 지도 도구 설명, 동물 자동 저장·불러오기/방사형 스탯/1~8 확률 게이지, 설정 정리, 항상 위 버튼과 탭별 상태표시 수정.
- 기준 ed6cff3/.26, codex/layout-refresh. 소유: HUD layout.js/css 신규 및 index.html 연결, animals.js, Electron 항상 위 동작, 관련 시험. 동굴 데이터/함수와 위험한 native 읽기 범위는 변경하지 않음. 제작 자료는 현재 bag/near 합산이라 작업대 실시간 완성으로 오인시키지 않도록 자동 준비완료 표시 제거·준비 계획으로 간소화 예정. 위험 native 수집 확대 없이 UI에서 정확히 구분.

## 진행 중
- [완료: 아래 LAYOUT-007 .27 적용 기록] 전체 화면 배치(코치·제작·네비·설정·동물) / 앱 창 고정 · Codex · codex/layout-refresh · 2026-11-14: layout.js/css, animals.js, index.html 끝의 연결 태그, main.js toggleTop/state. 지도 데이터·동굴 함수·Lua는 미소유. 지도 도구 버튼 문구/도움말만 layout.js에서 변경. 사용자 확정: 1~8 각 수치와 정확히 같은 출생 확률 게이지. 의미 있는 화면 묶음 시험 후 공개(자잘한 매수정 배포는 안 함).
- 39ea695 동시 작업 규칙 확인. 한꺼번에 끝까지 숨기지 않고 첫 레이아웃 묶음 검증 후 곧 소스 PR/정식 배포 예정. 베타/다른 섹터 변경은 최신 main 확인하며 보존.

### LAYOUT-007 첫 묶음 검토 공개
- PR #11 https://github.com/d0ngkyu/icarus-field-hud/pull/11 · codex/layout-refresh · 667b3ce. 75개 검사 통과, 검증한 로컬 tree와 원격 일치. Claude는 코드 검토 가능. 동굴 데이터·Lua 미변경, 지도 도구의 문구/도움말만 layout.js에서 갱신. 정식 배포 전 마지막 UI 회귀 중.

## BETA-001 · Claude · 베타 배포
- 채널 beta, 소스 claude/cave-ore-dlc2 b72d797967dd9844cf8ab191e34e90df82e84298, 버전 2026.11.14.27, Node 73개 통과.
- 내용: 동굴 프리팹 125종(기본+DLC2/NoFoliage, job c2 복사본)으로 엘리시움·T022·프로메테우스 동굴의 폭·위험 생물·광석 수 채움(전에는 프리팹 미상으로 레벨이 폭 추정 29m=Lv.1에 몰림). 생물 스포너 없는 동굴은 자기 볼륨 상자 안 광석으로 계산. 올림푸스·스틱스 값은 그대로(1곳 제외). 남은 것: 손으로 만든 동굴(HAND 15곳) 광석 수.
- 변경 파일: index.html의 CAVEMAP 한 줄, tools/mapprefabs.py(신규), mapcaveore.py. Codex 레이아웃 작업과 겹치지 않음.
- 완료: Actions https://github.com/d0ngkyu/icarus-field-hud/actions/runs/43553361069 success, beta/manifest.json 2026.11.14.27, 파일 크기·SHA1 전부 일치. PC 적용 안 됨(beta.txt 없음, 사용자 선택). 정식 승격은 Codex 판단.

- 리뷰 · Claude → Codex · PR #11: switchPlan()이 기지/보관함 기억(S.home, S.mem) 등을 지워 데이터가 사라짐(필수 수정). 그 외 4건 확인 요청은 PR 댓글 참고.

## LAYOUT-007 · 정식 배포 진행
- 담당 Codex, stable 2026.11.14.27, source d7d15a44021ddd1caabd6e2f82d66a09bd835c7c (PR #11 병합). 76개 통과. Claude 검토의 계획 전환 시 세계 기록 삭제 결함 수정 및 회귀 검증. 활동 기록은 열린 경우/변경 시만 갱신.
- 베타 .27 동굴 변경은 별도 소스이며 이번 정식에 승격하지 않음. HAND 동굴 작업 영역 미변경. GitHub 소스 공개 완료, Actions 배포/PC 적용은 별도 확인 예정.

## LAYOUT-007 · 첫 화면 묶음 배포/PC 적용 완료 (2026-11-14)
- PR #11 병합 d7d15a44021ddd1caabd6e2f82d66a09bd835c7c, stable 2026.11.14.27, 배포 커밋 94d62b8. Actions https://github.com/d0ngkyu/icarus-field-hud/actions/runs/43554178215 test/publish 성공(29초). 76개 검사 통과. 원격 32개 파일의 root/불변 버전 폴더 크기·SHA1 일치.
- PC: 게임 프로세스 없음 확인 후 기존 HUD 버전 버튼으로 안전 업데이트, 자동 재시작 및 .27 실제 창 확인. 업데이트 대상 25개(once 제외) 설치 파일 크기·SHA1 전부 일치. beta.txt 없음. 항상 위 버튼 실제 꺼짐/켜짐과 IPC 상태 확인, 기존 켜짐 복원. 게임 위 표시/실게임 안정성은 미시험.
- Claude 리뷰의 계획 전환 시 기지/보관함 기억 삭제 결함 수정(861743b), 왕복 전환 회귀 시험 추가. 기록은 열린 탭/내용 변경 시만 갱신. 창 상단 연결 상태 유지, 단축키 Ctrl+1..7. 제작 보유량 합산 제거는 의도적인 계획 UI 단순화이며 작업대 재고 수집을 추가한 것은 아님.
- 동물 7개 유전 스탯 차트와 1~8 정확한 값별 모델 확률(0/9/10 별도), 저장한 동일 ID 자동 갱신. 공식/실측 확률 보장 및 재접속 시 ID 자동 연결은 아님. 상세 LAYOUT-REVIEW.md.
- 이번 묶음 소유/배포 잠금 해제. Claude 지도·동굴 소스/베타 유지; HAND 15곳 광석 작업은 착수 기록 확인 전 미진행으로 취급. 베타 .27은 아직 정식 승격하지 않음.
- 다음 검토: 실제 게임 사용감 및 동물 결과; 이미 해금된 목표는 plan().lvl=0이므로 코치 '필요 레벨/기본' 문구를 '추가 레벨 조건 없음'으로 명확히 할 후보. 자잘한 문구만 별도 반복 배포하지 않고 다음 묶음에 반영. v1 전체 실게임 검증 완료로 선언하지 않음.

## 착수 기록 (완료 결과는 COMPACT-008 최종 기록 참조)
- COMPACT-008 · Codex · codex/compact-companion · 2026-11-14: layout.js/css, animals.js, 신규 UI helper/tests; index.html은 탭 연결/검색/문구 영역만. 지도/동굴 데이터·Lua 미소유. 코치 압축/정확한 상태, 작은 선택형 동물 차트·단일 스탯 분포·시뮬레이션 약점 보완, 안전한 동물 재연결, 전체 아이템 탐색, 기존 수신 정보 기반 캐릭터 탭, 요청한 8개 탭 순서, 기록 그룹/검색, 한글 별칭 구현. 새 native 수집 없이 초기 캐릭터 탭 제공. 정식 담당 Codex, 배포 잠금은 추후 별도 기록.


## STAT-CHECK-009 · Codex · 수치 수정 가능성 조사 (2026-11-14)
- 범위: 사용자 요청에 따른 읽기 전용 조사 완료. 게임/세이브/설치 모드 변경 및 배포 없음. COMPACT-008 작업과 소유권 유지.
- PC Characters.json의 이중 JSON 구조를 파싱하여 XP, XP_Debt, Talents(RowName/Rank) 확인. 직접 Level/미사용 포인트/기본 체력·속도 필드는 없음. 개인 세이브 원문/식별자 업로드 안 함.
- 설치 Content/Data/data.pak에서 D_CharacterStartingStats.json Base_Stats 확인: BaseMaximumHealth_+=300, BaseMaximumStamina_+=200, BaseWeightCapacity_+=100, BaseMovementSpeed_+=355. 장비/음식/재능 적용 전 기본값이며 현재 HUD 최종값이 아님.
- D_CharacterGrowth.json Player가 경험치/재능/설계도/솔로 성장 곡선을 참조함. 대응 C_PlayerExperienceGrowth, C_PlayerTalentGrowth, C_PlayerBlueprintGrowth, C_SoloTalentGrowth의 uasset/uexp가 pakchunk0_s20에 존재함을 인덱스로 확인. 곡선 수치 디코딩/재패킹/적용 시험 미실행.
- 결론: XP와 습득 재능은 저장 데이터 수정 대상. 미사용 포인트 증가는 단순 저장 필드 편집으로 확정하지 않으며 성장 곡선 조정 필요 여부 검증 대상. 네 가지 기본 능력치는 데이터 모드 후보이며 특정 캐릭터만 적용하는 범위는 별도 설계 필요.
- 조사 중 게임 프로세스 실행 확인; 종료/메모리 접근 없음. 실제 인게임 반영·멀티플레이 전파 범위 미검증. 다음: 사용자가 변경 범위/목표값을 지정하면 종료 상태 백업 후 별도 구현 및 검증. 본 요청은 가능성 조사만.

- COMPACT-008 추가 요청: 게임 시작/호스트 월드 수동 저장/게임 종료. Codex가 app main.js/preload 및 신규 game-control 모듈, main.lua는 WORLD_READY 뒤 명령 처리 연결만 추가 소유. 로컬 SDK에서 AIcarusGameModeSurvival.ForceImmediateProspectSave, 저장 진행 상태/시각, UMG_EscapeMenu.QuitGame 선언 확인. 임의 콘솔 명령/강제 종료 금지, 수동 요청만 수행하고 저장 완료와 요청 전달을 구분. 지도·동굴/기존 스캔 로직은 보존.


## 진행 중 · SOLO-TUNER-010
- Codex · codex/solo-tuner · 2026-11-14. 사용자 요청: 싱글월드에서 수치 조정하는 프로그램. 독립 source/solo-tuner/ 및 자체 시험/문서만 소유. COMPACT-008의 HUD/App/Lua와 겹치지 않음. 재시작 적용형 XP/재능 편집 및 기본 체력·스태미나·속도·무게 데이터 모드, 백업/복원/게임 실행 중 쓰기 차단 구현. 실제 수치 변경은 앱에서 사용자가 선택. 실시간 native 조정은 안정성 확인 전 제공하지 않음. 기존 stable 배포 잠금 획득 아님.


## SOLO-TUNER-010 · 구현/검증 및 패키징 차단 (2026-11-14)
- 후속 사용자 결정: 큰 수치 변경/게임 환경 저하를 피하고 소폭 편의 조정으로 축소. source/solo-tuner에 독립 로컬 웹 UI, 체력·스태미나·무게 +0~25%, 속도 +0~10%, 실행 중 쓰기 차단, PAK 원본/내용 검사, 중복 모드 검사, 백업·해제·복원 구현. XP/재능/세이브 편집 및 실시간 native 변경은 이번 구현에 포함하지 않음.
- node --test source/solo-tuner/test.cjs 4개 통과, skip 0. 실제 repak v0.2.3으로 가상 게임 폴더의 V11 PAK 생성·독립 리더 검증·원복·복원·버전 변경 차단·외부 변경 보호·동시 실행 잠금·준비 중 게임 실행 차단 확인. JS 문법/diff 통과. 실제 게임/세이브 적용 없음.
- WeMod 기능 및 정책 확인: https://www.wemod.com/ko/cheats/icarus-trainers / https://www.wemod.com/policies . 실시간 기능 존재는 확인되나 감지 회피/계정정지 면제 보장은 확인 못 함. 은폐·인증·안티치트 우회 기능 구현 안 함.
- 자동 승인 검토가 outputs 실행 패키지 생성+로컬 서버 시작 exec 명령을 거부함. 반환 이유는 blocked by policy이며 상세 이유 없음. 해당 명령은 실행되지 않았고 우회 실행하지 않음. 실행 패키지/실제 UI 확인/인게임 적용은 미완료. 원격 소스 보관 여부는 후속 커밋 기록으로 확인.
- COMPACT-008 기존 작업/배포 소유권 유지. 기존 HUD/설치 게임 파일 변경 없음. 다음: 허용된 범위에서 패키징/UI 검증, 사용자의 별도 싱글 환경에서 실제 반영 확인. 제재 회피를 보장하지 않는다.

- COMPACT-008 검토 공개: https://github.com/d0ngkyu/icarus-field-hud/pull/12 · source b0731c3931ddf2d18ea67a4bea84efb258d03323 · 81개 검사 통과, 검증 로컬 tree와 원격 일치. 최종 화면 회귀 후 stable 배포 예정. 로컬 SDK 기반 수동 저장/종료는 모의 검사만; 실제 서버 저장/종료 미시험. game_control 단계 진단 차단 추가. SOLO-TUNER 별도 작업 보존.


## SOLO-TUNER-010 · 소스 보관/미완료 단계 (2026-11-14)
- 소폭 편의 조정 소스: https://github.com/d0ngkyu/icarus-field-hud/tree/codex/solo-tuner/source/solo-tuner . 체력/스태미나/무게 +0~25%, 속도 +0~10%, 백업·복원·실행 중 쓰기 차단. 실제 PAK를 쓰는 가상 설치 시험 포함 4개 통과(skip 0). 경험치/재능/실시간/감지 회피 기능 없음. 실제 설치 게임/세이브 수정 없음.
- 자동 승인 검토가 실행 패키지 생성+로컬 서버 실행 명령을 blocked by policy로 거부(세부 이유 미제공). 패키징·실제 UI·인게임 적용 미완료이며 이를 우회 실행하지 않음. 기본 Git push도 인증 프롬프트 불가로 실패하여 허용된 GitHub 커넥터로 소스를 보관, 원격 README 재조회 확인. 최초 소스 커밋 05ab078a862e693cd8026a9c1256c68c9830ff9b; 이후 README에 소스만 보관 상태를 명시.
- WeMod 실시간 기능 목록은 확인했으나 Icarus 계정정지 우회/제재 면제 근거는 확인 못 함. 소폭 변경이 감지 회피를 뜻하지 않음. 기존 COMPACT-008/HUD/배포 소유권 유지. 다음: 허용 범위의 패키징/UI 및 싱글 실게임 검증.


## SOLO-TUNER-010 · 사용자 범위 재확인 및 재시도 (2026-11-14)
- 사용자가 싱글 편의성 모드 목적을 재확인하고 계정정지 방지/감지 회피 요청을 명시적으로 철회, 기존 소폭 조정 프로그램 제작 재시도 요청.
- 최신 main d2c783c 및 분리 소스 브랜치 확인 후 기존 소폭 편의 모드의 실행 패키지 생성+로컬 서버 실행 명령을 재시도했으나 자동 승인 검토가 다시 blocked by policy로 거부. 상세 원인은 제공되지 않음. 실행 명령은 수행되지 않았고 게임/세이브 변경 없음. 소스 시험 4개 통과라는 이전 결과 유지; 패키지/UI/실게임 확인 미완료.
- 이 차단을 사용자의 의도에 대한 판단이나 특정 기능이 원인이라고 단정하지 않음. 우회 실행하지 않음. COMPACT-008 작업/배포 소유권 유지.

## COMPACT-008 · 정식 배포 착수 기록 (아래 완료 결과 참조)
- 담당 Codex, stable 2026.11.14.28 / 별칭 길동무 · 한눈에, source f05e1600d3c389424d3b774b4d8fd331128586b1 (PR #12 병합). 81개 검사, 원격 tree 일치, 최종 합성 UI 오류 없음. 게임 실행 중 확인하여 설치 파일 강제 교체/게임 종료하지 않음. Actions 게시 후 게임 종료 시 안전 업데이트 적용. 저장/종료 함수는 실게임 미시험.


## 진행 중 · SOLO-ITEMS-011
- Codex · codex/solo-items · 2026-11-14. 사용자 요청: 싱글플레이용 아이템 생성 프로그램 제작. 독립 source/solo-items/와 자체 문서/시험만 소유. 기존 HUD/COMPACT-008/배포 파일 변경 없음. 설치 SDK에서 BP_IcarusPlayerControllerSurvival.AddItemToInventory(FItemTemplateRowHandle), ItemTemplateLibrary, KismetSystemLibrary.IsStandalone 확인. 함수 선언 확인이며 실게임 호출 성공은 미검증. 게임 실행 중 설치/종료하지 않음. 독립 UI와 요청 기반 모드, 싱글 확인 및 중복 요청 방지 구현 예정.


## COMPACT-008 · 정식 배포 완료 / PC 적용 대기 (2026-11-14)
- Codex: PR #12 병합 source f05e1600d3c389424d3b774b4d8fd331128586b1, stable 2026.11.14.28 「길동무 · 한눈에」. 배포 d70c16607463f1da5cee41ba9b3e36d4a2dbe19f. Actions https://github.com/d0ngkyu/icarus-field-hud/actions/runs/43559075499 test/publish 성공(24초). 원격 fetch 후 root files 및 불변 releases/stable/2026.11.14.28/files의 34개 크기·SHA1 모두 일치.
- 구현: 코치 압축/레벨 상태 정정, 220×200 동물 7축 차트와 선택한 스탯의 1~8 정확한 값별 분포, 후보 선택·약점 개선 평균/확률, 동일 종·성별·유전자 후보의 수동 재연결(aliases), 캐릭터 초기 탭, 요청한 8개 탭 순서/단축키, 3106개 아이템 탐색/60개씩 표시, 기록 그룹·검색. 최초 탭 캐릭터, 사용자 선택 유지. 캐릭터는 기존 수신 레벨/포인트/좌표만 사용하며 체력 등 새 native 수집 없음.
- 시뮬레이션은 기존 모델의 후보별 12000회 결과를 집계. 약점 보완은 낮은 스탯들의 개별 개선 확률 평균이며 공동 확률 아님. 실제 유전 규칙 검증/실측 확률로 표현하지 않음. 재접속 동일 개체는 자동 병합하지 않고 사용자 확인 필요.
- 게임 시작/호스트 월드 수동 저장/저장 후 종료 버튼: 설치 SDK의 ForceImmediateProspectSave와 저장 상태/시각/실패 카운터, EscapeMenu.QuitGame 사용. 요청 만료·중복·호스트 권한·월드 변경·안전 모드·진단 차단 포함. 종료는 Esc 메뉴 열린 상태에서 확인 후 요청. 저장 처리 종료와 디스크 영속성 검증은 별개. 실제 호스트 저장/종료는 미시험이며 강제 종료하지 않음.
- 검증: Node+Fengari 81개 통과(skip0), diff/원격 tree 일치, 합성 화면 942×876에서 차트·후보 선택·기록 검색·전체 아이템 탐색·캐릭터 표시 확인. 기존 refreshBars의 숨긴 배지 참조 오류를 재현하여 DOM 보존으로 수정; 최종 새 화면 콘솔 오류 없음. 합성 자료는 제품에 포함하지 않음. 상세 COMPACT-REVIEW.md.
- PC 읽기 확인: 게임 실행 중, 설치 version.txt .27. 설치 파일 교체/게임 종료 안 함. .28 PC 적용은 게임 종료 후 기존 안전 updater 절차에 맡김; 새 Lua는 다음 게임 실행부터. 실제 서버 저장/종료, 재접속 개체 연결, 장시간 안정성은 후속 확인. v1 실게임 검증 완료 선언 아님.
- 본 묶음 구현/정식 배포 소유 잠금 해제. Claude 지도·동굴/베타 및 독립 SOLO-TUNER 작업 보존, 베타 .27 승격 안 함. workflow의 checkout/setup-node v4 런타임 폐기 경고는 후속 유지보수 항목(이번 실행 성공).


## SAVE-CHECK-012 · 수동 저장 대기 진단 (2026-11-14)
- 사용자: 월드 수동 저장의 요청 처리 중 표시가 오래 지속됨. PC 읽기 점검: 설치 .28, control-response.txt timeout(14:03:33 KST), 요청 파일은 없음. Lua의 timeout 응답은 요청을 접수한 뒤 45초 내 완료 조건을 확인하지 못한 경로. 앱은 최대 50초 기다리는 구현.
- 로컬 Prospect JSON 중 최신 수정 시각 14:02:47 확인(응답 약46초 전). 파일/개인 식별자는 업로드하지 않음. 요청 직후 파일 쓰기와 양립하지만 자동 저장일 수도 있으므로 해당 버튼의 성공 증거로 확정하지 않음. 실제 파일 반영과 LastProspectSaveStateTime 기반 완료 판정 불일치 의심; 저장 실패로 단정하지 않음.
- 게임/설치 파일 변경, 추가 저장 명령, 종료 없이 읽기 점검만 수행. 완료 판정과 진행 상태 UI 보완 필요. 기존 mock 검사는 실제 게임 필드 갱신 의미를 검증하지 못함. 종료 버튼도 같은 완료 조건을 사용하므로 현재 저장 보장 용도로 의존하지 않도록 안내. 소스 수정/재배포 아직 없음.


## SOLO-ITEMS-011 · 실행 도구 제작 / 실게임 검증 대기 (2026-11-14)
- 사용자 요청: 싱글플레이 아이템 생성 프로그램. 독립 source/solo-items 소스 브랜치 codex/solo-items, 원격 커밋 e0f64f1196330ea7bacc97d3722ef6f95052c323. GitHub 커넥터로 소스 커밋·브랜치 갱신 후 git fetch 및 staged 소스와 원격 diff 없음 확인. 일반 git commit은 이 작업 환경의 author identity 미설정으로 실패하여 커넥터 사용; 로컬 커밋을 원격 백업이라고 표현하지 않음.
- Windows .NET Framework C# 실행 파일과 별도 UE4SS 모드 IcarusSoloItems. 설치 데이터 D_ItemTemplate와 기존 HUD 한글 이름 연결 2,989개, 한글/영어/내부 이름 검색, 수량 1~100. UI에서 준비한 요청을 게임 F11로 실행. KismetSystemLibrary.IsStandalone 판정, 템플릿 검증, 120초 만료, 중복/재시작 요청 폐기. 상시 UObject 스캔 없음.
- 검증: 실행 파일 자체 검사(카탈로그/프로토콜/수량/식별자) 및 Lua 모의 5개 통과. Windows 실제 창·한글 '철' 검색 결과 확인. 출력 ZIP 및 exe 생성 완료. exe SHA256 C4B976FFE0DA69F5501E498DE395A90A608053A5A757370DA55B4304745AB07B.
- 게임 실행 중으로 설치/해제/실게임 호출 미실행. 기존 HUD·게임·세이브 변경 없음. 실제 아이템 지급, 가방 부족, 아이템별 초기 속성 및 Unreal 안정성은 미검증. 함수의 반환값이 없어 UI는 '호출 완료'로 표시하며 실제 지급 성공으로 단정하지 않음.
- 다음: 게임 정상 종료 후 도구의 모드 설치 → 싱글 월드 재입장 → 돌 1개 요청/F11로 실제 확인. 정식 HUD 배포 대상 아님. COMPACT-008/Claude 베타 소유권 변경 없음. 코드 소유 작업 완료, 첫 인게임 확인 대기.


## 진행 중 · SAVE-FIX-013
- Codex · codex/save-feedback · 수동 저장 접수/완료/파일 갱신 구분과 진행 피드백 보완. app game-control/main/preload, HUD layout의 게임 버튼 블록, Lua game_control 및 관련 검사만 소유. 기존 45초 무표시 대기를 줄이고 실제 완료 미확인을 성공으로 바꾸지 않음. 실행 중 서버/설치본 보존. stable 배포는 검증 후 별도 기록.


## SAVE-FIX-013 · 정식 배포 진행
- Codex stable 2026.11.14.29, source 9680db38fdbf0548f95a9fa0abbff04a73b54f15 (PR #13), 검사 84개와 원격 source tree 일치 확인. 수동 저장 진행/10초 후 미확인/파일 갱신 구분, 저장 상태 true→false 판정 추가. 파일 갱신만으로 종료하지 않음. 닫힌 HUD 창의 400ms 위치 저장 타이머 취소/가드. 게임 실행 중 설치 교체/종료 없이 안전 updater 적용 대기.


## SOLO-ITEMS-UI-014 · 착수 기록 (아래 완료 참조)
- Codex · codex/solo-items · 사용자 요청: 아이템 생성기 디자인 개선. 독립 source/solo-items/ItemTool.cs UI 및 설명서만 소유. 네이비/골드, 검색 목록/선택 카드 분리, 수량 프리셋과 하단 연결 설정. 게임 생성 Lua/요청 프로토콜/기존 HUD/SAVE-FIX-013 영역은 변경하지 않음. 실제 Windows UI 확인 후 실행 파일 재패키징 예정.


## SOLO-ITEMS-UI-014 · 디자인 0.2 완료 (2026-11-14)
- 사용자 요청: 아이템 생성기 고급스러운 디자인. 독립 C# 도구만 네이비/샴페인 골드, 검색 목록/선택 카드, 결과 수, 1/10/50/100 수량 버튼, 하단 모드 설정으로 개편. source/solo-items/ItemTool.cs 및 README만 변경; Lua/생성 프로토콜/기존 HUD·SAVE-FIX-013 영역 미변경.
- 소스 codex/solo-items c0fb2d128ae63e97afce4b8cc147113ee8f78899, 원격 fetch 후 전체 source/solo-items와 로컬 diff 없음. Windows 실행 파일 자체 검사 통과, 실제 1040×800 창의 색상/배치/한글/잘림 여부 시각 확인. 선택 카드 클릭 자동화는 foreground process id 조회 실패로 완료하지 못했으며 실게임 지급 시험도 없음.
- 출력 IcarusSoloItems-0.2.zip / IcarusSoloItems-0.2/IcarusSoloItems.exe. exe SHA256 A065103374A161CAB6D1DCB67F7B87E5C96AD659C3FB5CF7F89F0082BF0D2E59. 기존 0.1 출력 보존. 디자인 작업 완료, 생성 기능의 첫 실게임 확인은 기존 후속 과제로 유지.


## SAVE-FIX-013 · 정식 .29 공개 완료 (PC 확인 진행)
- PR #13 source 9680db38fdbf0548f95a9fa0abbff04a73b54f15. Actions https://github.com/d0ngkyu/icarus-field-hud/actions/runs/43560448444 성공(26초). 원격 manifest .29 및 35개 root/불변 파일 크기·SHA1 검증. 84개 검사 통과, skip0.
- 저장 접수/경과 시간, 저장 중→완료 상태 전환 추가. save-only 10초 확인 후 완료 미확인으로 반환. 로컬 기존 Prospect JSON의 최신 수정/비어 있지 않음만 읽어 파일 갱신 증거를 별도 표시하며 자동저장과 구분 불가/성공 확정 아님. 종료는 이 증거만으로 실행하지 않음. 스캔은 수동 요청 중 2초 간격, 내용 읽기/업로드 없음.
- 사용자 스크린샷 Object has been destroyed: 400ms 창 위치 저장 콜백의 destroyed 가드 누락 확인. 닫을 때 타이머 취소, 이미 큐에 든 콜백도 창 유효성 검사; 실제 모의 회귀 포함. 스크린샷 잘린 스택만으로 해당 줄을 확정하지 않음.
- 실제 게임 종료 확인 후 기존 HUD를 열어 업데이트 클릭. 현재 CDN 응답은 아직 .28이며 PC 적용 확인 진행 중. 서버/세이브 쓰기 명령이나 강제 종료 없음. 실제 저장 완료 보장은 아직 미검증.


## SOLO-SUITE-015 · 착수 기록 (아래 완료 참조)
- Codex · codex/solo-items · 사용자 요청: 프로그램 수정 시 자동 다운로드/교체 및 체력 한도, 스태미나 소모, 산소/허기/갈증, 인벤토리 무게, 내구도, 달리기 속도 탭 추가. 독립 source/solo-items/ 및 standalone/ 배포 경로만 소유. 기존 HUD stable/SAVE-FIX 영역과 분리. 설치 data.pak에서 기본 능력치, 행동 스태미나 비용, 내구도 테이블을 읽어 검증 중. 종료 후 적용형 데이터 모드와 원복, 검증된 자동 업데이트 구현 예정. 실게임 수치 반영은 별도 확인.


## 착수 기록 · UPDATE-COPY-016 (아래 완료 참조)
- Codex · codex/playful-updates · HUD index.html 업데이트 버튼/설정 버전 문구만 소유. 버전 별칭 Lv.1 생존 새내기, 업데이트 상태별 재치 있는 문구. 단순 문구만 별도 연속 배포하지 않고 다음 기능/수정 묶음에 포함. SAVE-FIX-013 배포 성공 후 PC 조작은 사용자 Esc로 중단, 마지막 PC .28 확인 기록으로 정정하며 배포 잠금 해제. SOLO-SUITE 영역 보존.


## UPDATE-COPY-016 · 소스 반영 / 바탕화면 실행기 완료
- PR #14 squash e66efa4add4219e87219ca929737d3c9b0353002. 버전 별칭 Lv.1 생존 새내기와 버튼 상태(새 패치 왔나? / 패치 줍는 중 / 넌 이미 최신형 / 나 방금 진화함 / 패치가 길을 잃음) 분리. 내부 숫자 버전 유지, 큰 기능 단계만 Lv.2 야전 견습생 → Lv.3 개척 베테랑 → Lv.4 행성 고인물로 승급. 문구 변경은 다음 수정 묶음에 배포(현재 stable .29 유지).
- 관련 기존 검사 32개 통과(인라인 JS 파싱 포함). 업로드 출력 잘림을 원격 diff에서 발견, 병합 전 전체 문서 복원 후 로컬 검증본과 줄끝 공백 제외 diff 없음 확인. squash로 최종 정상본만 main 통합. 실제 새 문구 UI는 아직 설치/검증하지 않음.
- 사용자 추가 요청으로 바탕화면 이카루스 HUD.exe 생성(.NET Framework winexe 4608바이트, SHA256 333D1755D9156E7A72004727A1710C9ECE28D621ECD37DE4CFCCF38446230394). 기존 설치 HUD.exe를 여는 전용 실행기, --check 경로 검증 exit0. 전체 HUD 배포 패키지가 아니며 다른 PC는 HUD 설치 필요. 실제 실행으로 게임을 켜거나 서버를 종료하지 않음. 소스는 해당 작업 workspace work/HudLauncher.cs에 보관(원격 소스 백업으로 주장하지 않음).
- PC 읽기 version.txt .29 확인. 이전 Esc 중단 당시 .28 기록 이후 적용됨; 이번에 직접 업데이트를 실행한 것은 아님. SAVE-FIX 배포 잠금 및 본 소스 작업 잠금 해제, SOLO-SUITE 독립 작업 유지.


## 착수 기록 · HUD-ICON-017 (아래 완료 참조)
- Codex · 아이콘 그래픽/바탕화면 HUD 실행기만. 생성 이미지 기반 흑연·골드 나침반 I 문장, 16~256 ICO. 사용자 요청으로 바탕화면 실행기 아이콘 적용 및 추출 검사 완료. 게임/서버 변경 없음. 앱 source 아이콘은 다음 묶음 배포용으로 반영 예정. 다른 UI/독립 도구 영역 보존.


## HUD-ICON-017 · 완료
- PR #15: 흑연/샴페인 골드 나침반 I 생성 아이콘, source/app/icon.png(256px)와 design/hud-gold.ico(16~256px 7종) 원격 보관. Git blob 7fca2ba25216ac9da3dcc097fdd98b4da02da8d2 / 70f552cf035565309346e9744e30509b6a631849 로컬과 일치. 바탕화면 실행기 소스 source/tools/HudLauncher.cs 보관.
- 사용자 바탕화면 이카루스 HUD.exe 아이콘 실제 교체, 이전 exe workspace 백업. --check exit0, exe에서 추출한 32px 아이콘 시각 확인. 새 exe SHA256 FF4F98E6C54F2BABD71AA64F35E6EA83AE1C1924654745C3890EDB68D2B7C46D. Explorer 캐시의 즉시 갱신 여부는 직접 확인하지 않음.
- 내장 image_gen 생성, 투명 PNG 보존 및 다중 크기 ICO 패키징. 출력 outputs/icarus-hud-gold.png, icarus-hud.ico. 앱 창/트레이 아이콘은 다음 정식 묶음 배포 시 적용; 현재 stable .29 변경 없음. 게임/서버 실행 또는 종료 안 함. 본 작업 소유 해제.


## SOLO-SUITE-015 · 개인용 0.3.0 제작·원격 공개·PC 설치 (2026-11-14)
- 사용자: 개인 혼자 사용, 기존 길동무와 충돌 최소화/가벼움/어린이도 쉬운 조작, 바탕화면 exe, 수정 완료마다 자동 다운로드·교체. 참고 사이트 https://www.wemod.com/ko/cheats/icarus-trainers 직접 확인. 기능 목록/간단한 제어를 참고하되 무적/무한 내구도/실시간 기능으로 과장하지 않음. 세부 source/solo-items/REFERENCE.md.
- 구현: 아이템/체력/스태미나/생존/무게/내구도/달리기/설정 8탭. 기본/절반/소모없음/2배 등 버튼과 슬라이더. 체력 기본 최대치 1~3배, 행동 비용0~100%, 산소/음식/물 기본 소모0~100%, 휴대 한도1~5배, 장비 최대 내구도1~5배, 달리기1~2배. 원본 data.pak 읽기→별도 998-IcarusSoloTools_P.pak 생성, 게임/서버 종료 가드, 타 PAK 테이블 충돌 검사, own hash/게임 업데이트 검사, 백업/기본값 복원. 캐릭터 세이브 직접 편집 없음. 멀티 사용 전 원복 안내.
- 길동무 분리: 기존 HUD 파일/설정/배포 채널 변경 없음, 별도 모드·상태 폴더. HUD Lua에서 F11/도구명 충돌 문자열 없음 확인. Native .NET 앱, 웹 서버/Electron/상시 게임 스캔 없음. UI 응답 대기용1초 timer는 요청 없으면 즉시 반환, 업데이트 시작 시/15분마다. UI 조작/자동화 중 메모리 약80~118MiB 관측; 통제된 idle/FPS/장시간 동시사용 시험은 아니므로 성능 무영향/무충돌 보장하지 않음.
- 자동 업데이트: codex/solo-items/standalone/manifest.json, 불변 commit ZIP 주소, 패키지 및 9개 파일 SHA256/크기/허용 경로 검증, 종료 helper의 교체/복구. 게임 실행/설정 편집/아이템 요청 중 교체 보류. 별도 사용자 설정 유지. 기존 own Lua 모드는 다음 앱 시작 때 게임 종료 상태에서만 갱신. 배포 절차 source/solo-items/RELEASE.md 및 Package.ps1. 이후 이 도구 수정 완료 시 version 증가·검증·새 불변 package·manifest 게시를 수행한다.
- 검증: 실행 파일 자체 검사 통과, suite 12개 결과(실제 설치 데이터 매핑, 걷기/탈것/배치물 유지, 가상 설치 PAK 생성·읽기·기본값 원복, 실행 가드/외부변경 보호, 업데이트 ZIP/각파일/정상 교체/중간실패 복구/변조·경로·중복 차단). Lua 생성 모의5개는 앞선 결과, 이번 Lua 변경 없음. Windows 실제 탭/접근성 확인; 사용자 입력으로 UI 클릭 자동화가 중단되어 생존 탭 전체 조작은 미확인. 실게임 수치 반영/아이템 지급은 미검증.
- 소스/불변 ZIP 커밋 c939e63e3f4f1fc0cc6d361b6026fd67a47546fa, manifest 게시 0546a755aa6de1f5c927da21ed9be01b232525cf. 원격 ZIP 재다운로드 SHA256 a9a5a15fd69d11bbeaf1d36bb7cb8f98d85f14fa2e550e0d076716845920c297, 내부9개 전부 검증. 실 CDN manifest 0.3.0 확인. source diff는 두 라이선스의 CRLF/LF 차이만 있고 나머지 일치(의미 비교 전체 일치).
- PC 실제 설치: %LOCALAPPDATA%/Programs/IcarusSoloTools 9개 파일 hash/크기 일치. 사용자 요청 바탕화면 ‘아이카루스 싱글 도구.exe’(실행기) 생성, SHA256 360CB67D429C98468495B4311E894A33C4F8C8FF46E64E2EE5F4DC69DF45A36B. 설치본 --self-test 통과. 출력 IcarusSoloTools-0.3.0.zip. 작업 마지막 확인 시 실제 게임의 998 PAK 없음: 도구가 실제 조절값을 적용한 것으로 주장하지 않음.
- 완료 범위: 도구/업데이트 채널/바탕화면 설치. 다음: 사용자 별도 싱글 월드에서 작은 변경 적용·아이템1개 확인, 길동무와 실제 동시사용 검증. SAVE-FIX/HUD stable/Claude beta 소유권 변경 없음. 자동 AI 실행/상시 agent 감시는 추가하지 않음.


## 착수 기록 · THREE-REVIEW-018 (아래 완료 참조)
- Codex · 사용자 명시 요청으로 3개 독립 검토 에이전트: 안정성/호스트 저장·종료, 사용성/디자인·성능, 데이터 정확성/배포. main be8fd13 및 stable .29 기준 읽기 검토와 합성 재현, 이후 상호 반박 후 우선순위 합의. 제품/설치 파일·게임 조작 없음, 검토 문서/기록만 담당. SOLO-SUITE 별도 작업 보존. 실제 검증과 의심을 구분하며 에이전트 수를 독립성/정확성 보장으로 표현하지 않음.


## THREE-REVIEW-018 · 3인 교차 검토 완료
# HUD 3인 교차 검토 결과
검토일: 2026-11-14 · 기준 main be8fd13 / 정식 2026.11.14.29
방법: 안정성(A), 사용성(B), 데이터·배포(C) 독립 읽기 검토 후 서로의 결론 반박·검증. 주 담당도 주요 재현을 다시 실행했습니다. 실제 게임 종료·저장 명령과 설치 변경은 하지 않았습니다.

## 결론
새 탭이나 장식을 늘리기 전에 종료 요청, 업데이트 결과, 월드 기록, 교배 추천의 신뢰성을 정비하는 것이 우선입니다. 검사 84개가 모두 통과해도 아래 결함은 남았습니다. 모의 검사는 실제 Unreal 네이티브 안정성을 보장하지 않습니다.

## 1차: 서버와 업데이트 안전
1. **종료 요청의 동일한 만료 시각과 취소 처리 [높음, 합성 재현]**
앱은 요청 생성 후 50초, Lua는 최대 15초 늦게 접수한 뒤 45초를 기다립니다. 요청100·접수114·완료151의 모의 시계에서 앱 기한150 이후 QuitGame 1회가 실행됐습니다. 응답이 id|까지만 기록된 순간에도 앱은 500ms 만에 최종 오류로 판단하고 잠금을 풀 수 있습니다. Lua 응답은 직접 덮어쓰기 방식입니다.
- 근거: source/app/game-control.js:22,28,38 / source/mod/Scripts/game_control.lua:8,19,45,55.
- 수정: 공유 절대 만료 시각, 종료 직전 재확인, 취소 확인 또는 짧은 유효기간 갱신, 응답 원자적 게시와 불완전 응답 재시도.
- 통과 조건: 앱 시간 초과·취소·연결 해제 이후 게임 종료 호출 0회. 늦은 접수/부분 응답/세션 변경을 함께 시험.
- 실제 게임에서 늦은 종료를 실행해 본 것은 아닙니다.

2. **업데이트 실패를 최신으로 표시 [높음, 합성 재현]**
다운로드 실패 시 updater는 skipped가 있는 결과를 반환합니다. 앱은 이를 참인 결과로 받고 lastUpd에 목표 버전을 저장합니다. 화면은 변경 파일이 없다는 이유로 최신이라고 알리며 복구 기능도 완료라고 할 수 있습니다.
- 근거: source/app/updater.js:154 / source/app/main.js:168,191,196 / source/mod/hud/index.html:1047,1109.
- 재현: mock HTTP503 결과에 checkUpdate=true, info.version=설치하지 않은2099.1.1.1, 정상 upd 이벤트.
- 수정: 완료/실패/보류/오래된 응답 상태를 명시하고 설치 성공한 버전만 표시. skipped는 실패 안내.
- 통과 조건: 파일 하나라도 받지 못하면 최신/복구완료 표시 금지. 기존 파일 보존 검사와 UI 결과 검사를 함께 수행.

3. **자동 채굴을 멈추는 경로의 유효성 검사 누락 [높은 위험, 실제 충돌 미재현]**
월드 전환 또는 플레이어 소실로 stopMining을 부르는데, stopMining은 pawn의 유효성을 확인하지 않고 네이티브 입력 해제를 호출합니다. pcall만으로 접근 위반을 방지할 수 없습니다.
- 근거: source/mod/Scripts/main.lua:982–996.
- 수정: 세션이 바뀌면 예약/상태만 해제. 같은 세션의 유효한 pawn일 때만 입력 해제.
- 통과 조건: invalid pawn·세션 변경·월드 해제 후 native 호출 0회. 이것이 과거 크래시의 원인이었다는 증거는 없습니다.

## 2차: 사용자의 월드와 교배 목적에 맞게
4. **같은 지형의 서로 다른 월드 기록 분리 [중요, 코드 구조 확인]**
현재 지형 이름 Terrain_016 등을 개인 기록 키로 사용합니다. 서로 다른 올림푸스 서버에 들어가도 기지·보관함·핀·탐험 기록을 구분하지 못합니다.
- 근거: source/mod/Scripts/main.lua:317–320 / source/mod/hud/index.html:483,544–548.
- 수정: 정적 지형/동굴 자료는 지형별 공유, 개인 기록은 Prospect 식별자로 분리. 안정적인 식별자를 확보하기 전에는 명시적인 월드 프로필 선택 제공. 기존 기록 이전은 복사·보존 방식.
- 동물도 전역 저장 구조와 actor ID를 사용합니다. 실제 서로 다른 월드의 ID 충돌은 미측정이므로 확정된 개체 덮어쓰기로 표현하지 않습니다.
- 통과 조건: 같은 올림푸스 월드 A↔B 전환 후 양쪽 개인 기록이 각각 복원됨.

5. **교배 상대 순위를 같은 기준으로 비교 [중요, 실제 JS 함수 합성 입력 재현]**
현재 '균형 발전'은 부모 중 더 좋은 부모를 넘어설 확률입니다. 상대 후보마다 기준 부모가 달라지므로 선택 동물을 발전시키려는 추천 순위로는 적합하지 않습니다.
- 근거: source/mod/hud/animals.js:64–75,187–188,242.
- 선택 동물 전스탯3, 상대 전3/전5/전8일 때:
| 상대 스탯 | 현재 순위 확률 | 기준 동물 대비 약점 평균 상승 | 개별 약점 개선 확률 평균 |
|---|---:|---:|---:|
| 전부3 | 0.0583% | +0.0228 | 35.94% |
| 전부5 | 0% | +1.0234 | 58.36% |
| 전부8 | 0% | +2.5933 | 83.11% |
이는 실제 출생 실험 결과가 아니라 현재 모델의 계산 결과입니다.
- 수정: 선택 동물의 최저 스탯·합계를 공통 기준으로 추천. '양쪽 부모를 뛰어넘는 확률'은 별도 고급 지표로 보존.
- 통과 조건: 위 입력에서 기준 대비 개선이 큰 상대가 우선됨. 모델의 실제 유전 규칙 적합성은 실측 기록으로 별도 검증.

## 후순위 보완
- 동물 색상: radar 고정 HSL은 저장한 낮음/높음 기준을 사용하지 않음(animals.js:206–209,286–291). 차트/범례/비교표의 등급 함수를 통일.
- 기록: index.html:200이 30개만 보존. 그룹·검색이 있어도 오래된 활동은 삭제됨. 보존 한도 안내, 제한 있는 장기 기록과 내보내기 고려.
- 교배 상대: 추천 상위8마리 외에도 전체 후보 직접 선택 제공. 의도적 성능 제한일 수 있어 안전 결함으로 분류하지 않음.
- 제작 F6: 열린 제작대가 없으면 8m 내 다른 제작대에 넣는 fallback(main.lua:1101–1113). 현재 연 제작대만 허용하는 사용자 요구에 맞게 변경.
- 시뮬레이션: 300회 배분 한도 후 unfinished 결과도 출생 확률에 포함됨. 해당 시도의 제외/계산 실패 처리가 필요하나 입력의 실게임 가능성은 미확정. 순위 결함과 구분.
- 친구 배포: HudLauncher.cs는 C드라이브 기본 Steam 경로만 사용. 다른 라이브러리 경로 탐색/선택과 실제 설치 패키지가 필요.
- 저장 파일 증거: 현재 계정/월드 특정 없이 Prospect 수정 시각을 비교하므로 특정 요청의 저장 완료 증거로 격상하지 말 것.

## 합의와 반박
A/B/C 모두 종료 프로토콜, 업데이트 실패 표시, 개인 월드 격리를 우선 대상으로 인정했습니다. B의 교배 순위 재현은 C와 주 담당이 독립 확인했습니다. A가 발견한 native 정지 경로는 코드상 위험이며 실제 충돌 재현과 구분했습니다.
상위8 제한은 개선 제안으로 낮추고, 극단 입력의 시뮬레이션 미완료를 근거로 모든 실게임 확률이 틀렸다고 단정하지 않았습니다. 새 디자인 취향이나 탭 추가는 위 항목 뒤로 미뤘습니다.

## 검사와 범위
- 주 담당: Node+Fengari 기존84개 통과(skip0).
- 주 담당 재실행: 지연 종료, 부분 응답, 업데이트 실패 IPC 결과, 교배 추천 수치.
- 제품 소스/설치본 수정 및 배포 없음. 이 보고서는 수정 완료 선언이 아닙니다.
- 다음 작업 권장: 1차 안전 묶음 → 2차 월드/교배 정확성 묶음 → 소규모 실제 호스트 세션 검증 → v2 기능.



## THREE-REVIEW-018 · 멀티플레이 자동 기능 추가 확인
- F3(main.lua1197~1235): 열린 상자/시선 대상이 아닌 5m 내 가장 가까운 비어 있지 않은 Inventory 선택, 자기 pawn inventory만 제외. 상자 종류/현재 열림의 명시적 검증 없음. 부족분 개수 전달 없이 OnServer_QuickMoveItem으로 묶음 이동, pcall 성공만으로 로컬 have/완료 메시지 갱신. 다른 상자·과다 반출·서버 거절 오표시 위험. 실제 권한 우회/아이템 복제는 확인하지 않았음.
- F4(main.lua900~960): 40ms 간격 제어 회전/이동 입력, 월드 준비/유효 pawn/막힘/도착 가드 있음. 자동 경로탐색·절벽 회피 기능이 아님. 서버 지연/FPS 저하를 실제 측정한 것은 아님.
- F5: 700ms마다 일반 공격 입력, WORLD_READY 해제 stopMining 경로의 invalid pawn 호출 위험은 기존 검토 참조. 실제 튕김 원인으로 확정하지 않음.
- F6: 열린 제작대 없으면 8m 내 가까운 제작대 fallback, 서버 proxy 호출 후 성공을 실제 처리 확인과 구분하지 않음. 공동 제작대 큐/재료에 영향을 줄 수 있어 명시 대상과 결과 확인 필요.
- PC macros_on.txt 존재를 읽기로 확인. 실제 현재 세션의 로딩 상태/사용 여부는 단정하지 않음. 설정 파일은 시작 시 읽으므로 기존 세션에서 설정 OFF만으로 즉시 중단된다고 보장할 수 없음. 사용자 질의에 대한 검토만 수행, 자동 기능을 임의로 끄거나 게임을 종료하지 않음.
- 권장: 멀티 기본은 F3/F5/F6 OFF, F4 선택 제공. 긴급정지·사망/메뉴/월드전환 중단·열린 대상만 허용·수량 상한·서버 결과 확인을 먼저 보완. 안전성을 검증하지 않은 자동 기능 확대보다 우선.


## 진행 중 · MANUAL-ONLY-019
- Codex · codex/manual-only · 사용자 결정: 자동 이동/채굴/공격/상자 꺼내기/제작 조작 제거, 아이템 검색·제작법·재료/작업대 계산 유지. main.lua F3~F6 구역, HUD 자동 실행 버튼/설정/문구, 관련 앱 IPC만 소유. 수동 게임 시작/월드저장/종료 및 나침반 표시는 이번 제거 대상 아님. 실행 중 설치 변경/서버 종료 없이 검증 후 stable 배포.


## 착수 기록 · SOLO-DESIGN-019 (아래 완료 참조)
- Codex · codex/solo-items · 독립 싱글 도구 source/solo-items 및 standalone 전담. 사용자 요청 금빛 날개 아이콘과 전체 레이아웃/글꼴 개편, 다음 0.3.1에 함께 반영. 좌측 메뉴/Noto Sans KR/큰 숫자/선택 상태 개선. 기존 HUD/게임 파일 및 다른 진행 섹터 변경 없음. 기존 0.3.0 공개 유지, 검증 후 독립 채널 배포.


## MANUAL-ONLY-019 · 정식 배포 진행
- Codex stable 2026.11.14.30, source 157fc08744ab05b5944fba9253d5f72d94c7377e PR #16. 84개 검사/원격 source 일치, 합성 제작 검색·재료 표시·설정 제거·콘솔 오류없음 확인. F3~F6 게임 조작 코드 삭제, 설정/IPC/클립보드 실행 명령 제거. F7~F10 수동 정보 기능 유지. 현재 게임 미실행 읽기 확인, 설치는 기존 updater 사용. 앞선 레벨 문구/아이콘 포함.


## SOLO-DESIGN-019 · 배포 인수
- Codex 단독 배포 · 독립 standalone 채널 · 대상 0.3.1 · 소스/불변 ZIP 7ddfa2606dc00cacfe572c660211a8dde579d2da. 기존 HUD stable/beta 배포 대상 아님. 소스 검사 suite 12개 및 자체검사 통과; 실제 새 아이템/생존/설정 화면 확인, 7해상도 아이콘 표시 수정 확인. 패키지 SHA256 a62b1944c89549b198e6f23a1d3dd518995d9247ec17b7947474843b7fdd08a0. 다음: 원격 ZIP 재검증 → manifest 게시 → 실제 기존 0.3.0 자동 교체 확인. 게임 실행 중 교체 금지 유지.


## SOLO-DESIGN-019 · 0.3.1 완료 (2026-11-14)
- 사용자 요청: 독립 싱글 도구의 금빛 날개 아이콘 + 전체 레이아웃/디자인/글꼴 개편. 왼쪽 8메뉴, 기능별 큰 제목, 아이템 2열 카드, 간단한 사용 순서, 설정 안으로 게임 연결 이동. 로컬 Noto Sans KR(없으면 맑은 고딕), 숫자 Bahnschrift. 선택 프리셋 금빛 테두리 및 적용 전 변경 표시. 웹폰트/애니메이션 루프 추가 없음.
- 아이콘: built-in image_gen 결과를 16/24/32/48/64/128/256px PNG ICO로 변환, 앱/바탕화면 exe에 포함. 최초 GetHicon/Save 변환이 빈 타일처럼 표시되어 실제 창에서 발견; 명시적 원본 픽셀 범위와 PNG frame으로 수정 후 추출/실행 창 표시 확인. 프롬프트와 변환 도구 ICON.md/tools/MakeIcon.cs에 보관.
- 검증: suite 12개(실제 data 읽기/가상 PAK/업데이트 실패 복구 등) 및 최종 exe 자체검사 통과. 실제 아이템/생존/설정 화면 확인. UI 조작 중 사용자 활동/다른 HUD의 항상 위 창이 캡처를 가린 경우 있음; 전체 DPI/작은 화면/게임 성능 시험은 아님. 새 UI가 게임 수치를 적용한 것으로 주장하지 않음.
- 원격: 소스+불변ZIP 7ddfa2606dc00cacfe572c660211a8dde579d2da, manifest c746b1052c07cbbbb91c178bf138c8a6f48905b4. 원격 ZIP SHA256 a62b1944c89549b198e6f23a1d3dd518995d9247ec17b7947474843b7fdd08a0 및 내부9개 크기/hash 전부 재검증. CDN manifest 0.3.1 확인. fetch 후 source 의미 비교 일치(기존 라이선스 CRLF 차이 제외).
- PC 실제 자동 업데이트: 옛 0.3.0 바탕화면 실행기를 시작 → 다운로드/검증 → 종료 helper 교체 → LocalAppData/Programs/IcarusSoloTools의 0.3.1 자동 재시작 확인(14:46 KST). installed-version 0.3.1, 설치9개 hash 전부 일치. 바탕화면 exe도 자동 갱신 SHA256 89b38038798dfe5504f6c4e319f1aa8d2f7a642f114e1e537e64193d2f2e8e33. 가상 시험뿐 아니라 실제 기존 설치 업그레이드 경로 확인.
- 빌드 산출물 bin/ 분리로 실행 중 옛 루트 exe 잠금 때문에 빌드 실패했던 문제 해소. 디자인 기록 DESIGN.md, 배포 RELEASE.md. 기존 HUD와 게임/서버 종료/강제 교체 없이 독립 앱만 갱신. standalone 배포 소유 해제. 다음: 사용자의 싱글 실게임 아이템 지급/수치 반영 확인, 화면 크기별 추가 검증.


## MANUAL-ONLY-019 · 정식 .30 배포 완료 (2026-11-14)
- 사용자 요청으로 HUD의 F3 자동 재료 꺼내기, F4 자동 이동, F5 반복 공격/채굴/벌목, F6 자동 제작 대기열 실행 코드를 삭제. 관련 설정·IPC·클립보드 실행 명령도 제거. 별도 자동 사냥 구현은 발견되지 않았으며 반복 공격 경로 제거로 대응. 제작 검색/전체 목록/재료 수량/작업대/제작 구조 및 F7~F10 수동 정보 기능 유지. 별도 싱글 도구는 이번 범위 아님.
- PR #16, source 157fc08744ab05b5944fba9253d5f72d94c7377e. stable 2026.11.14.30, 배포 10f7278. Actions https://github.com/d0ngkyu/icarus-field-hud/actions/runs/43563157751 test/publish 성공(24초). 84개 검사(skip0) 및 F3~F6 미등록/F7~F10 등록 회귀 확인. 원격 manifest35개 root/불변 파일 크기·SHA1 일치.
- 합성 화면: 제작대 검색→목록→재료 섬유60/나무50/가죽20/돌12 표시, 설정 자동조작 없음, 콘솔 오류 없음. layout cq 삭제 뒤 남은 참조도 수정. PR #14 업데이트 문구/Lv.1 및 PR #15 아이콘 함께 배포.
- PC: 게임 미실행 확인 후 기존 HUD 버튼으로 업데이트 요청. CDN main manifest가 아직 .29라 실제 .30 설치는 대기 상태(설치 version.txt .29 읽기). 강제 파일 교체/서버 종료 없음. 다음: CDN 갱신 후 기존 안전 updater 적용·설치 hash 확인. 실게임 안정성 시험은 아직.
- 이번 소스/정식 배포 소유 해제. 이전 THREE-REVIEW-018의 저장 종료 만료/업데이트 실패 표시/월드 격리/교배 순위 문제는 이번에 수정한 것으로 간주하지 않음. 자동 채굴 정지 및 F3/F6 위험 경로는 코드 제거로 해소.


### SOLO-DESIGN-019 · 바탕화면 표시 후속
- 사용자: 바탕화면 아이콘이 바뀌지 않았다고 보고. 실제 Desktop exe에서 아이콘 추출 시 금빛 날개 확인: 리소스 교체와 Explorer 표시 갱신은 별개임. SHChangeNotify(해당 파일/폴더/association) 및 Windows ie4uinit -show로 캐시 갱신 요청. Explorer/게임 종료 없음. 사용자가 보는 바탕화면의 실제 갱신 결과는 아직 미확인; 앞선 파일 hash 확인을 화면 표시 확인으로 확대하지 않음.


## UPDATE-URL-020 · 진행 중
- Codex 앱 업데이트 주소 복구 담당. raw /main/manifest는 cache-bust에도 .29, /refs/heads/main/manifest는 .30 확인. 소스 package updateUrl 명시 브랜치 주소로 수정·검증 후 stable .31 배포 및 기존 안전 updater로 PC 적용 예정. 게임 미실행, 다른 섹터 변경 없음.

## CLAUDE-APPLY-30 · PC 적용 (14:51 KST)
- 사용자 요청 "작업 확인하고 적용". 게임 미실행 확인(live.js/UE4SS.log 14:09 이후 갱신 없음). CDN manifest .30 확인 후 .29 대비 바뀐 6개(Scripts/main.lua, hud/index.html, hud/layout.js, app main/updater/preload.js)를 릴리스 SHA1 검증본으로 설치, update-channel.json stable=.30·version.txt .30 기록. 설치 후 Lua/HUD 3개 SHA1 일치 재확인. 앱 변경은 HUD 재시작 후 적용. 실게임 확인은 아직.


## UPDATE-URL-020 · 배포 인수
- Codex stable .31, source 90e9b040c2b16b3e9f98282d0683f8a270aa7ef4 (PR17). 84개 통과, 명시 브랜치 URL 응답 검증. package.json updateUrl만 변경. 기존 PC는 기존 updater에 정상 주소를 전달하는 일회 복구 실행으로 설치하며 게임 상태 재검사/다운로드 hash/원자 교체를 유지.


## 착수 기록 · SOLO-RESIZE-021 (아래 게시 결과 참조)
- Codex / codex/solo-items / 독립 도구 0.3.2: 고정 창 해제, 기본 980x650, 창 크기에 맞춘 배치와 크기 기억. source/solo-items 및 standalone만 소유. HUD UPDATE-URL 작업과 별도. TASKS 동시 갱신 409 후 최신 기록 재조회·보존하여 재시도.


### SOLO-RESIZE-021 · 독립 채널 배포 인수
- Codex / 0.3.2 / source 128b808fb82c5922017c02e81cf6512e287f69c3. 860x580,980x650,1500x900,980x650 왕복 × 8탭 경계 검사 및 미적용값 유지 검사 통과. 창 테두리/최대화 활성 확인. 게임 실행이 시작되어 설치본 교체는 기존 안전 절차로 보류하며 새 빌드 창은 열어둠. 원격 ZIP 검증 후 manifest 게시 담당. HUD 채널 변경 없음.


## UPDATE-URL-020 완료 / USAGE-RANK-021 진행
- .31 Actions 43563556171 성공, source90e9b040, 배포7526ef7. 기존 /main도 .31 응답 확인. 복구 보조실행은 자동검토 blocked by policy(세부없음)로 실행 안 됨. 현재 게임 실행 확인으로 설치 보류. Claude .30 적용 기록 확인. 기본 안전 업데이트로 다음 종료 후 .31 이상 적용.
- Codex source/app/main.js 누적 사용 집계와 source/mod/hud/index.html 상단 배지/업데이트 문구 담당. 사용자 요청 사용시간 LV+칭호, 기존 Lv.1 생존 새내기 제거. 게임과 HUD 동시실행 시간(기존3초 게임확인 재사용), 분당 저장, 장기 정지/오프라인 제외. 로컬 누적치로 시작, 과거시간 추정 없음. 업데이트 버튼 패치 왔슈?로 분리. 다른 UI 섹터 변경 없음.


## SOLO-RESIZE-021 · 0.3.2 게시 완료 / PC 설치 대기
- 고정 창을 Sizable로 변경, 최대화/복원 활성, 기본 client980x650·최소860x580. 창에 맞춰 버튼/글꼴/목록/배경을 같은 기준 좌표에서 배치, 반복 확대축소 누적 오차 방지. window-size.txt에 마지막 일반 창 크기 저장 및 다음 실행 화면 범위 제한. 새 탭도 현재 크기로 배치, 검색 목록 열폭 보완. 게임 기능 변경 없음.
- 최종 layout-test 통과: 4개 크기 왕복 × 8탭의 컨트롤 경계, 미적용 체력200 값/dirty 유지, Sizable/MaximizeBox 확인. Windows 실제 새 작은 창과 최대화 접근성 확인. 다른 창 및 사용자 입력으로 전체 스크린샷/마우스 드래그 검증은 제한됨. 모든 DPI 조합 검증 아님.
- source128b808fb82c5922017c02e81cf6512e287f69c3, manifest02df110095befadf2f7550a3b03f0378cd9a06b6. 원격 ZIP 재다운로드 SHA256 2bd76cf584bb3ec672c00fad6387124b3c18b17846aa956e5dcf2d7f8555d521 일치, 실 CDN0.3.2 확인. 원격 fetch 후 source 의미 diff 없음. 출력 IcarusSoloTools-0.3.2.zip.
- PC: 작업 중 Icarus 게임 실행 시작 확인. 기존 안전 정책으로 설치본0.3.1 교체는 수행하지 않음. 새0.3.2 빌드 창을 실행해 둠(즉시 크기 조절 가능). 게임 종료 후 도구를 닫고 바탕화면 실행기로 열면 기존 자동 updater가0.3.2 적용. 실제 PC0.3.2 설치 완료로 주장하지 않음. 게임/HUD 종료·설치 파일 강제 교체 없음. 독립 채널 배포 소유 해제.

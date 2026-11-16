# Icarus Field HUD — 협업 인수인계 (Gemini용)

작성: Claude · 2026-11-16 12:00 KST · 기준 커밋 `icarus-field-hud` main `defa029`
Codex(ChatGPT)는 지금 사용자가 열 수 없어, Codex 기록(TASKS.md·리뷰 문서·브랜치)까지 Claude가 정리했습니다.

---

## 0. 한 줄 요약
게임 **Icarus**(UE4, Steam)를 돕는 **두 번째 모니터 HUD**입니다.
- 게임 안: **UE4SS Lua 모드**(`source/mod/Scripts`)가 게임 상태를 읽어 `hud/live.js` 파일로 내보냅니다.
- 게임 밖: **Electron 앱**(`source/app`)이 그 파일을 받아 HTML 화면(`source/mod/hud`)에 보여 줍니다.
- 업데이트: 이 GitHub 저장소의 `manifest.json`(정식)·`beta/manifest.json`(베타)과 `releases/<채널>/<버전>/files`로 자동 배포됩니다.

사용자는 **프로그래밍을 모릅니다**. 보고는 **짧은 한국어**로, 결과·필요한 결정·막힌 부분만 알려 주세요. "가장 간단하고 잔고장 적게"가 최우선입니다.

## 1. 묶음 구성
| 폴더 | 내용 |
|---|---|
| `icarus-field-hud/` | 본 저장소 main 스냅샷. 용량이 큰 `releases/`, `files/`(배포 산출물 약 760MB)는 뺐습니다. GitHub에서 받으세요: https://github.com/d0ngkyu/icarus-field-hud |
| `icarus-field-hud/side-projects/solo-items/` | 싱글 전용 아이템 지급 도구(C# + Lua). 브랜치 `codex/solo-items`에만 있고 main에 병합 안 됨 |
| `icarus-field-hud/side-projects/solo-tuner/` | 싱글 수치 소폭 조정 도구(로컬 웹 UI). 브랜치 `codex/solo-tuner`, 소스만 있고 패키징 미완료 |
| `ai-collaboration/` | AI 공통 협업 규칙 허브(비공개 저장소 `d0ngkyu/ai-collaboration`). README → RULES → PROJECTS 순서로 읽기 |
| `HANDOFF-GEMINI.md` | 이 문서 |
| `GEMINI.md` | Gemini 시작 지침(저장소 루트에도 같은 파일을 올림) |

## 2. 처음 읽을 순서
1. `ai-collaboration/README.md` → `RULES.md` → `PROJECTS.md`
2. `icarus-field-hud/COLLAB-COMMON.md`, `COLLAB.md`(실시간 협업 규칙), `RELEASE-CHANNELS.md`(배포 절차)
3. `icarus-field-hud/TASKS.md` 맨 아래부터 위로(최신 기록이 아래). 약 1000줄
4. 기능별 문서: `OPTIMIZATION.md`, `GAME-NEWS.md`, `MAP-*.md`, `ACTIVITY-REVIEW.md`, `LAYOUT-REVIEW.md` 등
5. 구조 설명: `HANDOFF.md`(11-14 기준이라 일부 낡음, §3 데이터 흐름·좌표는 여전히 유효)

## 3. 현재 버전 (2026-11-16 12:00)
| 채널 | 버전 | 담당 | 비고 |
|---|---|---|---|
| 정식(stable) | **2026.11.16.15** | Codex | 사용자 PC 설치·해시 일치 확인됨(Codex 기록, 11-16 10:23) |
| 베타(beta) | **2026.11.16.100** | Claude | = .16.15 + 최적화 복구 수정. PC는 `beta.txt` 없어 미적용 |
| 싱글 아이템 도구 | 0.3.4 | Codex | 게시됨. **실제 아이템 지급은 한 번도 성공 확인 안 됨** |

배포 규칙(RELEASE-CHANNELS.md): GitHub Actions **Publish HUD channel**(`.github/workflows/release.yml`)만 사용. 입력 = channel / source(전체 SHA) / version(YYYY.MM.DD.N, 채널 안에서 증가) / notes. 동시 실행 차단·해시 검증·채널 이력 검사 포함. **새 채널 배포의 source는 이전 같은 채널 배포 source를 조상으로 포함해야** 합니다(아니면 "discard previous channel history" 오류 → 이전 source를 merge).
게임 실행 중에는 설치 파일을 바꾸지 않습니다(updater가 게임 종료 후 적용).

## 4. 기능 현황
### 완료(정식 반영)
- 제작 계산·재료 트리·작업대 구분, 성장 코치(서버별 계획), 네비/나침반 목표
- 지도: 5개 맵 + 전초기지, 지형 이미지, 지역 이름(한국어), **맵 파일에서 읽은 전체 동굴**(레벨 1/2/3/M, 수중 파란색, 관통 ⇄, 동굴별 위험 생물·광석 수), 심층 광맥·이그조틱(붉은 이그조틱 포함)·보스, 탐험 안개, 파티원 표시, 내 서버/친구 서버 구분
- 동물: 유전 7스탯 자동 읽기(창 열 때 1회), 교배 확률 1~8 단계 차트, 관측 기록
- 활동 기록·업적 54개·사용 시간 칭호, 생활 집계(마우스 합계만, 설정에서 끄기)
- 게임 공식 소식 탭 + 한국어 번역 + 친구 자동 공유(`news/ko.json`)
- 게임 최적화(서버장용/개인용 그래픽 프리셋, 백업·복원, CPU/RAM/GPU 전후 측정)
- 마우스 올림 도움말(.16.15), 항상 위, 게임 끄면 HUD도 종료, 자동 업데이트(정식/베타 채널)
- 안전장치: 튕김 위험 읽기(fog) 격리 `features_off.txt`, `safe_mode.txt`, 충돌 진단(diag.js)

### 베타에만 있음 (정식 승격 대기)
- 최적화 복구(.16.100): "백업으로 강제 복원" 버튼(일반 복원이 막혔을 때만 표시), 실제 오류 이유 표시, 게임 버전에 없는 선택 설정 4개 건너뜀. 테스트 180개 통과. 소스 브랜치 `claude/optimizer-recover`

### 미완료·미검증 / 남은 문제 (우선순위 순)
1. **[보안] 소식 공유 토큰 권한이 너무 넓음.** 사용자 PC에 저장된 fine-grained 토큰이 `icarus-field-hud` 저장소 Contents RW → 유출 시 `manifest.json`/`releases`를 바꿔 모든 친구 HUD에 코드 주입 가능. 해결: 소식 전용 공개 저장소(예: `d0ngkyu/icarus-hud-news`) 생성 → 그 저장소만 허용한 새 토큰 → `source/app/news-publisher.js`의 `ENDPOINT`, `source/app/news.js`의 `SHARED` 주소 교체 → 기존 `news/ko.json` 이동 → 옛 토큰 폐기. 저장소·토큰 생성은 사용자 조치 필요(TASKS NEWS-REPO-049).
2. **[P0] 게임 종료/로비 이동 시 네이티브 충돌**(EXIT-CRASH-022). 엔진의 Prospect/Voxel 복원 → PreExit 중 충돌. 모드 원인 여부 미확정. 다음: 안전모드로 재현 → 모드 없이 비교.
3. **[P0] 저장·재접속 안정성**: 호스트용 수동 저장의 실제 완료 미검증.
4. **최적화 정식 반영**: 베타 .16.100 검토 후 정식 승격. 아직 "다음 게임 종료 때 적용" 예약 기능 없음(HUD가 게임과 함께 꺼져 적용 시점이 어려움 — 제안됨).
5. **[P1] 경량화 실측**(HUD 켬/끔, 탭별 CPU·RAM, FPS는 측정 수단 없음).
6. **[P1] 지도 신뢰도**: 생성 후보/최근 관측/소진/미수신 구분, 서버 전환 시 타이머 섞임 방지.
7. 동굴 데이터: 손으로 배치한 동굴(HAND, 약 15곳) 광석 수 없음(폭으로만 레벨). 수중 판정은 N10 한 곳으로만 icarusintel과 대조.
8. 동물 교배: 실제 새끼 관측과 모델 오차 비교 필요(모델 확률이 공식 확률은 아님).
9. 싱글 아이템 도구: 0.3.4 개인 호스트 허용 수정 후 **실제 F11 지급 시험 필요**(돌 1개). 수치 조정 도구(solo-tuner): 패키징·실게임 적용 미완료.
10. 화면 사용성 회귀(작은 창/큰 글씨/키보드)를 릴리스 체크에 포함.

## 5. 개발·검증 방법
- 테스트: `cd source && npm i fengari && NODE_PATH=<fengari 경로> node --test tests/*.test.cjs` (현재 175~180개), `python3 tests/animals_read_once.py`(lupa 필요)
- Lua 모드: `source/mod/Scripts/main.lua`(게임 읽기, 0.75초 tick), `animals.lua`, `game_control.lua`. 새 네이티브 읽기는 튕김 위험 → `on(feat)` 게이트와 `step()` 진단 마커 필수
- 화면: `source/mod/hud/index.html`(약 960KB 단일 파일, 데이터 JSON 내장) + `layout.js`, `optimization.js`, `news.js`, `hover-help.js` 등 분리 모듈
- 앱: `source/app/main.js`(창·IPC·게임 감시·업데이트), `updater.js`(채널·다운그레이드 차단·롤백), `optimizer.js`, `news*.js`, `activity.js` + `ActivityCounter.exe`(C#)
- 데이터 도구: `source/tools/*.py`(pak 추출·동굴·지도), `release.cjs`(빌더)
- 사용자 PC 경로: 게임 `C:\Program Files (x86)\Steam\steamapps\common\Icarus`, 모드 `...\Binaries\Win64\ue4ss\Mods\IcarusHUD\`, 앱 설정·최적화 백업 `%APPDATA%\IcarusHUD\`

## 6. 협업 규칙 핵심 (Gemini 포함 3자)
- 작업 시작 전 `git pull`, TASKS.md 맨 아래 `## 진행 중 · <AI> · <섹터>` 한 줄 기록 후 push. 다른 AI가 잡은 섹터 파일은 고치지 않음.
- 브랜치에서 작업(`gemini/<주제>`), 테스트 통과 후 push. 상대 작업의 문제는 TASKS에 `리뷰` 한 줄 또는 PR 댓글.
- 배포는 Actions 한 경로로만. 채널 담당(현재 정식=Codex, 베타=Claude)과 Gemini의 채널은 **사용자 결정 필요**(제안: Gemini는 브랜치·PR까지, 배포는 담당 AI).
- 커밋 작성자: `user.name=d0ngkyu`, `user.email=d0ngkyu@users.noreply.github.com`. 사용자 개인 이메일·토큰을 커밋/문서에 넣지 않음.
- 게임 실행 중 설치 파일 교체·게임 강제 종료·세이브 수정 금지. 자동 게임 조작(자동 채굴·이동 등)은 제거된 기능이며 다시 넣지 않음.
- 기록에는 "검증됨"과 "미검증"을 구분해 적음.

## 7. 열린 브랜치 (main에 없는 커밋)
| 브랜치 | 상태 |
|---|---|
| `claude/optimizer-recover` | 베타 .16.100 소스. 정식 승격 검토 대상 |
| `codex/solo-items` (12) | 싱글 아이템 도구 0.3.4. HUD와 별개 제품 |
| `codex/solo-tuner` (2) | 수치 조정 도구 소스만 |
| `claude/cave-ore-dlc2`, `codex/animals-and-exit`, `codex/map-selection*`, `codex/playful-updates`, `codex/v1-polish`, `codex/collaboration-hub-link` | 내용은 이미 main에 반영됐거나 기록용. 정리 대상 |

## 8. 이 묶음에 없는 것
- 배포 산출물 `releases/`, `files/`(GitHub에 있음), 지도 webp·아이콘 원본 일부(배포본에 있음)
- 사용자 PC에만 있는 Codex 작업 폴더(`C:\Users\PC\Documents\Codex\...`): 작성 시점에 PC 연결이 끊겨 확인 못 함. Codex 기록상 작업 결과는 모두 GitHub에 push됨
- 비밀값: 번역 API 키, 소식 공유 토큰(PC에 암호화 저장, 공유 금지)

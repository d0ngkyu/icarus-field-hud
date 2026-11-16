# Icarus Field HUD — 협업 인수인계 (Gemini용)

작성: Claude · 2026-11-16 12:00 KST 최초, **21:55 갱신**(main `70124a4` 기준)
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

## 3. 현재 버전 (2026-11-16 21:55 갱신)
| 채널 | 버전 | 담당 | 비고 |
|---|---|---|---|
| 정식(stable) | **2026.11.16.16** (source `bb511aa`) | Codex (이번 .16만 사용자 결정으로 Claude가 배포) | **.17 배포를 Codex가 지금 진행 중**(CODEX-INTEGRATION-060, PR37, source `470186e`). 끝나면 TASKS 맨 아래에 완료 기록이 붙음 |
| 베타(beta) | **2026.11.16.109** (source `fec345d`) | Claude | 첫 설치 진행 창. PC는 `beta.txt` 없어 미적용 |
| 설치기 | `IcarusHUD-Setup.exe` (GitHub 릴리스 v1.0, 112MB) | Claude | 친구용 버튼 하나 설치. 코드 서명 없음 → SmartScreen 경고 |
| 싱글 아이템 도구 | 0.3.4 | Codex | 게시됨. **실제 아이템 지급은 한 번도 성공 확인 안 됨** |

배포 규칙(RELEASE-CHANNELS.md): GitHub Actions **Publish HUD channel**(`.github/workflows/release.yml`)만 사용. 입력 = channel / source(전체 SHA) / version(YYYY.MM.DD.N, 채널 안에서 증가) / notes. 동시 실행 차단·해시 검증·채널 이력 검사 포함. **새 채널 배포의 source는 이전 같은 채널 배포 source를 조상으로 포함해야** 합니다(아니면 "discard previous channel history" 오류 → 이전 source를 merge).
게임 실행 중에는 설치 파일을 바꾸지 않습니다(updater가 게임 종료 후 적용). **Gemini는 배포하지 않습니다.**

## 3-1. 12:00 이후 있었던 일 (TASKS 051~060 요약)
| ID | 누가 | 내용 | 상태 |
|---|---|---|---|
| REDEXO-BLOOM-051 | Claude | 지도 레드 엑조틱 식물은 꽃 핀(채집 가능) 것만 표시, 감지 거리 표시 | .16 정식 포함, 실게임 미확인 |
| FIELD-ASSISTANT-052 | **Gemini 초안** → Claude 통합 | 원정 도우미(탐사 브리핑 TOP3·동굴 코스·제작 세트). 사용자 결정으로 미니 타이머·야간 감광은 뺌 | .16 정식 포함 |
| EXPLORE-MODE-053 | Claude | 설정 '탐험 모드': 가 본 곳만 지도 표시(치트 느낌 줄이기). 기본 꺼짐 | .16 정식 포함 |
| PATCH-COMPAT-054 | Claude | 게임 업데이트 호환 점검(Steam buildid·UE4SS.log 읽기 전용) + 매주 금요일 14:42 KST 클라우드 예약 점검 | .16 정식 포함 |
| PROSPECT-SAVE-055 | Claude | 내 세이브(혼자/방장 월드)에서 심층 광맥·레드 식물 위치 읽어 지도 표시 | .16 포함, Codex가 .17에서 ProspectID 일치 검사 보강 |
| CLEANUP-056 | Claude | 창 밖 이동 차단(보안), 세이브 읽기 비동기, 지도 저장 묶음 | .16 정식 포함 |
| STABLE-057 | Claude | 사용자 결정으로 정식 .16을 Claude가 1회 배포 | 완료 |
| INSTALLER-058/059 | Claude | 친구용 설치기 + 첫 설치 진행 창 | 베타 .109 / .17에 포함 예정 |
| CODEX-INTEGRATION-060 | Codex | 048~059 재검토: 세이브 서버 격리, 강제 복원 경합, 윈도우 줄바꿈(CRLF) 시험 3건 수정 → 202검사 | **정식 .17 배포 진행 중** |

교훈(Gemini 관련): 지난번 Gemini 초안은 옛 TASKS 사본 기준이라 **작업 번호가 겹쳤습니다(050)**. 다음부터는 GitHub 최신 TASKS.md 맨 아래 번호를 보고 다음 번호를 쓰고, zip으로만 작업할 때는 번호 대신 `GEMINI-<주제>`로 적어 주세요. 또 Windows에서 시험할 때 줄바꿈(CRLF) 때문에 정규식 시험이 깨진 적이 있으니 시험 입력 줄바꿈을 정규화하세요.

## 4. 남은 일 (우선순위 순, 21:55 기준)
1. **[보안] 소식 공유 토큰 권한이 너무 넓음**(NEWS-REPO-049, 보류). 토큰이 `icarus-field-hud` 저장소 전체 쓰기 → 유출 시 모든 친구 HUD 자동업데이트에 코드 주입 가능. 해결: 소식 전용 공개 저장소 + 그 저장소 전용 토큰 → `news-publisher.js` ENDPOINT, `news.js` SHARED 주소 교체 → `news/ko.json` 이동 → 옛 토큰 폐기. **저장소·토큰 생성은 사용자 조치 필요.**
2. **[P0] 게임 종료/로비 이동 시 네이티브 충돌**(EXIT-CRASH-022). 모드 원인 여부 미확정. 안전모드 재현 → 모드 없이 비교.
3. **[P0] 저장·재접속 안정성**: 호스트용 수동 저장의 실제 완료 미검증.
4. **실게임 확인 대기**: 세이브 읽기 좌표 정확도, 꽃 표시, 원정 도우미, 탐험 모드, 호환 점검(.16/.17 기능 전부 실게임 미확인).
5. **[P1] 경량화 실측**(HUD 켬/끔, 탭별 CPU·RAM; FPS 측정 수단 없음).
6. **[P1] 지도 신뢰도**: 생성 후보/최근 관측/소진/미수신 구분, 서버 전환 시 섞임 방지.
7. 생물 스폰 구역 지도(D_AISpawnZones.json 164행 있음, 구역 경계 도형은 지도 레벨 파일에서 추출 필요).
8. 화면 정리 후보: 탭 10개 정리안, 지도 레이어 묶음, Electron sandbox 켜기(실제 확인 필요).
9. 설치기 후속: 재설치 시 `taskkill /F` 사용, 제거 후 게임 mod 폴더 잔존 점검.
10. 동굴 HAND 15곳 광석 수 없음, 동물 교배 모델 실측 비교, 싱글 아이템 도구 F11 실제 지급 시험(돌 1개), solo-tuner 패키징.

**Gemini에게 맞는 일(제안)**: 게임 실행·PC 접근이 필요 없는 4번 외 항목 — 7(스폰 구역 데이터 정리), 8(화면 정리안 초안), 6(지도 표시 로직 시험 추가), 시험 보강. 시작 전 TASKS 맨 아래에서 다른 AI가 잡은 섹터인지 꼭 확인.

## 5. 개발·검증 방법
- 테스트: `cd source && npm i fengari && NODE_PATH=<fengari 경로> node --test tests/*.test.cjs` (현재 202개, .17 기준), `python3 tests/animals_read_once.py`(lupa 필요)
- Lua 모드: `source/mod/Scripts/main.lua`(게임 읽기, 0.75초 tick), `animals.lua`, `game_control.lua`. 새 네이티브 읽기는 튕김 위험 → `on(feat)` 게이트와 `step()` 진단 마커 필수
- 화면: `source/mod/hud/index.html`(약 960KB 단일 파일, 데이터 JSON 내장) + `layout.js`, `optimization.js`, `news.js`, `hover-help.js` 등 분리 모듈
- 앱: `source/app/main.js`(창·IPC·게임 감시·업데이트), `updater.js`(채널·다운그레이드 차단·롤백), `optimizer.js`, `news*.js`, `activity.js` + `ActivityCounter.exe`(C#)
- 데이터 도구: `source/tools/*.py`(pak 추출·동굴·지도), `release.cjs`(빌더)
- 사용자 PC 경로: 게임 `C:\Program Files (x86)\Steam\steamapps\common\Icarus`, 모드 `...\Binaries\Win64\ue4ss\Mods\IcarusHUD\`, 앱 설정·최적화 백업 `%APPDATA%\IcarusHUD\`

## 6. 협업 규칙 핵심 (Gemini 포함 3자)
- 작업 시작 전 `git pull`, TASKS.md 맨 아래 `## 진행 중 · <AI> · <섹터>` 한 줄 기록 후 push. 다른 AI가 잡은 섹터 파일은 고치지 않음.
- 브랜치에서 작업(`gemini/<주제>`), 테스트 통과 후 push. 상대 작업의 문제는 TASKS에 `리뷰` 한 줄 또는 PR 댓글.
- 배포는 Actions 한 경로로만. 채널 담당: 정식=Codex, 베타=Claude. **Gemini는 브랜치·PR까지만 하고 배포하지 않는다**(2026-11-16 사용자 결정). Gemini 변경은 담당 AI가 검토 후 배포.
- 커밋 작성자: `user.name=d0ngkyu`, `user.email=d0ngkyu@users.noreply.github.com`. 사용자 개인 이메일·토큰을 커밋/문서에 넣지 않음.
- 게임 실행 중 설치 파일 교체·게임 강제 종료·세이브 수정 금지. 자동 게임 조작(자동 채굴·이동 등)은 제거된 기능이며 다시 넣지 않음.
- 기록에는 "검증됨"과 "미검증"을 구분해 적음.

## 7. 열린 브랜치 (21:55)
| 브랜치 | 상태 |
|---|---|
| `codex/review-claude-060` | Codex .17 정식 통합(PR37). 진행 중 — 건드리지 말 것 |
| `claude/field-assistant` | 베타 .109 소스(051~059 누적). .17에 흡수 예정 |
| `claude/optimizer-recover`, `claude/redexo-bloom` | .16에 이미 포함. 정리 대상 |
| `codex/solo-items` / `codex/solo-tuner` | 싱글 도구(HUD와 별개 제품) |
| 그 외 `claude/cave-*`, `codex/*` 다수 | 이미 main 반영 또는 기록용. 정리 대상 |

## 7-1. 다른 프로젝트
- 등록된 프로젝트는 Icarus Field HUD 하나뿐(ai-collaboration PROJECTS.md).
- 사용자가 **헬다이버즈 2 편의 프로그램**을 만들고 싶다고 한 적 있음 — 아직 저장소·작업 없음. 새 게임은 **별도 프로젝트**로 시작하고 Icarus 저장소에 섞지 않음.

## 8. 이 묶음에 없는 것
- 배포 산출물 `releases/`, `files/`(GitHub에 있음), 지도 webp·아이콘 원본 일부(배포본에 있음)
- 사용자 PC에만 있는 Codex 작업 폴더(`C:\Users\PC\Documents\Codex\...`): 작성 시점에 PC 연결이 끊겨 확인 못 함. Codex 기록상 작업 결과는 모두 GitHub에 push됨
- 비밀값: 번역 API 키, 소식 공유 토큰(PC에 암호화 저장, 공유 금지)

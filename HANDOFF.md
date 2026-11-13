# Icarus Field HUD: 작업 인수인계 (Claude → Codex)

최종 갱신: 2026-11-14 · 작성: Claude · 현재 배포 버전: **2026.11.14.3**

## 0. 한 줄 요약
게임 Icarus(UE4, Steam)용 **두 번째 모니터 HUD**입니다. 게임 안에서는 **UE4SS Lua 모드**가 게임 상태를 읽어 파일로 내보냅니다. 게임 밖에서는 **Electron 프로그램**이 그 파일을 받아 HTML 화면(제작 계산, 네비, 지도, 성장 코치)에 보여 줍니다. 업데이트는 이 GitHub 저장소의 `manifest.json`과 `files/`를 통해 자동으로 배포됩니다.
사용자는 프로그래밍을 모릅니다. "가장 간단하고 잔고장 적게"가 최우선입니다. UI 문구는 모두 한국어입니다.

## 1. 역할 분담 (합의됨)
| 담당 | 범위 |
|---|---|
| **Codex** | `source/app/main.js`의 **live.js 실시간 파일 읽기**(createWindow 안의 `tick`/`setInterval(tick,200)` 부분), `source/app/preload.js`의 **초기 데이터 전달**, `source/app/updater.js`의 **경로 검증**(`findGame`, `askGame`, `target`, `isGame`, `registerApp`/`shortPath`) |
| **Claude** | 모드 `source/mod/Scripts/main.lua`, 화면 `source/mod/hud/index.html`, 튕김 진단 `source/app/diag.js`, 맵 파일 추출 `source/app/extract.js`·`levjob.js`, 데이터 추출 도구 `source/tools/*`, 배포(`build_release.py` 실행 후 push) |

- **겹치는 곳**: `main.js`는 둘 다 손댑니다. Codex는 위 함수만 바꾸고, 다른 부분(업데이트 흐름 `runUpdate`/`start`, 진단 연결, IPC 핸들러)은 Claude 담당입니다.
- **IPC 채널 이름과 `window.hudApp` API 모양**(§5)은 화면(index.html)이 의존합니다. 바꾸면 반드시 서로 알려야 합니다.
- **배포(push)는 한 명만** 합니다. 지금은 Claude가 맡습니다. Codex는 `source/`만 고치고 커밋하면, Claude가 빌드해서 `manifest.json`/`files/`를 갱신합니다. 둘이 동시에 `files/`를 만들면 해시가 꼬입니다.

## 2. Claude 작업 폴더
- 작업 공간은 Claude의 클라우드 컨테이너(Linux)라서 **Codex가 직접 볼 수 없습니다**. 그래서 원본을 이 저장소 `source/`에 모두 올렸고, **기준 원본은 `source/`**입니다.
  - 참고용 Claude 쪽 경로: `/home/claude/app/src`(프로그램), `/home/claude/mod`(모드·화면), `/home/claude/tools`(도구), `/home/claude/release`(빌드 결과)
- 사용자 PC 설치 위치:
  - 게임: `C:\Program Files (x86)\Steam\steamapps\common\Icarus`
  - 모드: `...\Icarus\Icarus\Binaries\Win64\ue4ss\Mods\IcarusHUD\`
    - `Scripts\main.lua`, `Scripts\bp_names.lua`, `hud\index.html`, `hud\icons.webp`, `hud\fonts\`, `hud\maps\*.webp`, `hud\live.js`
  - 사용자 본인의 프로그램: `...\Mods\IcarusHUD\app\IcarusHUD.exe` (코드는 `app\resources\app\*.js`, asar 없음)
    - 같은 위치에 0바이트 `app.asar`가 남아 있습니다. Electron은 `app` 폴더를 먼저 읽으므로 무해합니다.
  - 친구들은 zip(Release `v1.0`)을 아무 데나 풀고 실행합니다. 프로그램이 게임 폴더를 찾아 모드를 설치합니다.

## 3. 구성과 데이터 흐름
```
[게임] UE4SS v3 (dwmapi.dll + ue4ss/UE4SS.dll) → Mods/IcarusHUD/Scripts/main.lua
   0.75초마다 autoTick: 가방, 위치, 주변 물체, 탐험 기록, 진행도 읽기
   → hud/live.js 덮어쓰기:  window.__icarusLive&&window.__icarusLive({...});
[프로그램] Electron 45 (source/app)
   main.js: live.js 상태를 200 ms마다 확인 → 바뀌면 내용을 IPC 'live'로 페이지에 전달
            페이지 파일(index.html)이 바뀌면 자동 새로 고침
            업데이트: 시작 5초 뒤, 30분마다, 게임이 다시 켜질 때(live.js가 2분 넘게 멈췄다 다시 바뀔 때)
   preload.js: window.hudApp API 노출
[화면] hud/index.html (단일 파일, 약 860 KB, 게임 데이터 JSON 내장 <script id="d">)
   hudApp.onLive(txt) → eval 대신 __icarusLive 호출로 처리 (프로그램 밖에서는 live.js를 400 ms마다 다시 읽음)
[게임으로 보내기] 클립보드 문자열을 게임 안 모드가 읽음
   ICARUSHUD|x|y|z|k=kind|q=item:target,...|h=x,y,z|      (나침반 목표, F7)
   ICARUSCRAFT|recipe*count@sets|...|q=...|                 (부품 대기열, F6)
```

### live.js 메시지 필드 (main.lua → 화면)
`t` 순번, `auto` 자동 여부, `w` 월드 이름(Terrain_016 올림푸스 / 017 스틱스 / 019 프로메테우스 / 021 엘리시움 / 022), `p` [x,y,z,yaw](cm), `inv` 가방, `box` 근처 보관함, `lm` 표시물 목록 `[["종류:이름",x,y,z,(추가)],…]`, `ore` 광석, `prog` 레벨·해금, `fog` 탐험 기록, `wp` 나침반 목표, `msg` 알림.

- `lm` 종류 접두사
  - `c:` 동굴 입구(근처) · `w:` 맵 전체 동굴 · `d:<Row>` 심층 광맥(D_OreDeposit 행) · `e:` 광맥 자리(종류 모름) · `x:` 엑조틱
  - `g:` 간헐천 · `b:<Row>#<id>` 월드 보스(5번째 값 1=처치됨) · `a:` 동물(표시 안 함)
- `fog`: `{cx,cy,ts,o,r:[hex 행...]}`. 1비트가 1타일이고 1=탐험함. `o`=1이면 행이 X, `o`=2이면 행이 Y.

### 좌표·지도
- 월드 범위 ±403200 cm(큰 맵), 아웃포스트 ±100800 cm. 값은 `D_WorldData.GridBounds`에서 왔습니다.
- HUD 기본 회전 `rot=1`이 인게임 지도와 같습니다(화면 오른쪽=+X, 아래=+Y). 칸 이름은 50400 cm 격자 A1~P16입니다.
- 지도 그림 `hud/maps/<World>.webp`(2048px)는 게임 pak의 `VisualMapTex_*`(Oodle 압축, DXT1 512² × 8×8 타일)를 `tools/mapbuild.py`로 합친 것입니다.
  - 타일 배치: 열 = 7−y, 행 = 7−x. 그림 왼쪽→오른쪽이 +Y, 위→아래가 −X.

## 4. 업데이트 시스템 (`updater.js` + `tools/build_release.py`)
- `manifest.json`: `{version, notes, config, files:[{p, n(크기), h(sha1), once?}]}`
  - 경로 규칙: `game/...` = Icarus 게임 폴더 기준, `app/...` = 프로그램 코드 폴더(`resources/app`) 기준
  - `once: 1`: 없을 때만 설치(UE4SS 로더, ini, mods.txt, UEHelpers, Keybinds). 이미 UE4SS를 쓰는 사람의 설정을 보존하기 위해서입니다.
  - 받는 주소: `https://raw.githubusercontent.com/d0ngkyu/icarus-field-hud/main` + `/manifest.json`, `/files/<p>`
- 동작: sha1이 다른 파일만 받아 `.new`로 쓴 뒤 rename. `app/` 파일이 바뀌면 프로그램이 스스로 다시 시작합니다.
- 빌드: `python3 source/tools/build_release.py <버전> "<노트>"` 실행 후 `manifest.json`·`files/`를 커밋하고 push합니다.
  - 버전 형식: `YYYY.MM.DD.N`. 화면 index.html의 `__HUD_VERSION__`이 이 버전으로 바뀝니다.
  - 지금은 경로가 Claude 컨테이너 기준으로 적혀 있습니다. Codex가 직접 빌드한다면 상단 경로를 `source/` 기준으로 바꿔야 합니다.
- **zip(프로그램 본체 exe)**: `@electron/packager --no-asar`로 만들고 `seticon.js`로 아이콘을 넣습니다. GitHub Release에는 사용자가 직접 올립니다(Claude 세션은 Release 생성 권한이 없음).

### 경로 검증 (Codex 담당) 메모
- `findGame` 우선순위: `HUD_GAME_DIR` 환경변수(시험용) → `cfg.game` → 프로그램이 모드 폴더 안에 있으면 7단계 위 → 레지스트리·libraryfolders.vdf의 Steam 라이브러리.
- `isGame(d)`: `d/Icarus/Binaries/Win64/Icarus-Win64-Shipping.exe`가 있는지.
- `target()`은 `game/`·`app/` 접두사만 허용합니다. **`..`로 상위 폴더를 벗어나는지 검사하는 부분은 아직 없습니다** → 검증 추가가 필요합니다.
- `registerApp`: 모드 폴더의 `app_path.txt`에 exe의 8.3 짧은 경로를 기록합니다. 한글 폴더 문제 때문이고, Lua `os.execute`가 이 경로로 HUD를 켭니다.

## 5. window.hudApp (preload) API: 화면이 쓰는 것
`state()`, `toggleTop()`, `toggleCompact()`, `minimize()`, `hide()`, `info()` → `{version, app, game, macros, last}`, `setMacros(on)`, `checkUpdate()`, `diagStatus()`, `diagReport()`, `setSafe(on)`, `setModOn(on)`, `onState(fn)`, `onLive(fn)`, `onUpd(fn)`, `onDiag(fn)`

- IPC 이벤트(main → 페이지): `live`(live.js 원문), `state`, `upd`, `diag`
- 화면은 `hudApp`이 없거나 함수가 빠져 있어도 동작해야 합니다(브라우저에서 바로 열 때 대비). 새 API를 추가할 때는 화면 쪽에서 존재 여부를 확인하는 코드가 이미 있습니다.

## 6. 모드(main.lua) 주요 동작
- 키: F8 보기, F9 추가, F10 다시 읽기, F7 나침반 목표
  - F3~F6 반자동(상자에서 꺼내기, 자동 이동, 자동 채굴, 부품 대기열)은 `macros_on.txt`가 있을 때만 동작합니다. 기본은 꺼짐.
- 스위치 파일(모드 폴더)
  - `macros_on.txt`: 반자동 기능 켜기
  - `dev.txt`: 업데이트를 만드는 PC(사용자 본인)에서만 놓음
  - `safe_mode.txt`: 안전 모드
  - `features_off.txt`: 줄마다 끌 기능 이름 하나(fog/bosses/worldmarks/landmarks/progress/macros)
  - `diag_step.txt`: 모드가 지금 하고 있는 작업. 튕김 원인 추정용.
- 게임 함수 메모: `IcarusWorldSettings`(맵 조각마다 하나, 66개 정도), `MapManager_C.FogData`, `WorldBossSpawner`, `ResourceDeposit.Type`(D_OreDeposit 행), `PlayerState:ServerMovePersonalWaypoint`

## 7. 지금 상태·알려진 문제·할 일
- 2026-11-13 23:34 **게임 튕김**(EXCEPTION_ACCESS_VIOLATION 0x78, 호출 순서에 UE4SS). 원인은 확정되지 않았습니다.
  - 그날 새로 넣은 근처 동굴 액터 읽기, 게임 안에서 큰 맵 파일 복사, 이른 시점 탐험 기록 읽기를 빼거나 늦췄습니다. 그 뒤 23:39 세션은 안정적이었습니다.
- **안 가 본 곳의 동굴**: 서버 접속(클라이언트) 상태에서는 모든 `IcarusWorldSettings.CaveLocations`가 비어 있습니다.
  - 그래서 게임 pak의 맵 레벨 파일(`Terrain_0xx.umap/uexp`)에서 뽑을 계획입니다. 프로그램의 `levjob.js`가 `dev.txt` PC에서 `levelraw/`로 원본을 복사하고, `levels.txt`에 경로 목록을 남깁니다.
  - 그다음 Claude가 Oodle 압축을 풀어 동굴 위치·크기를 뽑고 `hud/caves/<World>.json` 같은 형태로 넣을 예정입니다. **이 부분은 Claude가 진행 중입니다.**
- 월드 보스 표시: 들어가 있지만, 게임에서 실제로 보이는지 확인을 기다리는 중입니다.
- 지도 그림: 올림푸스·스틱스만 배포 중입니다. 프로메테우스·엘리시움·022·아웃포스트는 원본만 꺼내 둔 상태입니다(모드 폴더 `mapraw_*`).
- 심층 광맥 종류는 탐사(서버)마다 달라서, 자리마다 최신 값만 남기고 6시간 넘은 값은 흐리게 표시합니다.
- 사용자 PC의 HUD 프로그램이 예전 버전으로 계속 떠 있던 문제가 있었습니다. 2026-11-14 00:10에 최신 파일을 직접 넣었고, 트레이에서 종료 후 다시 켜야 반영됩니다.

## 8. 지켜 주세요
1. 사용자 PC에서 이미 동작하는 경로와 파일 이름(모드 폴더 구조, `live.js` 형식, 클립보드 형식, IPC 이름)을 함부로 바꾸지 않습니다.
2. 게임 안 Lua에서 UObject를 다룰 때는 `IsValid`와 `Default__` 제외를 지킵니다. 월드에 들어가기 전에는 읽지 않습니다(`WORLD_READY`). pcall로는 네이티브 크래시를 막을 수 없습니다.
3. 사용자에게 보이는 모든 문구는 한국어로, 짧고 쉽게 씁니다.
4. 시험: Linux에서 `xvfb-run electron`으로 가짜 게임 폴더를 대상으로 시험했습니다(`HUD_GAME_DIR`, `HUD_UPDATE_URL`, `HUD_TEST_YES=1` 환경변수).

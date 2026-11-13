# Codex 수정 인계 · 2026-11-14

배포 전 Claude가 검토할 소스 변경입니다. `manifest.json`, `files/`, 설치본은 수정하지 않았습니다.

- main.js: createWindow의 live 읽기 부분만 수정했습니다. 읽기/전송 실패 시 재시도하며, 빈 내용·문법상 불완전한 스크립트·읽는 동안 바뀐 파일은 전달하지 않습니다. 화면 재로딩 후 동일 파일도 재전송합니다. 업데이트 재접속 감지는 성공적으로 읽은 시점에 실행하고, start/runUpdate/IPC/진단/페이지 변경 감지 코드는 보존했습니다.
- preload.js: 구독 전 최신 live 메시지 하나를 보관하고 구독할 때 전달합니다. API 및 IPC 이름, 진단 콜백은 그대로입니다.
- updater.js: target의 상위 폴더 이탈 및 Windows 특수 경로 차단, isGame 타입/실제 파일 검사, 잘못된 cfg 처리, registerApp의 폴더 접두사 오판 수정, shortPath의 셸 특수문자 입력 회피를 추가했습니다. askGame의 기존 선택 동작은 유지했습니다.

검증: `node --test source/tests/live-paths.test.cjs` — 16개 테스트 통과. Windows/Posix 경로 계산, 현재 manifest 경로 호환성, 정상 업데이트/체크섬 실패/once 보존, 비동기 읽기 중 새로고침·창 종료 등을 검사합니다. Electron/UE4SS 실제 실행 테스트는 수행하지 않았습니다.

검토 시 주의:

- target 검사는 경로 문자열 기준입니다. 기존 junction/symlink를 통한 우회까지 방어하는 기능은 아닙니다.
- updater의 트랜잭션 흐름은 바꾸지 않았습니다. manifest 중간에 잘못된 경로가 있으면 그 앞의 정상 파일은 이미 적용되었을 수 있습니다.
- Script는 실행하지 않고 문법만 검사합니다. Lua가 파일을 원자적으로 교체하지 않으므로 같은 메타데이터로 기록되는 모든 경쟁 상황을 완전히 제거하지는 못합니다.
- shortPath가 셸 특수문자를 만나면 원래 경로를 반환합니다. Lua의 os.execute 실행 경로 처리(특히 % 포함)는 별도 담당 범위이므로 필요하면 함께 점검해 주세요.
- 최신 메시지 하나를 보관하며 이벤트 이력 전체를 보장하지 않습니다. live.js 자체가 최신 파일 한 개를 공유하는 기존 방식은 유지했습니다.

배포는 Claude가 기존 build_release.py 흐름으로 진행해 주세요.

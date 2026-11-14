# 독립 싱글 도구 배포

사용자 지시: 이후 이 프로그램의 수정 완료 시 자동 다운로드/파일 교체 채널까지 갱신한다. 기존 HUD stable/beta 배포와 별개이며 `source/solo-items`와 `standalone/`만 사용한다.

1. 최신 codex/solo-items 및 main/TASKS를 fetch하고 소유권 확인. 한 배포자만 진행.
2. Updater.CurrentVersion을 증가시킨다. Build.ps1 → --self-test, --suite-test 및 변경에 맞는 Windows UI 확인.
3. tools/repak.exe v0.2.3과 두 라이선스를 포함하고 Package.ps1을 실행한다. tools 바이너리는 재다운로드 시 공식 배포본 및 해시를 검증한다.
4. source 변경과 `standalone/releases/<version>/package.zip`을 GitHub의 동일 커밋에 올린다. 이미 게시된 버전 경로는 덮어쓰지 않는다.
5. 생성된 manifest-draft.json의 packageUrl을 `https://raw.githubusercontent.com/d0ngkyu/icarus-field-hud/<위 커밋 전체 SHA>/standalone/releases/<version>/package.zip`으로 채운다.
6. 원격 ZIP SHA256·크기와 내부 파일 검증 후 `standalone/manifest.json`을 별도 커밋한다. 이때부터 클라이언트가 새 버전을 받는다. 실패한 빌드/미완성 소스를 manifest에 노출하지 않는다.
7. 원격 manifest/ZIP 재조회로 공개 확인, TASKS 및 허브 요약 갱신. 원격 공개, PC 앱 적용, 게임 모드 적용, 인게임 결과를 각각 구분한다.

첫 설치는 `%LOCALAPPDATA%/Programs/IcarusSoloTools`. DesktopLauncher.exe를 사용자가 요청한 바탕화면 `아이카루스 싱글 도구.exe`로 복사한다. 이후 앱은 자체 업데이트한다. 개인 설정/세이브/게임 데이터 원문을 배포하지 않는다.

기존 설치 모드가 본 도구 소유인 경우 새 앱 시작 때 종료 상태에서만 Lua 파일 갱신. 데이터 모드 설정은 별도 ‘설정 적용’으로 재생성한다. 업데이트 자체는 사용자가 선택한 수치를 바꾸지 않는다.

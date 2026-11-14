# 아이카루스 아이템 보급소 0.2

현재 설치본의 아이템 템플릿과 기존 HUD 한글 이름을 연결한 Windows 실행 파일입니다. Windows의 .NET Framework와 기존 UE4SS를 사용하며 별도 Python/Node 설치는 필요 없습니다.

0.2: 네이비/샴페인 골드 테마, 검색 목록과 선택한 아이템 카드 분리, 검색 결과 수, 수량 1/10/50/100 프리셋, 하단 모드 설정. 생성 방식과 F11 사용법은 동일합니다.

## 사용
1. 폴더 안의 `IcarusSoloItems.exe`를 더블 클릭합니다. 실행 파일만 다른 곳으로 옮기지 마세요.
2. 게임을 정상 종료하고 **모드 설치 / 갱신**을 누릅니다.
3. 게임을 실행하고 싱글플레이 월드에 입장합니다.
4. 한글 또는 영어로 검색하고 아이템과 수량(1~100)을 고릅니다.
5. **요청 준비**를 누른 뒤 2분 이내에 게임으로 돌아가 **F11**을 누릅니다.
6. 게임 가방에서 실제 지급 결과를 확인합니다. 첫 사용은 돌 1개로 시험하세요.

게임이 실행 중이면 설치/해제를 차단합니다. 기존 HUD 파일과 세이브 파일은 직접 수정하지 않습니다. `IcarusSoloItems`라는 별도 UE4SS 모드만 설치합니다. 게임 종료 후 **모드 사용 해제**를 누르면 다음 실행부터 꺼집니다. 이미 생성된 아이템은 없어지지 않습니다.

## 검증과 제한
- 설치 SDK에서 `BP_IcarusPlayerControllerSurvival.AddItemToInventory(FItemTemplateRowHandle)`, `ItemTemplateLibrary.IsValidName`, `KismetSystemLibrary.IsStandalone` 선언 확인.
- 싱글(Standalone) 판정이 참일 때만 호출합니다. 호스트 멀티플레이도 대상이 아닙니다.
- 2,989개 템플릿: 한글 이름이 있는 항목과 한 개 단위 템플릿만 포함. 같은 아이템의 변형이 별도 행에 표시될 수 있습니다. 게임 업데이트 뒤 목록은 재생성 필요.
- F11을 눌렀을 때만 게임 객체 접근. 상시 스캔/타이머 없음. 요청은 처리 전에 가져가며 재시작 시 폐기하고, 자동 재시도하지 않습니다.
- 게임 함수는 성공 결과를 반환하지 않으므로 UI는 **호출 완료**까지만 표시합니다. 가방 부족, 아이템별 제한, 내구도/충전량, 실제 지급 수량은 실게임 확인이 필요합니다.
- 현재 실게임 생성 시험은 하지 않았습니다. Lua 모의 시험은 실제 Unreal 호출과 크래시 안전성을 증명하지 않습니다.
- 생성은 저장된 월드에 남을 수 있습니다. 기존 월드가 중요하면 게임 종료 상태에서 세이브 사본을 보관하고 별도 싱글 월드에서 첫 시험을 하세요.

## 개발 검증
`IcarusSoloItems.exe --self-test` → `self-test.txt` 기록.

빌드: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File Build.ps1` (.NET Framework 기본 C# 컴파일러 사용).

직접 확인: C# 실행 파일 자체 검사 통과, Lua 모의 시험 5개 통과, 실제 Windows 창과 한글 '철' 검색 결과 확인. 현재 게임이 실행 중이므로 모드 설치 및 실게임 F11 생성 시험은 미실행.

Lua 모의 검증은 개발용 `fengari`를 설치한 환경에서 `node --test test.cjs`로 실행합니다.

UE4SS API 참고: https://docs.ue4ss.com/dev/lua-api/global-functions/executeingamethread.html
게임 데이터 원본과 개인 세이브는 포함하지 않으며, 카탈로그에는 템플릿 ID와 표시 이름만 포함합니다.

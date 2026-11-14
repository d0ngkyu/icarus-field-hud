# ACTIVITY-024

생활 업적30개 추가(총54). HUD 실행 동안 Windows 세션의 전체 화면 마우스 클릭/휠/상대 이동 입력과 60초 이상 무입력 시간을 숫자로만 로컬 저장. 앱/키/좌표 내용 수집 및 네트워크 전송 없음. 설정 OFF와 HUD 종료 시 helper 종료. 절전 공백 제외. 이동량은 raw input 단위이며 실제 거리/픽셀 아님. 절대 좌표 장치 이동은 제외.

Raw Input helper는 이벤트당 할당 없이 합계만 계산, 5초 stdout 전달, 60초 설정 저장. 메모리 초기 약22MiB, CPU 초기 관측0.047초. 실게임 프레임 영향/실물 마우스 정확도는 미검증. 자동 UI 입력은 Raw Input 집계 검증으로 사용하지 않음. 정상 종료 시 helper 종료 확인; 마지막5초 및 비정상 종료 시 마지막 저장 이후 기록 손실 가능.

검증: Node+Fengari95개 통과(skip0), malformed/duplicate snapshot 및 toggle/late callback/threshold tests, 브라우저 합성30개 카드와 숫자5/Shift9 탭 전환·입력칸 제외 확인. 최초 재시험은 NODE_PATH 누락으로 Fengari 실패, 기존 lua-test 의존성 지정 후95개 성공. 새 Lua/게임메모리 접근 없음.

빌드: Windows Framework64/v4.0.30319/csc.exe /nologo /optimize+ /platform:x64 /target:exe /reference:System.Windows.Forms.dll /out:source\app\ActivityCounter.exe source\tools\ActivityCounter.cs

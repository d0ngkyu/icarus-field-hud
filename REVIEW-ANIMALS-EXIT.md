# 2026-11-14 Codex: 종료·동물 상세 검토

## 소유권
Codex: codex/animals-and-exit에서 종료 감시, animals 모듈, 탭, 시험. Claude: 통합/배포 유지. .11의 levjob 및 동굴 위험 변경 보존.

## 실제 PC 확인/복구
- resources/app.asar(13,219바이트) 내부 package는 1.0.1, main.js에는 updater/doctor/watchGame이 없음. resources/app/는 최신 코드였음.
- 게임과 HUD가 꺼져 있음을 확인 후 app.asar를 같은 폴더 app.asar.legacy-20261114로 백업 이동. 설치 소스는 덮어쓰지 않음.
- 일반 HUD 실행 성공, userData/update.log와 diag.json 생성. 로그에서 2026.11.14.11 업데이트 1 changed 확인. 실제 게임을 켜거나 종료하지 않음.
- debugger 포트 기반 시험은 자동 승인 검토가 거부하여 중단. 이후 일반 실행과 파일 기록만 확인.

## 구현
- 3초 간격 프로세스 확인, 2회 연속 부재 시 종료. 조회 실패/업데이트 중 종료 보류 유지. --icarus-auto로 최초 관찰 전 게임 종료도 처리.
- 충돌 알림/진단 실패가 HUD를 계속 살려 두던 분기 제거. 진단은 last-exit-report.txt에 저장. 수동 실행 HUD는 게임을 본 적 없으면 유지. 기존 종료 설정 존중.
- 게임 스레드에서 3초마다 상세 UI 클래스만 검색(최대 8개 검사), 열린 패널 LinkedMount만 읽음. 월드 동물 순회/신규 Hook 없음. UObject를 tick 사이에 보관하지 않음. Lua 오류 시 세션 읽기 중지, animals 진단/차단 지원. **pcall은 네이티브 접근 위반을 막지 못함.**
- 로컬 SDK의 UMG_MountInterface_V2, GeneticsComponent, CreatureGenetics, CreatureSex, StatDisplayMount를 근거로 구현. 게임 data.pak D_GeneticValues의 7개 키와 영문 약어 확인. 한국어 표기는 설명용 번역.
- 유전 값 0~10, 현재 능력치 텍스트, 스탯별 색상 경계, 최대 200개 로컬 저장. 12초 지나면 현재 관찰 무효화. 닫힌 탭은 반복 렌더링 안 함.
- 같은 MountData 종류의 반대 성별끼리 부모 평균/중점 스탯 정렬. **새끼의 확률/보장 범위가 아님.** 돌연변이/혈통/재능 계산 미포함. Cow/Bull 등 다른 MountData 행의 호환성 미확인으로 제외. 액터 이름 식별자이므로 재접속 후 같은 동물이 별도 기록으로 저장될 수 있음.

## 검증 및 남은 일
- Node 39개 통과: 자동 실행 조기 종료, 충돌/진단 실패, 업데이트 동시성, 동물 값/경계/짝 비교 등.
- Lua 5.3 문법 파서, JS 문법, git diff --check 통과. 합성 데이터 브라우저 동물 탭/색상 표시 확인.
- **미검증:** 실제 상세창 viewport 관계/SDK 필드 읽기, 실게임 FPS/안정성, 게임 종료 뒤 Steam 상태, 실제 유전 계산. 단위 테스트가 이를 증명하지 않음.
- 배포 담당: 패키지의 legacy app.asar 제외, 새 animals.lua/animals.js manifest 포함 확인. 게임 종료 상태에서 통합 배포 후 상세창 열기/닫기와 정상 종료 확인. 서버 호스트에서 미검증 네이티브 읽기를 안정성 확정으로 취급하지 말 것.
- 실제 확률 예측은 게임 유전 규칙 검증 후 확장할 미완료 항목. 부모 평균을 확정 예측으로 설명하지 말 것.

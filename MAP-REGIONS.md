# 지도 지역 이름 · MAP-REGION-LABELS-029

정적 atlas 라벨: Olympus 6, Styx 13, Prometheus 20. 미지원 지도/전초기지에는 다른 지도의 이름을 표시하지 않는다. 사용자 번역 예시(큰 강, 드라이 릿지, 막힌 숲)를 반영했다. 한국어는 HUD 번역이며 공식 한국어 locres 대조를 마친 것으로 주장하지 않는다. 확대 시 게임 영문명을 병기한다.

## 근거와 좌표
- 게임 Data.pak `Prospects/D_Biomes.json`의 BiomeName/DisplayName에서 영문명 존재 확인.
- 표시 앵커: 2026-11-16 Icarus Field Guide의 각 interactive 페이지 공개 arealabel left/top 백분율. 지역 중심의 라벨 위치이며 정확한 경계/현재 지역 판정용 데이터가 아니다. 일반 Cave 표시는 지역명 목록에서 제외.
  - https://www.icarusfieldguide.com/maps/olympus/interactive
  - https://www.icarusfieldguide.com/maps/styx/interactive
  - https://www.icarusfieldguide.com/maps/prometheus/interactive
- https://icarusintel.com/ 지도 선택/레이어 구성을 참고. 해당 사이트에서 지역명 좌표를 얻었다고 주장하지 않는다.
- 게임 지도 bounds ±403200 cm, 50400 cm 격자. north-up left→right=+X, top→bottom=+Y. 백분율에서 월드좌표로 변환한 뒤 기존 toS에 맡겨 회전/이동/줌에 함께 대응. Dry Ridge 앵커는 F6.

## 동작 및 제한
- 기본 ON, 기존 mapv.L 저장 방식으로 설정 유지. 레이어 도움말에 지원 지도와 미탐험 처리 명시.
- 12~18px 글자, 외곽선, 화면 밖 라벨 제외, 고정 우선순위로 라벨끼리 겹침 억제. 확대하면 영문명 병기.
- POI 다음/개인 핀·목표·내 위치 이전에 그려 지역명이 동굴 아이콘에 묻히지 않는다. 앵커가 HUD 방문 원 안에 없으면 지역명 불투명도를 14%로 낮춰 미탐험 지형과 함께 어둡게 표시한다. 별도 전체화면 canvas는 만들지 않는다. 클릭/경로/핀 hit 영역을 추가하지 않는다. 게임 메모리 조회, 월드 스캔, 네트워크 요청, 새 타이머 없음.
- 겹쳐 숨겨진 이름은 확대/이동하면 표시된다. 지형의 대표 위치에 붙인 이름이며 경계 폴리곤이나 현재 지역 실시간 판정은 아님.
- Lua/저장/종료/동굴 데이터/활동 집계는 변경하지 않는다. native 게임 종료 충돌을 해결했다고 주장하지 않는다.

## 검증
자동 검사: 지도별 개수/미지원 지도 격리, 좌표와 F6 변환, 4방향 회전·줌·화면 경계·중복 억제, canvas 상태 복원, 모듈 로드 및 미탐험 앵커 밝기. UI/배포/PC 적용 결과는 TASKS.md에 별도 기록.

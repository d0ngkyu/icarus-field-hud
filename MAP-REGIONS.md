# 지도 지역 이름 · MAP-REGION-LABELS-029

정적 atlas 라벨: Olympus 6, Styx 13, Prometheus 20. 미지원 지도/전초기지에는 다른 지도의 이름을 표시하지 않는다. 한국어는 설치 게임 ko-KR Game.locres의 D_Biomes 표기와 39개 모두 대조했다. .16.1 당시 임의 번역으로 달랐던 21개를 .16.2에서 수정한다. 확대 시 게임 영문명을 병기한다.

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

## 2026-11-16 · MAP-REGION-LABELS-031 교정
- 수풀(Grove)은 누락이 아니라 '작은 숲'으로 잘못 번역되어 있었다. 신록 테라스/링 호수/얼어붙은 횡단 지역 등 21개 이름을 게임 한국어로 교정.
- 근거: 설치 pakchunk0-WindowsNoEditor.pak 안 Icarus/Content/Localization/Game/ko-KR/Game.locres. 기존 extract.js openPak/rawRange로 읽고 pyooz0.0.8로 블록 해제, locres.py를 Python -X utf8로 파싱. 게임 파일은 읽기만 수행. 추출 Game.locres SHA256 8753313d1763a705d223060ae1e05115b9efe8f01940a5dfa2f22051010a7d19. 제품에 파서/압축라이브러리/전체 번역 파일은 포함하지 않는다.
- tests/fixtures/regions-ko.json은 해당 게임 번역 중 사용한 39개 키·이름만 담은 회귀 근거. 전체 자산이나 개인정보 없음.
- 지역 찾기 선택창: 현재 지도 이름만 표시, 선택하면 기존 월드좌표로 중심 이동·최소 줌 .22·지역명 ON·따라가기 OFF. 캐릭터/핀/경로/게임 상태는 변경하지 않음. 작은 영역/긴 이름이 축소 시 중복 억제로 안 보일 때 사용.
- 범위 확인: Olympus6/Styx13은 현재 표의 지상 지역 전부와 대응. Prometheus는20개 앵커만 있음. Pro_Abyss(심연) 및 Pro_Null_Arctic_Cave는 범용 지상 라벨에 합치지 않았으며 검증된 별도 위치/층 정보가 없어 추정 좌표를 넣지 않는다. 모든 지도·지하 영역을 완전히 담았다고 주장하지 않는다.
- 검증110개 통과, 브라우저에서 수풀 선택·중심확대·한영표시와 전초기지 목록 비활성 확인, console error0. 초기 시험의 VM window/global 분리 오류는 window.HudRegions 명시로 수정 후 통과. 설치 적용/배포 근거는 TASKS 참조.

# LAYOUT-007 · 첫 화면 개편 묶음

## 변경
- 코치: 성장 로드맵, 목표 이전/다음/직접 선택, 서버별 수동 계획(목표·완료·제작목록·기록) 저장. 다른 계획으로 전환할 때 이전 서버의 실시간 가방/보관함·위치 목표 캐시 제거. 서버 자동 인식은 아님.
- 활동 기록을 7번째 탭으로 분리. 코치의 중복 재료 요약 제거.
- 제작: 검색/만들 목록 유지, 작업대별 제작·재료 목록·제작 구조의 한 화면 전환. 구조는 부품별 이동/상위 복귀, 제작 수량 변경 시 하위 수량 갱신. 보유 재료 합산과 준비완료 안내 제거; 레시피 기준 준비 계획만 표시.
- 작업대에 있는 재료와 다른 보관함/가방을 섞어 실제 제작 가능하다고 표시하지 않음. 특정 작업대의 실시간 재고 수집은 이번 범위에 없음. 게임 내 최종 재료 확인 필요.
- 네비 필터 그룹, 지도 경로/범위 원 사용 도움말, 설정 카테고리, 현재 탭 관련 하단 상태만 표시.
- 동물: 선택 기록 복원, 등록한 같은 actor ID의 상세 정보 자동 갱신, 7개 스탯 방사형 차트/값별 그라데이션/숫자. 1~8 각 수치의 정확한 출생 확률, 0·9·10은 별도로 표시하며 1~8을 100%로 재정규화하지 않음. 기존 시뮬레이션 공식을 변경하지 않음(실게임 검증 전 모델).
- 저장된 동물은 오프라인에서도 열람 가능. 재접속 후 다른 actor ID를 같은 개체라고 임의 병합하지 않음. 처음 등록은 사용자 버튼 1회; 이후 저장 목록/선택 복원, 새 native 스캔 없음.
- 창 고정: Electron 실제 상태로 토글, screen-saver 레벨, 상태 이벤트/문구/실패 안내, 버튼 자식도 no-drag. 독점 전체화면 게임 위 표시 보장은 아니며 실제 Windows 게임 조합은 아직 미검증.
- 새 layout.js/css를 배포 빌더에 포함. 기존 동굴 데이터·함수·Lua 변경 없음.

## 검증
- Node+Fengari 75개 통과. 수치별 확률 합계(0/9/10 포함), 실제 창 고정 상태 모의 IPC, CSS/JS 신규 자산 빌드 포함 회귀 검사.
- 합성 브라우저: 목표 이전/다음·서버별 계획, 조립대→전자 부품→재료 탐색/복귀, 제작수량 키보드 변경, 7축/7행×8단계, 설정 한 카테고리, 기록 탭, 지도 도움말, 창 고정 버튼 응답.
- 1400px 및 760px 창에서 제작/동물 가로 넘침 없음. 최종 새 검증 탭 콘솔 오류 0. 이 결과는 실게임 자료/창 고정 시험이 아님.
- 발견/수정: 필터 DOM을 분리한 도중 document 조회로 라벨을 바꾸려 하면 null 초기화 오류 발생. 분리한 그룹 내부 조회로 수정 후 새 페이지 회귀 확인. 배포 전 해결.
- 초기 화면 구조/차트를 PR #11로 먼저 공개, 검증 보완을 묶어 후속 반영. 정식 Codex/베타 Claude 역할 유지.

## Claude review follow-up
- Confirmed and fixed: switching plans must preserve world memories, home, navigation and current telemetry. Added VM regression test switching away and back; 76 tests pass.
- History renders only when open and changed. Recipe quantities intentionally exclude inventory to avoid workbench readiness claims. Connection remains visible in titlebar tbst (1-second status refresh). Existing tabs already use Ctrl+1..6; history uses Ctrl+7.


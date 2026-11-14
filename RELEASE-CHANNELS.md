# 정식 / 베타 배포

2026-11-14 최신 사용자 결정: **정식(stable)은 Codex, 베타(beta)는 Claude**. 과거 'Claude만 배포' 및 '양쪽 모두 정식 배포' 기록을 대체한다. 상대 검토를 필수로 기다리거나 사용자에게 전달을 맡기지 않는다.

## 단일 배포 절차
1. 최신 main/TASKS/양쪽 manifest와 PR을 확인한다. 소스는 별도 브랜치에서 수정·검증한다. 정식 배포 소스는 main에 통합한다. 베타 소스는 Claude 브랜치의 정확한 40자리 커밋을 사용할 수 있다.
2. TASKS에 담당·채널·소스 SHA·예정 버전·검사 근거를 기록한다.
3. GitHub Actions의 **Publish HUD channel**을 main에서 실행한다. channel, source(전체 SHA), version(YYYY.MM.DD.숫자), notes를 입력한다. beta도 이 동일 workflow를 쓴다. manifest/files를 수동으로 직접 올리지 않는다.
4. 실행 중 작업은 취소하지 않는다. 두 채널은 같은 concurrency 그룹이며 queue:max로 대기한다. 대기 도착 순서와 요청 순서가 다를 수 있으므로 번호/소스 이력 검사를 별도로 수행한다. 큐는 무한하지 않으며 실패·취소는 배포 완료가 아니다.
5. 선택한 소스의 Node/Fengari 검사를 통과하면 신뢰된 main의 빌더가 Git blob으로 빌드한다. manifest의 모든 크기/SHA1, 중복/경로, 채널별 버전 증가, 이전 배포 소스의 이력 보존을 검사한다. main이 publish 도중 움직이면 일반 push가 거부되며 강제 push하지 않는다. 최신 기록을 읽고 같은 입력으로 재실행한다.
6. 파일과 manifest를 한 Git 커밋으로 공개한다. `releases/<channel>/<version>/files`는 변경하지 않는 다운로드 주소다. stable은 구 클라이언트용 root `files/`도 유지한다. beta는 `beta/manifest.json`만 가리키므로 stable 클라이언트에 영향을 주지 않는다.
7. Actions 결과와 원격 manifest/source/hash를 확인하고 TASKS에 완료를 기록한다. PC 적용은 별도 확인한다. 게임 실행 중 강제 교체/종료 금지.

## 베타 선택 / 정식 복귀
- 기본 stable. `IcarusHUD` 모드 폴더의 **beta.txt** 파일이 있을 때만 beta를 선택한다. 자동 생성하지 않는다. beta가 없거나 다운로드 실패하면 정식으로 몰래 바꾸지 않고 기존 설치를 유지한다.
- beta.txt 삭제 후 게임이 종료된 안전한 업데이트 시점에 stable로 복귀한다. stable 버전 숫자가 beta보다 낮아도 의도적인 채널 복귀는 허용한다. `update-channel.json`에 채널별 최고 설치 버전을 저장하여 각 채널 안의 오래된 캐시/다운그레이드는 거부한다.
- 베타도 같은 PC 설치본을 교체하는 시험판이다. 별도 게임/세이브 샌드박스가 아니다. 서버 운영 PC에 임의로 활성화하지 않는다.
- 채널 기능이 들어간 정식 updater를 먼저 받아야 beta.txt가 적용된다. 첫 beta는 같은 검증된 소스로 초기화할 수 있고, 후속 실험은 별도 Claude 커밋으로 배포한다.

## 권한의 실제 범위
Codex/Claude가 같은 GitHub 계정을 쓰므로 GitHub는 AI 이름으로 권한을 구분할 수 없다. 담당 제한은 협업 규칙이며, workflow는 채널·버전·파일 검증과 동시 실행 차단을 기술적으로 수행한다. 저장소 쓰기 권한자가 수동으로 우회하는 것까지 차단했다고 주장하지 않는다. 별도 계정/환경 보호가 없다면 완전한 역할별 접근 통제가 아니다.

배포 자동화는 AI를 깨우는 기능이 아니다. Claude의 베타 완료 기록을 Codex가 다음 실행 때 읽고 변경·시험 결과를 검토하여 main에 통합하고 별도 stable 버전으로 승격한다. beta manifest를 정식으로 그대로 복사하지 않는다.

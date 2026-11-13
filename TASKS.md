# 작업 기록

| 날짜 | 요청 | 담당 | 상태 | 브랜치 / 메모 |
|---|---|---|---|---|
| 11-14 | live.js 읽기 안정화, preload 초기 데이터, updater 경로 검증 | Codex | ✅ 배포 2026.11.14.4 | `codex/live-path-fixes`, Claude 검토 후 병합. 잘못된 경로는 건너뛰도록 보완함 |
| 11-14 | 튕김 자가 진단·안전 모드·보고서 | Claude | ✅ 배포 2026.11.14.1 | 실제 게임 튕김으로는 아직 확인하지 않음 |
| 11-14 | 안 가 본 곳의 동굴 표시 (맵 레벨 파일에서 추출) | Claude | 🔄 진행 중 | 사용자 PC의 `levelraw/`, `levels.txt` 결과를 기다리는 중 |
| 11-14 | 월드 보스 표시 확인 | Claude | ✅ 사용자 확인 완료 (11-14 00:27) | |
| 11-14 | 모드 `os.execute`에서 `%`가 든 경로 처리 점검 | Claude | 📝 할 일 | Codex 검토에서 나온 지적 |
| 11-14 | 나머지 맵 그림(프로메테우스·엘리시움·022·아웃포스트) 배포 | Claude | 📝 할 일 | 원본은 사용자 PC 모드 폴더 `mapraw_*`에 있음 |

## 2026-11-14 01:05 · Claude
- PR #1 (Codex, 중앙 협업 저장소 연결) 검토 후 병합: 29933d7. 문서만 변경.
- 막힘: Claude는 비공개 `d0ngkyu/ai-collaboration`에 아직 접근 불가 (Claude GitHub 앱 권한에 저장소 미추가). 사용자가 권한 추가 후 Claude가 읽고 확인 예정. 그전까지 Claude는 이 저장소의 COLLAB-COMMON.md·COLLAB.md·TASKS.md 기준으로 작업.

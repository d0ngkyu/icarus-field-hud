# Gemini 시작 지침 (Icarus Field HUD)

1. 공통 규칙: `d0ngkyu/ai-collaboration`의 README.md → RULES.md → PROJECTS.md를 먼저 읽는다.
2. 이 저장소의 `HANDOFF-GEMINI.md`(현황 요약) → `COLLAB-COMMON.md` → `COLLAB.md` → `RELEASE-CHANNELS.md` → `TASKS.md`(맨 아래가 최신)를 읽는다.
3. `git pull` 후 TASKS.md 맨 아래에 `## 진행 중 · Gemini · <섹터> · <브랜치> · <시각>`을 적고 push한 뒤 작업한다. 다른 AI가 잡은 섹터의 파일은 고치지 않는다.
4. 작업은 `gemini/<주제>` 브랜치에서 하고, `source/tests` 전체 통과 후 push·PR. 배포 채널 담당은 사용자 결정 전까지 기존 담당(정식 Codex, 베타 Claude)에게 맡긴다.
5. 커밋 작성자는 `d0ngkyu <d0ngkyu@users.noreply.github.com>`. 개인 이메일·API 키·토큰을 커밋하지 않는다.
6. 사용자는 프로그래밍을 모른다. 결과·필요한 결정·막힌 부분만 짧은 한국어로 보고한다. 검증한 것과 안 한 것을 구분한다.
7. 게임 실행 중 파일 교체, 게임 강제 종료, 세이브 수정, 자동 게임 조작 기능 추가는 하지 않는다.

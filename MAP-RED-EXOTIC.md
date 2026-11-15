# 레드 엑조틱 지도

- 게임 D_MetaResourceNodes의 MetaDeposit_Volcanic → D_OreDeposit.Exotic_Red_Raw 확인. 설치 CXXHeaderDump의 BP_IcarusMetaSpawn.Meta Node Handle / BP_ExoticPlantSpawn / BP_Exotic_Plant(ResourceCount) 사용.
- 기존 ResourceDeposit 관측의 d:Exotic_Red_Raw는 심층광맥에서 붉은 별 전용레이어로 분리. R 나무 / P 식물. 기본 켜짐, 레이어별 독립 저장.
- 기존 랜드마크 주기(약30초)에 현재월드의 생성점/식물만 읽음. 클래스당512상한, 유효성·현재월드·유한좌표 검사. 스폰/채집/저장 변경이나 새 네이티브 훅 없음.
- r:Tree 생성 가능한 지점은 실제 가까운 레드 자원관측 전까지 미확인. r:Plant ResourceCount >=0만 상태판정. 누락은 소진 아님. 관측 소진 뒤 양수 재수신 시 다시 활성화. 인접 나무 생성점은 실제 나무 마커와 중복표시하지 않음.
- 로드/복제된 액터만 표시. 전체 맵 고정좌표 데이터셋은 없으며 다른 서버에서 미로딩 생성점·식물은 수신되지 않을 수 있음. 이전 기록은 유지. 재접속/장시간/native 실제읽기는 미검증.
- 위키 참고: https://icarus.wiki.gg/wiki/Red_Exotics (수확형 나무 및 식물 구분). 좌표나 생성확률은 외부 사이트에서 복사하지 않음.
- 147개 Node/Fengari 검사, 붉은 레이어 독립/중복제거/소진·재관측/보라 엑조틱 혼동 방지/외부월드거부 모의 검사. 합성브라우저 마커/상세 검증. 합성 엘리시움 화면은 렌더링시험이며 해당 지형의 자연스폰 주장이 아님.

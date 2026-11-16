(function(root){'use strict';
// Resolve only the hovered/focused control. No polling or whole-page observer.
const tabs={character:'내 캐릭터의 최근 수신 상태를 봅니다. 미수신 값은 실제 수치로 추정하지 않습니다.',map:'지도·자원 후보·관측 상태·서버원 위치를 봅니다. 내 PC가 수신하지 못한 서버 정보는 확인할 수 없습니다.',animals:'보고 있는 동물의 스탯과 저장한 동물, 다음 세대 교배 추정치를 봅니다.',nav:'찾을 대상과 보관함을 골라 위치를 확인합니다. 자동 이동·채집은 하지 않습니다.',craft:'만들 목록의 재료와 작업대별 제작 순서를 계산합니다. 실제 제작은 게임에서 합니다.',coach:'서버별 계획과 성장 목표를 고릅니다. 완료 표시는 직접 관리합니다.',help:'화면 꾸미기·게임 최적화·연결·업데이트 등 HUD 설정을 바꿉니다.',history:'지난 활동을 종류별로 모아 보고 검색합니다.',achievements:'사용 시간과 활동으로 얻은 칭호를 골라 착용합니다. 인게임 수치는 입력 기반 추정입니다.',news:'공식 업데이트 글과 사진, 공유 한국어 번역을 읽습니다. 탭을 열거나 새 소식 확인을 누르면 갱신합니다.'};
const rules={
 '#raw':'레시피 기준으로 필요한 전체 재료 수량입니다. 보관함·가방의 보유량을 섞어 준비 완료로 판단하지 않습니다.', '#bench':'선택한 제작법별 작업대와 그곳에서 만들 부품을 봅니다.', '#tree':'부품을 눌러 하위 제작 재료를 보고 위 경로로 돌아갑니다.', '#sbneed':'현재 제작 계획의 재료 안내입니다. 누르면 제작 탭을 엽니다.', '#sbgoal':'현재 계획의 목표 안내입니다. 누르면 코치 탭을 엽니다.',
 '[data-news-refresh]':'공식 소식과 공유 번역을 다시 확인합니다. 연속 확인은 1분 간격이며 공개 직후에는 캐시 반영이 늦을 수 있습니다.',
 '[data-news-id]':'이 업데이트의 본문·사진과 저장된 한국어 번역을 엽니다.',
 '[data-news-key]':'직접 번역할 때만 Google API 키를 입력합니다. 공유 번역을 읽는 친구는 필요 없습니다.',
 '[data-news-connect]':'API 키를 이 Windows 계정에 암호화 저장합니다. 실제 연결은 번역 요청 때 확인합니다.',
 '[data-news-disconnect]':'이 PC의 Google API 키만 지웁니다. 저장된 번역과 Google 계정의 키는 삭제하지 않습니다.',
 '[data-news-publisher]':'운영자용 GitHub 토큰입니다. 이 저장소의 Contents 읽기·쓰기 권한으로 번역을 공개합니다.',
 '[data-news-publisher-connect]':'토큰을 암호화 저장하고 기존 미공유 번역도 공개합니다. 이후 직접 번역하면 자동 공유합니다.',
 '[data-news-publisher-disconnect]':'이 PC의 공유 토큰을 지웁니다. 공개된 번역은 남으며 GitHub 토큰 자체를 폐기하지는 않습니다.',
 '[data-news-publish-retry]':'저장된 미공유 번역을 다시 업로드합니다. 같은 글을 Google로 재번역하지 않습니다.',
 '[data-news-translate]':'저장된 한국어가 있으면 바로 읽습니다. 없으면 개인 API로 번역하며, 자동 공유 연결 시 모두에게 공개합니다. 키가 없으면 공유 번역을 기다립니다.',
 '[data-news-original]':'선택한 공지의 공식 원문을 HUD 안에서 봅니다.',
 '[data-news-usage]':'이 PC의 월별 번역 요청량입니다. 다른 앱·PC 사용량은 포함하지 않으며 무료 한도 보장을 뜻하지 않습니다.',
 '[data-news-publish-status]':'공유 연결·미공유 건수·최근 오류입니다. 친구에게 보이기까지 캐시 지연이 있을 수 있습니다.',
 '[data-news-article] a':'공식 공지 원문을 외부 브라우저에서 엽니다.',
 '.news-settings a':'Google Cloud에서 번역 API 설정을 엽니다.',
 '[data-pref="theme"]':'HUD 색상을 고릅니다. 보상 테마는 해당 업적을 달성하면 열립니다.',
 '[data-pref="font"]':'글꼴을 바꿉니다. 이 PC에 없는 글꼴은 대체 글꼴로 표시됩니다.',
 '[data-pref="size"]':'HUD 글자 크기를 바꿉니다. 게임 글자 크기는 바뀌지 않습니다.',
 '[data-pref="density"]':'항목 사이 여백을 조절해 한 화면에 보이는 양을 바꿉니다.',
 '[data-pref="shape"]':'카드와 버튼의 모서리 모양을 바꿉니다.',
 '[data-move]':'이 탭을 앞이나 뒤로 옮깁니다. 숫자 단축키도 새 순서를 따릅니다.',
 '[data-reset-personal]':'색상·글꼴·크기·간격·탭 순서를 기본값으로 돌립니다. 업적과 게임 기록은 유지합니다.',
 '[data-mode="host"]':'게임을 완전히 종료한 뒤 적용하세요. 서버장 PC의 그래픽 부담을 낮추며 다른 서버원의 PC 설정은 바꾸지 않습니다.',
 '[data-mode="personal"]':'게임을 완전히 종료한 뒤 적용하세요. 내 PC의 그림자·효과·FPS 제한을 조절합니다. 서버장용과 둘 중 하나만 선택하세요.',
 '[data-action="hardware"]':'내 CPU·메모리·GPU를 확인해 프리셋을 추천합니다. 이 버튼만으로 설정이 바뀌지는 않습니다.',
 '[data-action="status"]':'저장된 설정이 선택한 프리셋과 일치하는지 확인합니다. 초록색은 FPS 개선을 검증했다는 뜻이 아닙니다.',
 '[data-action="restore"]':'게임 종료 후 최적화 전 백업 설정으로 되돌립니다. 별도로 바뀐 설정과 충돌하면 중단합니다.',
 '[data-sample]':'같은 기지·시야·인원에서 CPU·RAM·GPU 사용량을 약 10~40초 측정합니다. FPS와 잔끊김 측정은 포함하지 않습니다.',
 '[data-game="start"]':'Steam을 통해 이카루스를 실행합니다.',
 '[data-game="save"]':'현재 호스트 월드에 저장을 요청합니다. 서버원은 서버장 월드를 저장할 수 없으며 결과 안내를 확인해야 합니다.',
 '[data-game="exit"]':'저장 절차를 거쳐 정상 종료를 요청합니다. 강제 종료 버튼이 아닙니다. 오류·미확인 상태는 결과 안내를 확인하세요.',
 '#plan-select':'서버별로 저장한 성장 계획을 바꿉니다.', '#plan-name':'새 계획의 이름을 입력합니다. 서버 이름처럼 구분하기 쉽게 적으세요.', '#plan-add':'입력한 이름의 별도 성장 계획을 추가합니다.',
 '#goal-prev, #goal-next, #goal-select':'이 계획에서 볼 성장 목표를 바꿉니다. 실제 게임 진행을 되돌리지는 않습니다.',
 '#plan-craft':'선택한 목표의 제작 계획과 필요한 재료를 봅니다.', '#plan-complete':'이 계획에서 목표의 완료 표시를 바꿉니다. 게임에 제작 명령을 보내지 않습니다.', '#plan-recommend':'현재 상태를 기준으로 추천 목표를 선택합니다.',
 '[data-craft-view="steps"]':'어떤 작업대에서 어떤 부품을 만들지 순서대로 봅니다.', '[data-craft-view="materials"]':'제작에 필요한 재료 수량을 봅니다. 준비 여부는 실제 제작할 작업대에서도 확인하세요.', '[data-craft-view="tree"]':'부품을 선택하며 제작 구조를 한 단계씩 탐색합니다.',
 '#tree-root':'제작 구조에서 살펴볼 최종 아이템을 고릅니다.', '[data-crumb]':'앞에서 보던 제작 단계로 돌아갑니다.', '[data-ingredient]':'이 부품을 만드는 데 필요한 하위 재료를 봅니다.', '#res [data-k]':'이 아이템을 만들 목록에 추가합니다. 실제 게임 제작은 하지 않습니다.', '#catalog-prev, #catalog-next':'아이템 검색 결과의 이전·다음 페이지를 봅니다.',
 '#history-search':'아이템 이름·목표·작업 내용으로 저장된 활동 기록을 찾습니다.',
 '#title-auto':'사용 시간 레벨에 맞는 칭호를 자동 착용합니다.', '[data-ach-filter]':'이 종류의 업적만 모아 봅니다.', '#achievement-unlocked':'달성한 업적만 표시합니다.',
 '#activity-toggle, #activity-settings-toggle':'전체 화면의 클릭·마우스 이동·활동 시간을 집계합니다. 인게임 이동·도구 사용량은 실제 행동 확정값이 아닌 입력 기반 추정입니다.',
 '#mapselect':'게임 접속 여부와 관계없이 다른 지도를 열어 봅니다. 접속한 월드를 바꾸지는 않습니다.',
 '#mtcurrent':'현재 접속한 맵으로 돌아갑니다. 게임 정보를 수신해야 사용할 수 있습니다.', '#mtfit':'선택한 지도 전체가 보이도록 확대 비율을 맞춥니다.', '#partyclear':'현재 월드에 저장한 서버원 이동 경로를 지웁니다. 서버원이나 게임 기록을 삭제하지 않습니다.', '[data-ml="party"]':'내 PC가 최근 수신한 서버원 위치를 지도에 표시합니다. 멀리 있어 수신하지 못한 위치는 숨깁니다.',
 '#partyrecord':'내 PC가 수신한 서버원 위치만 이동 기록으로 남깁니다. 수신하지 못한 구간은 기록되지 않습니다.', '#partytrails':'저장한 서버원 이동 경로를 지도에 표시합니다.', '[id^="partycolor"]':'이 서버원의 지도 표시 색을 바꿉니다.', '[id^="partygo"]':'최근 수신한 이 서버원의 위치로 지도를 옮깁니다. 위치가 없으면 사용할 수 없습니다.',
 '[data-ml="regions"]':'게임 데이터에 있는 지역 이름을 지도에 표시합니다.',
 '#mfogbtn, [data-ml="fog"]':'HUD 방문 기록으로 아직 가보지 않은 곳을 가립니다. 모든 서버원의 탐험 기록을 뜻하지 않습니다.',
 '#navbx, #navore, #navcave, #navgey, #navani':'이 종류의 대상을 네비 목록에 표시하거나 숨깁니다.', '#navneed':'현재 제작 목록에서 부족한 재료에 해당하는 대상만 봅니다.',
 '#pane-animals [data-save]':'상세창에서 읽은 동물은 자동 등록·갱신됩니다. 수동 등록이 가능한 상태에서는 이 버튼으로 저장할 수 있습니다.',
 '#pane-animals [data-search]':'저장한 동물을 이름이나 종류로 찾습니다.', '#pane-animals [data-base]':'교배 계획의 기준 부모를 고릅니다.', '#pane-animals [data-target]':'교배 상대를 비교할 중점 스탯을 고릅니다. 전체 균형을 선택하면 약한 스탯 보완을 함께 봅니다.',
 '#pane-animals [data-delete]':'선택한 동물의 HUD 저장 기록만 삭제합니다. 게임 속 동물은 삭제하지 않습니다.', '#pane-animals [data-limit]':'색상 구분 기준을 바꿉니다. 높음 이상 값은 새끼의 목표 수치로도 사용됩니다. 게임 속 유전자는 바뀌지 않습니다.',
 '#pane-animals [data-mutation]':'모의 교배에 사용할 돌연변이 확률 가정입니다. 게임의 검증된 실제 확률이 아닙니다.', '#pane-animals [data-context]':'관측 기록을 같은 조건끼리 구분할 이름입니다.',
 '#pane-animals [data-partner]':'실제 새끼 관측 기록에 연결할 다른 부모를 고릅니다.', '#pane-animals [data-confirm]':'지금 읽은 동물이 선택한 부모들의 실제 새끼인지 확인한 뒤 체크하세요.', '#pane-animals [data-record]':'현재 새끼의 스탯을 실제 관측 결과로 저장합니다.', '#pane-animals [data-undo]':'마지막으로 저장한 새끼 관측 기록을 지웁니다.',
 '#pane-animals [data-focus-stat], #pane-animals [data-stat]':'이 스탯의 1~8단계 출생 추정 확률을 봅니다. 모의 계산이며 실제 확률을 보장하지 않습니다.',
 '#pane-animals [data-reconnect-to]':'재접속 후 현재 동물과 연결할 기존 저장 기록을 고릅니다. 이름·종류·스탯을 확인하세요.', '#pane-animals [data-reconnect-button]':'현재 동물을 고른 기존 기록과 같은 동물로 연결합니다. 다른 동물과 혼동하지 않도록 확인하세요.', '#pane-animals [data-pair-select]':'다음 세대에 사용할 부모 조합을 바꿔 약한 스탯 보완과 예상 분포를 비교합니다.',
 '#optSafe':'충돌 위험을 줄이는 안전 모드를 전환합니다. 변경 안내와 게임 재시작 필요 여부를 확인하세요.', '#diagfix':'배포 파일을 확인하고 필요한 파일을 다시 받습니다. 게임 중에는 안전한 적용 시점까지 기다립니다.', '#diagrep':'문제 확인용 진단 보고서를 바탕 화면에 저장합니다.', '#diagmod':'게임 모드 사용을 켜거나 끕니다. 버튼을 누른 뒤 안내를 확인하세요.',
 '[data-clr="log"]':'HUD에 저장한 활동 기록을 지웁니다. 게임 저장 파일은 삭제하지 않습니다.'
};
function resolve(target){if(!target?.closest)return null;
 // Prefer the nearest control over help on its enclosing panel.
 const el=target.closest('button,input,select,textarea,summary,a,[role="button"],[data-tip],[title],label,[data-news-usage],[data-news-publish-status]');if(!el)return null;
 let text='';const tab=el.dataset?.tab;if(tab&&tabs[tab])text=tabs[tab];
 if(!text)for(const [selector,help]of Object.entries(rules))if(el.matches(selector)||el.matches('label')&&el.querySelector(selector)){text=help;break;}
 if(!text)text=el.dataset?.tip||el.getAttribute('title')||'';
 if(!text&&el.matches('summary'))text='눌러서 「'+el.textContent.trim().slice(0,70)+'」 항목을 펼치거나 접습니다.';
 if(!text&&el.matches('.settings-nav button'))text='「'+el.textContent.trim()+'」 설정을 엽니다.';
 return text?{el,text}:null;
}
const api={resolve,tabs,rules};if(typeof module!=='undefined')module.exports=api;if(root)root.HudHoverHelp=api;
})(typeof window!=='undefined'?window:globalThis);

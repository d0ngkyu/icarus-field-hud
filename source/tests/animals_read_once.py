# Run with: python3 source/tests/animals_read_once.py (needs: pip install lupa). Checks the genetics list is read once per panel opening.
import lupa
L=lupa.LuaRuntime()
src=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','mod','Scripts','animals.lua'),encoding='utf-8').read()
L.execute('''
reads=0
local function obj(t) t.IsValid=function() return true end return t end
actorA=obj{GetFullName=function() return "Mount_A" end, MountData={RowName={ToString=function() return "Moa" end}}, MountName="A"}
genes={}
for i,k in ipairs({"Vitality","Endurance","Muscle","Agility","Hardiness","Toughness","Utility"}) do genes[i]={GeneticValue={RowName={ToString=function() return k end}},Value=5} end
comp=obj{bHasGeneratedGenetics=true,CreatureSex=1,CreatureGenetics={GetArrayNum=function() return 7 end,ForEach=function(self,f) reads=reads+1 for i,g in ipairs(genes) do f(i,{get=function() return g end}) end end}}
actorA.GetComponentByClass=function() return comp end
panelOpen=true
panel=obj{GetFullName=function() return "UMG_MountInterface_V2_C_1" end,IsInViewport=function() return panelOpen end,IsVisible=function() return true end,GetParent=function() return nil end,LinkedMount=actorA}
function FindAllOf() return {panel} end
function StaticFindObject() return obj{} end
''')
M=L.execute(src)
r=[M.read() for _ in range(6)]
print('results', [x is not None for x in r], 'array reads', L.eval('reads'))
L.execute('panelOpen=false'); M.read(); L.execute('panelOpen=true')
r=[M.read() for _ in range(3)]
print('after reopen', [x is not None for x in r], 'array reads', L.eval('reads'))
print(r[-1])
L.execute('comp.CreatureGenetics.GetArrayNum=function() return 6 end; reads=0; actorA.GetFullName=function() return "Mount_B" end')
r=[M.read() for _ in range(6)]
print('bad animal', [x is not None for x in r], 'array reads', L.eval('reads'))

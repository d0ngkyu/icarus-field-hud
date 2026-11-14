'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {Tuner,validate,modifiedTable,readTable,fileHash,MOD,TABLE,MOUNT}=require('./core.cjs');
const baseline={Rows:[{Name:'Base_Stats',StatsGranted:{'(Value="BaseMaximumHealth_+")':300,'(Value="BaseMaximumStamina_+")':200,'(Value="BaseWeightCapacity_+")':100,'(Value="BaseMovementSpeed_+")':355,'(Value="Unrelated_+")':42}},{Name:'Other',preserve:true}]};
const mild={health:10,stamina:10,weight:10,speed:5};
test('only four bounded fields change; defaults and unrelated data preserved',()=>{
 const original=JSON.stringify(baseline),r=modifiedTable(baseline,mild);assert.equal(JSON.stringify(baseline),original);assert.equal(r.preview.health.value,330);assert.equal(r.preview.speed.value,373);assert.equal(r.table.Rows[0].StatsGranted['(Value="Unrelated_+")'],42);assert.deepEqual(r.table.Rows[1],baseline.Rows[1]);
});
test('reject invalid, excessive, negative, fractional and extra fields',()=>{
 for(const bad of [null,{}, {...mild,speed:11},{...mild,health:26},{...mild,weight:-1},{...mild,health:'10'},{...mild,stamina:NaN},{...mild,speed:1.5},{...mild,extra:0}])assert.throws(()=>validate(bad));
});
test('unknown game schema fails closed',()=>{assert.throws(()=>modifiedTable({Rows:[]},mild));const bad=structuredClone(baseline);delete bad.Rows[0].StatsGranted['(Value="BaseWeightCapacity_+")'];assert.throws(()=>modifiedTable(bad,mild));});
const exe=process.env.SOLO_TEST_REPAK;
test('real PAK lifecycle, rollback, conflict, stale version, concurrent lock and running guards', {skip:!exe},()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'icarus-solo-test-'));
 const game=path.join(root,'game'),stateDir=path.join(root,'state'),src=path.join(root,'input'),data=path.join(game,'Icarus/Content/Data/data.pak');
 fs.mkdirSync(path.join(src,'Stats'),{recursive:true});fs.mkdirSync(path.dirname(data),{recursive:true});
 fs.writeFileSync(path.join(src,TABLE),JSON.stringify(baseline));
 cp.execFileSync(exe,['pack',src,data,'--mount-point',MOUNT,'--version','V11'],{windowsHide:true});
 let running=false;const tuner=new Tuner({game,stateDir,repak:exe,guard:()=>running});const original=fileHash(data);
 // Never creates a file when running or when confirmation/hash is missing.
 running=true;assert.throws(()=>tuner.apply(mild,original,true),/실행 중/);running=false;
 assert.throws(()=>tuner.apply(mild,original,false),/확인/);assert.throws(()=>tuner.apply(mild,'outdated',true),/바뀌/);assert.equal(fs.existsSync(tuner.target),false);
 const first=tuner.apply(mild,original,true);assert.equal(tuner.status().installed,true);assert.equal(fileHash(data),original);
 assert.equal(readTable(tuner.target).Rows[0].StatsGranted['(Value="BaseMaximumHealth_+")'],330);
 const second=tuner.apply({...mild,health:25},original,true);assert.equal(tuner.status().values.health,25);
 tuner.restore(second.backup);assert.equal(tuner.status().values.health,10);
 const removed=tuner.remove();assert.equal(fs.existsSync(tuner.target),false);tuner.restore(removed.backup);assert.equal(tuner.status().values.health,10);
 tuner.restore(first.backup);assert.equal(fs.existsSync(tuner.target),false);
 fs.writeFileSync(tuner.target,'foreign');assert.throws(()=>tuner.apply(mild,original,true),/다릅니다/);assert.throws(()=>tuner.remove(),/다릅니다/);assert.equal(fs.readFileSync(tuner.target,'utf8'),'foreign');fs.unlinkSync(tuner.target);
 fs.writeFileSync(path.join(stateDir,'write.lock'),'test');assert.throws(()=>tuner.apply(mild,original,true),/중복/);fs.unlinkSync(path.join(stateDir,'write.lock'));
 tuner.apply(mild,original,true);const change=path.join(tuner.modDir,'Other_P.pak');fs.copyFileSync(tuner.target,change);assert.throws(()=>tuner.apply(mild,original,true),/충돌/);fs.unlinkSync(change);
 const before=fileHash(tuner.target);let checks=0;tuner.guard=()=>++checks>=2;assert.throws(()=>tuner.apply({...mild,health:20},original,true),/실행 중/);assert.equal(fileHash(tuner.target),before);tuner.guard=()=>false;
 assert.throws(()=>tuner.restore('../escape'),/유효/);
 fs.appendFileSync(data,Buffer.from('changed'));assert.equal(tuner.status().stale,true);assert.throws(()=>tuner.restore(removed.backup),/다른 게임 버전/);
 assert.equal(fileHash(tuner.target),before);
 // Cleanup only this controlled OS temporary directory.
 fs.rmSync(root,{recursive:true,force:true});
});

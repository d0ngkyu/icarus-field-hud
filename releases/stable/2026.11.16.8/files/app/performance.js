'use strict';
const {execFile}=require('child_process'),os=require('os');
function powershell(script,timeout=30000){return new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout,maxBuffer:1048576},(e,out)=>{if(e)return reject(Error('Windows 성능 정보를 읽지 못했습니다.'));try{const r=JSON.parse(out.trim());if(r.error)throw Error(r.error);resolve(r)}catch(err){reject(Error(err.message||'측정 결과를 읽지 못했습니다.'))}}))}
async function hardware(){const base={ramGB:Math.round(os.totalmem()/1073741824),threads:os.cpus().length,cpu:os.cpus()[0]?.model||'확인 불가'};let gpu=[];try{gpu=await powershell("@(Get-CimInstance Win32_VideoController -ErrorAction Stop | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress",12000)}catch{}return{...base,gpu:Array.isArray(gpu)?gpu:[gpu],recommendation:base.ramGB<24||base.threads<12?'host':'personal',reason:'RAM·논리 CPU 기준의 보수적인 추천입니다. GPU 이름만으로 VRAM·실제 게임 성능을 단정하지 않습니다.'}}
const script=`$ErrorActionPreference='Stop'
try {
 $games=@(Get-Process -Name 'Icarus-Win64-Shipping' -ErrorAction SilentlyContinue)
 if($games.Count -ne 1){throw '게임 실행 상태를 확인해 주세요. 게임이 1개 실행 중일 때 측정합니다.'}
 $game=$games[0];$gameId=$game.Id;$startTime=$game.StartTime;$cpu0=$game.TotalProcessorTime.TotalSeconds;$timer=[Diagnostics.Stopwatch]::StartNew();$ram=@();$gpu=@()
 for($i=0;$i -lt 5;$i++){
  Start-Sleep -Seconds 2
  $game=Get-Process -Id $gameId -ErrorAction Stop
  if($game.StartTime -ne $startTime){throw '측정 중 게임이 재시작되어 결과를 버렸습니다.'}
  $ram+=($game.WorkingSet64/1MB)
  try{$engines=@(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop | Where-Object {$_.Name -like "pid_$($gameId)_*engtype_3D"});if($engines.Count -gt 0){$gpu+=($engines|Measure-Object UtilizationPercentage -Maximum).Maximum}}catch{}
 }
 $elapsed=$timer.Elapsed.TotalSeconds;$cpu=100*($game.TotalProcessorTime.TotalSeconds-$cpu0)/$elapsed/[Environment]::ProcessorCount
 $result=@{cpuPercent=[Math]::Round($cpu,1);ramMB=[Math]::Round(($ram|Measure-Object -Average).Average);durationSeconds=[Math]::Round($elapsed,1);samples=$ram.Count;gpu3DPercent=$null;fps=$null;frameTime=$null}
 if($gpu.Count -gt 0){$result.gpu3DPercent=[Math]::Round(($gpu|Measure-Object -Average).Average,1)}
 $result | ConvertTo-Json -Compress
} catch { @{error=$_.Exception.Message}|ConvertTo-Json -Compress }`;
let active=false;
async function sample(){if(active)throw Error('이미 측정 중입니다.');active=true;try{return{...await powershell(script,45000),at:Date.now()}}finally{active=false}}
function compare(a,b){if(!a||!b)return null;const delta={};for(const k of ['cpuPercent','ramMB','gpu3DPercent'])delta[k]=Number.isFinite(a[k])&&Number.isFinite(b[k])?Math.round((b[k]-a[k])*10)/10:null;return delta}
module.exports={hardware,sample,compare};

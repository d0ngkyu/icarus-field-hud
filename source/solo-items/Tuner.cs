using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using System.Threading.Tasks;

public sealed class TuneValues {
    public int Health=100, Stamina=100, Oxygen=100, Food=100, Water=100, Weight=100, Durability=100, Speed=100;
    public bool IsDefault {get{return Health==100&&Stamina==100&&Oxygen==100&&Food==100&&Water==100&&Weight==100&&Durability==100&&Speed==100;}}
    public void Validate(){
        if(Health<100||Health>300||Weight<100||Weight>500||Durability<100||Durability>500||Speed<100||Speed>200||new[]{Stamina,Oxygen,Food,Water}.Any(x=>x<0||x>100)) throw new Exception("설정 범위를 확인해 주세요.");
    }
}
public sealed class TuneRecord {
    public string Game,DataHash,ModHash,Time;
    public TuneValues Values;
}
public static class Tuner {
    public static readonly string StateDir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"IcarusSoloTools");
    public const string ModName="998-IcarusSoloTools_P.pak";
    public const string Stats="Stats/D_CharacterStartingStats.json", Actions="Tools/D_StaminaActionCosts.json", Durable="Traits/D_Durable.json";
    public const string Mount="../../../Icarus/Content/data/";
    static readonly Encoding Utf8=new UTF8Encoding(false);
    public static JavaScriptSerializer Json(){return new JavaScriptSerializer{MaxJsonLength=16000000};}
    public static string Hash(string path){using(var f=File.OpenRead(path))using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(f)).Replace("-","").ToLowerInvariant();}
    public static bool Running(){
        foreach(var name in new[]{"Icarus","Icarus-Win64-Shipping","IcarusServer","IcarusServer-Win64-Shipping"}){
            var ps=Process.GetProcessesByName(name);bool found=ps.Length>0;foreach(var p in ps)p.Dispose();if(found)return true;
        }return false;
    }
    public static void Stopped(){if(Running())throw new Exception("게임을 먼저 종료해 주세요. 설정은 다음 게임 실행부터 적용됩니다.");}
    static string Key(string game){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(Utf8.GetBytes(Path.GetFullPath(game).ToLowerInvariant()))).Replace("-","").Substring(0,16);}
    static string RecordPath(string game){return Path.Combine(StateDir,"tuning-"+Key(game)+".json");}
    public static TuneRecord ReadRecord(string game){var p=RecordPath(game);return File.Exists(p)?Json().Deserialize<TuneRecord>(File.ReadAllText(p,Utf8)):null;}
    public static void Atomic(string path,string text){
        Directory.CreateDirectory(Path.GetDirectoryName(path));string temp=path+"."+Guid.NewGuid().ToString("N")+".tmp";File.WriteAllText(temp,text,Utf8);
        try{if(File.Exists(path))File.Replace(temp,path,null);else File.Move(temp,path);}finally{if(File.Exists(temp))File.Delete(temp);}
    }
    static string Q(string s){if(s.Contains("\""))throw new Exception("잘못된 파일 경로입니다.");return "\""+s+"\"";}
    static string Run(string repak,string args){
        using(var p=new Process{StartInfo=new ProcessStartInfo(repak,args){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Utf8,StandardErrorEncoding=Utf8}}){
            p.Start();var output=p.StandardOutput.ReadToEndAsync();var error=p.StandardError.ReadToEndAsync();
            if(!p.WaitForExit(30000)){p.Kill();throw new Exception("게임 데이터 확인 시간이 초과되었습니다.");}
            Task.WaitAll(output,error);if(p.ExitCode!=0)throw new Exception("데이터 도구 오류: "+error.Result.Trim());return output.Result;
        }
    }
    static string MountOf(string repak,string pak){var text=Run(repak,"info "+Q(pak));var line=text.Split('\n').FirstOrDefault(x=>x.StartsWith("mount point: "));if(line==null)throw new Exception("게임 데이터 경로를 확인하지 못했습니다.");return line.Substring(13).TrimEnd('\r');}
    public static string ReadTable(string repak,string pak,string name){return Run(repak,"get --strip-prefix "+Q(MountOf(repak,pak))+" "+Q(pak)+" "+Q(name));}
    static Dictionary<string,object> Obj(object x){var d=x as Dictionary<string,object>;if(d==null)throw new Exception("지원하지 않는 게임 데이터입니다.");return d;}
    static IEnumerable<Dictionary<string,object>> Rows(Dictionary<string,object> d){return ((IEnumerable)d["Rows"]).Cast<object>().Select(Obj);}
    static string Ref(Dictionary<string,object>d,string key){object x;if(!d.TryGetValue(key,out x))return "None";var r=Obj(x);return r.ContainsKey("RowName")?(string)r["RowName"]:"None";}
    static void Scale(Dictionary<string,object>d,string key,int percent,bool required){
        if(!d.ContainsKey(key)){if(required)throw new Exception("게임 기본값이 바뀌었습니다: "+key);return;}
        decimal v=Convert.ToDecimal(d[key]);if(v<0)throw new Exception("게임 수치가 예상과 다릅니다.");
        d[key]=(int)Math.Round(v*percent/100m,MidpointRounding.AwayFromZero);
    }
    public static Dictionary<string,string> Transform(string stats,string actions,string durable,string items,TuneValues v){
        v.Validate();var result=new Dictionary<string,string>();
        var s=Obj(Json().DeserializeObject(stats));var row=Rows(s).Single(x=>(string)x["Name"]=="Base_Stats");var values=Obj(row["StatsGranted"]);
        foreach(var pair in new[]{new KeyValuePair<string,int>("BaseMaximumHealth_+",v.Health),new KeyValuePair<string,int>("BaseWeightCapacity_+",v.Weight),new KeyValuePair<string,int>("SprintMovementSpeedCoefficient_%",v.Speed),new KeyValuePair<string,int>("BaseOxygenConsumptionPerHour_+",v.Oxygen),new KeyValuePair<string,int>("BaseFoodConsumptionPerHour_+",v.Food),new KeyValuePair<string,int>("BaseWaterConsumptionPerHour_+",v.Water)})
            Scale(values,"(Value=\""+pair.Key+"\")",pair.Value,true);
        Scale(values,"(Value=\"BaseOxygenConsumedPerStaminaUsed_+%\")",v.Oxygen,false);
        Scale(values,"(Value=\"BaseFoodConsumedPerStaminaUsed_+%\")",v.Food,false);
        Scale(values,"(Value=\"BaseWaterConsumedPerStaminaUsed_+%\")",v.Water,false);
        if(v.Health!=100||v.Weight!=100||v.Speed!=100||v.Oxygen!=100||v.Food!=100||v.Water!=100)result[Stats]=Json().Serialize(s);
        if(v.Stamina!=100){
            var a=Obj(Json().DeserializeObject(actions));int changed=0;
            foreach(var r in Rows(a)){if(((string)r["Name"]).StartsWith("Mount_"))continue;foreach(var key in new[]{"BeginActionCost","EndActionCost","PerSecondCost"})if(r.ContainsKey(key)){r[key]=Convert.ToDecimal(r[key])*v.Stamina/100m;changed++;}}
            if(changed==0)throw new Exception("스태미나 데이터가 바뀌었습니다.");result[Actions]=Json().Serialize(a);
        }
        if(v.Durability!=100){
            var it=Obj(Json().DeserializeObject(items));var gear=new HashSet<string>();
            foreach(var r in Rows(it))if(new[]{"ToolDamage","Armour","RangedWeaponData","FirearmData"}.Any(k=>Ref(r,k)!="None")){var name=Ref(r,"Durable");if(name!="None")gear.Add(name);}
            var d=Obj(Json().DeserializeObject(durable));var def=Obj(d["Defaults"]);int changed=0;
            foreach(var r in Rows(d))if(gear.Contains((string)r["Name"])){if(!r.ContainsKey("Max_Durability"))r["Max_Durability"]=def["Max_Durability"];Scale(r,"Max_Durability",v.Durability,true);changed++;}
            if(changed==0)throw new Exception("장비 내구도 데이터를 찾지 못했습니다.");result[Durable]=Json().Serialize(d);
        }
        return result;
    }
    static void Owned(string target,TuneRecord record,string game){if(File.Exists(target)&&(record==null||!string.Equals(record.Game,game,StringComparison.OrdinalIgnoreCase)||Hash(target)!=record.ModHash))throw new Exception("기존 조절 파일이 변경되어 덮어쓰지 않았습니다.");}
    public static string Apply(string game,TuneValues values,string repak,Action guard=null){
        values.Validate();game=Path.GetFullPath(game);if(guard==null)guard=Stopped;
        Directory.CreateDirectory(StateDir);
        using(var writeLock=new FileStream(Path.Combine(StateDir,"tuning.lock"),FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None)){
            guard();string data=Path.Combine(game,"Icarus/Content/Data/data.pak"),mods=Path.Combine(game,"Icarus/Content/Paks/mods"),target=Path.Combine(mods,ModName),recordPath=RecordPath(game);
            if(!File.Exists(data))throw new Exception("Icarus 게임 폴더를 확인해 주세요.");
            var old=ReadRecord(game);Owned(target,old,game);string dataHash=Hash(data);
            string stage=Path.Combine(StateDir,"build",Guid.NewGuid().ToString("N"));Directory.CreateDirectory(stage);
            var tables=Transform(ReadTable(repak,data,Stats),ReadTable(repak,data,Actions),ReadTable(repak,data,Durable),ReadTable(repak,data,"Items/D_ItemsStatic.json"),values);
            if(Directory.Exists(mods))foreach(var pak in Directory.GetFiles(mods,"*.pak",SearchOption.AllDirectories)){
                if(string.Equals(Path.GetFullPath(pak),target,StringComparison.OrdinalIgnoreCase))continue;
                string listing=Run(repak,"list --strip-prefix "+Q(MountOf(repak,pak))+" "+Q(pak));
                if(tables.Keys.Any(k=>listing.IndexOf(k,StringComparison.OrdinalIgnoreCase)>=0))throw new Exception("다른 모드와 설정이 겹칩니다: "+Path.GetFileName(pak));
            }
            string packed=Path.Combine(stage,ModName);
            if(tables.Count>0){
                string input=Path.Combine(stage,"input");Directory.CreateDirectory(input);
                foreach(var p in tables){var f=Path.Combine(input,p.Key);Directory.CreateDirectory(Path.GetDirectoryName(f));File.WriteAllText(f,p.Value,Utf8);}
                Run(repak,"pack "+Q(input)+" "+Q(packed)+" --mount-point "+Q(Mount)+" --version V11");
                foreach(var p in tables)if(ReadTable(repak,packed,p.Key).Trim()!=p.Value.Trim())throw new Exception("설정 파일 검증에 실패했습니다.");
            }
            guard();Owned(target,old,game);if(Hash(data)!=dataHash)throw new Exception("게임이 업데이트되었습니다. 다시 적용해 주세요.");
            string backup=Path.Combine(StateDir,"backups",DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,8));Directory.CreateDirectory(backup);
            bool existed=File.Exists(target);if(existed)File.Copy(target,Path.Combine(backup,ModName));if(File.Exists(recordPath))File.Copy(recordPath,Path.Combine(backup,"record.json"));
            Directory.CreateDirectory(mods);guard();
            try{
                if(tables.Count==0)File.Delete(target);
                else{File.Copy(packed,target+".new",true);if(File.Exists(target))File.Replace(target+".new",target,null);else File.Move(target+".new",target);}
                Atomic(recordPath,Json().Serialize(new TuneRecord{Game=game,DataHash=dataHash,ModHash=tables.Count==0?null:Hash(target),Values=values,Time=DateTime.UtcNow.ToString("o")}));
            }catch{
                if(existed)File.Copy(Path.Combine(backup,ModName),target,true);else File.Delete(target);
                if(File.Exists(Path.Combine(backup,"record.json")))File.Copy(Path.Combine(backup,"record.json"),recordPath,true);else File.Delete(recordPath);
                throw;
            }
            return tables.Count==0?"기본값으로 복원했습니다. 다음 게임 실행부터 적용됩니다.":"설정 파일을 적용했습니다. 게임을 새로 실행해 확인하세요.";
        }
    }
}

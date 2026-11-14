using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.IO.Compression;

public static class SuiteTests {
    static readonly List<string> results=new List<string>();
    static void Assert(bool b,string message){if(!b)throw new Exception(message);}
    static void Reject(Action a,string name){bool failed=false;try{a();}catch{failed=true;}Assert(failed,"Expected rejection: "+name);results.Add("PASS "+name);}
    static Dictionary<string,object> Parse(string s){return (Dictionary<string,object>)Tuner.Json().DeserializeObject(s);}
    static IEnumerable<Dictionary<string,object>> Rows(string s){return ((IEnumerable)Parse(s)["Rows"]).Cast<Dictionary<string,object>>();}
    static decimal Stat(string s,string key){var row=Rows(s).Single(x=>(string)x["Name"]=="Base_Stats");return Convert.ToDecimal(((Dictionary<string,object>)row["StatsGranted"])["(Value=\""+key+"\")"]);}
    public static void Run(string root){
        string work=Path.Combine(root,"test-work",Guid.NewGuid().ToString("N"));Directory.CreateDirectory(work);
        string repak=Path.Combine(root,"tools","repak.exe"),original=@"C:\Program Files (x86)\Steam\steamapps\common\Icarus\Icarus\Content\Data\data.pak";
        string stats=Tuner.ReadTable(repak,original,Tuner.Stats),actions=Tuner.ReadTable(repak,original,Tuner.Actions),durable=Tuner.ReadTable(repak,original,Tuner.Durable),items=Tuner.ReadTable(repak,original,"Items/D_ItemsStatic.json");
        var v=new TuneValues{Health=200,Stamina=50,Oxygen=0,Food=50,Water=0,Weight=200,Durability=200,Speed=150};
        var changed=Tuner.Transform(stats,actions,durable,items,v);
        Assert(Stat(changed[Tuner.Stats],"BaseMaximumHealth_+")==Stat(stats,"BaseMaximumHealth_+")*2,"Health");
        Assert(Stat(changed[Tuner.Stats],"BaseWeightCapacity_+")==Stat(stats,"BaseWeightCapacity_+")*2,"Weight");
        Assert(Stat(changed[Tuner.Stats],"BaseMovementSpeed_+")==Stat(stats,"BaseMovementSpeed_+"),"Walking changed");
        Assert(Stat(changed[Tuner.Stats],"SprintMovementSpeedCoefficient_%")==Stat(stats,"SprintMovementSpeedCoefficient_%")*1.5m,"Sprint");
        Assert(Stat(changed[Tuner.Stats],"BaseOxygenConsumptionPerHour_+")==0&&Stat(changed[Tuner.Stats],"BaseWaterConsumptionPerHour_+")==0,"Survival");
        Assert(Convert.ToDecimal(Rows(changed[Tuner.Actions]).Single(x=>(string)x["Name"]=="PlayerCharacter_Sprint")["PerSecondCost"])==8,"Stamina sprint");
        Assert(Convert.ToDecimal(Rows(changed[Tuner.Actions]).Single(x=>(string)x["Name"]=="Mount_Jump")["BeginActionCost"])==25,"Mount changed");
        Assert(Convert.ToDecimal(Rows(changed[Tuner.Durable]).Single(x=>(string)x["Name"]=="Stone_Axe")["Max_Durability"])==40000,"Axe durability");
        Assert(Convert.ToDecimal(Rows(changed[Tuner.Durable]).Single(x=>(string)x["Name"]=="Deployable")["Max_Durability"])==1000,"Deployable changed");
        results.Add("PASS installed data mappings; walking, mounts and deployables preserved");
        Assert(Tuner.Transform(stats,actions,durable,items,new TuneValues()).Count==0,"Default should remove mod");
        Reject(()=>new TuneValues{Speed=999}.Validate(),"invalid range");
        string fake=Path.Combine(work,"fake-game"),data=Path.Combine(fake,"Icarus/Content/Data/data.pak");Directory.CreateDirectory(Path.GetDirectoryName(data));File.Copy(original,data);
        Tuner.Apply(fake,v,repak,()=>{});string target=Path.Combine(fake,"Icarus/Content/Paks/mods",Tuner.ModName);
        Assert(File.Exists(target)&&Stat(Tuner.ReadTable(repak,target,Tuner.Stats),"BaseMaximumHealth_+")==600,"Packed data readback");results.Add("PASS real PAK build/install/readback in fake game");
        string hash=Tuner.Hash(target);Reject(()=>Tuner.Apply(fake,new TuneValues(),repak,()=>{throw new Exception("running");}),"running game gate");Assert(Tuner.Hash(target)==hash,"Gate changed file");
        File.AppendAllText(target,"foreign");Reject(()=>Tuner.Apply(fake,v,repak,()=>{}),"foreign mod change protection");
        // Restore the exact owned bytes from this build by finding their recorded hash.
        var rec=Tuner.ReadRecord(fake);var own=Directory.GetFiles(Path.Combine(Tuner.StateDir,"build"),Tuner.ModName,SearchOption.AllDirectories).First(p=>Tuner.Hash(p)==rec.ModHash);File.Copy(own,target,true);
        Tuner.Apply(fake,new TuneValues(),repak,()=>{});Assert(!File.Exists(target),"Restore default");results.Add("PASS default restore removes only owned mod");
        string stage=Path.Combine(work,"stage"),installed=Path.Combine(work,"installed"),extracted=Path.Combine(work,"extracted");Directory.CreateDirectory(stage);Directory.CreateDirectory(installed);Directory.CreateDirectory(extracted);
        var files=new List<UpdateFile>();
        foreach(string name in Updater.Allowed){string f=Path.Combine(stage,name);Directory.CreateDirectory(Path.GetDirectoryName(f));File.WriteAllText(f,"new:"+name);files.Add(new UpdateFile{path=name,size=new FileInfo(f).Length,sha256=Tuner.Hash(f)});string old=Path.Combine(installed,name);Directory.CreateDirectory(Path.GetDirectoryName(old));File.WriteAllText(old,"old:"+name);}
        string zip=Path.Combine(work,"package.zip");ZipFile.CreateFromDirectory(stage,zip);
        var manifest=new UpdateManifest{version=Updater.CurrentVersion,packageUrl="https://raw.githubusercontent.com/d0ngkyu/icarus-field-hud/test/package.zip",size=new FileInfo(zip).Length,sha256=Tuner.Hash(zip),files=files.ToArray()};
        Updater.Extract(zip,extracted,manifest);Updater.VerifyStage(extracted,manifest);results.Add("PASS package extraction and every file hash");
        int guards=0;Reject(()=>Updater.ApplyFiles(extracted,installed,manifest,()=>{if(++guards==5)throw new Exception("simulated interruption");}),"update interruption rollback");
        foreach(string name in Updater.Allowed)Assert(File.ReadAllText(Path.Combine(installed,name))=="old:"+name,"Rollback failed: "+name);
        Updater.ApplyFiles(extracted,installed,manifest,()=>{});Updater.VerifyStage(installed,manifest);results.Add("PASS successful replacement with backup");
        File.AppendAllText(Path.Combine(extracted,"catalog.json"),"bad");Reject(()=>Updater.VerifyStage(extracted,manifest),"hash mismatch rejected");
        var bad=Tuner.Json().Deserialize<UpdateManifest>(Tuner.Json().Serialize(manifest));bad.files[0].path="../escape.exe";Reject(()=>Updater.Validate(bad),"path traversal rejected");
        var duplicate=Tuner.Json().Deserialize<UpdateManifest>(Tuner.Json().Serialize(manifest));duplicate.files[0].path=duplicate.files[1].path;Reject(()=>Updater.Validate(duplicate),"duplicate paths rejected");
        File.WriteAllText(Path.Combine(root,"suite-test.txt"),string.Join(Environment.NewLine,results)+Environment.NewLine+"WORK="+work,new UTF8Encoding(false));
    }
}

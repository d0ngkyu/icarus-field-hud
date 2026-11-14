using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Collections.Generic;
using System.IO.Compression;
using System.Diagnostics;
using System.Threading.Tasks;

public sealed class UpdateFile {public string path;public string sha256;public long size;}
public sealed class UpdateManifest {public string version,packageUrl,sha256;public long size;public UpdateFile[] files;}
public static class Updater {
    public const string CurrentVersion="0.3.0";
    public const string ManifestUrl="https://raw.githubusercontent.com/d0ngkyu/icarus-field-hud/codex/solo-items/standalone/manifest.json";
    public static readonly HashSet<string> Allowed=new HashSet<string>(new[]{"IcarusSoloItems.exe","DesktopLauncher.exe","catalog.json","README.md","Scripts/main.lua","Scripts/catalog.lua","tools/repak.exe","tools/LICENSE-MIT","tools/LICENSE-APACHE"},StringComparer.OrdinalIgnoreCase);
    static bool Hex(string s){return s!=null&&System.Text.RegularExpressions.Regex.IsMatch(s,"^[a-fA-F0-9]{64}$");}
    public static void Validate(UpdateManifest m){
        Version v;Uri uri;
        if(m==null||!Version.TryParse(m.version,out v)||!Hex(m.sha256)||m.size<=0||m.size>30000000||m.files==null||m.files.Length!=Allowed.Count)throw new Exception("업데이트 정보가 올바르지 않습니다.");
        if(!Uri.TryCreate(m.packageUrl,UriKind.Absolute,out uri)||uri.Scheme!="https"||uri.Host!="raw.githubusercontent.com"||!uri.AbsolutePath.StartsWith("/d0ngkyu/icarus-field-hud/",StringComparison.Ordinal))throw new Exception("업데이트 주소를 확인할 수 없습니다.");
        var paths=new HashSet<string>(StringComparer.OrdinalIgnoreCase);long total=0;
        foreach(var f in m.files){if(f==null||!Allowed.Contains(f.path)||!paths.Add(f.path)||!Hex(f.sha256)||f.size<0||f.size>20000000)throw new Exception("업데이트 파일 목록이 올바르지 않습니다.");total+=f.size;}
        if(total>40000000)throw new Exception("업데이트 용량 제한을 넘었습니다.");
    }
    public static void VerifyStage(string stage,UpdateManifest m){Validate(m);foreach(var f in m.files){var p=Path.Combine(stage,f.path);if(!File.Exists(p)||new FileInfo(p).Length!=f.size||Tuner.Hash(p)!=f.sha256.ToLowerInvariant())throw new Exception("업데이트 파일 검증 실패: "+f.path);}}
    public static async Task<string> Download(){
        ServicePointManager.SecurityProtocol|=SecurityProtocolType.Tls12;
        using(var http=new HttpClient(new HttpClientHandler{AllowAutoRedirect=false})){http.Timeout=TimeSpan.FromSeconds(90);http.DefaultRequestHeaders.UserAgent.ParseAdd("IcarusSoloTools/"+CurrentVersion);
            string text=await http.GetStringAsync(ManifestUrl+"?v="+DateTimeOffset.UtcNow.ToUnixTimeSeconds());
            if(text.Length>65536)throw new Exception("업데이트 정보가 너무 큽니다.");
            var m=Tuner.Json().Deserialize<UpdateManifest>(text);Validate(m);
            if(new Version(m.version)<=new Version(CurrentVersion))return null;
            string stage=Path.Combine(Tuner.StateDir,"updates",m.version+"-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(stage);
            string zip=Path.Combine(stage,"package.zip");
            using(var response=await http.GetAsync(m.packageUrl,HttpCompletionOption.ResponseHeadersRead)){
                response.EnsureSuccessStatusCode();using(var input=await response.Content.ReadAsStreamAsync())using(var output=File.Create(zip)){
                    byte[] buffer=new byte[65536];long total=0;int n;while((n=await input.ReadAsync(buffer,0,buffer.Length))>0){total+=n;if(total>m.size)throw new Exception("업데이트 크기가 다릅니다.");await output.WriteAsync(buffer,0,n);}if(total!=m.size)throw new Exception("업데이트 다운로드가 완료되지 않았습니다.");
                }
            }
            if(Tuner.Hash(zip)!=m.sha256.ToLowerInvariant())throw new Exception("다운로드 파일이 손상되었습니다.");
            Extract(zip,stage,m);VerifyStage(stage,m);Tuner.Atomic(Path.Combine(stage,"update-manifest.json"),text);return stage;
        }
    }
    public static void Extract(string zip,string stage,UpdateManifest m){
        Validate(m);var found=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using(var archive=ZipFile.OpenRead(zip))foreach(var entry in archive.Entries){
            string name=entry.FullName.Replace('\\','/');
            if(name.EndsWith("/")&&entry.Length==0)continue;
            if(!Allowed.Contains(name)||!found.Add(name))throw new Exception("허용하지 않은 업데이트 파일입니다.");
            var f=m.files.Single(x=>x.path.Equals(name,StringComparison.OrdinalIgnoreCase));if(entry.Length!=f.size)throw new Exception("압축 파일 크기가 다릅니다.");
            string dest=Path.Combine(stage,name);Directory.CreateDirectory(Path.GetDirectoryName(dest));
            using(var source=entry.Open())using(var output=new FileStream(dest,FileMode.CreateNew,FileAccess.Write))source.CopyTo(output);
        }
        if(found.Count!=Allowed.Count)throw new Exception("업데이트 파일이 누락되었습니다.");
    }
    public static void BeginApply(string stage,string target){
        var m=Tuner.Json().Deserialize<UpdateManifest>(File.ReadAllText(Path.Combine(stage,"update-manifest.json")));VerifyStage(stage,m);Tuner.Stopped();
        Process.Start(new ProcessStartInfo(Path.Combine(stage,"IcarusSoloItems.exe"),"--apply-update "+Process.GetCurrentProcess().Id+" \""+Path.GetFullPath(target).TrimEnd('\\')+"\""){UseShellExecute=false,CreateNoWindow=true});
    }
    public static void ApplyFiles(string stage,string target,UpdateManifest m,Action guard){
        VerifyStage(stage,m);target=Path.GetFullPath(target);
        if(!File.Exists(Path.Combine(target,"IcarusSoloItems.exe"))||!File.Exists(Path.Combine(target,"catalog.json")))throw new Exception("기존 프로그램 폴더를 확인할 수 없습니다.");
        guard();using(var updateLock=new FileStream(Path.Combine(target,".update.lock"),FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None)){
            string backup=Path.Combine(target,".update-backups",DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6));Directory.CreateDirectory(backup);
            var touched=new List<UpdateFile>();var existed=new HashSet<string>();
            foreach(var f in m.files){string old=Path.Combine(target,f.path);if(File.Exists(old)){string b=Path.Combine(backup,f.path);Directory.CreateDirectory(Path.GetDirectoryName(b));File.Copy(old,b);existed.Add(f.path);}}
            try{
                guard();foreach(var f in m.files){guard();string dest=Path.Combine(target,f.path);Directory.CreateDirectory(Path.GetDirectoryName(dest));File.Copy(Path.Combine(stage,f.path),dest+".new",true);touched.Add(f);if(File.Exists(dest))File.Replace(dest+".new",dest,null);else File.Move(dest+".new",dest);}
                VerifyStage(target,m);Tuner.Atomic(Path.Combine(target,"installed-version.json"),Tuner.Json().Serialize(m));
            }catch{
                foreach(var f in touched.AsEnumerable().Reverse()){string dest=Path.Combine(target,f.path);if(existed.Contains(f.path))File.Copy(Path.Combine(backup,f.path),dest,true);else File.Delete(dest);File.Delete(dest+".new");}throw;
            }
        }
    }
    public static void RunHelper(string[] args){
        int pid=int.Parse(args[1]);string target=args[2],stage=AppDomain.CurrentDomain.BaseDirectory;
        try{using(var old=Process.GetProcessById(pid))if(!old.WaitForExit(30000))throw new Exception("프로그램 종료를 기다리는 중입니다. 다음 실행 때 다시 업데이트합니다.");}catch(ArgumentException){}
        var m=Tuner.Json().Deserialize<UpdateManifest>(File.ReadAllText(Path.Combine(stage,"update-manifest.json")));
        if(m.version!=CurrentVersion)throw new Exception("업데이트 실행 파일 버전이 다릅니다.");ApplyFiles(stage,target,m,Tuner.Stopped);
        Process.Start(new ProcessStartInfo(Path.Combine(target,"IcarusSoloItems.exe")){UseShellExecute=true,WorkingDirectory=target});
    }
}

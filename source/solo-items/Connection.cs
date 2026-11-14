using System;
using System.IO;
using System.Drawing;
using System.Diagnostics;
using System.Windows.Forms;

public sealed class ConnectionState {
    public string Badge,Detail;public bool Online;
    public static ConnectionState Read(bool running,bool installed,string heartbeat,string probe,long now,long processStart){
        var s=new ConnectionState{Badge="OFFLINE",Detail="게임을 실행해 주세요."};
        if(!installed){s.Detail="앱 설정에서 아이템 모드를 설치하세요.";return s;}
        if(!running)return s;
        s.Badge="WAITING";s.Detail="모드 응답 대기 · 설치 후에는 게임을 다시 실행하세요.";
        var p=(heartbeat??"").Split('|');long time,session;
        if(p.Length!=4||p[0]!="1"||p[3]!="LOADED"||!long.TryParse(p[1],out time)||!long.TryParse(p[2],out session))return s;
        if(time>now+2||now-time>10||session<processStart-2||session>time)return s;
        s.Online=true;s.Badge="ONLINE";s.Detail="모드 연결됨 · 싱글 월드에서 F11로 사용 준비 확인";
        var q=(probe??"").Split('|');long checkedAt,checkedSession;
        if(q.Length==4&&q[0]=="1"&&long.TryParse(q[1],out checkedAt)&&long.TryParse(q[2],out checkedSession)&&checkedSession==session&&checkedAt<=now+2&&now-checkedAt<=10){
            if(q[3]=="SINGLE")s.Detail="방금 싱글 월드 확인 · 아이템 요청 가능";
            else if(q[3]=="MULTI")s.Detail="멀티플레이 확인 · 아이템 생성 사용 불가";
            else s.Detail="월드 준비 전 · 싱글 월드 입장 후 F11";
        }
        return s;
    }
}
public partial class ItemTool {
    readonly Timer connectionTimer=new Timer();
    Label connectionBadge,connectionDetail;
    void InitializeConnection(){
        saveState.SetBounds(976,22,220,26);saveState.Font=Ui(9);
        pageSubtitle.Width=565;
        connectionBadge=TextLabel("●  OFFLINE",950,54,246,33);connectionBadge.Font=new Font("Bahnschrift",17,FontStyle.Bold);connectionBadge.TextAlign=ContentAlignment.MiddleRight;
        connectionDetail=TextLabel("연결 확인 중",790,99,406,30);connectionDetail.Font=Ui(9);connectionDetail.ForeColor=muted;connectionDetail.TextAlign=ContentAlignment.MiddleRight;connectionDetail.AutoEllipsis=true;
        connectionTimer.Interval=3000;connectionTimer.Tick+=(o,e)=>RefreshConnection();connectionTimer.Start();
        FormClosed+=(o,e)=>connectionTimer.Dispose();RefreshConnection();
    }
    static string ReadSmall(string path){
        try{if(!File.Exists(path)||new FileInfo(path).Length>256)return "";return File.ReadAllText(path).Trim();}catch(IOException){return "";}catch(UnauthorizedAccessException){return "";}
    }
    void RefreshConnection(){
        if(connectionBadge==null||IsDisposed)return;
        ConnectionState state;
        try{
            string root=ModPath(game.Text),expected=Path.GetFullPath(Path.Combine(game.Text,@"Icarus\Binaries\Win64\Icarus-Win64-Shipping.exe"));
            bool running=false;long started=long.MaxValue;
            foreach(var p in Process.GetProcessesByName("Icarus-Win64-Shipping"))using(p){
                if(!string.Equals(Path.GetFullPath(p.MainModule.FileName),expected,StringComparison.OrdinalIgnoreCase))continue;
                running=true;started=new DateTimeOffset(p.StartTime.ToUniversalTime()).ToUnixTimeSeconds();break;
            }
            bool installed=File.Exists(Path.Combine(root,"enabled.txt"))&&File.Exists(Path.Combine(root,"solo-items-owner.txt"));
            state=ConnectionState.Read(running,installed,ReadSmall(Path.Combine(root,"heartbeat.txt")),ReadSmall(Path.Combine(root,"world-check.txt")),DateTimeOffset.UtcNow.ToUnixTimeSeconds(),started);
        }catch{state=new ConnectionState{Badge="OFFLINE",Detail="연결을 확인할 수 없습니다 · 앱 설정의 게임 폴더 확인"};}
        connectionBadge.Text="●  "+state.Badge;connectionBadge.ForeColor=state.Online?Color.FromArgb(114,207,164):state.Badge=="WAITING"?gold:muted;
        connectionDetail.Text=state.Detail;
    }
    static void ConnectionTest(){
        Func<bool,bool,string,string,long,long,ConnectionState> read=ConnectionState.Read;
        string live="1|1000|900|LOADED";
        if(!read(true,true,live,"",1002,899).Online)throw new Exception("Fresh heartbeat rejected");
        foreach(var text in new[]{"", "1|1000", "1|980|900|LOADED", "1|1030|900|LOADED", "1|1000|800|LOADED"})if(read(true,true,text,"",1002,899).Online)throw new Exception("Invalid heartbeat accepted");
        if(read(false,true,live,"",1002,899).Online||read(true,false,live,"",1002,899).Online)throw new Exception("Offline accepted");
        if(!read(true,true,live,"1|1000|900|MULTI",1002,899).Detail.Contains("사용 불가"))throw new Exception("Multiplayer state lost");
        if(!read(true,true,live,"1|1000|900|SINGLE",1002,899).Detail.Contains("요청 가능"))throw new Exception("Single check lost");
        if(read(true,true,"1|1020|900|LOADED","1|1000|900|SINGLE",1020,899).Detail.Contains("요청 가능"))throw new Exception("Stale ready retained");
        File.WriteAllText(Path.Combine(Base,"connection-test.txt"),"PASS: fresh/stale/future/partial/old session/offline/disabled heartbeat; single/multi/expired readiness");
    }
}

using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Drawing;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Text.RegularExpressions;

// Teleport tab (single-player tool only): save the current spot, move to a saved spot, or go back.
// The game mod checks single-player host, same map and map bounds before it moves the character.
public sealed class TeleportSpot {public string Name,World;public int X,Y,Z;}
public partial class ItemTool {
    List<TeleportSpot> spots=new List<TeleportSpot>();
    string spotsPath=Path.Combine(Tuner.StateDir,"teleports.json");
    string hereId="";
    ListBox spotList;TextBox spotName;
    static readonly Dictionary<string,string> MapNames=new Dictionary<string,string>{{"Terrain_016","올림푸스"},{"Terrain_017","스틱스"},{"Terrain_019","프로메테우스"},{"Terrain_021","엘리시움"}};
    public static string MapName(string w){string n;return w!=null&&MapNames.TryGetValue(w,out n)?n:(w??"?");}
    public static string SpotText(TeleportSpot s){return s.Name+"   ·   "+MapName(s.World)+"   ("+(s.X/100)+", "+(s.Y/100)+")";}
    public static string TeleportRequest(string cmd,TeleportSpot s){
        string head=Guid.NewGuid().ToString("N")+"|"+DateTimeOffset.UtcNow.ToUnixTimeSeconds()+"|";
        if(cmd=="HERE"||cmd=="BACK")return head+cmd;
        if(cmd!="GO"||s==null||s.World==null||!Regex.IsMatch(s.World,@"^[A-Za-z0-9_]+$"))throw new Exception("이동할 장소를 확인해 주세요.");
        return head+"GO|"+s.World+"|"+s.X+"|"+s.Y+"|"+s.Z;
    }
    public static TeleportSpot ParseHere(string line,string id,string name){
        var m=Regex.Match(line??"",@"^([a-f0-9]{32})\|([A-Za-z0-9_]+)\|(-?\d+)\|(-?\d+)\|(-?\d+)\s*$");
        if(!m.Success||m.Groups[1].Value!=id)return null;
        return new TeleportSpot{Name=name,World=m.Groups[2].Value,X=int.Parse(m.Groups[3].Value),Y=int.Parse(m.Groups[4].Value),Z=int.Parse(m.Groups[5].Value)};
    }
    void LoadSpots(){try{if(File.Exists(spotsPath))spots=Tuner.Json().Deserialize<List<TeleportSpot>>(File.ReadAllText(spotsPath,Utf8))??new List<TeleportSpot>();}catch{spots=new List<TeleportSpot>();}}
    void SaveSpots(){Tuner.Atomic(spotsPath,Tuner.Json().Serialize(spots));}
    void SendTeleport(string request){
        if(imagePreviewMode)throw new Exception("화면 확인 모드에서는 요청하지 않습니다.");
        string target=ModPath(game.Text);
        if(!File.Exists(Path.Combine(target,"enabled.txt")))throw new Exception("게임 종료 후 먼저 모드를 설치하세요.");
        string p=Path.Combine(target,"teleport.txt");
        if(File.Exists(p))throw new Exception("앞 이동 요청을 처리하는 중입니다. 잠시 뒤 다시 눌러 주세요.");
        File.WriteAllText(p+".tmp",request,Utf8);File.Move(p+".tmp",p);lastId=request.Split('|')[0];
    }
    void ShowTeleport(){
        LoadSpots();
        PanelLabel("싱글 월드에서만 동작합니다. 같은 지도에 저장한 장소로만 이동하고, 도착할 때 살짝 위에서 내려옵니다.",26,66,925,28,10,false).ForeColor=muted;
        PanelLabel("지금 위치 저장",26,108,300,28,12,true);
        spotName=new TextBox{Font=Ui(12),BackColor=Color.FromArgb(32,42,53),ForeColor=ForeColor,BorderStyle=BorderStyle.FixedSingle,AccessibleName="장소 이름"};spotName.SetBounds(26,142,520,34);tuningPanel.Controls.Add(spotName);
        PanelButton("＋ 지금 위치 저장",560,140,200,()=>{
            string name=(spotName.Text??"").Trim();if(name.Length==0)name="장소 "+(spots.Count+1);if(name.Length>30)name=name.Substring(0,30);
            var req=TeleportRequest("HERE",null);SendTeleport(req);hereId=lastId;pendingSpotName=name;message.Text="게임에서 지금 위치를 읽는 중…";
        },true);
        spotList=new ListBox{Font=Ui(11),BackColor=Color.FromArgb(28,37,47),ForeColor=ForeColor,BorderStyle=BorderStyle.None,IntegralHeight=false,ItemHeight=30,AccessibleName="저장한 장소"};
        spotList.SetBounds(26,196,734,196);tuningPanel.Controls.Add(spotList);RefreshSpots();
        PanelButton("이 장소로 이동",776,196,180,()=>{var s=Selected();SendTeleport(TeleportRequest("GO",s));message.Text="「"+s.Name+"」(으)로 이동 요청…";},true).Height=44;
        PanelButton("삭제",776,252,180,()=>{var s=Selected();spots.Remove(s);SaveSpots();RefreshSpots();message.Text="「"+s.Name+"」을(를) 목록에서 지웠습니다.";});
        PanelButton("↩ 이동 전 위치로",26,410,240,()=>{SendTeleport(TeleportRequest("BACK",null));message.Text="이동 전 위치로 돌아가는 중…";});
        PanelLabel("목록을 두 번 눌러도 이동합니다.",290,420,450,24,9,false).ForeColor=muted;
        spotList.DoubleClick+=(o,e)=>{try{var s=Selected();SendTeleport(TeleportRequest("GO",s));message.Text="「"+s.Name+"」(으)로 이동 요청…";}catch(Exception ex){message.Text=ex.Message;}};
    }
    string pendingSpotName="";
    TeleportSpot Selected(){if(spotList==null||spotList.SelectedIndex<0||spotList.SelectedIndex>=spots.Count)throw new Exception("목록에서 장소를 고르세요.");return spots[spotList.SelectedIndex];}
    void RefreshSpots(){if(spotList==null||spotList.IsDisposed)return;spotList.Items.Clear();foreach(var s in spots)spotList.Items.Add(SpotText(s));if(spots.Count==0)message.Text="저장한 장소가 없습니다. 게임에서 원하는 곳에 서서 ‘지금 위치 저장’을 누르세요.";}
    // called from ReadStatus when the game wrote here.txt for our HERE request
    void ReadHere(){
        if(hereId=="")return;
        try{
            string file=Path.Combine(ModPath(game.Text),"here.txt");if(!File.Exists(file))return;
            var s=ParseHere(File.ReadAllText(file,Utf8),hereId,pendingSpotName);if(s==null)return;
            hereId="";spots.Add(s);SaveSpots();RefreshSpots();if(spotName!=null&&!spotName.IsDisposed)spotName.Text="";
            message.Text="「"+s.Name+"」 저장 · "+MapName(s.World);
        }catch(IOException){}catch(UnauthorizedAccessException){}
    }
    static void TeleportTest(){
        var r=TeleportRequest("GO",new TeleportSpot{Name="a",World="Terrain_016",X=-5,Y=7,Z=1});
        if(!Regex.IsMatch(r,@"^[a-f0-9]{32}\|\d+\|GO\|Terrain_016\|-5\|7\|1$"))throw new Exception("Teleport request");
        if(!TeleportRequest("BACK",null).EndsWith("|BACK"))throw new Exception("Back request");
        bool bad=false;try{TeleportRequest("GO",new TeleportSpot{World="x|y"});}catch{bad=true;}if(!bad)throw new Exception("World check");
        string id=new string('a',32);var s=ParseHere(id+"|Terrain_019|100|-200|300",id,"집");
        if(s==null||s.World!="Terrain_019"||s.Y!=-200||s.Name!="집")throw new Exception("Here parse");
        if(ParseHere(new string('b',32)+"|Terrain_019|1|2|3",id,"x")!=null)throw new Exception("Other request id accepted");
    }
}

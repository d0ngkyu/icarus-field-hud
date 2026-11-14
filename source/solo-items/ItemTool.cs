using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Drawing;
using System.Diagnostics;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Windows.Forms;

public class Item {
    public string id {get;set;}
    public string name {get;set;}
    public string english {get;set;}
}
public class ItemTool : Form {
    static readonly string Base = AppDomain.CurrentDomain.BaseDirectory;
    static readonly Encoding Utf8 = new UTF8Encoding(false);
    readonly TextBox game = new TextBox(), search = new TextBox();
    readonly ListView list = new ListView();
    readonly NumericUpDown amount = new NumericUpDown();
    readonly Label message = new Label();
    readonly Timer timer = new Timer();
    readonly Item[] catalog;
    string lastId = "";
    static Item[] LoadCatalog() {
        return new JavaScriptSerializer { MaxJsonLength = 8000000 }.Deserialize<Item[]>(File.ReadAllText(Path.Combine(Base,"catalog.json"),Utf8));
    }
    public static string Request(string id, int count) {
        if (!System.Text.RegularExpressions.Regex.IsMatch(id,@"^[A-Za-z0-9_]+$") || count<1 || count>100) throw new Exception("아이템 또는 수량이 올바르지 않습니다.");
        return Guid.NewGuid().ToString("N")+"|"+DateTimeOffset.UtcNow.ToUnixTimeSeconds()+"|"+id+"|"+count;
    }
    static void AssertStopped() {
        foreach (string name in new[]{"Icarus","Icarus-Win64-Shipping","IcarusServer-Win64-Shipping"}) {
            var processes=Process.GetProcessesByName(name);
            bool running=processes.Length>0;
            foreach(var p in processes) p.Dispose();
            if(running) throw new Exception("게임을 정상 종료한 뒤 설치하거나 해제해 주세요.");
        }
    }
    static string ModPath(string root) {
        root=Path.GetFullPath(root);
        var bin=Path.Combine(root,@"Icarus\Binaries\Win64");
        if(!File.Exists(Path.Combine(bin,"Icarus-Win64-Shipping.exe"))) throw new Exception("Icarus 게임 폴더를 선택해 주세요.");
        if(!File.Exists(Path.Combine(bin,@"ue4ss\UE4SS.dll"))) throw new Exception("기존 HUD의 UE4SS 설치가 필요합니다.");
        return Path.Combine(bin,@"ue4ss\Mods\IcarusSoloItems");
    }
    static string Install(string root) {
        AssertStopped();
        string target=ModPath(root);
        string owner=Path.Combine(target,"solo-items-owner.txt");
        if(Directory.Exists(target) && !File.Exists(owner)) throw new Exception("같은 이름의 다른 모드가 있습니다. 덮어쓰지 않았습니다.");
        string enabled=Path.Combine(target,"enabled.txt");
        // Stage both files before touching the active mod. A failed update remains disabled.
        Directory.CreateDirectory(Path.Combine(target,"Scripts"));
        foreach(string f in new[]{"main.lua","catalog.lua"})
            File.Copy(Path.Combine(Base,"Scripts",f),Path.Combine(target,"Scripts",f+".new"),true);
        AssertStopped();
        File.Delete(enabled);
        File.WriteAllText(owner,"IcarusSoloItems 0.1",Utf8);
        foreach(string f in new[]{"main.lua","catalog.lua"}) {
            string dest=Path.Combine(target,"Scripts",f);
            if(File.Exists(dest)) File.Replace(dest+".new",dest,dest+".previous");
            else File.Move(dest+".new",dest);
        }
        AssertStopped();
        File.WriteAllText(enabled,"",Utf8);
        return target;
    }
    void Add(Control c,int x,int y,int w,int h) {c.SetBounds(x,y,w,h);Controls.Add(c);}
    Label TextLabel(string s,int x,int y,int w,int h) {var c=new Label{Text=s};Add(c,x,y,w,h);return c;}
    void ActionButton(string s,int x,int y,int w,Action a) {
        var c=new Button{Text=s};Add(c,x,y,w,36);
        c.Click+=(o,e)=>{try{a();}catch(Exception ex){message.Text=ex.Message;}};
    }
    public ItemTool() {
        catalog=LoadCatalog();
        Text="아이카루스 · 싱글 아이템 도구";
        ClientSize=new Size(830,660); MinimumSize=new Size(846,699);
        StartPosition=FormStartPosition.CenterScreen;
        Font=new Font("맑은 고딕",10); BackColor=Color.FromArgb(242,245,248);
        AutoScaleMode=AutoScaleMode.None;
        TextLabel("필요한 아이템, 직접 선택하세요",24,18,780,36).Font=new Font("맑은 고딕",17,FontStyle.Bold);
        TextLabel("싱글 전용 · 생성 요청은 게임에서 F11을 눌러 실행합니다.",26,59,780,28);
        game.Text=@"C:\Program Files (x86)\Steam\steamapps\common\Icarus";
        Add(game,26,101,575,28);
        ActionButton("폴더 선택",613,96,190,()=>{using(var d=new FolderBrowserDialog{Description="Icarus 게임 폴더 선택"}){if(d.ShowDialog()==DialogResult.OK) game.Text=d.SelectedPath;}});
        ActionButton("① 모드 설치 / 갱신",26,142,220,()=>{Install(game.Text);message.Text="설치 완료. 게임을 실행하고 싱글 월드에 입장하세요.";});
        ActionButton("모드 사용 해제",258,142,170,()=>{
            AssertStopped();string target=ModPath(game.Text);
            if(!File.Exists(Path.Combine(target,"solo-items-owner.txt"))) throw new Exception("이 도구로 설치한 모드가 없습니다.");
            File.Delete(Path.Combine(target,"enabled.txt"));File.Delete(Path.Combine(target,"request.txt"));
            message.Text="모드를 해제했습니다. 이미 얻은 아이템은 유지됩니다.";
        });
        TextLabel("② 아이템 검색 (한글 / 영어 / 내부 이름 · 검색 결과 최대 200개)",26,193,777,24);
        Add(search,26,223,777,29);search.TextChanged+=(o,e)=>FilterItems();
        list.View=View.Details;list.FullRowSelect=true;list.MultiSelect=false;list.HideSelection=false;
        list.Columns.Add("아이템",260);list.Columns.Add("영어 이름",225);list.Columns.Add("내부 이름",265);
        Add(list,26,262,777,255);
        TextLabel("수량",26,536,50,27);amount.Minimum=1;amount.Maximum=100;amount.Value=1;Add(amount,80,533,90,30);
        ActionButton("③ 요청 준비 → 게임에서 F11",187,529,390,()=>{
            if(list.SelectedItems.Count!=1) throw new Exception("목록에서 아이템을 선택하세요.");
            string target=ModPath(game.Text);
            if(!File.Exists(Path.Combine(target,"enabled.txt"))) throw new Exception("게임 종료 후 먼저 모드를 설치하세요.");
            string p=Path.Combine(target,"request.txt");
            if(File.Exists(p)||File.Exists(Path.Combine(target,"processing.txt"))) throw new Exception("대기 중인 요청이 있습니다. F11로 실행하거나 요청을 취소하세요.");
            string request=Request((string)list.SelectedItems[0].Tag,(int)amount.Value);
            File.WriteAllText(p+".tmp",request,Utf8);File.Move(p+".tmp",p);
            lastId=request.Split('|')[0];message.Text="요청 준비 완료. 2분 이내 게임으로 돌아가 F11을 누르세요.";
        });
        ActionButton("요청 취소",589,529,214,()=>{
            string target=ModPath(game.Text);
            if(File.Exists(Path.Combine(target,"processing.txt"))) throw new Exception("이미 처리 중인 요청은 취소할 수 없습니다.");
            File.Delete(Path.Combine(target,"request.txt"));lastId="";message.Text="대기 요청을 취소했습니다.";
        });
        message.Text="게임 종료 → 모드 설치 → 싱글 입장 → 아이템 선택 → 요청 준비 → F11";
        message.ForeColor=Color.FromArgb(29,70,100);Add(message,26,580,777,68);
        timer.Interval=1000;timer.Tick+=(o,e)=>ReadStatus();timer.Start();
        FormClosed+=(o,e)=>timer.Dispose();FilterItems();
    }
    void FilterItems() {
        string q=search.Text.Trim();list.BeginUpdate();list.Items.Clear();
        foreach(var i in catalog.Where(i=>(i.name+" "+i.english+" "+i.id).IndexOf(q,StringComparison.OrdinalIgnoreCase)>=0).Take(200)) {
            var row=new ListViewItem(new[]{i.name,i.english,i.id});row.Tag=i.id;list.Items.Add(row);
        }
        list.EndUpdate();
    }
    void ReadStatus() {
        if(lastId=="") return;
        try {
            var p=File.ReadAllText(Path.Combine(ModPath(game.Text),"status.txt"),Utf8).Split('|');
            if(p.Length<4 || p[0]!=lastId) return;
            if(p[1]=="SENT") {message.Text="생성 함수 "+p[2]+"회 호출 완료. 실제 지급 수량은 게임 가방에서 확인하세요.";lastId="";}
            if(p[1]=="ERROR") {message.Text="처리 중단 (호출 "+p[2]+"회): "+p[3];lastId="";}
            if(p[1]=="WORKING") message.Text="게임에서 생성 요청을 처리하고 있습니다.";
        }catch(IOException){}catch(UnauthorizedAccessException){}
    }
    static void SelfTest() {
        var cat=LoadCatalog();
        if(cat.Length!=2989 || !cat.Any(i=>i.id=="Fiber")) throw new Exception("Catalog test failed");
        if(!System.Text.RegularExpressions.Regex.IsMatch(Request("Fiber",3),@"^[a-f0-9]{32}\|\d+\|Fiber\|3$")) throw new Exception("Protocol failed");
        foreach(int n in new[]{0,101}) {bool rejected=false;try{Request("Fiber",n);}catch{rejected=true;}if(!rejected)throw new Exception("Range failed");}
        bool invalid=false;try{Request("../bad",1);}catch{invalid=true;}if(!invalid)throw new Exception("ID failed");
        File.WriteAllText(Path.Combine(Base,"self-test.txt"),"PASS: catalog, request protocol, quantity limits, invalid identifier",Utf8);
    }
    [STAThread] public static int Main(string[] args) {
        try {
            if(args.Contains("--self-test")){SelfTest();return 0;}
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new ItemTool());return 0;
        } catch(Exception ex) {
            File.WriteAllText(Path.Combine(Base,"error.txt"),ex.ToString(),Utf8);
            if(!args.Contains("--self-test")) MessageBox.Show(ex.Message,"실행 오류");
            return 1;
        }
    }
}

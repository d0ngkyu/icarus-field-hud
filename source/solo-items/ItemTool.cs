using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Drawing;
using System.Diagnostics;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

public class Item {
    public string id {get;set;}
    public string name {get;set;}
    public string english {get;set;}
}
public partial class ItemTool : Form {
    static readonly string Base = AppDomain.CurrentDomain.BaseDirectory;
    static readonly Encoding Utf8 = new UTF8Encoding(false);
    readonly TextBox game = new TextBox(), search = new TextBox();
    readonly ListView list = new ListView();
    readonly NumericUpDown amount = new NumericUpDown();
    readonly Label message = new Label();
    readonly Label selectedName = new Label(), selectedEnglish = new Label(), resultCount = new Label();
    Button prepare;
    readonly Color muted=Color.FromArgb(147,160,173), gold=Color.FromArgb(220,186,132), panel=Color.FromArgb(23,30,38);
    readonly ImageList rowHeight = new ImageList();
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
    Label TextLabel(string s,int x,int y,int w,int h) {var c=new Label{Text=s,BackColor=Color.Transparent};Add(c,x,y,w,h);return c;}
    Button ActionButton(string s,int x,int y,int w,Action a) {
        var c=new Button{Text=s,FlatStyle=FlatStyle.Flat,BackColor=Color.FromArgb(34,44,55),ForeColor=ForeColor,Cursor=Cursors.Hand};
        c.FlatAppearance.BorderSize=0;c.FlatAppearance.MouseOverBackColor=Color.FromArgb(48,61,74);Add(c,x,y,w,38);
        c.Click+=(o,e)=>{try{a();}catch(Exception ex){message.Text=ex.Message;}};
        return c;
    }
    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h,int attr,ref int value,int size);
    protected override void OnHandleCreated(EventArgs e) {base.OnHandleCreated(e);try{int on=1;DwmSetWindowAttribute(Handle,20,ref on,4);}catch{}}
    protected override void OnPaint(PaintEventArgs e) {
        base.OnPaint(e);PaintDesign(e.Graphics);
    }
    public ItemTool() {
        catalog=LoadCatalog();
        Text="ICARUS · 싱글 도구";
        Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        ClientSize=new Size(1040,800); FormBorderStyle=FormBorderStyle.FixedSingle;MaximizeBox=false;
        StartPosition=FormStartPosition.CenterScreen;
        Font=new Font("맑은 고딕",10); BackColor=Color.FromArgb(14,19,25);ForeColor=Color.FromArgb(232,237,242);DoubleBuffered=true;
        AutoScaleMode=AutoScaleMode.None;
        var brand=TextLabel("I C A R U S   /   F I E L D   S U P P L Y",30,24,600,22);brand.ForeColor=gold;brand.Font=new Font("Segoe UI",9,FontStyle.Bold);
        TextLabel("아이카루스 싱글 도구",27,51,640,44).Font=new Font("맑은 고딕",23,FontStyle.Bold);
        var badge=TextLabel("●  SINGLE PLAYER",814,48,198,30);badge.ForeColor=gold;badge.TextAlign=ContentAlignment.MiddleRight;badge.Font=new Font("Segoe UI",10,FontStyle.Bold);
        var version=TextLabel("DESKTOP EDITION   /   "+Updater.CurrentVersion,784,84,228,24);version.ForeColor=muted;version.TextAlign=ContentAlignment.MiddleRight;version.Font=new Font("Segoe UI",9);
        game.Text=@"C:\Program Files (x86)\Steam\steamapps\common\Icarus";
        TextLabel("게임 연결",48,666,130,24).Font=new Font("맑은 고딕",10,FontStyle.Bold);
        TextLabel("처음 한 번, 게임을 종료한 상태에서 모드를 설치하세요.",170,666,790,24).ForeColor=muted;
        game.BorderStyle=BorderStyle.None;game.BackColor=panel;game.ForeColor=muted;game.Font=new Font("Segoe UI",9);Add(game,48,705,550,24);
        ActionButton("폴더 변경",620,697,100,()=>{using(var d=new FolderBrowserDialog{Description="Icarus 게임 폴더 선택"}){if(d.ShowDialog()==DialogResult.OK) game.Text=d.SelectedPath;}});
        ActionButton("모드 설치 / 갱신",732,697,160,()=>{Install(game.Text);message.Text="설치 완료. 게임을 실행하고 싱글 월드에 입장하세요.";});
        ActionButton("해제",904,697,86,()=>{
            AssertStopped();string target=ModPath(game.Text);
            if(!File.Exists(Path.Combine(target,"solo-items-owner.txt"))) throw new Exception("이 도구로 설치한 모드가 없습니다.");
            File.Delete(Path.Combine(target,"enabled.txt"));File.Delete(Path.Combine(target,"request.txt"));
            message.Text="모드를 해제했습니다. 이미 얻은 아이템은 유지됩니다.";
        });
        TextLabel("아이템 라이브러리",48,176,300,28).Font=new Font("맑은 고딕",12,FontStyle.Bold);
        resultCount.ForeColor=muted;resultCount.BackColor=panel;resultCount.TextAlign=ContentAlignment.MiddleRight;resultCount.Font=new Font("Segoe UI",9);Add(resultCount,370,176,266,26);
        TextLabel("검색",48,225,44,28).ForeColor=gold;
        search.BorderStyle=BorderStyle.FixedSingle;search.BackColor=Color.FromArgb(32,42,53);search.ForeColor=ForeColor;
        search.AccessibleName="아이템 검색";Add(search,98,222,538,29);search.TextChanged+=(o,e)=>FilterItems();
        TextLabel("한글 · 영어 이름으로 검색",48,264,560,22).ForeColor=muted;
        list.View=View.Details;list.FullRowSelect=true;list.MultiSelect=false;list.HideSelection=false;
        list.BorderStyle=BorderStyle.None;list.BackColor=panel;list.ForeColor=ForeColor;list.HeaderStyle=ColumnHeaderStyle.None;list.OwnerDraw=true;
        list.Columns.Add("아이템",300);list.Columns.Add("영어 이름",270);rowHeight.ImageSize=new Size(1,43);list.SmallImageList=rowHeight;
        list.DrawItem+=(o,e)=>{};
        list.DrawSubItem+=(o,e)=>{
            bool chosen=e.Item.Selected;Color bg=chosen?Color.FromArgb(48,52,52):(e.ItemIndex%2==0?panel:Color.FromArgb(26,34,43));
            using(var b=new SolidBrush(bg)) e.Graphics.FillRectangle(b,e.Bounds);
            if(chosen && e.ColumnIndex==0) using(var b=new SolidBrush(gold))e.Graphics.FillRectangle(b,e.Bounds.X,e.Bounds.Y,3,e.Bounds.Height);
            var rect=new Rectangle(e.Bounds.X+14,e.Bounds.Y,e.Bounds.Width-24,e.Bounds.Height);
            TextRenderer.DrawText(e.Graphics,e.SubItem.Text,list.Font,rect,e.ColumnIndex==0?(chosen?gold:ForeColor):muted,TextFormatFlags.VerticalCenter|TextFormatFlags.EndEllipsis|TextFormatFlags.SingleLine);
        };
        Add(list,48,298,588,312);
        list.SelectedIndexChanged+=(o,e)=>{
            bool chosen=list.SelectedItems.Count==1;
            selectedName.Text=chosen?list.SelectedItems[0].Text:"아이템을 선택하세요";
            selectedEnglish.Text=chosen?list.SelectedItems[0].SubItems[1].Text:"왼쪽 목록에서 필요한 아이템을 골라 주세요.";
            if(prepare!=null)prepare.Enabled=chosen;
        };
        TextLabel("선택한 아이템",702,176,286,26).ForeColor=muted;
        var mark=TextLabel("선택한 보급품",720,229,185,27);mark.ForeColor=gold;mark.Font=new Font("Segoe UI",13,FontStyle.Bold);mark.BackColor=Color.FromArgb(33,44,55);
        selectedName.Text="아이템을 선택하세요";selectedName.Font=new Font("맑은 고딕",16,FontStyle.Bold);selectedName.BackColor=panel;selectedName.AutoEllipsis=true;Add(selectedName,702,290,286,34);
        selectedEnglish.Text="왼쪽 목록에서 필요한 아이템을 골라 주세요.";selectedEnglish.ForeColor=muted;selectedEnglish.Font=new Font("맑은 고딕",9);selectedEnglish.BackColor=panel;selectedEnglish.AutoEllipsis=true;Add(selectedEnglish,702,326,286,24);
        TextLabel("보급 수량",702,373,180,26).Font=new Font("맑은 고딕",11,FontStyle.Bold);
        TextLabel("1–100개",902,375,86,24).ForeColor=muted;
        amount.Minimum=1;amount.Maximum=100;amount.Value=1;amount.Font=new Font("Segoe UI",18,FontStyle.Bold);amount.BackColor=Color.FromArgb(32,42,53);amount.ForeColor=ForeColor;amount.BorderStyle=BorderStyle.FixedSingle;Add(amount,702,410,286,42);
        int bx=702;foreach(int n in new[]{1,10,50,100}){int value=n;var b=ActionButton(n.ToString(),bx,464,64,()=>amount.Value=value);b.Height=30;bx+=74;}
        prepare=ActionButton("생성 요청 준비   →",702,516,286,()=>{
            if(list.SelectedItems.Count!=1) throw new Exception("목록에서 아이템을 선택하세요.");
            string target=ModPath(game.Text);
            if(!File.Exists(Path.Combine(target,"enabled.txt"))) throw new Exception("게임 종료 후 먼저 모드를 설치하세요.");
            string p=Path.Combine(target,"request.txt");
            if(File.Exists(p)||File.Exists(Path.Combine(target,"processing.txt"))) throw new Exception("대기 중인 요청이 있습니다. F11로 실행하거나 요청을 취소하세요.");
            string request=Request((string)list.SelectedItems[0].Tag,(int)amount.Value);
            File.WriteAllText(p+".tmp",request,Utf8);File.Move(p+".tmp",p);
            lastId=request.Split('|')[0];message.Text="요청 준비 완료. 2분 이내 게임으로 돌아가 F11을 누르세요.";
        });
        prepare.Height=46;prepare.BackColor=gold;prepare.ForeColor=Color.FromArgb(25,29,32);prepare.Font=new Font("맑은 고딕",12,FontStyle.Bold);prepare.FlatAppearance.MouseOverBackColor=Color.FromArgb(239,206,157);prepare.Enabled=false;
        var hint=TextLabel("게임으로 돌아가  F11  을 누르세요.",702,575,286,24);hint.ForeColor=muted;hint.TextAlign=ContentAlignment.MiddleCenter;
        var cancel=ActionButton("대기 요청 취소",702,600,286,()=>{
            string target=ModPath(game.Text);
            if(File.Exists(Path.Combine(target,"processing.txt"))) throw new Exception("이미 처리 중인 요청은 취소할 수 없습니다.");
            File.Delete(Path.Combine(target,"request.txt"));lastId="";message.Text="대기 요청을 취소했습니다.";
        });
        cancel.Height=24;cancel.BackColor=panel;cancel.ForeColor=muted;cancel.Font=new Font("맑은 고딕",9);
        message.Text="준비됨  ·  아이템을 선택해 보급 요청을 준비하세요.";
        message.ForeColor=muted;message.Font=new Font("맑은 고딕",9);Add(message,28,762,984,32);
        timer.Interval=1000;timer.Tick+=(o,e)=>ReadStatus();timer.Start();
        FormClosed+=(o,e)=>{timer.Dispose();rowHeight.Dispose();};FilterItems();InitializeSuite();InitializeDesign();
    }
    void FilterItems() {
        string q=search.Text.Trim();list.BeginUpdate();list.Items.Clear();
        var matches=catalog.Where(i=>(i.name+" "+i.english+" "+i.id).IndexOf(q,StringComparison.OrdinalIgnoreCase)>=0).ToArray();
        resultCount.Text=matches.Length.ToString("N0")+" ITEMS"+(matches.Length>200?"   /   200 표시":"");
        foreach(var i in matches.Take(200)) {
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
            if(args.Length==3&&args[0]=="--apply-update"){Updater.RunHelper(args);return 0;}
            if(args.Contains("--connection-test")){ConnectionTest();return 0;}
            if(args.Contains("--layout-test")){LayoutTest();return 0;}
            if(args.Contains("--self-test")){SelfTest();return 0;}
            if(args.Contains("--suite-test")){SuiteTests.Run(Base);return 0;}
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            bool created;using(var mutex=new System.Threading.Mutex(true,"Local\\IcarusSoloTools",out created)){
                if(!created){MessageBox.Show("싱글 도구가 이미 실행 중입니다. 작업 표시줄에서 열어 주세요.","아이카루스 싱글 도구");return 0;}
                Application.Run(new ItemTool());mutex.ReleaseMutex();return 0;
            }
        } catch(Exception ex) {
            File.WriteAllText(Path.Combine(Base,"error.txt"),ex.ToString(),Utf8);
            if(!args.Contains("--self-test")&&!args.Contains("--suite-test")&&!args.Contains("--layout-test")&&!args.Contains("--connection-test")) MessageBox.Show(ex.Message,"실행 오류");
            return 1;
        }
    }
}

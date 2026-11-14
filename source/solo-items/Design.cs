using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Linq;
using System.Collections.Generic;
using System.Windows.Forms;

public partial class ItemTool {
    static readonly string UiFont=new System.Drawing.Text.InstalledFontCollection().Families.Any(f=>f.Name=="Noto Sans KR")?"Noto Sans KR":"맑은 고딕";
    readonly List<Control> connectionControls=new List<Control>();
    Label pageTitle,pageSubtitle,saveState,workflow;
    bool designReady;
    static Font Ui(float size,bool bold=false){return new Font(UiFont,size,bold?FontStyle.Bold:FontStyle.Regular);}
    void InitializeDesign(){
        SuspendLayout();ClientSize=new Size(1224,800);Font=Ui(10);
        foreach(Control c in Controls){
            if(c==tuningPanel||tabs.Contains(c))continue;
            if(c.Top>=652&&c.Top<746){connectionControls.Add(c);c.Left+=184;continue;}
            if(itemControls.Contains(c)){c.Left+=184;continue;}
            if(c.Top<110)c.Visible=false;
        }
        foreach(Control c in Controls)if(c.Font.Name=="맑은 고딕")c.Font=Ui(c.Font.Size,c.Font.Bold);
        tuningPanel.SetBounds(212,155,984,477);tuningPanel.BorderStyle=BorderStyle.None;
        message.SetBounds(232,751,944,38);message.Font=Ui(10);
        var logo=new PictureBox{Image=Icon.ToBitmap(),SizeMode=PictureBoxSizeMode.Zoom,BackColor=Color.Transparent};Add(logo,26,28,64,64);
        TextLabel("ICARUS",24,108,160,32).Font=new Font("Bahnschrift",21,FontStyle.Bold);
        var sub=TextLabel("나만의 싱글 도구",26,143,150,27);sub.Font=Ui(10);sub.ForeColor=muted;
        string[] names={"아이템 보급","체력","스태미나","산소 · 음식 · 물","가방 무게","장비 내구도","달리기","앱 설정"};
        for(int i=0;i<tabs.Count;i++){
            var b=tabs[i];b.Text=names[i];b.SetBounds(16,i==7?654:206+i*54,168,44);b.Font=Ui(11,true);b.TextAlign=ContentAlignment.MiddleLeft;b.Padding=new Padding(14,0,0,0);b.FlatAppearance.MouseOverBackColor=Color.FromArgb(43,49,57);b.TabIndex=i;
        }
        var edition=TextLabel("PERSONAL EDITION",26,724,160,22);edition.Font=new Font("Bahnschrift",9);edition.ForeColor=muted;
        var version=TextLabel("v"+Updater.CurrentVersion,26,748,160,22);version.Font=new Font("Bahnschrift",11);version.ForeColor=gold;
        pageTitle=TextLabel("",212,43,750,48);pageTitle.Font=Ui(26,true);
        pageSubtitle=TextLabel("",214,99,820,30);pageSubtitle.Font=Ui(11);pageSubtitle.ForeColor=muted;
        saveState=TextLabel("",1000,56,196,32);saveState.Font=Ui(10,true);saveState.TextAlign=ContentAlignment.MiddleRight;
        workflow=TextLabel("",236,667,934,52);workflow.Font=Ui(11);workflow.ForeColor=muted;
        selectedName.Font=Ui(17,true);selectedEnglish.Font=Ui(9);amount.Font=new Font("Bahnschrift",22,FontStyle.Bold);
        prepare.Text="아이템 요청 준비";prepare.Font=Ui(12,true);
        designReady=true;UpdateDesign();ResumeLayout();Invalidate();
    }
    void UpdateDesign(){
        if(!designReady)return;
        string[] titles={"필요한 아이템을, 간편하게","나에게 맞는 체력","가볍게 움직이세요","여유로운 생존","가방을 더 넉넉하게","오래 쓰는 장비","원하는 속도로","앱 설정"};
        string[] subtitles={"찾고 → 수량을 고르고 → 게임에서 F11","기본 최대 체력을 조절합니다.","달리기 · 점프 · 도구의 스태미나 소모량을 조절합니다.","산소와 음식, 물의 소모량을 각각 고릅니다.","캐릭터가 들 수 있는 무게 한도를 조절합니다.","도구 · 무기 · 방어구의 최대 내구도를 조절합니다.","달리기 속도를 조절합니다.","업데이트와 게임 연결을 한곳에서 관리합니다."};
        pageTitle.Text=titles[activeTab];pageSubtitle.Text=subtitles[activeTab];
        saveState.Text=dirty?"●  적용 전 변경 있음":"●  싱글플레이 전용";saveState.ForeColor=dirty?gold:Color.FromArgb(137,191,174);
        foreach(var c in connectionControls)c.Visible=activeTab==7;
        workflow.Visible=activeTab!=7;
        workflow.Text=activeTab==0?"01   아이템 선택     →     02   수량 선택     →     03   게임에서 F11\n처음 사용한다면 왼쪽 ‘앱 설정’에서 아이템 모드를 설치하세요.":"값을 고른 다음 ‘설정 적용’을 누르세요.\n게임을 종료한 상태에서 적용하고, 다시 실행하면 반영됩니다.";
        for(int i=0;i<tabs.Count;i++){tabs[i].BackColor=i==activeTab?Color.FromArgb(57,49,37):Color.FromArgb(18,24,32);tabs[i].ForeColor=i==activeTab?gold:muted;}
        Invalidate();
    }
    void PaintDesign(Graphics g){
        g.SmoothingMode=SmoothingMode.AntiAlias;
        using(var b=new SolidBrush(Color.FromArgb(18,24,32)))g.FillRectangle(b,0,0,200,800);
        using(var p=new Pen(Color.FromArgb(37,47,58)))g.DrawLine(p,200,0,200,800);
        using(var b=new SolidBrush(panel)){
            if(activeTab==0){g.FillRectangle(b,212,155,630,477);g.FillRectangle(b,862,155,334,477);}else g.FillRectangle(b,212,155,984,477);
            g.FillRectangle(b,212,652,984,82);
        }
        using(var p=new Pen(Color.FromArgb(45,54,64))){g.DrawLine(p,212,139,1196,139);g.DrawLine(p,232,735,1176,735);}
        if(activeTab==0){using(var p=new Pen(Color.FromArgb(57,58,57)))g.DrawLine(p,886,354,1172,354);}
    }
}

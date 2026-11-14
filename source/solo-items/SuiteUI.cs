using System;
using System.IO;
using System.Linq;
using System.Drawing;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Threading.Tasks;

public sealed class SuiteConfig {public string Game;public bool AutoUpdate=true;}
public partial class ItemTool {
    readonly List<Control> itemControls=new List<Control>();
    readonly List<Button> tabs=new List<Button>();
    readonly Panel tuningPanel=new Panel();
    readonly Timer updateTimer=new Timer();
    TuneValues tuning=new TuneValues();
    SuiteConfig config=new SuiteConfig();
    int activeTab=0;bool dirty=false,working=false,checking=false;string stagedUpdate=null;
    Label updateStatus=new Label();
    string configPath=Path.Combine(Tuner.StateDir,"settings.json");
    void SaveConfig(){config.Game=game.Text;Tuner.Atomic(configPath,Tuner.Json().Serialize(config));}
    void InitializeSuite(){
        foreach(Control c in Controls)if(c.Top>=155&&c.Top<640)itemControls.Add(c);
        game.ReadOnly=true;
        try{if(File.Exists(configPath))config=Tuner.Json().Deserialize<SuiteConfig>(File.ReadAllText(configPath));if(!string.IsNullOrWhiteSpace(config.Game))game.Text=config.Game;var record=Tuner.ReadRecord(game.Text);if(record!=null&&record.Values!=null){record.Values.Validate();tuning=record.Values;}}
        catch(Exception ex){message.Text="저장된 설정을 읽지 못했습니다: "+ex.Message;}
        game.TextChanged+=(o,e)=>{try{SaveConfig();var record=Tuner.ReadRecord(game.Text);tuning=record!=null&&record.Values!=null?record.Values:new TuneValues();dirty=false;if(activeTab>0)ShowTab(activeTab);}catch(Exception ex){message.Text=ex.Message;}};
        var names=new[]{"아이템","체력","스태미나","생존","무게","내구도","달리기","설정"};
        for(int i=0;i<names.Length;i++){int n=i;var b=ActionButton(names[i],28+i*124,112,116,()=>ShowTab(n));b.Height=32;tabs.Add(b);}
        tuningPanel.BackColor=panel;tuningPanel.BorderStyle=BorderStyle.FixedSingle;Add(tuningPanel,28,155,984,477);tuningPanel.Visible=false;
        tabs[0].BackColor=gold;tabs[0].ForeColor=Color.FromArgb(25,29,32);
        updateTimer.Interval=15*60*1000;updateTimer.Tick+=async(o,e)=>await CheckUpdates(false);updateTimer.Start();
        Shown+=async(o,e)=>{try{SyncInstalledMod();}catch(Exception ex){message.Text="모드 갱신 대기: "+ex.Message;}await Task.Delay(2500);if(!IsDisposed)await CheckUpdates(false);};
        FormClosed+=(o,e)=>updateTimer.Dispose();
        FormClosing+=(o,e)=>{if(working){e.Cancel=true;message.Text="설정 적용이 끝나면 닫을 수 있습니다.";}};
    }
    void SyncInstalledMod(){
        if(Tuner.Running())return;string target=ModPath(game.Text);
        if(!File.Exists(Path.Combine(target,"solo-items-owner.txt"))||!File.Exists(Path.Combine(target,"enabled.txt")))return;
        if(new[]{"main.lua","catalog.lua"}.Any(f=>!File.Exists(Path.Combine(target,"Scripts",f))||Tuner.Hash(Path.Combine(target,"Scripts",f))!=Tuner.Hash(Path.Combine(Base,"Scripts",f))))Install(game.Text);
    }
    Label PanelLabel(string text,int x,int y,int w,int h,int size,bool bold){var l=new Label{Text=text,ForeColor=ForeColor,BackColor=panel,Font=new Font("맑은 고딕",size,bold?FontStyle.Bold:FontStyle.Regular)};l.SetBounds(x,y,w,h);tuningPanel.Controls.Add(l);return l;}
    Button PanelButton(string text,int x,int y,int w,Action a,bool primary=false){var b=new Button{Text=text,FlatStyle=FlatStyle.Flat,BackColor=primary?gold:Color.FromArgb(34,44,55),ForeColor=primary?Color.FromArgb(25,29,32):ForeColor,Cursor=Cursors.Hand};b.FlatAppearance.BorderSize=0;b.SetBounds(x,y,w,38);b.Click+=(o,e)=>{try{a();}catch(Exception ex){message.Text=ex.Message;}};tuningPanel.Controls.Add(b);return b;}
    void ClearPanel(){foreach(Control c in tuningPanel.Controls.Cast<Control>().ToArray()){tuningPanel.Controls.Remove(c);c.Dispose();}}
    void ShowTab(int index){
        activeTab=index;foreach(var c in itemControls)c.Visible=index==0;
        for(int i=0;i<tabs.Count;i++){tabs[i].BackColor=i==index?gold:Color.FromArgb(34,44,55);tabs[i].ForeColor=i==index?Color.FromArgb(25,29,32):ForeColor;}
        tuningPanel.Visible=index!=0;if(index==0)return;ClearPanel();
        string[] titles={"","얼마나 튼튼하게 할까요?","스태미나를 얼마나 쓸까요?","산소 · 배고픔 · 목마름","얼마나 많이 들고 갈까요?","장비를 얼마나 오래 쓸까요?","얼마나 빠르게 달릴까요?","앱 설정"};
        PanelLabel(titles[index],24,20,900,39,20,true);
        if(index==7){ShowAppSettings();return;}
        PanelLabel("버튼으로 고르고, 아래의 ‘설정 적용’을 누르세요. 게임을 새로 실행하면 적용됩니다.",26,66,925,28,10,false).ForeColor=muted;
        switch(index){
            case 1:SettingRow("기본 최대 체력","Health",100,300,new[]{100,200,300},new[]{"기본","2배","3배"},112);break;
            case 2:SettingRow("달리기 · 점프 · 도구 사용량","Stamina",0,100,new[]{100,50,0},new[]{"기본","절반만","소모 없음"},112);break;
            case 3:SettingRow("산소 소모","Oxygen",0,100,new[]{100,50,0},new[]{"기본","절반만","소모 없음"},105);SettingRow("배고픔 진행","Food",0,100,new[]{100,50,0},new[]{"기본","절반만","소모 없음"},204);SettingRow("목마름 진행","Water",0,100,new[]{100,50,0},new[]{"기본","절반만","소모 없음"},303);break;
            case 4:SettingRow("가방에 들 수 있는 무게","Weight",100,500,new[]{100,200,500},new[]{"기본","2배","5배"},112);break;
            case 5:SettingRow("도구 · 무기 · 방어구 최대 내구도","Durability",100,500,new[]{100,200,500},new[]{"기본","2배","5배"},112);break;
            case 6:SettingRow("달리기 속도","Speed",100,200,new[]{100,150,200},new[]{"기본","1.5배","2배"},112);break;
        }
        if(index!=3){
            string tip=index==5?"기존 장비의 현재 내구도를 채우는 수리는 아닙니다.\n최대 내구도가 늘며, 장비에 따라 수리가 필요할 수 있습니다.":index==4?"아이템 하나하나의 무게는 그대로입니다.\n내 캐릭터가 들 수 있는 무게 한도가 늘어납니다.":index==6?"걷기 속도는 그대로, 달리기 속도만 바꿉니다.":"‘기본’ 버튼을 누르면 원래 값으로 돌아갑니다.\n다른 탭에서 고른 설정도 함께 적용됩니다.";
            PanelLabel(tip,26,272,910,70,12,false).ForeColor=muted;
        }
        PanelButton("모두 기본값",26,418,155,()=>{tuning=new TuneValues();dirty=true;ShowTab(activeTab);message.Text="기본값을 선택했습니다. ‘설정 적용’을 누르면 복원됩니다.";});
        PanelButton("설정 적용",730,413,224,async()=>await ApplyTuning(),true).Height=44;
        PanelLabel("싱글 전용 · 멀티플레이 전에는 모두 기본값으로 복원",202,427,510,26,9,false).ForeColor=muted;
    }
    void SettingRow(string text,string key,int min,int max,int[] presets,string[] labels,int y){
        var field=typeof(TuneValues).GetField(key);int value=(int)field.GetValue(tuning);
        PanelLabel(text,26,y,530,25,12,true);
        var current=PanelLabel("",778,y,176,26,13,true);current.TextAlign=ContentAlignment.MiddleRight;current.ForeColor=gold;
        var slider=new TrackBar{Minimum=min,Maximum=max,Value=value,TickStyle=TickStyle.None,SmallChange=10,LargeChange=25,BackColor=panel,AccessibleName=text};slider.SetBounds(20,y+36,535,40);tuningPanel.Controls.Add(slider);
        Action show=()=>current.Text=slider.Value==100?"기본 (100%)":slider.Value==0?"소모 없음":slider.Value+"%";
        slider.ValueChanged+=(o,e)=>{field.SetValue(tuning,slider.Value);dirty=true;show();};show();
        for(int i=0;i<3;i++){int v=presets[i];PanelButton(labels[i],575+i*128,y+34,120,()=>slider.Value=v);}
    }
    async Task ApplyTuning(){
        if(working)return;working=true;Enabled=false;message.Text="설정 파일을 준비하고 있습니다…";
        string root=game.Text;var copy=Tuner.Json().Deserialize<TuneValues>(Tuner.Json().Serialize(tuning));
        try{string result=await Task.Run(()=>Tuner.Apply(root,copy,Path.Combine(Base,"tools","repak.exe")));dirty=false;SaveConfig();message.Text=result;}
        catch(Exception ex){message.Text=ex.Message;}
        finally{working=false;Enabled=true;}
    }
    void ShowAppSettings(){
        PanelLabel("자동으로 새 버전을 받고, 파일을 교체합니다.",26,75,900,29,12,false).ForeColor=muted;
        var auto=new CheckBox{Text="자동 업데이트",Checked=config.AutoUpdate,ForeColor=ForeColor,BackColor=panel,Font=new Font("맑은 고딕",13,FontStyle.Bold),AutoSize=false};auto.SetBounds(26,133,800,42);auto.CheckedChanged+=(o,e)=>{config.AutoUpdate=auto.Checked;SaveConfig();};tuningPanel.Controls.Add(auto);
        PanelLabel("앱을 켤 때와 15분마다 확인합니다.\n게임 실행 중에는 다운로드만 하고, 파일 교체는 기다립니다.\n설정을 고르는 중이면 다음 실행 때 적용합니다.",26,190,920,96,12,false).ForeColor=muted;
        PanelLabel("현재 버전  "+Updater.CurrentVersion,26,308,900,30,12,true);
        updateStatus=PanelLabel("",26,352,920,46,10,false);updateStatus.ForeColor=gold;
        PanelButton("지금 업데이트 확인",26,414,220,async()=>await CheckUpdates(true));
        PanelButton("기다리는 업데이트 적용",694,414,260,()=>{if(stagedUpdate==null){message.Text="대기 중인 업데이트가 없습니다.";return;}if(dirty)throw new Exception("먼저 고른 설정을 적용하거나 앱을 다시 열어 주세요.");LaunchUpdate();});
    }
    async Task CheckUpdates(bool manual){
        if(checking||working||(!manual&&!config.AutoUpdate))return;checking=true;
        try{
            if(stagedUpdate==null){if(manual)message.Text="새 버전을 확인하고 있습니다…";stagedUpdate=await Updater.Download();}
            if(IsDisposed)return;
            if(stagedUpdate==null){if(manual)message.Text="최신 버전입니다. ("+Updater.CurrentVersion+")";if(!updateStatus.IsDisposed)updateStatus.Text="최신 버전 · "+Updater.CurrentVersion;}
            else if(!working&&!dirty&&lastId==""&&(config.AutoUpdate||manual)&&!Tuner.Running())LaunchUpdate();
            else{message.Text="업데이트 준비 완료. 게임 종료 후, 설정 탭에서 적용하거나 앱을 다시 실행하세요.";if(!updateStatus.IsDisposed)updateStatus.Text="업데이트 다운로드 완료 · 안전하게 교체할 때까지 대기";}
        }catch(Exception ex){if(manual)message.Text="업데이트 확인 실패: "+ex.Message;if(!updateStatus.IsDisposed)updateStatus.Text="업데이트를 확인하지 못했습니다. 기존 버전은 계속 사용할 수 있습니다.";}
        finally{checking=false;}
    }
    void LaunchUpdate(){if(stagedUpdate==null||working||dirty)return;if(lastId!="")throw new Exception("아이템 요청 처리가 끝난 뒤 업데이트할 수 있습니다.");Tuner.Stopped();Updater.BeginApply(stagedUpdate,Base);Close();}
}

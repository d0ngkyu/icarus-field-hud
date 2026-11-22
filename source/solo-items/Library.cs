using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;

public sealed class SetItem {public string id;public int count;}
public sealed class CraftSet {public string name,description;public string[] recipes;public SetItem[] items;public int total;public override string ToString(){return name;}}
public sealed class LibraryData {
    public string[] categories;public Dictionary<string,string> groups;public CraftSet[] sets;public string sourceHash;
    public static LibraryData Load(){using(var s=Assembly.GetExecutingAssembly().GetManifestResourceStream("LibraryData"))using(var r=new StreamReader(s))return Tuner.Json().Deserialize<LibraryData>(r.ReadToEnd());}
}
public partial class ItemTool {
    static bool libraryRenderMode;
    readonly LibraryData library=LibraryData.Load();
    ComboBox categoryFilter;
    Button setsButton;
    void InitializeLibrary(){
        categoryFilter=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,FlatStyle=FlatStyle.Flat,BackColor=panel,ForeColor=ForeColor,AccessibleName="아이템 분류",DropDownHeight=320};
        categoryFilter.Items.AddRange(library.categories);categoryFilter.SelectedIndex=0;
        Add(categoryFilter,48,260,370,29);
        categoryFilter.SelectedIndexChanged+=(o,e)=>FilterItems();
        setsButton=ActionButton("추천 제작 세트",432,258,204,ShowCraftSets);setsButton.Height=32;
    }
    IEnumerable<Item> FilteredItems(string query,string category){
        return catalog.Where(i=>(category=="전체"||(library.groups.ContainsKey(i.id)&&library.groups[i.id]==category))&&(i.name+" "+i.english+" "+i.id).IndexOf(query,StringComparison.OrdinalIgnoreCase)>=0);
    }
    public static string SetRequest(SetItem[] items,int multiplier,IEnumerable<string> allowed){
        if(items==null||items.Length<1||items.Length>20||multiplier<1||multiplier>1000)throw new Exception("세트 구성을 확인해 주세요.");
        var known=new HashSet<string>(allowed,StringComparer.Ordinal);var seen=new HashSet<string>(StringComparer.Ordinal);var parts=new List<string>();long total=0;
        foreach(var i in items){
            if(i==null||i.id==null||!System.Text.RegularExpressions.Regex.IsMatch(i.id,@"^[A-Za-z0-9_]+$")||!known.Contains(i.id)||!seen.Add(i.id)||i.count<1)throw new Exception("지원하지 않는 세트 아이템입니다.");
            long count=(long)i.count*multiplier;total+=count;if(total>1000)throw new Exception("세트 전체 수량은 1,000개 이하여야 합니다.");parts.Add(i.id+":"+count);
        }
        string request=Guid.NewGuid().ToString("N")+"|"+DateTimeOffset.UtcNow.ToUnixTimeSeconds()+"|SET|"+string.Join(",",parts);
        if(request.Length>4096)throw new Exception("세트 요청이 너무 깁니다.");return request;
    }
    void QueueRequest(string request){
        if(imagePreviewMode)throw new Exception("화면 확인 모드에서는 요청하지 않습니다.");
        string target=ModPath(game.Text);
        if(!File.Exists(Path.Combine(target,"enabled.txt")))throw new Exception("게임 종료 후 먼저 모드를 설치하세요.");
        string p=Path.Combine(target,"request.txt");
        if(File.Exists(p)||File.Exists(Path.Combine(target,"processing.txt")))throw new Exception("앞 요청을 처리하는 중입니다. 잠시 뒤 다시 누르거나 요청을 취소하세요.");
        File.WriteAllText(p+".tmp",request,Utf8);File.Move(p+".tmp",p);lastId=request.Split('|')[0];
        message.Text="보내는 중… 싱글 월드에 들어가 있으면 1~2초 안에 가방으로 들어옵니다.";
    }
    void ShowCraftSets(){
        if(working)return;working=true;
        try{using(var dialog=new Form{Text="추천 제작 세트 · 재료 모음",ClientSize=new Size(600,560),MinimumSize=new Size(560,560),StartPosition=FormStartPosition.CenterParent,BackColor=BackColor,ForeColor=ForeColor,Font=Ui(11),Icon=Icon,MinimizeBox=false,MaximizeBox=false}){
            var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(20),ColumnCount=1,RowCount=7};
            foreach(float h in new[]{32f,42f,62f})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,h));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));
            foreach(float h in new[]{46f,68f,46f})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,h));
            dialog.Controls.Add(layout);
            layout.Controls.Add(new Label{Text="만들고 싶은 작업대를 고르세요",Dock=DockStyle.Fill,ForeColor=gold,Font=Ui(14,true)});
            var choice=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Dock=DockStyle.Fill,BackColor=panel,ForeColor=ForeColor,AccessibleName="추천 세트 선택"};choice.Items.AddRange(library.sets);layout.Controls.Add(choice);
            var description=new Label{Dock=DockStyle.Fill,ForeColor=muted};layout.Controls.Add(description);
            var rows=new ListView{Dock=DockStyle.Fill,View=View.Details,FullRowSelect=true,MultiSelect=false,BackColor=panel,ForeColor=ForeColor,BorderStyle=BorderStyle.None,OwnerDraw=true};
            rows.Columns.Add("재료",390);rows.Columns.Add("수량",110);rows.DrawColumnHeader+=(o,e)=>e.DrawDefault=true;rows.DrawItem+=(o,e)=>{};
            using(var height=new ImageList{ImageSize=new Size(1,36)}){
                rows.SmallImageList=height;
                rows.DrawSubItem+=(o,e)=>{using(var b=new SolidBrush(panel))e.Graphics.FillRectangle(b,e.Bounds);int inset=10;if(e.ColumnIndex==0){itemImages.Draw(e.Graphics,(string)e.Item.Tag,new Rectangle(e.Bounds.X+6,e.Bounds.Y+3,30,30));inset=44;}TextRenderer.DrawText(e.Graphics,e.SubItem.Text,rows.Font,new Rectangle(e.Bounds.X+inset,e.Bounds.Y,Math.Max(1,e.Bounds.Width-inset-5),e.Bounds.Height),ForeColor,TextFormatFlags.VerticalCenter|TextFormatFlags.EndEllipsis);};
                rows.Resize+=(o,e)=>{rows.Columns[1].Width=100;rows.Columns[0].Width=Math.Max(200,rows.ClientSize.Width-120);};layout.Controls.Add(rows);
                var line=new FlowLayoutPanel{Dock=DockStyle.Fill,WrapContents=false,Padding=new Padding(0,7,0,0)};
                line.Controls.Add(new Label{Text="몇 세트?",AutoSize=true,Margin=new Padding(0,5,12,0)});
                var copies=new NumericUpDown{Minimum=1,Maximum=1,Value=1,Width=70,BackColor=panel,ForeColor=ForeColor,AccessibleName="세트 수"};line.Controls.Add(copies);
                var total=new Label{AutoSize=true,Margin=new Padding(18,5,0,0),ForeColor=gold};line.Controls.Add(total);layout.Controls.Add(line);
                layout.Controls.Add(new Label{Text="완성품 대신 위 재료를 지급합니다. 청사진과 작업대는 별도 필요합니다.\n보유 재료는 차감하지 않습니다. 기본 레시피 기준이며 재능 할인은 미반영입니다.\n요청하면 바로 가방으로 · 취소해도 이미 처리한 재료는 남습니다.",Dock=DockStyle.Fill,Font=Ui(9),ForeColor=muted});
                var buttons=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.RightToLeft};
                var ready=new Button{Text="세트 바로 받기",Width=180,Height=38,FlatStyle=FlatStyle.Flat,BackColor=gold,ForeColor=Color.FromArgb(25,29,32),Enabled=!imagePreviewMode};
                var close=new Button{Text="닫기",Width=90,Height=38,FlatStyle=FlatStyle.Flat,BackColor=panel,ForeColor=ForeColor,DialogResult=DialogResult.Cancel};buttons.Controls.Add(ready);buttons.Controls.Add(close);layout.Controls.Add(buttons);dialog.CancelButton=close;
                bool updating=false;
                Action refresh=()=>{var set=choice.SelectedItem as CraftSet;if(set==null)return;rows.BeginUpdate();rows.Items.Clear();foreach(var entry in set.items){var item=catalog.First(i=>i.id==entry.id);var row=new ListViewItem(new[]{item.name,((int)copies.Value*entry.count).ToString("N0")+"개"});row.Tag=entry.id;rows.Items.Add(row);}rows.EndUpdate();description.Text=set.description;total.Text=set.items.Length+"종 · 총 "+(set.total*(int)copies.Value).ToString("N0")+"개 / 1,000";};
                choice.SelectedIndexChanged+=(o,e)=>{updating=true;copies.Value=1;copies.Maximum=Math.Max(1,1000/((CraftSet)choice.SelectedItem).total);updating=false;refresh();};
                copies.ValueChanged+=(o,e)=>{if(!updating)refresh();};
                ready.Click+=(o,e)=>{try{var set=(CraftSet)choice.SelectedItem;QueueRequest(SetRequest(set.items,(int)copies.Value,catalog.Select(i=>i.id)));dialog.DialogResult=DialogResult.OK;dialog.Close();}catch(Exception ex){description.Text=ex.Message;}};
                choice.SelectedIndex=0;
                if(libraryRenderMode){
                    Action<Control> createHandles=null;createHandles=c=>{var handle=c.Handle;foreach(Control child in c.Controls)createHandles(child);};
                    createHandles(dialog);layout.PerformLayout();
                    foreach(var size in new[]{new Size(560,560),new Size(760,650)}){
                        dialog.ClientSize=size;layout.PerformLayout();
                        foreach(CraftSet set in library.sets){choice.SelectedItem=set;copies.Value=copies.Maximum;layout.PerformLayout();
                            if((int)copies.Value*set.total>1000||rows.Items.Count!=set.items.Length)throw new Exception("Set preview total mismatch");
                            foreach(Control c in layout.Controls)if(c.Bottom>layout.ClientSize.Height||c.Right>layout.ClientSize.Width)throw new Exception("Set preview clipping");
                        }
                    }
                    dialog.ClientSize=new Size(600,560);choice.SelectedIndex=0;copies.Value=1;layout.PerformLayout();
                    using(var shot=new Bitmap(dialog.Width,dialog.Height)){dialog.DrawToBitmap(shot,new Rectangle(Point.Empty,shot.Size));shot.Save(Path.Combine(Base,"sets-preview.png"),System.Drawing.Imaging.ImageFormat.Png);}
                }else dialog.ShowDialog(this);
            }
        }}finally{working=false;}
    }
    static void LibraryTest(){
        using(var form=new ItemTool()){
            if(form.library.groups.Count!=form.catalog.Length)throw new Exception("Category coverage");
            foreach(var category in form.library.categories.Skip(1))if(!form.FilteredItems("",category).Any())throw new Exception("Empty category");
            if(!form.FilteredItems("Fiber","재료 · 광물").Any(i=>i.id=="Fiber")||form.FilteredItems("Fiber","방어구 · 가방").Any(i=>i.id=="Fiber"))throw new Exception("Combined filter");
            foreach(var set in form.library.sets){
                if(set.total!=set.items.Sum(i=>i.count))throw new Exception("Set sum");
                int max=1000/set.total;SetRequest(set.items,max,form.catalog.Select(i=>i.id));bool rejected=false;try{SetRequest(set.items,max+1,form.catalog.Select(i=>i.id));}catch{rejected=true;}if(!rejected)throw new Exception("Set limit");
            }
            foreach(var bad in new[]{new[]{new SetItem{id="NoSuchItem",count=1}},new[]{new SetItem{id="Fiber",count=0}},new[]{new SetItem{id="Fiber",count=1},new SetItem{id="Fiber",count=2}}}){
                bool rejected=false;try{SetRequest(bad,1,form.catalog.Select(i=>i.id));}catch{rejected=true;}if(!rejected)throw new Exception("Invalid set accepted");
            }
            libraryRenderMode=true;try{form.ShowCraftSets();}finally{libraryRenderMode=false;}
        }
        File.WriteAllText(Path.Combine(Base,"library-test.txt"),"PASS: all categories, combined search, seven sets, exact totals, multiplier bounds, invalid and duplicate entries");
    }
}

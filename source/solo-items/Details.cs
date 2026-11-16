using System;
using System.IO;
using System.Linq;
using System.Drawing;
using System.Collections.Generic;
using System.Reflection;
using System.Windows.Forms;

public sealed class ItemStat {public string label,value;}
public sealed class ItemDetail {public string description,source;public bool tool;public ItemStat[] stats;}
public sealed class DetailData {
    public Dictionary<string,ItemDetail> details;
    public static DetailData Load(){using(var s=Assembly.GetExecutingAssembly().GetManifestResourceStream("ItemDetails"))using(var r=new StreamReader(s))return Tuner.Json().Deserialize<DetailData>(r.ReadToEnd());}
}
public partial class ItemTool {
    readonly DetailData detailData=DetailData.Load();
    Button detailsButton;
    string DetailSummary(string id){ItemDetail detail;return id!=null&&detailData.details.TryGetValue(id,out detail)?(detail.source=="분류 기반 안내"?"[분류 안내] ":"")+detail.description:"설명 정보가 없습니다.";}
    void InitializeDetails(){detailsButton=ActionButton("설명 · 스탯",850,174,138,()=>{if(previewItem!=null)ShowItemDetails(previewItem,false);});detailsButton.Height=28;detailsButton.Font=Ui(9);detailsButton.Enabled=false;}
    void ShowItemDetails(string id,bool render){
        var item=catalog.First(i=>i.id==id);var detail=detailData.details[id];bool previousWorking=working;working=true;
        try{using(var dialog=new Form{Text="아이템 설명 · 기본 스탯",ClientSize=new Size(540,530),MinimumSize=new Size(520,540),StartPosition=FormStartPosition.CenterParent,BackColor=BackColor,ForeColor=ForeColor,Font=Ui(11),Icon=Icon,MinimizeBox=false,MaximizeBox=false}){
            var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(20),ColumnCount=1,RowCount=6};
            foreach(float h in new[]{80f,100f,28f})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,h));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,56));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,42));dialog.Controls.Add(layout);
            var header=new Panel{Dock=DockStyle.Fill};header.Paint+=(o,e)=>itemImages.Draw(e.Graphics,id,new Rectangle(0,0,60,60));
            header.Controls.Add(new Label{Text=item.name,Location=new Point(76,0),Size=new Size(400,44),Font=Ui(17,true),ForeColor=gold,AutoEllipsis=true});
            header.Controls.Add(new Label{Text=item.english,Location=new Point(76,46),Size=new Size(400,26),ForeColor=muted,AutoEllipsis=true});layout.Controls.Add(header);
            layout.Controls.Add(new TextBox{Text=detail.description,Multiline=true,ReadOnly=true,BorderStyle=BorderStyle.None,Dock=DockStyle.Fill,BackColor=panel,ForeColor=ForeColor,ScrollBars=ScrollBars.Vertical,AccessibleName="아이템 설명"});
            layout.Controls.Add(new Label{Text=detail.source+(itemImages.Has(id)?"":" · 이미지 준비 중"),Dock=DockStyle.Fill,ForeColor=muted,Font=Ui(9)});
            var rows=new ListView{Dock=DockStyle.Fill,View=View.Details,FullRowSelect=true,BackColor=panel,ForeColor=ForeColor,BorderStyle=BorderStyle.None};rows.Columns.Add("기본 수치",235);rows.Columns.Add("값",220);layout.Controls.Add(rows);
            using(var height=new ImageList{ImageSize=new Size(1,32)}){
                rows.SmallImageList=height;foreach(var stat in detail.stats)rows.Items.Add(new ListViewItem(new[]{stat.label,stat.value}));
                if(detail.stats.Length==0)rows.Items.Add(new ListViewItem(new[]{"확인된 기본 수치 없음","—"}));
                rows.Resize+=(o,e)=>{rows.Columns[0].Width=Math.Max(150,rows.ClientSize.Width/2-10);rows.Columns[1].Width=Math.Max(150,rows.ClientSize.Width-rows.Columns[0].Width-22);};
                layout.Controls.Add(new Label{Text="기본 게임 데이터 기준 · 재능 / 개조 / 도구 설정은 미반영\n현재 장비의 실제 수치와 다를 수 있습니다.",Dock=DockStyle.Fill,Font=Ui(9),ForeColor=muted});
                var close=new Button{Text="닫기",Dock=DockStyle.Right,Width=100,FlatStyle=FlatStyle.Flat,BackColor=panel,ForeColor=ForeColor,DialogResult=DialogResult.Cancel};layout.Controls.Add(close);dialog.CancelButton=close;
                if(render){
                    Action<Control> createHandles=null;createHandles=c=>{var handle=c.Handle;foreach(Control child in c.Controls)createHandles(child);};createHandles(dialog);
                    foreach(var size in new[]{new Size(520,540),new Size(720,650)}){dialog.ClientSize=size;layout.PerformLayout();foreach(Control c in layout.Controls)if(c.Right>layout.Width||c.Bottom>layout.Height)throw new Exception("Details clipping");}
                    dialog.ClientSize=new Size(540,530);layout.PerformLayout();using(var shot=new Bitmap(dialog.Width,dialog.Height)){dialog.DrawToBitmap(shot,new Rectangle(Point.Empty,shot.Size));shot.Save(Path.Combine(Base,"details-preview.png"),System.Drawing.Imaging.ImageFormat.Png);}
                }else dialog.ShowDialog(this);
            }
        }}finally{working=previousWorking;}
    }
    static void DetailsTest(){
        using(var form=new ItemTool()){
            if(form.detailData.details.Count!=form.catalog.Length||form.detailData.details.Any(p=>string.IsNullOrWhiteSpace(p.Value.description)))throw new Exception("Description coverage");
            var stone=form.detailData.details["Stone_Pickaxe"];var titanium=form.detailData.details["Titanium_Pickaxe"];
            if(!stone.tool||!stone.stats.Any(s=>s.label=="근접 피해"&&s.value=="30 (±10%)")||!stone.stats.Any(s=>s.label=="최대 내구도"&&s.value=="20,000")||!titanium.stats.Any(s=>s.label=="채굴 효율"&&s.value=="1.4배"))throw new Exception("Known tool stats");
            if(form.detailData.details["Fiber"].tool||form.detailData.details["Fiber"].source!="게임 한국어 설명")throw new Exception("Material classification");
            if(!form.detailData.details.Any(p=>p.Value.source=="분류 기반 안내"))throw new Exception("Fallback provenance");
            form.ShowItemDetails("Stone_Pickaxe",true);
        }
        File.WriteAllText(Path.Combine(Base,"details-test.txt"),"PASS: 2989 descriptions/provenance, tool base stats, material distinction, detail layout/render");
    }
}

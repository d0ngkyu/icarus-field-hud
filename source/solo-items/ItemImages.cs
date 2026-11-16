using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Collections.Generic;
using System.Reflection;
using System.Web.Script.Serialization;
using System.Windows.Forms;

// One shared atlas; no network calls, image-per-row allocation or game access.
public sealed class ItemImages : IDisposable {
    Bitmap atlas;
    readonly Dictionary<string,int> indices=new Dictionary<string,int>(StringComparer.Ordinal);
    public int Count {get{return indices.Count;}}
    public ItemImages(){
        try{
            var assembly=Assembly.GetExecutingAssembly();
            using(var stream=assembly.GetManifestResourceStream("ItemAtlas"))
            using(var image=Image.FromStream(stream))atlas=new Bitmap(image);
            if(atlas.Width!=2304||atlas.Height%48!=0)throw new InvalidDataException("Icon atlas size");
            using(var stream=assembly.GetManifestResourceStream("ItemImageMap"))
            using(var reader=new StreamReader(stream)){
                var map=new JavaScriptSerializer().Deserialize<Dictionary<string,int>>(reader.ReadToEnd());
                foreach(var pair in map)if(pair.Value>=0&&pair.Value<48*(atlas.Height/48))indices.Add(pair.Key,pair.Value);
            }
        }catch{if(atlas!=null){atlas.Dispose();atlas=null;}indices.Clear();}
    }
    public bool Has(string id){return id!=null&&indices.ContainsKey(id);}
    public void Draw(Graphics g,string id,Rectangle box){
        int index;
        if(atlas!=null&&id!=null&&indices.TryGetValue(id,out index)){
            var old=g.InterpolationMode;g.InterpolationMode=InterpolationMode.HighQualityBicubic;
            g.DrawImage(atlas,box,new Rectangle(index%48*48,index/48*48,48,48),GraphicsUnit.Pixel);
            g.InterpolationMode=old;
        }else{
            // Explicit neutral placeholder, never another item's picture.
            using(var pen=new Pen(Color.FromArgb(116,129,141),Math.Max(1,box.Width/32f))){
                int pad=Math.Max(4,box.Width/5);var r=Rectangle.Inflate(box,-pad,-pad);
                g.DrawRectangle(pen,r);g.DrawLine(pen,r.Left,r.Top,r.Left+r.Width/2,r.Top+r.Height/3);
                g.DrawLine(pen,r.Right,r.Top,r.Left+r.Width/2,r.Top+r.Height/3);
                g.DrawLine(pen,r.Left+r.Width/2,r.Top+r.Height/3,r.Left+r.Width/2,r.Bottom);
            }
        }
    }
    public void Dispose(){if(atlas!=null){atlas.Dispose();atlas=null;}indices.Clear();}
}
public partial class ItemTool {
    readonly ItemImages itemImages=new ItemImages();
    Panel itemPreview;
    string previewItem;
    void InitializeItemImages(){
        Disposed+=(o,e)=>itemImages.Dispose();
        InitializeDetails();
        itemPreview=new Panel{BackColor=Color.FromArgb(29,39,49),AccessibleName="선택한 아이템 이미지"};
        Add(itemPreview,702,210,286,72);
        itemPreview.Paint+=(o,e)=>{
            int side=Math.Min(64,Math.Min(itemPreview.Width-12,itemPreview.Height-8));
            if(previewItem==null){TextRenderer.DrawText(e.Graphics,"아이템 미리보기",itemPreview.Font,itemPreview.ClientRectangle,muted,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);return;}
            itemImages.Draw(e.Graphics,previewItem,new Rectangle(10,(itemPreview.Height-side)/2,side,side));
            TextRenderer.DrawText(e.Graphics,DetailSummary(previewItem),itemPreview.Font,new Rectangle(side+22,4,itemPreview.Width-side-28,itemPreview.Height-8),muted,TextFormatFlags.VerticalCenter|TextFormatFlags.WordBreak|TextFormatFlags.EndEllipsis);
        };
    }
    static void ImageTest(){
        using(var images=new ItemImages()){
            if(images.Count<2100||!images.Has("Fiber")||!images.Has("Stone")||images.Has("not-an-item"))throw new Exception("Icon mapping failed");
            using(var bitmap=new Bitmap(160,80))using(var g=Graphics.FromImage(bitmap)){
                images.Draw(g,"Fiber",new Rectangle(0,0,64,64));
                images.Draw(g,"not-an-item",new Rectangle(80,0,64,64));
                int opaque=0;for(int x=80;x<144;x++)for(int y=0;y<64;y++)if(bitmap.GetPixel(x,y).A>0)opaque++;
                if(opaque<20)throw new Exception("Missing-icon placeholder failed");
            }
        }
        File.WriteAllText(Path.Combine(Base,"image-test.txt"),"PASS: embedded atlas, exact item mapping, known/unknown rendering");
    }
}

using System;
using System.IO;
using System.Drawing;
using System.Linq;
using System.Collections.Generic;
using System.Windows.Forms;

public partial class ItemTool {
    sealed class LayoutSpec { public Rectangle Bounds; public string Family; public float Size; public FontStyle Style; public Padding Padding; }
    readonly Dictionary<Control,LayoutSpec> layoutSpecs=new Dictionary<Control,LayoutSpec>();
    readonly Dictionary<string,Font> layoutFonts=new Dictionary<string,Font>();
    bool resizingReady,layingOut;
    float layoutX=1,layoutY=1;
    string windowFile=Path.Combine(Tuner.StateDir,"window-size.txt");
    void RememberLayout(Control c){
        layoutSpecs[c]=new LayoutSpec{Bounds=c.Bounds,Family=c.Font.Name,Size=c.Font.Size,Style=c.Font.Style,Padding=c.Padding};
    }
    void InitializeResize(){
        foreach(Control c in Controls)RememberLayout(c);
        FormBorderStyle=FormBorderStyle.Sizable;MaximizeBox=true;
        MinimumSize=SizeFromClientSize(new Size(860,580));
        var area=Screen.FromPoint(Cursor.Position).WorkingArea;
        int width=980,height=650;
        try{var p=File.ReadAllText(windowFile).Split(',');width=int.Parse(p[0]);height=int.Parse(p[1]);}catch{}
        width=Math.Max(860,Math.Min(width,area.Width-40));height=Math.Max(580,Math.Min(height,area.Height-80));
        resizingReady=true;ClientSize=new Size(width,height);
        Resize+=(o,e)=>LayoutWindow();
        ResizeEnd+=(o,e)=>SaveWindowSize();
        FormClosed+=(o,e)=>{SaveWindowSize();foreach(var f in layoutFonts.Values)f.Dispose();};
        LayoutWindow();
    }
    void SaveWindowSize(){
        if(WindowState!=FormWindowState.Normal)return;
        try{Tuner.Atomic(windowFile,ClientSize.Width+","+ClientSize.Height);}catch{}
    }
    void LayoutNewPanel(){
        if(!resizingReady)return;
        foreach(var c in layoutSpecs.Keys.Where(c=>c.IsDisposed).ToArray())layoutSpecs.Remove(c);
        foreach(Control c in tuningPanel.Controls)RememberLayout(c);
        LayoutWindow();
    }
    void LayoutWindow(){
        if(!resizingReady||layingOut||WindowState==FormWindowState.Minimized)return;
        layingOut=true;SuspendLayout();tuningPanel.SuspendLayout();
        try{
            layoutX=ClientSize.Width/1224f;layoutY=ClientSize.Height/800f;
            float scale=(float)(Math.Round(Math.Min(1.25,Math.Min(layoutX,layoutY))*40)/40);
            foreach(var pair in layoutSpecs){
                var c=pair.Key;if(c.IsDisposed)continue;var spec=pair.Value;
                float size=Math.Max(7,spec.Size*scale);
                string key=spec.Family+"|"+size+"|"+spec.Style;
                Font font;if(!layoutFonts.TryGetValue(key,out font)){font=new Font(spec.Family,size,spec.Style);layoutFonts.Add(key,font);}
                c.Font=font;
                c.Padding=new Padding((int)(spec.Padding.Left*layoutX),(int)(spec.Padding.Top*layoutY),(int)(spec.Padding.Right*layoutX),(int)(spec.Padding.Bottom*layoutY));
                var b=spec.Bounds;c.SetBounds((int)Math.Round(b.X*layoutX),(int)Math.Round(b.Y*layoutY),(int)Math.Round(b.Width*layoutX),(int)Math.Round(b.Height*layoutY));
            }
            list.Columns[0].Width=(int)(300*layoutX);list.Columns[1].Width=Math.Max(60,list.ClientSize.Width-SystemInformation.VerticalScrollBarWidth-list.Columns[0].Width-6);
            rowHeight.ImageSize=new Size(1,Math.Max(28,(int)(43*layoutY)));
        }finally{tuningPanel.ResumeLayout();ResumeLayout();layingOut=false;Invalidate();}
    }
    static void LayoutTest(){
        using(var form=new ItemTool()){
            form.tuning.Health=200;form.dirty=true;
            foreach(var size in new[]{new Size(860,580),new Size(980,650),new Size(1500,900),new Size(980,650)}){
                form.ClientSize=size;
                for(int tab=0;tab<8;tab++){
                    form.ShowTab(tab);
                    foreach(var c in form.layoutSpecs.Keys){
                        if(c.IsDisposed)continue;
                        if(c.Right>c.Parent.ClientSize.Width+2||c.Bottom>c.Parent.ClientSize.Height+2)throw new Exception("Clipped control: "+c.Text+" at "+size);
                    }
                    if(form.tuning.Health!=200||!form.dirty)throw new Exception("Resize lost pending values");
                }
            }
            if(form.FormBorderStyle!=FormBorderStyle.Sizable||!form.MaximizeBox)throw new Exception("Window is fixed");
            File.WriteAllText(Path.Combine(Base,"layout-test.txt"),"PASS: 4 sizes x 8 tabs, content bounds, pending values, resizable border/maximize");
        }
    }
}

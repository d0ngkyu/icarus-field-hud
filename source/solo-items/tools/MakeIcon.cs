using System;using System.IO;using System.Drawing;using System.Drawing.Drawing2D;using System.Collections.Generic;using System.Runtime.InteropServices;
class MakeIcon {
 [DllImport("user32.dll")]static extern bool DestroyIcon(IntPtr p);
 static void Main(string[]args){var sizes=new[]{16,24,32,48,64,128,256};var data=new List<byte[]>();
 using(var source=Image.FromFile(args[0]))foreach(int size in sizes)using(var b=new Bitmap(size,size,System.Drawing.Imaging.PixelFormat.Format32bppArgb)){
  using(var g=Graphics.FromImage(b)){g.Clear(Color.Transparent);g.CompositingMode=CompositingMode.SourceCopy;g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;g.DrawImage(source,new Rectangle(0,0,size,size),0,0,source.Width,source.Height,GraphicsUnit.Pixel);}
  using(var ms=new MemoryStream()){b.Save(ms,System.Drawing.Imaging.ImageFormat.Png);data.Add(ms.ToArray());}
 }
 using(var w=new BinaryWriter(File.Create(args[1]))){w.Write((ushort)0);w.Write((ushort)1);w.Write((ushort)sizes.Length);int offset=6+sizes.Length*16;
 for(int i=0;i<sizes.Length;i++){w.Write((byte)(sizes[i]==256?0:sizes[i]));w.Write((byte)(sizes[i]==256?0:sizes[i]));w.Write((byte)0);w.Write((byte)0);w.Write((ushort)1);w.Write((ushort)32);w.Write(data[i].Length);w.Write(offset);offset+=data[i].Length;}
 foreach(var d in data)w.Write(d);
 }
 }
}

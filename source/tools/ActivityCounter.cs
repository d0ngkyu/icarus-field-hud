// Aggregate mouse input and foreground game key-hold durations. No key history, coordinates, app names or disk writes.
using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

sealed class ActivityCounter : NativeWindow, IDisposable {
  [StructLayout(LayoutKind.Sequential)] struct Device { public ushort page,usage; public uint flags; public IntPtr target; }
  [StructLayout(LayoutKind.Sequential)] struct LastInput { public uint size,time; }
  [DllImport("user32.dll",SetLastError=true)] static extern bool RegisterRawInputDevices(Device[] d,uint n,uint size);
  [DllImport("user32.dll")] static extern uint GetRawInputData(IntPtr h,uint command,IntPtr data,ref uint size,uint header);
  [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LastInput info);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint process);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  readonly IntPtr buffer=Marshal.AllocHGlobal(128);
  readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
  readonly Stopwatch clock=Stopwatch.StartNew();
  readonly Process parent;
  long clicks,right; double wheel,distance,idleSeconds; long previous,ticks; bool disposed;
  double gameMove,gameSprint,gameTool;long gameClicks;bool gameActive,sprintHeld,wasGame;uint lastForeground;bool lastForegroundGame;
  bool GameForeground(){uint id;GetWindowThreadProcessId(GetForegroundWindow(),out id);if(id!=lastForeground){lastForeground=id;lastForegroundGame=false;try{using(var p=Process.GetProcessById((int)id))lastForegroundGame=p.ProcessName.Equals("Icarus-Win64-Shipping",StringComparison.OrdinalIgnoreCase);}catch{}}return lastForegroundGame;}
  static bool Down(int key){return (GetAsyncKeyState(key)&0x8000)!=0;}
  public ActivityCounter(int pid) {
    parent=Process.GetProcessById(pid);
    CreateHandle(new CreateParams { Caption="HUD aggregate activity", Parent=new IntPtr(-3) });
    var devices=new[]{new Device{page=1,usage=2,flags=0x100,target=Handle}};
    if(!RegisterRawInputDevices(devices,1,(uint)Marshal.SizeOf(typeof(Device))))throw new InvalidOperationException("Mouse input registration failed");
    timer.Interval=200;timer.Tick+=Tick;timer.Start();
    // Parent pipe closes even if HUD crashes. Do not leave a detached collector.
    var thread=new Thread(()=>{try{while(Console.ReadLine()!=null){} }catch{} Application.Exit();});thread.IsBackground=true;thread.Start();
  }
  void Tick(object sender,EventArgs e) {
    if(parent.HasExited){Application.Exit();return;}
    long now=clock.ElapsedMilliseconds,dt=now-previous;previous=now;
    gameActive=GameForeground();bool moving=gameActive&&(Down(0x57)||Down(0x41)||Down(0x53)||Down(0x44));sprintHeld=moving&&Down(0x10);
    if(gameActive&&wasGame&&dt>0&&dt<=600){if(moving)gameMove+=dt/1000.0;if(sprintHeld)gameSprint+=dt/1000.0;if(Down(1))gameTool+=dt/1000.0;}wasGame=gameActive;
    var li=new LastInput{size=(uint)Marshal.SizeOf(typeof(LastInput))};
    if(dt>0&&dt<=3000&&GetLastInputInfo(ref li)) {
      uint age=unchecked((uint)Environment.TickCount-li.time);
      idleSeconds+=Math.Min(dt,Math.Max(0,(double)age-60000))/1000;
    }
    if(++ticks%25==0)Emit();
  }
  string N(double n){return n.ToString("F2",CultureInfo.InvariantCulture);}
  void Emit(){try{Console.WriteLine("{\"clicks\":"+clicks+",\"right\":"+right+",\"wheel\":"+N(wheel)+",\"distance\":"+N(distance)+",\"idle\":"+N(idleSeconds)+",\"gameMove\":"+N(gameMove)+",\"gameSprint\":"+N(gameSprint)+",\"gameTool\":"+N(gameTool)+",\"gameClicks\":"+gameClicks+",\"sprintHeld\":"+(sprintHeld?"true":"false")+"}");Console.Out.Flush();}catch{Application.Exit();}}
  protected override void WndProc(ref Message m) {
    if(m.Msg==0x00FF) {
      uint size=128,header=(uint)(IntPtr.Size==8?24:16);
      if(GetRawInputData(m.LParam,0x10000003,buffer,ref size,header)!=uint.MaxValue&&size>=header+24&&Marshal.ReadInt32(buffer)==0) {
        int offset=(int)header;ushort flags=unchecked((ushort)Marshal.ReadInt16(buffer,offset)),buttons=unchecked((ushort)Marshal.ReadInt16(buffer,offset+4));
        for(int bit=1;bit<=256;bit<<=2)if((buttons&bit)!=0)clicks++;
        if((buttons&4)!=0)right++;
        if((buttons&1)!=0&&GameForeground())gameClicks++;
        if((buttons&0xC00)!=0)wheel+=Math.Abs((double)Marshal.ReadInt16(buffer,offset+6))/120;
        // Raw relative units work in games with a locked cursor too. Not pixels/cm.
        if((flags&1)==0){double x=Marshal.ReadInt32(buffer,offset+12),y=Marshal.ReadInt32(buffer,offset+16);distance+=Math.Sqrt(x*x+y*y);}
      }
    }
    base.WndProc(ref m);
  }
  public void Dispose(){if(disposed)return;disposed=true;timer.Stop();timer.Dispose();DestroyHandle();Marshal.FreeHGlobal(buffer);parent.Dispose();}
  [STAThread] static int Main(string[] args){try{if(args.Length!=1)return 2;using(var c=new ActivityCounter(int.Parse(args[0],CultureInfo.InvariantCulture)))Application.Run();return 0;}catch(Exception e){Console.Error.WriteLine(e.GetType().Name);return 1;}}
}

using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
class HudLauncher {
 [STAThread] static int Main(string[] args) {
  string target=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),@"Steam\steamapps\common\Icarus\Icarus\Binaries\Win64\ue4ss\Mods\IcarusHUD\app\IcarusHUD.exe");
  if(args.Length==1 && args[0]=="--check") return File.Exists(target)?0:2;
  if(!File.Exists(target)){MessageBox.Show("HUD 설치 위치를 찾지 못했습니다. 이 실행기는 HUD가 설치된 PC에서 사용합니다.","이카루스 HUD");return 2;}
  try {Process.Start(new ProcessStartInfo(target){UseShellExecute=true,WorkingDirectory=Path.GetDirectoryName(target)});return 0;}
  catch(Exception ex){MessageBox.Show("HUD를 열지 못했습니다.\n"+ex.Message,"이카루스 HUD");return 1;}
 }
}


using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
class DesktopLauncher {
    [STAThread] static void Main(){
        string root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","IcarusSoloTools");
        string exe=Path.Combine(root,"IcarusSoloItems.exe");
        if(!File.Exists(exe)){MessageBox.Show("아이카루스 싱글 도구가 설치되어 있지 않습니다.","아이카루스 싱글 도구");return;}
        Process.Start(new ProcessStartInfo(exe){UseShellExecute=true,WorkingDirectory=root});
    }
}

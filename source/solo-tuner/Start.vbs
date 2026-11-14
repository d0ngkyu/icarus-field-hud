Option Explicit
Dim shell, fso, folder, exe
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
exe = folder & "\runtime\node.exe"
If Not fso.FileExists(exe) Then
  MsgBox "Missing runtime\node.exe. Extract the complete application folder first.", 16, "Icarus Solo Comfort"
  WScript.Quit 1
End If
shell.CurrentDirectory = folder
shell.Run Chr(34) & exe & Chr(34) & " " & Chr(34) & folder & "\server.cjs" & Chr(34), 0, False

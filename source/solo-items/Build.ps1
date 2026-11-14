$ErrorActionPreference='Stop'
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe "/out:$PSScriptRoot\IcarusSoloItems.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.Net.Http.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll "$PSScriptRoot\ItemTool.cs" "$PSScriptRoot\Tuner.cs" "$PSScriptRoot\Updater.cs" "$PSScriptRoot\SuiteUI.cs" "$PSScriptRoot\SuiteTests.cs"
if ($LASTEXITCODE -ne 0) { throw 'C# build failed' }
& $compiler /nologo /target:winexe "/out:$PSScriptRoot\DesktopLauncher.exe" /reference:System.Windows.Forms.dll "$PSScriptRoot\DesktopLauncher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Launcher build failed' }

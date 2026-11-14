$ErrorActionPreference='Stop'
$build=Join-Path $PSScriptRoot 'bin'
New-Item -ItemType Directory -Force -Path $build | Out-Null
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe "/win32icon:$PSScriptRoot\assets\app.ico" "/out:$build\IcarusSoloItems.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.Net.Http.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll "$PSScriptRoot\ItemTool.cs" "$PSScriptRoot\Tuner.cs" "$PSScriptRoot\Updater.cs" "$PSScriptRoot\SuiteUI.cs" "$PSScriptRoot\Design.cs" "$PSScriptRoot\ResizeUI.cs" "$PSScriptRoot\SuiteTests.cs"
if ($LASTEXITCODE -ne 0) { throw 'C# build failed' }
& $compiler /nologo /target:winexe "/win32icon:$PSScriptRoot\assets\app.ico" "/out:$build\DesktopLauncher.exe" /reference:System.Windows.Forms.dll "$PSScriptRoot\DesktopLauncher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Launcher build failed' }
foreach($file in @('catalog.json','README.md','Scripts/main.lua','Scripts/catalog.lua','tools/repak.exe','tools/LICENSE-MIT','tools/LICENSE-APACHE')) {
    $target=Join-Path $build $file
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($target)) | Out-Null
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $target -Force
}

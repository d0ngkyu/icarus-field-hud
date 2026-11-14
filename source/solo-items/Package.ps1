$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$version=[regex]::Match([IO.File]::ReadAllText((Join-Path $root 'Updater.cs')),'CurrentVersion="([^"]+)"').Groups[1].Value
if (-not $version) { throw 'Missing version' }
$files=@('IcarusSoloItems.exe','DesktopLauncher.exe','catalog.json','README.md','Scripts/main.lua','Scripts/catalog.lua','tools/repak.exe','tools/LICENSE-MIT','tools/LICENSE-APACHE')
$release=Join-Path $root 'release'
$stage=Join-Path $release $version
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$records=@()
foreach ($file in $files) {
    $source=Join-Path $root $file; $target=Join-Path $stage $file
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($target)) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
    $records+=@{path=$file;size=(Get-Item -LiteralPath $target).Length;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()}
}
$zip=Join-Path $release 'package.zip'
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
$manifest=@{version=$version;packageUrl='REPLACE_WITH_IMMUTABLE_COMMIT_URL';size=(Get-Item -LiteralPath $zip).Length;sha256=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant();files=$records}
[IO.File]::WriteAllText((Join-Path $release 'manifest-draft.json'),($manifest|ConvertTo-Json -Depth 5),(New-Object Text.UTF8Encoding($false)))
Write-Output "Prepared $version package: $zip"

const ResEdit=require('resedit'),fs=require('fs');
const exePath=process.argv[2],ico=process.argv[3];
const exe=ResEdit.NtExecutable.from(fs.readFileSync(exePath),{ignoreCert:true});
const res=ResEdit.NtExecutableResource.from(exe);
const iconFile=ResEdit.Data.IconFile.from(fs.readFileSync(ico));
const groups=ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const gid=groups.length?groups[0].id:1, lang=groups.length?groups[0].lang:1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries,gid,lang,iconFile.icons.map(i=>i.data));
const vi=ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
if(vi){vi.setStringValues({lang:1033,codepage:1200},{FileDescription:'Icarus Field HUD',ProductName:'Icarus Field HUD',CompanyName:'IcarusHUD',OriginalFilename:'IcarusHUD.exe',InternalName:'IcarusHUD'});vi.setFileVersion(1,0,0,0);vi.setProductVersion(1,0,0,0);vi.outputToResourceEntries(res.entries)}
res.outputResource(exe);fs.writeFileSync(exePath,Buffer.from(exe.generate()));console.log('icon set, groups:',groups.length);

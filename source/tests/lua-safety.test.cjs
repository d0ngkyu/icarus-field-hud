// Install fengari from npm, then node --test source/tests/lua-safety.test.cjs.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let F;try{F=require('fengari');}catch{}
test('Lua runtime: warmup/rejoin, safe-mode scanners, native cache and array bounds',{skip:!F&&'requires npm fengari'},()=>{
 const {lua,lauxlib,lualib,to_luastring,to_jsstring}=F,L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 for(const [name,file] of [['MAIN_SOURCE','main.lua'],['ANIMAL_SOURCE','animals.lua']]){lua.lua_pushstring(L,to_luastring(fs.readFileSync(path.join(__dirname,'../mod/Scripts',file),'utf8')));lua.lua_setglobal(L,to_luastring(name));}
 const rc=lauxlib.luaL_dostring(L,to_luastring(fs.readFileSync(path.join(__dirname,'system-safety.lua'),'utf8')));
 assert.equal(rc,lua.LUA_OK,rc?to_jsstring(lua.lua_tostring(L,-1)):'');lua.lua_close(L);
});

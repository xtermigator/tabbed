// Behavioral tests with simulated Chrome APIs; not a real-browser certification test.
const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict'), path=require('node:path');
const root=path.join(__dirname,'..');
function event(){return {listeners:[],addListener(f){this.listeners.push(f)}}}
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f},focus(){},select(){}});return elements.get(id)}
let saved,historyReads=0,created,updates=[],panel;
const chrome={storage:{local:{get:async()=>({}),set:async x=>{saved=structuredClone(x)}},onChanged:event()},tabs:{query:async()=>[{id:1,windowId:2,url:'https://example.org',title:'Example Research',pinned:false},{id:2,windowId:2,url:'chrome://settings',title:'Internal'}],onCreated:event(),onRemoved:event(),onUpdated:event(),create:async x=>created=x,update:async(...a)=>updates.push(a),remove:async()=>{}},history:{search:async()=>{historyReads++;return [{url:'https://wikipedia.org/wiki/Access',title:'Accessibility',visitCount:3,lastVisitTime:Date.now()}]}},windows:{WINDOW_ID_CURRENT:-2,create:async x=>created=x,update:async()=>{}},sidePanel:{open:async x=>panel=x}};
const ctx=vm.createContext({chrome,document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){}},structuredClone,URL,Date,console,setTimeout:()=>0,clearTimeout(){},prompt:()=> 'Test Session',confirm:()=>true});
vm.runInContext(fs.readFileSync(path.join(root,'dashboard.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{await new Promise(r=>setImmediate(r));
assert.equal(run('tabs.length'),1);assert.equal(historyReads,1);
run("query='accessibility'");assert.match(run('searchResults()'),/Accessibility/);console.log('PASS Smart Search includes history');
await run("favorite('https://example.org')");assert.equal(saved.hubData.favorites.length,1);await run("favorite('https://example.org')");assert.equal(saved.hubData.favorites.length,0);console.log('PASS favorites persist and remove');
await run('saveSession()');assert.equal(saved.hubData.sessions[0].urls.length,1);assert.equal(saved.hubData.sessions[0].urls[0],'https://example.org');console.log('PASS session excludes internal URLs');
await run("action({type:'click',target:{closest:s=>s==='[data-act]'?{dataset:{act:'restore-session',index:'0'}}:null}})");assert.equal(created.url[0],'https://example.org');console.log('PASS restore session creates window');
run("data.settings.history=false");let n=historyReads;await run('loadHistory()');assert.equal(historyReads,n);assert.equal(run('historyItems.length'),0);console.log('PASS history off prevents reads');
let side=el('.sidebar');assert(side.listeners.click);side.listeners.click({target:{closest:()=>({dataset:{view:'Settings'}})}});assert.equal(el('heading').textContent,'Settings');console.log('PASS Settings navigation');
await el('openPanel').onclick();assert.equal(panel.windowId,-2);console.log('PASS side panel invokes API directly');
assert(!run("safe('<script>')").includes('<script>'));console.log('PASS rendered user text escaped');
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.equal(m.manifest_version,3);assert(!m.permissions.includes('tabGroups'));assert(!m.host_permissions);for(const f of [m.background.service_worker,m.action.default_popup,m.options_page,m.side_panel.default_path,...Object.values(m.icons)])assert(fs.existsSync(path.join(root,f)),f);console.log('PASS MV3 manifest, referenced assets, reduced permissions');
})().catch(e=>{console.error(e);process.exitCode=1});

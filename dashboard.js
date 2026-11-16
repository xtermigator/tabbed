
'use strict';
const DEFAULT={workspaces:['School','AI Tools','Research','Projects','Personal'],assignments:{},favorites:[],sessions:[],settings:{history:true,suggestions:true,theme:'dark',scope:'workspace'},layout:{widgets:['workspaces','tabs','suggestions']}};
let data=structuredClone(DEFAULT),tabs=[],historyItems=[],view='Overview',query='',sort='recent',filter='all';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host=url=>{try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}};
const valid=url=>/^https?:\/\//i.test(url||'');
const title=t=>t.title||host(t.url)||'Untitled';
const label=t=>data.assignments[t.url]||suggestCategory(t.url||'',t.title||'');
function suggestCategory(url,t=''){
 const x=(url+' '+t).toLowerCase();
 if(/classroom|canvas\.instructure|school|course|homework|edu\b|blackboard|moodle/.test(x))return 'School';
 if(/chatgpt|openai|claude|gemini|perplexity|copilot|huggingface|anthropic/.test(x))return 'AI Tools';
 if(/scholar|research|arxiv|pubmed|wikipedia|journal|paper/.test(x))return 'Research';
 if(/github|notion|trello|figma|linear\.app|asana/.test(x))return 'Projects';
 return 'Personal';
}
const isFav=url=>data.favorites.some(f=>f.url===url);
async function save(){await chrome.storage.local.set({hubData:data})}
async function init(){
 const stored=await chrome.storage.local.get('hubData');
 if(stored.hubData){data={...structuredClone(DEFAULT),...stored.hubData,settings:{...DEFAULT.settings,...stored.hubData.settings},layout:{...DEFAULT.layout,...stored.hubData.layout}}}
 $('search').addEventListener('input',e=>{query=e.target.value.trim();render()});
 $('clearSearch').onclick=()=>{$('search').value='';query='';render();$('search').focus()};
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select()}});
 $('refresh').onclick=refresh;
 $('resetLayout').onclick=async()=>{data.layout={widgets:['workspaces','tabs','suggestions']};await save();render();toast('Layout reset')};
 $('openPanel').onclick=async()=>{try{
   if(!chrome.sidePanel?.open)throw new Error('Side panel not supported in this browser');
   const w=await chrome.windows.getCurrent();await chrome.sidePanel.open({windowId:w.id});
 }catch(e){toast('Side panel unavailable here. Use the full dashboard.')}};
 document.getElementById('content').addEventListener('dragstart',e=>{
   const el=e.target.closest('[data-drag-card]');if(!el)return;
   e.dataTransfer.setData('text/plain',el.dataset.dragCard);e.dataTransfer.effectAllowed='move';
 });
 document.getElementById('content').addEventListener('dragover',e=>{
   if(e.target.closest('[data-drag-card]'))e.preventDefault();
 });
 document.getElementById('content').addEventListener('drop',async e=>{
   const target=e.target.closest('[data-drag-card]');if(!target)return;
   e.preventDefault();const from=e.dataTransfer.getData('text/plain'),to=target.dataset.dragCard;
   if(!from||from===to)return;
   if(from.startsWith('workspace:')&&to.startsWith('workspace:')){
     const a=from.slice(10),b=to.slice(10),arr=[...data.workspaces];
     if(!arr.includes(a)||!arr.includes(b))return;
     arr.splice(arr.indexOf(a),1);arr.splice(arr.indexOf(b),0,a);data.workspaces=arr;
   }else if(!from.includes(':')&&!to.includes(':')){
     const arr=[...data.layout.widgets];if(!arr.includes(from)||!arr.includes(to))return;
     arr.splice(arr.indexOf(from),1);arr.splice(arr.indexOf(to),0,from);data.layout.widgets=arr;
   }else return;
   await save();render();toast('Layout saved');
 });
 
 $('addWorkspace').onclick=addWorkspace;
 $('nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){view=b.dataset.view;query='';$('search').value='';render()}});
 await refresh();
 chrome.tabs.onCreated.addListener(refresh);
 chrome.tabs.onRemoved.addListener(refresh);
 chrome.tabs.onUpdated.addListener((id,info)=>{if(info.status==='complete'||info.title)refresh()});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.hubData){data=changes.hubData.newValue;render()}});
}
async function refresh(){
 try{tabs=(await chrome.tabs.query({})).filter(t=>t.id!==undefined && valid(t.url));}
 catch(e){toast('Could not read tabs: '+e.message)}
 await loadHistory();render();
}
async function loadHistory(){
 historyItems=[];
 if(!data.settings.history)return;
 try{historyItems=(await chrome.history.search({text:'',maxResults:1500,startTime:Date.now()-90*86400000})).filter(h=>valid(h.url))}
 catch(e){toast('History unavailable: '+e.message)}
}
function setView(v){view=v;query='';$('search').value='';render()}
function nav(){
 const nav=$('workspaceNav');
 nav.innerHTML=data.workspaces.map((w,i)=>`<button data-view="${safe(w)}">● &nbsp; ${safe(w)}</button>`).join('');
 document.querySelectorAll('#nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
function stats(){
 $('stats').innerHTML=[['Open Tabs',tabs.length],['Favorites',data.favorites.length],['Workspaces',data.workspaces.length],['Saved Sessions',data.sessions.length]].map(([a,b])=>`<div class="stat"><strong>${b}</strong><span>${a}</span></div>`).join('');
}
function render(){
 nav();stats();
 $('heading').textContent=query?'Search Results':view;
 $('subtitle').textContent=query?'Search across your open tabs, saved links and optional history.':view==='Smart Search'?'Find past websites and useful recommendations.':'Your personal browser organization dashboard.';
 const c=$('content');
 if(query){c.innerHTML=searchResults();return}
 if(view==='Overview'){c.innerHTML=overview();return}
 if(view==='Smart Search'){c.innerHTML=smartSearch();return}
 if(view==='Favorites'){c.innerHTML=favoritesPanel();return}
 if(view==='Sessions'){c.innerHTML=sessionsPanel();return}
 if(view==='Settings'){c.innerHTML=settingsPanel();return}
 c.innerHTML=tabsPanel(view);
}
function overview(){
 const sections={
  workspaces:`<div class="section-head"><h2>✥ Your Workspaces</h2><button data-act="new-workspace">＋ New Workspace</button></div><div class="grid">${data.workspaces.map((w,i)=>`<button draggable="true" data-drag-card="workspace:${safe(w)}" class="workspace-card c${i%5}" data-go="${safe(w)}"><span>⠿ Drag to reorder</span><strong>${safe(w)}</strong><span>${tabs.filter(t=>label(t)===w).length} open tabs</span></button>`).join('')}</div>`,
  tabs:`<div class="section-head"><h2>✥ Open Tabs</h2><button data-go="All Tabs">View all</button></div>${tabTable(tabs.slice(0,12))}`,
  suggestions:`<div class="section-head"><h2>✥ Recommended to Revisit</h2><button data-go="Smart Search">Smart Search</button></div>${recommendations(5)}`
 };
 return (data.layout?.widgets||DEFAULT.layout.widgets).map(k=>`<section class="draggable-widget" draggable="true" data-drag-card="${k}">${sections[k]||''}</section>`).join('');
}
function tabsPanel(scope){
 let selected=tabs.filter(t=>scope==='All Tabs'||label(t)===scope);
 if(filter==='favorites')selected=selected.filter(t=>isFav(t.url));
 if(filter==='pinned')selected=selected.filter(t=>t.pinned);
 if(sort==='title')selected.sort((a,b)=>title(a).localeCompare(title(b)));
 if(sort==='site')selected.sort((a,b)=>host(a.url).localeCompare(host(b.url)));
 return `<div class="section-head"><h2>${safe(scope)} (${selected.length})</h2><div class="controls"><button data-act="save-session">Save Current Tabs</button><button data-act="new-workspace">New Workspace</button></div></div>
 <div class="controls"><select id="sort"><option value="recent" ${sort==='recent'?'selected':''}>Browser order</option><option value="title" ${sort==='title'?'selected':''}>Title A–Z</option><option value="site" ${sort==='site'?'selected':''}>Website A–Z</option></select>
 <select id="filter"><option value="all">All tabs</option><option value="favorites" ${filter==='favorites'?'selected':''}>Favorites only</option><option value="pinned" ${filter==='pinned'?'selected':''}>Pinned only</option></select></div>${tabTable(selected)}`;
}
function tabTable(items){
 if(!items.length)return '<div class="panel empty">No matching open tabs. Try another workspace or search.</div>';
 return `<div class="panel table-scroll"><table class="tab-table"><thead><tr><th>Tab</th><th>Workspace</th><th>Favorite</th><th>Actions</th></tr></thead><tbody>${items.map(t=>`<tr><td><span class="tab-title" title="${safe(title(t))}">${safe(title(t))}</span><span class="muted">${safe(host(t.url))}</span></td><td><select data-assign="${t.id}">${data.workspaces.map(w=>`<option ${label(t)===w?'selected':''}>${safe(w)}</option>`).join('')}</select></td><td><button data-act="favorite" data-url="${safe(t.url)}">${isFav(t.url)?'★':'☆'}</button></td><td><div class="row-actions"><button data-act="switch" data-id="${t.id}">Switch</button><button data-act="pin" data-id="${t.id}">${t.pinned?'Unpin':'Pin'}</button><button data-act="close" data-id="${t.id}">Close</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function searchResults(){
 const q=query.toLowerCase(), matches=(t)=>[title(t),t.url,label(t)].some(x=>String(x).toLowerCase().includes(q));
 const open=tabs.filter(matches).slice(0,80);
 const favorite=data.favorites.filter(matches).slice(0,80);
 const hist=data.settings.history?historyItems.filter(matches).filter(h=>!open.some(t=>t.url===h.url)).slice(0,80):[];
 return `<div class="section-head"><h2>Search for “${safe(query)}”</h2><button data-go="Smart Search">Advanced search</button></div>
 ${resultSection('Open Tabs',open,'open')}${resultSection('Favorites',favorite,'favorite')}${resultSection('Previously Visited',hist,'history')}
 <p class="small-note">Matches titles, URLs, and workspace labels. History is limited to your browser's available records from the last 90 days.</p>`;
}
function resultSection(name,items,type){
 return `<section class="panel"><h2>${name} (${items.length})</h2>${items.length?items.map(t=>`<div class="result"><div class="detail"><strong>${safe(title(t))}</strong><span class="muted">${safe(host(t.url))} · ${safe(label(t))}${type==='history'&&t.lastVisitTime?' · '+new Date(t.lastVisitTime).toLocaleDateString():''}</span></div><div class="row-actions">${type==='open'?`<button data-act="switch" data-id="${t.id}">Switch</button>`:`<button data-act="reopen" data-url="${safe(t.url)}">Reopen</button>`}<button data-act="favorite" data-url="${safe(t.url)}">${isFav(t.url)?'★':'☆'}</button></div></div>`).join(''):'<p class="small-note">No results in this section.</p>'}</section>`;
}
function recommendations(max=12){
 if(!data.settings.history||!data.settings.suggestions)return '<div class="panel empty">Enable History and Suggestions in Settings to see rediscovery recommendations.</div>';
 const opened=new Set(tabs.map(t=>t.url)),favs=new Set(data.favorites.map(f=>f.url));
 const candidates=historyItems.filter(h=>!opened.has(h.url)&&!favs.has(h.url));
 const relevant=data.workspaces.includes(view)?view:null;
 const score=h=>Math.log2((h.visitCount||0)+1)*3+(h.lastVisitTime?Math.max(0,14-(Date.now()-h.lastVisitTime)/86400000):0)/3+(relevant&&label(h)===relevant?8:0);
 candidates.sort((a,b)=>score(b)-score(a));
 return `<div class="panel"><h2>Suggested sites to reopen</h2>${candidates.slice(0,max).map(h=>`<div class="result"><div class="detail"><strong>${safe(title(h))}</strong><span class="muted">${safe(host(h.url))} · ${safe(label(h))} · ${h.visitCount||1} visits · ${h.lastVisitTime?new Date(h.lastVisitTime).toLocaleDateString():'Past visit'}</span></div><div class="row-actions"><button data-act="reopen" data-url="${safe(h.url)}">Reopen</button><button data-act="favorite" data-url="${safe(h.url)}">☆ Save</button></div></div>`).join('')||'<p class="small-note">No recommendations yet. Browse normally, then refresh this page.</p>'}<p class="small-note">Ranked locally by visit frequency, recency, and workspace relevance. No external AI service is used.</p></div>`;
}
function smartSearch(){
 return `<div class="panel"><h2>⌕ Smart Search & Rediscovery</h2><p>Type in the universal search bar above to search all open tabs, saved favorites, and previously visited websites.</p><div class="controls"><button data-act="focus-search" class="primary">Search Now</button><button data-go="Settings">Privacy Settings</button></div></div>
 ${recommendations(15)}`;
}
function favoritesPanel(){
 return `<div class="section-head"><h2>Saved Favorites (${data.favorites.length})</h2></div>${resultSection('Favorite Websites',data.favorites,'favorite')}`;
}
function sessionsPanel(){
 return `<div class="section-head"><h2>Saved Sessions</h2><button class="primary" data-act="save-session">＋ Save Current Tabs</button></div>
 <div class="panel">${data.sessions.length?data.sessions.map((s,i)=>`<div class="result"><div class="detail"><strong>${safe(s.name)}</strong><span class="muted">${s.urls.length} tabs · ${new Date(s.created).toLocaleString()}</span></div><div class="row-actions"><button data-act="restore-session" data-index="${i}">Restore</button><button data-act="delete-session" data-index="${i}">Delete</button></div></div>`).join(''):'<p class="empty">No sessions saved yet. Save your current browser tabs to return to them later.</p>'}</div>`;
}
function settingsPanel(){
 return `<div class="panel"><h2>Privacy & Search</h2>
 <div class="settings-row"><div><label>Include browsing history</label><div class="small-note">Search local browser history (last 90 days)</div></div><input type="checkbox" id="setting-history" ${data.settings.history?'checked':''}></div>
 <div class="settings-row"><div><label>Show rediscovery suggestions</label><div class="small-note">Rank past websites locally by recency and frequency</div></div><input type="checkbox" id="setting-suggestions" ${data.settings.suggestions?'checked':''}></div>
 <div class="settings-row"><div><label>Workspace search priority</label><div class="small-note">Workspace categorization is suggested from titles and URLs; manually assigned categories override suggestions.</div></div><span class="badge">Enabled</span></div>
 <p class="small-note">All extension data stays in this browser profile. The extension does not sync between Chrome, Edge, and Opera.</p></div>
 <div class="panel"><h2>Workspaces</h2>${data.workspaces.map(w=>`<div class="result"><strong>${safe(w)}</strong><button data-act="delete-workspace" data-workspace="${safe(w)}">Remove</button></div>`).join('')}<button data-act="new-workspace">＋ Add Workspace</button></div>`;
}
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3000)}
async function addWorkspace(){
 const w=prompt('Name your new workspace:')?.trim();
 if(!w)return;
 if(data.workspaces.some(x=>x.toLowerCase()===w.toLowerCase()))return toast('Workspace already exists');
 if(w.length>40)return toast('Use a name under 40 characters');
 data.workspaces.push(w);await save();setView(w);
}
async function favorite(url){
 if(!valid(url))return;
 const index=data.favorites.findIndex(f=>f.url===url);
 if(index>=0){data.favorites.splice(index,1);toast('Removed from favorites')}
 else{const t=tabs.find(t=>t.url===url)||historyItems.find(h=>h.url===url);data.favorites.push({url,title:title(t||{url})});toast('Saved to favorites')}
 await save();render();
}
async function saveSession(){
 const name=prompt('Name this saved session:','My session '+new Date().toLocaleDateString())?.trim();
 if(!name)return;
 const urls=tabs.filter(t=>valid(t.url)).map(t=>t.url);
 if(!urls.length)return toast('No website tabs to save');
 data.sessions.unshift({name:name.slice(0,80),created:Date.now(),urls:urls.slice(0,200)});
 await save();toast('Session saved');render();
}
async function action(e){
 const go=e.target.closest('[data-go]');
 if(go){setView(go.dataset.go);return}
 const assign=e.target.closest('[data-assign]');
 if(assign&&e.type==='change'){
  const t=tabs.find(t=>t.id===Number(assign.dataset.assign));
  if(t){data.assignments[t.url]=assign.value;await save();render()}return;
 }
 if(e.target.id==='sort'){sort=e.target.value;render();return}
 if(e.target.id==='filter'){filter=e.target.value;render();return}
 if(e.target.id==='setting-history'){data.settings.history=e.target.checked;await save();await loadHistory();render();return}
 if(e.target.id==='setting-suggestions'){data.settings.suggestions=e.target.checked;await save();render();return}
 const b=e.target.closest('[data-act]');if(!b)return;
 const act=b.dataset.act,id=Number(b.dataset.id),url=b.dataset.url,i=Number(b.dataset.index);
 try{
  if(act==='new-workspace')return addWorkspace();
  if(act==='focus-search')return $('search').focus();
  if(act==='save-session')return saveSession();
  if(act==='favorite')return favorite(url);
  if(act==='switch'){const t=tabs.find(t=>t.id===id);if(t){await chrome.tabs.update(id,{active:true});await chrome.windows.update(t.windowId,{focused:true})}}
  if(act==='reopen'&&valid(url))await chrome.tabs.create({url});
  if(act==='pin')await chrome.tabs.update(id,{pinned:!tabs.find(t=>t.id===id)?.pinned});
  if(act==='close'&&confirm('Close this browser tab?'))await chrome.tabs.remove(id);
  if(act==='restore-session'){
   const s=data.sessions[i];if(!s)return;
   if(!confirm(`Open ${s.urls.length} tabs from "${s.name}" in a new window?`))return;
   await chrome.windows.create({url:s.urls.filter(valid).slice(0,200)});toast('Session restored');
  }
  if(act==='delete-session'&&confirm('Delete this saved session?')){data.sessions.splice(i,1);await save()}
  if(act==='delete-workspace'){
   const w=b.dataset.workspace;if(data.workspaces.length===1)return toast('Keep at least one workspace');
   if(confirm(`Remove workspace "${w}"? Assigned sites will return to suggested categories.`)){
    data.workspaces=data.workspaces.filter(x=>x!==w);
    Object.keys(data.assignments).forEach(k=>{if(data.assignments[k]===w)delete data.assignments[k]});
    await save();setView('Overview');
   }
  }
  await refresh();
 }catch(err){toast('Action failed: '+err.message)}
}
$('content').addEventListener('click',action);
$('content').addEventListener('change',action);
init().catch(e=>toast('Initialization error: '+e.message));

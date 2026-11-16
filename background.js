chrome.runtime.onInstalled.addListener(async () => {
  const {hubData} = await chrome.storage.local.get('hubData');
  if (!hubData) await chrome.storage.local.set({hubData:{
    workspaces:['School','AI Tools','Research','Projects','Personal'],
    assignments:{},favorites:[],sessions:[],settings:{history:true,suggestions:true,theme:'dark',scope:'workspace'}
  }});
});
async function openDashboard(){
  const url=chrome.runtime.getURL('dashboard.html');
  const tabs=await chrome.tabs.query({});
  const existing=tabs.find(t=>t.url===url);
  if(existing){await chrome.tabs.update(existing.id,{active:true});await chrome.windows.update(existing.windowId,{focused:true});}
  else await chrome.tabs.create({url});
}
chrome.action.onClicked.addListener(openDashboard);
chrome.commands.onCommand.addListener(command=>{if(command==='open-dashboard')openDashboard();});
chrome.runtime.onMessage.addListener((msg)=>{if(msg?.type==='OPEN_DASHBOARD')openDashboard();});

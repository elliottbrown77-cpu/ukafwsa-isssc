const CACHE='ukafwsa-isssc-v34';
const CORE=['/','/index.html','/styles.css','/app.js','/event-content.js','/room-allocation.js','/admin-settings.js','/supabase-client.js','/ukafwsa-mark.svg','/ukafwsa-snowflake.svg','/icon-192.png','/icon-512.png','/maskable-512.png','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));
    return;
  }
  const cacheable=CORE.includes(url.pathname)&&!url.search;
  if(!cacheable)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&response.type==='basic'){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||'A new ISSSC notice is available.'}}
  const title=data.title||'ISSSC 2027';
  const options={
    body:data.body||'Open the Event app for details.',
    icon:'/icon-192.png',
    badge:'/ukafwsa-snowflake.svg',
    tag:data.tag||'isssc-event-notice',
    data:{url:data.url||'/#/event'},
    renotify:!!data.urgent,
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/#/event',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    const existing=clients.find(client=>client.url.startsWith(self.location.origin));
    if(existing){existing.navigate(target);return existing.focus();}
    return self.clients.openWindow(target);
  }));
});

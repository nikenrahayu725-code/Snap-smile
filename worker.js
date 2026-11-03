const DEFAULTS={photoCounts:[1,2,3,4],countdowns:[3,5,0],filters:['none','warm','soft','vintage','mono'],frames:['cream','pink','dark','white','wedding'],title:'THE WEDDING OF NIKEN & EGIT',subtitle:'19.12.2026'};
const ADMIN_COOKIE='snap_admin', VISITOR_COOKIE='snap_visitor', enc=s=>new TextEncoder().encode(s);
const json=(o,status=200,headers={})=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sign(p,secret){const k=await crypto.subtle.importKey('raw',enc(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(await crypto.subtle.sign('HMAC',k,enc(p)))}
function cookie(req,name){const m=(req.headers.get('Cookie')||'').match(new RegExp('(?:^|;\\s*)'+name+'=([^;]+)'));return m?.[1]||null}
async function isAdmin(req,env){const token=cookie(req,ADMIN_COOKIE);if(!token||!env.ADMIN_SECRET)return false;const [p,s]=token.split('.');if(!p||!s)return false;try{const raw=atob(p.replace(/-/g,'+').replace(/_/g,'/'));if(JSON.parse(raw).exp<Date.now())return false;return await sign(p,env.ADMIN_SECRET)===s}catch{return false}}
async function config(env){let c={};try{c=JSON.parse(await env.SNAP_SMILE_SETTINGS.get('public-config')||'{}')}catch{}const cover=await env.SNAP_SMILE_SETTINGS.get('cover:current','json').catch(()=>null);return {...DEFAULTS,...c,...(cover?{cover}: {})}}
async function photos(env){try{const v=JSON.parse(await env.SNAP_SMILE_SETTINGS.get('gallery:photos')||'[]');return Array.isArray(v)?v:[]}catch{return []}}
async function imagekit(env,path,opts={}){if(!env.IMAGEKIT_PRIVATE_KEY)throw new Error('ImageKit belum dikonfigurasi.');return fetch('https://api.imagekit.io/v1'+path,{...opts,headers:{Authorization:'Basic '+btoa(env.IMAGEKIT_PRIVATE_KEY+':'),...(opts.headers||{})}})}
async function uploadImage(env,file,name,folder){if(!file||typeof file==='string'||!file.type?.startsWith('image/'))throw new Error('File foto tidak valid.');if(file.size>8*1024*1024)throw new Error('Ukuran foto maksimal 8 MB.');const fd=new FormData();fd.append('file',file);fd.append('fileName',name);fd.append('folder',folder);const r=await imagekit(env,'/files/upload',{method:'POST',body:fd});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||'Upload ke penyimpanan gagal.');return d}
function visitorCookie(id){return `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=15552000; Secure; SameSite=Lax`}
async function getGuest(env,id){if(!id)return null;try{return await env.SNAP_SMILE_SETTINGS.get('guest:'+id,'json')}catch{return null}}
async function stateCall(env,path,body){if(!env.SNAP_STATE)throw new Error('Binding SNAP_STATE belum dikonfigurasi.');const id=env.SNAP_STATE.idFromName('snap-smile-global');return env.SNAP_STATE.get(id).fetch('https://state'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})}
async function getCount(env,id){const r=await stateCall(env,'/count?guestId='+encodeURIComponent(id));if(!r.ok)throw new Error('Gagal membaca kuota.');return (await r.json()).count}
async function getGallery(env){const legacy=await photos(env);const r=await stateCall(env,'/gallery/init',{legacy});if(!r.ok)throw new Error('Gagal membaca galeri.');return (await r.json()).photos}
export default{async fetch(request,env){const u=new URL(request.url),p=u.pathname,m=request.method;
try{
if(p==='/api/diag')return json({ok:true,bindings:{kv:!!env.SNAP_SMILE_SETTINGS,assets:!!env.ASSETS,state:!!env.SNAP_STATE,imagekitPrivateKey:!!env.IMAGEKIT_PRIVATE_KEY,imagekitPublicKey:!!env.IMAGEKIT_PUBLIC_KEY,imagekitUrlEndpoint:!!env.IMAGEKIT_URL_ENDPOINT,adminPassword:!!env.ADMIN_PASSWORD,adminSecret:!!env.ADMIN_SECRET}});
if(p==='/api/config'&&m==='GET')return json(await config(env));
if(p==='/api/guest/me'&&m==='GET'){const id=cookie(request,VISITOR_COOKIE),g=await getGuest(env,id);if(!g)return json({guest:null});return json({guest:{...g,remaining:Math.max(0,3-await getCount(env,id))}})}
if(p==='/api/guest/start'&&m==='POST'){let b={};try{b=await request.json()}catch{}const name=String(b.name||'').trim().replace(/[<>]/g,'').slice(0,60);if(name.length<2)return json({error:'Nama minimal 2 karakter.'},400);const id=crypto.randomUUID(),g={id,name,createdAt:new Date().toISOString()};await env.SNAP_SMILE_SETTINGS.put('guest:'+id,JSON.stringify(g),{expirationTtl:60*60*24*180});await env.SNAP_SMILE_SETTINGS.put('visitor:'+id,'0',{expirationTtl:60*60*24*180});return json({ok:true,guest:{...g,remaining:3}},200,{'Set-Cookie':visitorCookie(id)})}
if(p==='/api/gallery'&&m==='GET'){const list=await getGallery(env);return json({photos:list.map(({fileId,url,thumbnailUrl,createdAt})=>({fileId,url,thumbnailUrl,createdAt}))})}
if(p==='/api/upload'&&m==='POST'){if(!env.SNAP_SMILE_SETTINGS||!env.IMAGEKIT_PRIVATE_KEY)return json({error:'Layanan galeri belum tersambung.'},503);const id=cookie(request,VISITOR_COOKIE),guest=await getGuest(env,id);if(!id||!guest)return json({error:'Masukkan nama tamu terlebih dahulu.'},401);const reserve=await stateCall(env,'/reserve',{guestId:id,legacyCount:Number(await env.SNAP_SMILE_SETTINGS.get('visitor:'+id)||0)});const reserved=await reserve.json();if(!reserve.ok)return json({error:reserved.error||'Kuota unggahan habis.'},reserve.status);let d;try{const form=await request.formData(),file=form.get('file');d=await uploadImage(env,file,'snap-smile-'+Date.now()+'.png','/snap-smile')}catch(e){await stateCall(env,'/release',{guestId:id});throw e}const photo={fileId:d.fileId,url:d.url,thumbnailUrl:d.thumbnailUrl||d.url,createdAt:new Date().toISOString(),guestId:id,guestName:guest.name};const add=await stateCall(env,'/gallery/add',{photo});if(!add.ok){try{await imagekit(env,'/files/'+encodeURIComponent(d.fileId),{method:'DELETE'})}catch{}await stateCall(env,'/release',{guestId:id});throw new Error('Gagal menyimpan data galeri. Silakan coba lagi.')}return json({ok:true,photo,remaining:reserved.remaining})}
if(p==='/api/admin/login'&&m==='POST'){if(!env.ADMIN_PASSWORD||!env.ADMIN_SECRET)return json({error:'ADMIN_PASSWORD dan ADMIN_SECRET belum tersedia.'},503);let b={};try{b=await request.json()}catch{}if(b.password!==env.ADMIN_PASSWORD)return json({error:'Password salah.'},401);const token=b64url(enc(JSON.stringify({exp:Date.now()+28800000}))),sig=await sign(token,env.ADMIN_SECRET);return json({ok:true},200,{'Set-Cookie':`${ADMIN_COOKIE}=${token}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`})}
if(p==='/api/admin/logout'&&m==='POST')return json({ok:true},200,{'Set-Cookie':`${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`});
if(p.startsWith('/api/admin/')){if(!await isAdmin(request,env))return json({error:'Silakan login sebagai admin.'},401);
if(p==='/api/admin/config'&&m==='GET')return json(await config(env));
if(p==='/api/admin/config'&&m==='PUT'){let c;try{c=await request.json()}catch{return json({error:'Data tidak valid.'},400)}const allowed={photoCounts:[1,2,3,4],countdowns:[0,3,5],filters:['none','warm','soft','vintage','mono'],frames:['cream','pink','dark','white','wedding']};for(const k of Object.keys(allowed)){if(!Array.isArray(c[k])||!c[k].length||c[k].some(v=>!allowed[k].includes((k==='photoCounts'||k==='countdowns')?Number(v):v)))return json({error:'Pilihan '+k+' tidak valid.'},400)}const saved={photoCounts:c.photoCounts.map(Number),countdowns:c.countdowns.map(Number),filters:c.filters,frames:c.frames,title:String(c.title||DEFAULTS.title).slice(0,80),subtitle:String(c.subtitle||DEFAULTS.subtitle).slice(0,40)};const old=await config(env);await env.SNAP_SMILE_SETTINGS.put('public-config',JSON.stringify(saved));if(old.cover)await env.SNAP_SMILE_SETTINGS.put('cover:current',JSON.stringify(old.cover));return json({ok:true})}
if(p==='/api/admin/cover'&&m==='POST'){const form=await request.formData(),file=form.get('file');const d=await uploadImage(env,file,'wedding-cover-'+Date.now(),'/snap-smile-cover');const old=await env.SNAP_SMILE_SETTINGS.get('cover:current','json').catch(()=>null);const cover={fileId:d.fileId,url:d.url,thumbnailUrl:d.thumbnailUrl||d.url,updatedAt:new Date().toISOString()};await env.SNAP_SMILE_SETTINGS.put('cover:current',JSON.stringify(cover));if(old?.fileId){try{await imagekit(env,'/files/'+encodeURIComponent(old.fileId),{method:'DELETE'})}catch{}}return json({ok:true,cover})}
if(p==='/api/admin/cover'&&m==='DELETE'){const old=await env.SNAP_SMILE_SETTINGS.get('cover:current','json').catch(()=>null);await env.SNAP_SMILE_SETTINGS.delete('cover:current');if(old?.fileId){try{await imagekit(env,'/files/'+encodeURIComponent(old.fileId),{method:'DELETE'})}catch{}}return json({ok:true})}
if(p==='/api/admin/gallery'&&m==='GET')return json({photos:await getGallery(env)});
if(p==='/api/admin/gallery'&&m==='DELETE'){let b={};try{b=await request.json()}catch{}const list=await getGallery(env),ids=new Set((b.all?list.map(x=>x.fileId):(Array.isArray(b.fileIds)?b.fileIds:[])).filter(x=>typeof x==='string'));const deleted=[];for(const photo of list){if(!ids.has(photo.fileId))continue;try{const r=await imagekit(env,'/files/'+encodeURIComponent(photo.fileId),{method:'DELETE'});if(r.ok||r.status===404)deleted.push(photo)}catch{}}const result=await stateCall(env,'/gallery/remove',{fileIds:deleted.map(x=>x.fileId)});if(!result.ok)throw new Error('Foto terhapus di ImageKit tetapi pembaruan galeri gagal. Hubungi admin.');for(const ph of deleted)if(ph.guestId){const n=await getCount(env,ph.guestId);await env.SNAP_SMILE_SETTINGS.put('visitor:'+ph.guestId,String(n),{expirationTtl:60*60*24*180})}return json({ok:true,deleted:deleted.length})}
}
if(p==='/'||p==='/index.html')
return env.ASSETS.fetch(new Request(new URL('/index.html',u),request));
if(p==='/admin'||p==='/admin/')
return env.ASSETS.fetch(new Request(new URL('/admin.html',u),request));
return env.ASSETS.fetch(request);
}catch(e){return json({error:e?.message||'Terjadi kesalahan server.'},500)}
}};


// Durable Object: atomic quota reservations and serialized gallery updates.
export class SnapSmileState {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {
    const url = new URL(request.url), path = url.pathname;
    try {
      if (path === '/count') { const id=url.searchParams.get('guestId'); return Response.json({count:Number(await this.state.storage.get('count:'+id)||0)}); }
      const b = request.method === 'POST' ? await request.json() : {};
      if (path === '/reserve') {
        const id=String(b.guestId||''); if(!id) return Response.json({error:'Identitas tamu tidak valid.'},{status:400});
        const result=await this.state.storage.transaction(async tx=>{let n=await tx.get('count:'+id);if(n===undefined)n=Math.max(0,Number(b.legacyCount)||0);if(n>=3)return {ok:false,count:n};n++;await tx.put('count:'+id,n);return {ok:true,count:n};});
        return Response.json(result.ok?{ok:true,remaining:3-result.count}:{error:'Batas unggahan tercapai: maksimal 3 photo strip per pengunjung.'},{status:result.ok?200:429});
      }
      if (path === '/release') { const id=String(b.guestId||'');await this.state.storage.transaction(async tx=>{const n=Number(await tx.get('count:'+id)||0);await tx.put('count:'+id,Math.max(0,n-1));});return Response.json({ok:true}); }
      if (path === '/gallery/init') { let list=await this.state.storage.get('gallery');if(!list){list=Array.isArray(b.legacy)?b.legacy:[];await this.state.storage.put('gallery',list);}return Response.json({photos:list}); }
      if (path === '/gallery/add') { const photo=b.photo;if(!photo?.fileId)return Response.json({error:'Data foto tidak valid.'},{status:400});await this.state.storage.transaction(async tx=>{const list=await tx.get('gallery')||[];list.unshift(photo);await tx.put('gallery',list.slice(0,500));});return Response.json({ok:true}); }
      if (path === '/gallery/remove') { const ids=new Set(Array.isArray(b.fileIds)?b.fileIds:[]);let removed=[];await this.state.storage.transaction(async tx=>{const list=await tx.get('gallery')||[];removed=list.filter(x=>ids.has(x.fileId));await tx.put('gallery',list.filter(x=>!ids.has(x.fileId)));for(const p of removed){if(p.guestId){const k='count:'+p.guestId,n=Number(await tx.get(k)||0);await tx.put(k,Math.max(0,n-1));}}});return Response.json({ok:true,deleted:removed.length}); }
      return new Response('Not found',{status:404});
    } catch(e) { return Response.json({error:e.message||'State error'},{status:500}); }
  }
}

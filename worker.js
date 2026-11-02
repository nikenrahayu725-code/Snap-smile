const DEFAULTS={photoCounts:[1,2,3,4],countdowns:[3,5,0],filters:["none","warm","soft","vintage","mono"],frames:["cream","pink","dark","white","wedding"],title:"THE WEDDING OF NIKEN & EGIT",subtitle:"19.12.2026"};

const COOKIE="snap_admin";
const enc=s=>new TextEncoder().encode(s);

function b64url(bytes){
 return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

async function sign(payload,secret){
 const key=await crypto.subtle.importKey("raw",enc(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return b64url(await crypto.subtle.sign("HMAC",key,enc(payload)));
}

async function valid(request,env){
 const m=(request.headers.get("Cookie")||"").match(new RegExp(COOKIE+"=([^;]+)"));
 if(!m||!env.ADMIN_SECRET)return false;
 const [p,s]=m[1].split(".");
 if(!p||!s)return false;
 try{
  let b=p.replace(/-/g,"+").replace(/_/g,"/");
  b+="=".repeat((4-b.length%4)%4);
  if(JSON.parse(atob(b)).exp<Date.now())return false;
  return await sign(p,env.ADMIN_SECRET)===s;
 }catch{return false;}
}

const json=(o,status=200,headers={})=>new Response(JSON.stringify(o),{
 status,
 headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}
});

async function readConfig(env){
 try{
  return {...DEFAULTS,...JSON.parse(await env.SNAP_SMILE_SETTINGS.get("public-config")||"{}")};
 }catch{return DEFAULTS;}
}

export default{
 async fetch(request,env){
  const url=new URL(request.url);
  const path=url.pathname;

  if(path==="/api/config"&&request.method==="GET")
   return json(await readConfig(env));

  if(path==="/api/admin/login"&&request.method==="POST"){
   let b={};
   try{b=await request.json();}catch{}
   if(!env.ADMIN_PASSWORD||!env.ADMIN_SECRET)
    return json({error:"Admin belum dikonfigurasi."},503);
   if(typeof b.password!=="string"||b.password!==env.ADMIN_PASSWORD)
    return json({error:"Password salah."},401);

   const p=b64url(enc(JSON.stringify({exp:Date.now()+28800000})));
   const sig=await sign(p,env.ADMIN_SECRET);

   return json({ok:true},200,{
    "Set-Cookie":`${COOKIE}=${p}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
   });
  }

  if(path==="/api/admin/logout"&&request.method==="POST")
   return json({ok:true},200,{
    "Set-Cookie":`${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
   });

  if(path==="/api/admin/config"){
   if(!await valid(request,env))
    return json({error:"Silakan login sebagai admin."},401);

   if(request.method==="GET")
    return json(await readConfig(env));

   if(request.method==="PUT"){
    let c;
    try{c=await request.json();}catch{return json({error:"Format tidak valid."},400);}

    const allowed={
     photoCounts:[1,2,3,4],
     countdowns:[0,3,5],
     filters:["none","warm","soft","vintage","mono"],
     frames:["cream","pink","dark","white","wedding"]
    };

    for(const k of Object.keys(allowed)){
     if(!Array.isArray(c[k])||!c[k].length||
      c[k].some(v=>!allowed[k].includes(
       (k==="photoCounts"||k==="countdowns")?Number(v):v
      )))return json({error:"Pilihan "+k+" tidak valid."},400);
    }

    const saved={
     photoCounts:c.photoCounts.map(Number),
     countdowns:c.countdowns.map(Number),
     filters:c.filters,
     frames:c.frames,
     title:String(c.title||DEFAULTS.title).slice(0,80),
     subtitle:String(c.subtitle||DEFAULTS.subtitle).slice(0,40)
    };

    await env.SNAP_SMILE_SETTINGS.put("public-config",JSON.stringify(saved));
    return json({ok:true});
   }
  }

  if(path==="/admin"||path==="/admin/"){
   const assetURL=new URL("/admin.html",url.origin);
   return env.ASSETS.fetch(new Request(assetURL,{
    method:"GET",
    headers:request.headers
   }));
  }

  return env.ASSETS.fetch(request);
 }
};

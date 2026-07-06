/* DOGE RUNNER / DOGE KADE REMIX — global leaderboard (Cloudflare Worker)
   Deploy (no CLI needed):
   1. dash.cloudflare.com → Workers & Pages → Create → Worker → paste this file → Deploy
   2. Worker → Settings → Bindings → Add → KV namespace:
      create a namespace (any name), set the binding NAME to: SCORES
   3. (optional, for moderation) Settings → Variables → add a Secret named
      ADMIN_TOKEN with a long random value. Used by the /admin route below.
   4. Copy the *.workers.dev URL into LB_API in index.html and arcade.html

   API:
   GET  /runner?level=JUNGLE%20JAUNT&tier=1&limit=50  → ranked rows
   POST /runner {name,level,tier,time,pickups,letters} → best-per-player per (level,tier)
   GET  /arcade?limit=50              → ranked rows
   POST /arcade {name,score,level}    → stores best-per-player
   POST /admin  {token,action,...}    → moderation (see handleAdmin)

   Anti-cheat: runner times below MIN_TIME frames are rejected on write and
   hidden on read (self-healing — bogus entries vanish once this deploys).
   tier = the difficulty loop (the "L1/L2..." level counter). Each (zone,tier)
   is its own board. tier<=1 uses the legacy key so old scores still show. */

const LEVELS=['JUNGLE JAUNT','PIPE PANIC','EMERALD RUSH'];
const MIN_TIME=600;   // 10s @ 60fps — no legit clear is faster; blocks fakes
const CORS={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'content-type,authorization',
};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json',...CORS}});
const cleanName=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,10)||'PLAYER 1';
const int=(v,min,max)=>{ const n=Math.floor(Number(v)); return Number.isFinite(n)&&n>=min&&n<=max?n:null; };
const clampLimit=v=>{ const n=int(v,1,100); return n||10; };

async function upsert(env,key,entry,cmp,keep){
  let rows=JSON.parse(await env.SCORES.get(key)||'[]');
  if(keep) rows=rows.filter(keep); // drop stale/invalid rows on write
  const i=rows.findIndex(r=>r.name===entry.name);
  if(i<0) rows.push(entry);
  else if(cmp(entry,rows[i])<0) rows[i]=entry; // only keep a player's best
  rows.sort(cmp);
  if(rows.length>100) rows.length=100;
  await env.SCORES.put(key,JSON.stringify(rows));
  return rows;
}

const runnerKey=(level,tier)=>tier>1?'runner:'+level+':'+tier:'runner:'+level;
const validRunner=r=>typeof r.time==='number'&&r.time>=MIN_TIME;
async function runner(req,url,env){
  if(req.method==='GET'){
    const level=url.searchParams.get('level')||'';
    if(!LEVELS.includes(level)) return json({error:'unknown level'},400);
    const tier=int(url.searchParams.get('tier'),1,999)||1;
    const limit=clampLimit(url.searchParams.get('limit'));
    const rows=JSON.parse(await env.SCORES.get(runnerKey(level,tier))||'[]').filter(validRunner);
    return json(rows.slice(0,limit));
  }
  if(req.method==='POST'){
    let b; try{ b=await req.json(); }catch(e){ return json({error:'bad json'},400); }
    const level=String(b.level||'');
    if(!LEVELS.includes(level)) return json({error:'unknown level'},400);
    const tier=int(b.tier,1,999)||1;
    const entry={
      name:cleanName(b.name),
      time:int(b.time,1,60*60*60*10), // frames at 60fps, 10 hour cap
      pickups:int(b.pickups,0,9999),
      letters:int(b.letters,0,4),
      tier,
      at:Date.now(),
    };
    if(entry.time===null||entry.pickups===null||entry.letters===null) return json({error:'bad entry'},400);
    if(entry.time<MIN_TIME) return json({error:'time too fast'},400);
    const cmp=(a,b)=>a.time-b.time||b.letters-a.letters||b.pickups-a.pickups||a.at-b.at;
    const rows=await upsert(env,runnerKey(level,tier),entry,cmp,validRunner);
    return json(rows.slice(0,10));
  }
  return json({error:'method not allowed'},405);
}

async function arcade(req,url,env){
  if(req.method==='GET'){
    const limit=clampLimit(url.searchParams.get('limit'));
    return json(JSON.parse(await env.SCORES.get('arcade')||'[]').slice(0,limit));
  }
  if(req.method==='POST'){
    let b; try{ b=await req.json(); }catch(e){ return json({error:'bad json'},400); }
    const entry={
      name:cleanName(b.name),
      score:int(b.score,1,9999999),
      level:int(b.level,1,99),
      at:Date.now(),
    };
    if(entry.score===null||entry.level===null) return json({error:'bad entry'},400);
    const cmp=(a,b)=>b.score-a.score||b.level-a.level||a.at-b.at;
    const rows=await upsert(env,'arcade',entry,cmp);
    return json(rows.slice(0,10));
  }
  return json({error:'method not allowed'},405);
}

/* --- moderation ---------------------------------------------------------
   All actions require {token} matching the ADMIN_TOKEN secret.
   { action:'purge' }                      → drop sub-MIN_TIME rows from every
                                             runner board (cleans old fakes)
   { action:'delete', key, name }          → remove one player from one board
                                             (key e.g. "runner:JUNGLE JAUNT")
   { action:'list' }                       → list all board keys + row counts */
async function handleAdmin(req,env){
  if(req.method!=='POST') return json({error:'method not allowed'},405);
  let b; try{ b=await req.json(); }catch(e){ return json({error:'bad json'},400); }
  if(!env.ADMIN_TOKEN||b.token!==env.ADMIN_TOKEN) return json({error:'unauthorized'},401);
  const all=await env.SCORES.list();
  const keys=all.keys.map(k=>k.name);
  if(b.action==='list'){
    const out=[];
    for(const k of keys){ const rows=JSON.parse(await env.SCORES.get(k)||'[]'); out.push({key:k,rows:rows.length}); }
    return json(out);
  }
  if(b.action==='purge'){
    let removed=0;
    for(const k of keys){
      if(!k.startsWith('runner:')) continue;
      const rows=JSON.parse(await env.SCORES.get(k)||'[]');
      const kept=rows.filter(validRunner);
      if(kept.length!==rows.length){ removed+=rows.length-kept.length; await env.SCORES.put(k,JSON.stringify(kept)); }
    }
    return json({ok:true,removed});
  }
  if(b.action==='delete'){
    const key=String(b.key||''), name=cleanName(b.name);
    if(!keys.includes(key)) return json({error:'unknown key'},400);
    const rows=JSON.parse(await env.SCORES.get(key)||'[]');
    const kept=rows.filter(r=>r.name!==name);
    await env.SCORES.put(key,JSON.stringify(kept));
    return json({ok:true,removed:rows.length-kept.length});
  }
  return json({error:'unknown action'},400);
}

export default {
  async fetch(req,env){
    if(req.method==='OPTIONS') return new Response(null,{headers:CORS});
    const url=new URL(req.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    try{
      if(path==='/runner') return await runner(req,url,env);
      if(path==='/arcade') return await arcade(req,url,env);
      if(path==='/admin') return await handleAdmin(req,env);
    }catch(e){ return json({error:'server error'},500); }
    return json({error:'not found'},404);
  }
};

/* DOGE RUNNER / DOGE KADE REMIX — global leaderboard (Cloudflare Worker)
   Deploy (no CLI needed):
   1. dash.cloudflare.com → Workers & Pages → Create → Worker → paste this file → Deploy
   2. Worker → Settings → Bindings → Add → KV namespace:
      create a namespace (any name), set the binding NAME to: SCORES
   3. Copy the *.workers.dev URL into LB_API in index.html and arcade.html

   API:
   GET  /runner?level=JUNGLE%20JAUNT  → top 10 [{name,time,pickups,letters,at}]
   POST /runner {name,level,time,pickups,letters} → stores best-per-player, returns top 10
   GET  /arcade                       → top 10 [{name,score,level,at}]
   POST /arcade {name,score,level}    → stores best-per-player, returns top 10 */

const LEVELS=['JUNGLE JAUNT','PIPE PANIC','EMERALD RUSH'];
const CORS={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'content-type',
};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json',...CORS}});
const cleanName=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,10)||'PLAYER 1';
const int=(v,min,max)=>{ const n=Math.floor(Number(v)); return Number.isFinite(n)&&n>=min&&n<=max?n:null; };

async function upsert(env,key,entry,cmp){
  const rows=JSON.parse(await env.SCORES.get(key)||'[]');
  const i=rows.findIndex(r=>r.name===entry.name);
  if(i<0) rows.push(entry);
  else if(cmp(entry,rows[i])<0) rows[i]=entry; // only keep a player's best
  rows.sort(cmp);
  if(rows.length>100) rows.length=100;
  await env.SCORES.put(key,JSON.stringify(rows));
  return rows.slice(0,10);
}

async function runner(req,url,env){
  if(req.method==='GET'){
    const level=url.searchParams.get('level')||'';
    if(!LEVELS.includes(level)) return json({error:'unknown level'},400);
    return json(JSON.parse(await env.SCORES.get('runner:'+level)||'[]').slice(0,10));
  }
  if(req.method==='POST'){
    let b; try{ b=await req.json(); }catch(e){ return json({error:'bad json'},400); }
    const level=String(b.level||'');
    if(!LEVELS.includes(level)) return json({error:'unknown level'},400);
    const entry={
      name:cleanName(b.name),
      time:int(b.time,1,60*60*60*10), // frames at 60fps, 10 hour cap
      pickups:int(b.pickups,0,9999),
      letters:int(b.letters,0,4),
      at:Date.now(),
    };
    if(entry.time===null||entry.pickups===null||entry.letters===null) return json({error:'bad entry'},400);
    const cmp=(a,b)=>a.time-b.time||b.letters-a.letters||b.pickups-a.pickups||a.at-b.at;
    return json(await upsert(env,'runner:'+level,entry,cmp));
  }
  return json({error:'method not allowed'},405);
}

async function arcade(req,url,env){
  if(req.method==='GET') return json(JSON.parse(await env.SCORES.get('arcade')||'[]').slice(0,10));
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
    return json(await upsert(env,'arcade',entry,cmp));
  }
  return json({error:'method not allowed'},405);
}

export default {
  async fetch(req,env){
    if(req.method==='OPTIONS') return new Response(null,{headers:CORS});
    const url=new URL(req.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    try{
      if(path==='/runner') return await runner(req,url,env);
      if(path==='/arcade') return await arcade(req,url,env);
    }catch(e){ return json({error:'server error'},500); }
    return json({error:'not found'},404);
  }
};

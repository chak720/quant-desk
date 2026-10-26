
"use strict";
/* Quant Desk engine: question generators, ratings, adaptive selection. Progress lives in localStorage. */
/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a};
const fr=(n,d)=>{const g=gcd(n,d);n/=g;d/=g;return d===1?String(n):n+"/"+d};
const r4=x=>Math.round(x*10000)/10000;
const fmt=x=>Number.isInteger(x)?x.toLocaleString("en-GB"):String(r4(x));
const comb=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r)};
const fact=n=>n<=1?1:n*fact(n-1);
const todayKey=()=>new Date().toLocaleDateString("en-CA");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function parseNum(s){
  s=String(s).trim().replace(/,/g,"").replace(/£|\$/g,"");
  if(!s)return NaN;
  let pct=false; if(s.endsWith("%")){pct=true;s=s.slice(0,-1)}
  let v;
  if(/^-?\d+(\.\d+)?\s*\/\s*-?\d+(\.\d+)?$/.test(s)){const [a,b]=s.split("/").map(Number);v=a/b}
  else v=Number(s);
  return pct?v/100:v;
}
function close(given,ans,tol){
  const t=tol||{abs:1e-9,rel:1e-9};
  return Math.abs(given-ans)<=Math.max(t.abs||0,(t.rel||0)*Math.abs(ans));
}
const PROB_TOL={abs:0.002,rel:0.01};

/* ---------- question generators ----------
   each sub: {label,min,gen(L)} gen returns {q,ans,sol,tol?} */
const SKILLS={
 arith:{name:"Mental maths",subs:{
  addsub:{label:"Add / subtract",min:1,gen(L){
    const d=[2,2,3,3,4][L-1];const lo=10**(d-1),hi=10**d-1;
    let a=ri(lo,hi),b=ri(lo,hi);const sub=L>=2&&Math.random()<.55;
    if(sub&&b>a)[a,b]=[b,a];
    const ans=sub?a-b:a+b;
    return{q:`${a} ${sub?"−":"+"} ${b}`,ans,sol:`${a} ${sub?"−":"+"} ${b} = ${ans}`}}},
  mult:{label:"Multiplication",min:1,gen(L){
    const ranges=[[2,9,11,30],[11,25,11,25],[12,49,12,49],[101,399,3,9],[101,299,11,49]][L-1];
    const a=ri(ranges[0],ranges[1]),b=ri(ranges[2],ranges[3]);
    const ans=a*b;
    return{q:`${a} × ${b}`,ans,sol:`${a} × ${b} = ${ans}\nSplit: ${a} × ${Math.floor(b/10)*10} + ${a} × ${b%10} = ${a*Math.floor(b/10)*10} + ${a*(b%10)}`}}},
  div:{label:"Division",min:1,gen(L){
    const r=[[2,9,2,15],[3,12,11,40],[11,25,11,50],[12,40,30,120],[13,99,100,999]][L-1];
    const b=ri(r[0],r[1]),c=ri(r[2],r[3]);
    return{q:`${b*c} ÷ ${b}`,ans:c,sol:`${b} × ${c} = ${b*c}, so ${b*c} ÷ ${b} = ${c}`}}},
  pct:{label:"Percentages",min:1,gen(L){
    const ps=[[10,20,25,50],[5,15,30,75],[12.5,35,45,60],[17,23,37,8],[13,27,43,3.5]][L-1];
    const p=pick(ps);const y=L<3?ri(2,40)*10:ri(12,99)*(L<5?10:7);
    const ans=r4(p*y/100);
    return{q:`${p}% of ${y}`,ans,tol:{abs:0.01},sol:`${p}% of ${y} = ${y} × ${p}/100 = ${ans}`}}},
 }},
 prob:{name:"Probability",subs:{
 }},
 ev:{name:"Expected value",subs:{
  bets:{label:"Simple bets",min:1,gen(L){
    const p=pick([0.2,0.25,0.3,0.4,0.6,0.1]),w=ri(2,20)*5,l=ri(1,10)*5;const ans=r4(p*w-(1-p)*l);
    return{q:`A bet wins £${w} with probability ${p} and loses £${l} otherwise. EV per bet (£)?`,ans,tol:{abs:0.01},sol:`${p}·${w} − ${r4(1-p)}·${l} = ${ans}`}}},
 }},
 seq:{name:"Sequences",subs:{
  linear:{label:"Arithmetic / geometric",min:1,gen(L){
    if(Math.random()<.5){const a=ri(-20,40),d=ri(2,L*4+3)*(Math.random()<.3?-1:1);const s=[0,1,2,3,4].map(i=>a+i*d);
      return{q:`Next term: ${s.join(", ")}, ?`,ans:a+5*d,sol:`Common difference ${d}`}}
    const a=ri(1,6),r=pick(L<3?[2,3]:[2,3,4,-2,1.5]);const s=[0,1,2,3].map(i=>r4(a*r**i));
    return{q:`Next term: ${s.join(", ")}, ?`,ans:r4(a*r**4),tol:{abs:0.01},sol:`Ratio ${r}`}}},
  poly:{label:"Squares, cubes, 2nd differences",min:2,gen(L){
    const k=ri(-3,5),st=ri(1,6);
    const t=pick([
      {f:n=>n*n+k,s:`n² ${k>=0?"+":"−"} ${Math.abs(k)}`},
      {f:n=>n*n*n+k,s:`n³ ${k>=0?"+":"−"} ${Math.abs(k)}`},
      {f:n=>n*(n+1)/2,s:"Triangular numbers n(n+1)/2"},
      {f:n=>2*n*n-n+k,s:`2n² − n ${k>=0?"+":"−"} ${Math.abs(k)} (second difference 4)`},
    ]);const s=[0,1,2,3,4].map(i=>t.f(st+i));
    return{q:`Next term: ${s.join(", ")}, ?`,ans:t.f(st+5),sol:t.s}}},
  mixed:{label:"Recursive & interleaved",min:3,gen(L){
    const typ=ri(0,2);
    if(typ===0){let a=ri(1,5),b=ri(1,7);const s=[a,b];for(let i=0;i<4;i++)s.push(s[s.length-1]+s[s.length-2]);const ans=s.pop();
      return{q:`Next term: ${s.join(", ")}, ?`,ans,sol:"Each term is the sum of the previous two"}}
    if(typ===1){const a=ri(1,9),d=ri(2,6),b=ri(20,40),e=ri(1,5);const s=[];for(let i=0;i<7;i++)s.push(i%2?b-e*((i-1)/2):a+d*(i/2));const ans=s.pop();
      return{q:`Next term: ${s.join(", ")}, ?`,ans,sol:`Two interleaved sequences: +${d} and −${e}`}}
    const a=ri(1,4),m=ri(2,3),c=ri(1,4);const s=[a];for(let i=0;i<5;i++)s.push(s[s.length-1]*m+c);const ans=s.pop();
    return{q:`Next term: ${s.join(", ")}, ?`,ans,sol:`Each term ×${m} then +${c}`}}},
 }},
 fin:{name:"Quant finance",subs:{
  returns:{label:"Returns",min:1,gen(L){
    const t=ri(0,L>=3?2:1);
    if(t===0){const a=ri(20,200),b=Math.round(a*(1+ri(-30,40)/100));const ans=r4((b-a)/a*100);
      return{q:`A stock goes from £${a} to £${b}. Simple return in %?`,ans,pct:true,tol:{abs:0.1},sol:`(${b} − ${a}) / ${a} = ${ans}%`}}
    if(t===1){const x=pick([10,20,25,50]);const ans=r4(((1+x/100)*(1-x/100)-1)*100);
      return{q:`A stock rises ${x}% one day and falls ${x}% the next. Total return in %?`,ans,pct:true,tol:{abs:0.05},sol:`(1 + ${x/100})(1 − ${x/100}) − 1 = −${(x/100)**2} → ${ans}%. Losses hurt more than equal gains help.`}}
    const a=ri(50,150),b=Math.round(a*(1+ri(5,60)/100));const ans=r4(Math.log(b/a));
    return{q:`Price goes from ${a} to ${b}. Log return ln(P₁/P₀), as a decimal?`,ans,tol:{abs:0.005},sol:`ln(${b}/${a}) = ${ans}. Log returns add across periods; simple returns don't.`}}},
  risk:{label:"Volatility & Sharpe",min:2,gen(L){
    if(Math.random()<.5){const d=pick([0.5,1,1.5,2]);const ans=r4(d*Math.sqrt(252));
      return{q:`Daily volatility is ${d}%. Annualised volatility in % (252 trading days)?`,ans,pct:true,tol:{abs:0.3},sol:`σ scales with √time: ${d}% × √252 ≈ ${d} × 15.87 = ${ans}%`}}
    const m=ri(4,20),rf=ri(0,5),v=ri(5,25);const ans=r4((m-rf)/v);
    return{q:`A strategy returns ${m}% a year with ${v}% volatility. The risk-free rate is ${rf}%. Sharpe ratio?`,ans,tol:{abs:0.02},sol:`(return − risk-free) / volatility = (${m} − ${rf}) / ${v} = ${ans}`}}},
  options:{label:"Option payoffs",min:2,gen(L){
    const K=ri(8,12)*10,S=K+ri(-25,25);const t=ri(0,L>=3?3:1);
    if(t===0)return{q:`A call with strike ${K} expires with the stock at ${S}. Payoff?`,ans:Math.max(S-K,0),sol:`max(S − K, 0) = max(${S} − ${K}, 0) = ${Math.max(S-K,0)}`};
    if(t===1)return{q:`A put with strike ${K} expires with the stock at ${S}. Payoff?`,ans:Math.max(K-S,0),sol:`max(K − S, 0) = max(${K} − ${S}, 0) = ${Math.max(K-S,0)}`};
    if(t===2){const C=ri(3,15),P=ri(3,15),S0=K+C-P;return{q:`Zero interest rates. A ${K}-strike call costs ${C} and the ${K}-strike put costs ${P}. What must the stock price be (put–call parity)?`,ans:S0,sol:`C − P = S − K → S = K + C − P = ${K} + ${C} − ${P} = ${S0}`}}
    const prem=ri(4,14);return{q:`You buy a ${K}-strike straddle (call + put) for ${prem} total. What's the upper breakeven stock price at expiry?`,ans:K+prem,sol:`You need |S − K| > ${prem}: upper breakeven ${K} + ${prem} = ${K+prem}`}}},
 }},
 stats:{name:"Statistics",subs:{
  binom:{label:"Binomial mean / variance",min:1,gen(L){
    const n=ri(10,100),p=pick([0.1,0.2,0.25,0.4,0.5,0.6]);const v=Math.random()<.5;
    return{q:`X ~ Bin(${n}, ${p}). ${v?"Var(X)":"E[X]"}?`,ans:r4(v?n*p*(1-p):n*p),tol:{abs:0.01},sol:v?`np(1−p) = ${r4(n*p*(1-p))}`:`np = ${r4(n*p)}`}}},
 }},
};
const SKILL_ORDER=["arith","prob","ev","seq","stats","fin","mm"];
const SKILL_NAME={...Object.fromEntries(Object.entries(SKILLS).map(([k,v])=>[k,v.name])),mm:"Market making"}; /* SKILLS.mm itself is defined in qgen.js */
const LVL_NAME=["","Warm-up","Foundation","Interview","Hard","Desk-ready"];

/* ---------- state ---------- */
function blankState(){return{v:1,ratings:Object.fromEntries(SKILL_ORDER.map(k=>[k,950])),subs:{},mistakes:[],days:{},games:{sprint:{best:0,hist:[]},mm:{best:0,hist:[]},ladder:{best:0,hist:[]},kelly:{best:0,hist:[]},book:{best:0,hist:[]},desk:{best:0,hist:[]}},labs:{},lv:Object.fromEntries(SKILL_ORDER.map(k=>[k,1.5])),updated:null}}
let S=blankState();
let DAY={date:todayKey(),attempts:[]};
let db=null,storeMode="none",PLAN=null,READY=false;

/* Difficulty is a per-skill staircase S.lv (1.0 to 5.99). Fast correct answers step it up, misses step it down
   three times as far, so it settles where you get about 70% right: hard enough to learn, easy enough to keep going. */
const LV_UP=0.12,LV_SLOW=0.04,LV_DOWN=0.30;
function lvOf(skill){return clamp(Number(S.lv&&S.lv[skill])||1.5,1,5.99)}
function levelFor(skill){return Math.floor(lvOf(skill))}
function levelProgress(skill){const v=lvOf(skill);return v>=5?1:v-Math.floor(v)}
/* blend between neighbouring levels by the fractional part, so difficulty rises smoothly rather than in jumps */
function sampleLevel(skill){const v=lvOf(skill);let L=Math.floor(v)+(Math.random()<v-Math.floor(v)?1:0);if(Math.random()<.1)L--;return clamp(L,1,5)}
let LEVEL_EVENTS=[];
function subStat(key){return S.subs[key]||(S.subs[key]={n:0,c:0,ms:0,last:null})}
function accOf(st){return(st.c+1)/(st.n+2)}
function daysSince(d){if(!d)return 14;return Math.max(0,(Date.parse(todayKey())-Date.parse(d))/864e5)}

function pickSub(skill,L){
  const subs=Object.entries(SKILLS[skill].subs).filter(([k,s])=>s.min<=L);
  const w=subs.map(([k])=>{const st=subStat(skill+"."+k);return 1+2.5*(1-accOf(st))+0.25*Math.min(daysSince(st.last),6)});
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<subs.length;i++){r-=w[i];if(r<=0)return subs[i][0]}return subs[0][0];
}
/* Recently seen question texts (hashed) so the generators don't hand you the same question twice in a row */
function qhash(t){let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return h.toString(36)}
let RECENT=null;
function seenRecently(t){if(!RECENT)RECENT=new Set(S.recent||[]);return RECENT.has(qhash(t))}
function remember(t){const h=qhash(t);if(!RECENT)RECENT=new Set(S.recent||[]);if(RECENT.has(h))return;RECENT.add(h);S.recent=[...(S.recent||[]),h].slice(-500);if(RECENT.size>600)RECENT=new Set(S.recent)}
function makeQ(skill,sub,L){
  for(let t=0;t<12;t++){const q=makeQ1(skill,sub,L);if(t===11||!seenRecently(q.q)){remember(q.q);return q}}
}
function makeQ1(skill,sub,L){
  L=L||sampleLevel(skill);
  if(sub&&!SKILLS[skill].subs[sub])sub=null;
  sub=sub||pickSub(skill,L);
  const s=SKILLS[skill].subs[sub];L=Math.max(L,s.min);
  return{skill,sub,L,label:s.label,...s.gen(L)};
}
function skillWeight(k){
  const r=S.ratings[k];const subs=Object.keys(SKILLS[k].subs).map(s=>subStat(k+"."+s));
  const n=subs.reduce((a,s)=>a+s.n,0),c=subs.reduce((a,s)=>a+s.c,0);
  const last=subs.map(s=>s.last).filter(Boolean).sort().pop();
  return 1+Math.max(0,(1250-r)/150)+3*(1-(c+1)/(n+2))+0.3*Math.min(daysSince(last),7);
}
function buildDaily(){
  const qs=[];
  const review=S.mistakes.slice(0,3);
  for(const m of review){const q=m.qobj?{...m.qobj}:makeQ(m.skill,m.sub,m.L);q.review=m.id;qs.push(q)}
  /* the current unit's questions are regenerated for every set, so they're new numbers each time */
  const pqs=PLAN&&PLAN.fromUnit?(UNITS.find(u=>u.n===PLAN.unit)||{questions:[]}).questions.map(q=>({...q,unit:PLAN.unit})):PLAN&&PLAN.questions;
  if(Array.isArray(pqs)&&S.planDone!==PLAN.id){for(const pq of pqs.slice(0,4)){const q=planQ(pq);if(q)qs.push(q)}}
  /* keep the set mixed: once three market-making questions are in, fill the rest from other topics */
  while(qs.length<9){const ks=SKILL_ORDER.filter(k=>k!=="mm"||qs.filter(q=>q.skill==="mm").length<3),w=ks.map(skillWeight);let r=Math.random()*w.reduce((a,b)=>a+b,0);let k=ks[0];for(let i=0;i<ks.length;i++){r-=w[i];if(r<=0){k=ks[i];break}}qs.push(makeQ(k))}
  qs.push(makeQ("mm","quote"));
  return qs;
}
function planQ(pq){
  if(!pq||typeof pq.q!=="string")return null;
  const skill=SKILL_ORDER.includes(pq.skill)?pq.skill:"prob";
  const mm=!!pq.mm;const ans=Number(pq.ans);if(!isFinite(ans))return null;
  return{skill,sub:typeof pq.sub==="string"?pq.sub:"coach",L:clamp(Number(pq.L)||2,1,5),q:String(pq.q).slice(0,500),ans,mm,custom:true,
    ...(pq.quote?{quote:true,fv:Number(pq.fv),sd:Number(pq.sd)}:{}),
    tol:pq.tol&&typeof pq.tol==="object"?{abs:Number(pq.tol.abs)||0,rel:Number(pq.tol.rel)||0}:{abs:1e-6,rel:1e-6},
    pct:!!pq.pct,sol:String(pq.sol||"").slice(0,800),unit:Number(pq.unit)||0,secs:Number(pq.secs)||0,src:typeof pq.src==="string"?pq.src.slice(0,300):"",label:String(pq.label||"Coach question").slice(0,40),fromPlan:true};
}
const TARGET=1250,DEFAULT_GAIN=7;
function eta(skill){
  const r=S.ratings[skill];
  if(r>=TARGET)return{ready:true,days:0,measured:true,text:"Interview level"};
  const ds=Object.keys(S.days).sort().filter(k=>S.days[k].r&&S.days[k].r[skill]!=null).slice(-21);
  let perDay=DEFAULT_GAIN,measured=false;
  if(ds.length>=3){
    const first=S.days[ds[0]].r[skill],last=S.days[ds[ds.length-1]].r[skill];
    const span=Math.max(1,(Date.parse(ds[ds.length-1])-Date.parse(ds[0]))/864e5);
    perDay=(last-first)/span;measured=true;
  }
  if(perDay<=0.5)return{ready:false,days:Infinity,measured,text:"Not rising yet"};
  const days=Math.ceil((TARGET-r)/perDay);
  return{ready:false,days,measured,text:weeksText(days)};
}
function weeksText(d){if(!isFinite(d))return"–";if(d<=10)return`~${d} days`;const w=Math.round(d/7);return w>=26?"6+ months":`~${w} weeks`}
function overallEta(){
  const ks=SKILL_ORDER;const es=ks.map(k=>({k,e:eta(k)}));
  const open=es.filter(x=>!x.e.ready);
  if(!open.length)return{text:"You're at interview level across every topic.",measured:true};
  const worst=open.reduce((a,b)=>b.e.days>a.e.days?b:a);
  const measured=es.every(x=>x.e.measured);
  return{days:worst.e.days,text:isFinite(worst.e.days)?weeksText(worst.e.days):"Not yet measurable",bottleneck:SKILL_NAME[worst.k],measured};
}
const TARGETS={arith:[6,8,12,15,20],seq:[15,20,25,30,40],prob:[20,30,45,60,90],ev:[20,30,45,60,90],stats:[20,30,45,60,90],fin:[20,25,40,60,90],mm:[25,35,45,60,90]};
function targetSecs(q){const n=Number(q.secs);if(n>0)return Math.round(n);return(TARGETS[q.skill]||TARGETS.prob)[clamp(q.L||2,1,5)-1]}
function mmScore(bid,ask,v){
  if(!(bid>0&&ask>=bid))return 0;
  if(v<bid||v>ask)return 0;
  return clamp(Math.round(100-40*Math.log(ask/bid)),10,100);
}
function record(q,given,ok,ms,score){
  const key=q.skill+"."+q.sub;const st=subStat(key);
  st.n++;if(ok)st.c++;st.ms+=ms;st.last=todayKey();
  const D=800+120*(q.L-0.5);const r=S.ratings[q.skill];
  const seen=Object.keys(SKILLS[q.skill].subs).reduce((a,k)=>a+subStat(q.skill+"."+k).n,0);
  const exp=1/(1+10**((D-r)/400));
  const res=q.mm?score/100:(ok?(ms<=targetSecs(q)*1000?1:0.85):0);
  S.ratings[q.skill]=Math.round(r+(seen<=25?40:24)*(res-exp));
  if(!q.custom&&!q.review&&!q.fromPlan&&!q.noStair){
    const v=lvOf(q.skill),f=Math.floor(v),fast=ms<=targetSecs(q)*1000;
    /* first 15 answers in a topic move twice as fast so a strong start finds its level within a few days;
       a run of fast correct answers adds a bonus so easy material doesn't drag on */
    const warm=seen<=15?1.4:1,run=(S.run=S.run||{})[q.skill]=ok&&fast?(S.run[q.skill]||0)+1:0;
    const up=Math.min(0.22,warm*LV_UP+(q.L>f?0.04:0)+(run>=3?0.03:0));
    const nv=clamp(ok?v+(fast?up:LV_SLOW):v-warm*(LV_DOWN+(q.L<f?0.05:0)),1,5.99);
    (S.lv=S.lv||{})[q.skill]=Math.round(nv*1000)/1000;
    if(Math.floor(nv)!==f)LEVEL_EVENTS.push({skill:q.skill,from:f,to:Math.floor(nv)});
  }
  const day=dayRec();day.n++;if(ok)day.c++;day.r={...S.ratings};day.lv={...S.lv};
  if(!ok&&!q.review){S.mistakes.unshift({...(q.custom?{qobj:{skill:q.skill,sub:q.sub,L:q.L,q:q.q,ans:q.ans,tol:q.tol,sol:q.sol,label:q.label,custom:true,mm:!!q.mm,pct:!!q.pct,...(q.quote?{quote:true,fv:q.fv,sd:q.sd}:{})}}:{}),id:Date.now().toString(36)+ri(0,999),skill:q.skill,sub:q.sub,L:q.L,q:q.q,ans:r4(q.ans),given:String(given).slice(0,40),sol:q.sol,t:todayKey(),fixes:0});S.mistakes=S.mistakes.slice(0,60)}
  if(q.review){const m=S.mistakes.find(m=>m.id===q.review);if(m){if(ok){m.fixes++;if(m.fixes>=2)S.mistakes=S.mistakes.filter(x=>x!==m)}else m.fixes=0}}
  if(q.unit){const u=(S.units=S.units||{})[q.unit]||(S.units[q.unit]={a:0,c:0});u.a++;if(ok)u.c++;u.last=todayKey()}
  DAY.attempts.push({t:new Date().toISOString().slice(11,19),skill:q.skill,sub:q.sub,L:q.L,ok,ms,q:q.q.slice(0,160),ans:r4(q.ans),given:String(given).slice(0,40),...(q.mm?{score}:{})});
  DAY.attempts=DAY.attempts.slice(-300);
  queueSave();renderStrip();
}

/* ---------- persistence (browser only) ---------- */
let saveTimer=null;
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(lsSave,400)}
function lsSave(){S.updated=new Date().toISOString();
  const ks=Object.keys(S.days).sort();if(ks.length>400)for(const k of ks.slice(0,ks.length-400))delete S.days[k];
  try{localStorage.setItem("qd_state",JSON.stringify(S));localStorage.setItem("qd_day",JSON.stringify(DAY))}catch(e){}}
function mergeState(x){if(!x)return;const b=blankState();S={...b,...x,ratings:{...b.ratings,...(x.ratings||{})},games:{...b.games,...(x.games||{})},labs:{...(x.labs||{})},lv:{...b.lv,...(x.lv||Object.fromEntries(Object.entries(x.ratings||{}).map(([k,r])=>[k,clamp(1+(r-800)/120,1,5.99)])))}}}
/* per-day activity counters beyond questions: labs opened/finished, games played */
function dayRec(){return S.days[todayKey()]||(S.days[todayKey()]={n:0,c:0,daily:false})}
function bumpDay(k){const d=dayRec();d[k]=(d[k]||0)+1;queueSave();if(typeof renderStrip==="function")renderStrip()}
function unitDone(n){const u=(S.units||{})[n];const U=UNITS.find(x=>x.n===n);return!!u&&u.a>=Math.min(4,U.questions.length)&&u.c/u.a>=0.8}
function nextUnit(){return UNITS.find(u=>!unitDone(u.n))||null}
function unitPlan(U){return{id:"unit-"+U.n+"-"+todayKey(),unit:U.n,fromUnit:true,lesson:{title:`Unit ${U.n}: ${U.title}`,sections:U.sections,takeaways:U.takeaways},questions:U.questions.map(q=>({...q,unit:U.n}))}}
let DAILY=null;
async function loadState(){
  try{mergeState(JSON.parse(localStorage.getItem("qd_state")||"null"))}catch(e){}
  try{const d=JSON.parse(localStorage.getItem("qd_day")||"null");if(d&&d.date===todayKey())DAY=d}catch(e){}
  try{const r=await fetch("daily.json",{cache:"no-store"});if(r.ok){const j=await r.json();
    if(j&&j.id&&daysSince(j.id)<=2)DAILY=j}}catch(e){}
  choosePlan();READY=true;
}
function choosePlan(){
  const U=nextUnit();
  if(DAILY&&S.planDone!==DAILY.id)PLAN=DAILY;
  else PLAN=U?unitPlan(U):DAILY;
}

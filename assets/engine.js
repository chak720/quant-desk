
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
  frac:{label:"Fraction → decimal",min:1,gen(L){
    const dens=[[2,4,5,8],[8,16,20,25],[3,6,9,12],[7,11,16,32],[7,13,17,19]][L-1];
    const d=pick(dens);let n=ri(1,d-1);while(gcd(n,d)!==1)n=ri(1,d-1);
    return{q:`Write ${n}/${d} as a decimal (3 d.p. is fine)`,ans:n/d,tol:{abs:0.0006},sol:`${n}/${d} = ${r4(n/d)}`}}},
 }},
 prob:{name:"Probability",subs:{
  coins:{label:"Coins & at-least-one",min:1,gen(L){
    if(L<=2&&Math.random()<.5){const n=ri(2,5);return{q:`Flip ${n} fair coins. P(at least one head)?`,ans:1-1/2**n,tol:PROB_TOL,sol:`1 − P(all tails) = 1 − (1/2)^${n} = ${fr(2**n-1,2**n)}`}}
    const n=ri(2,L+3);return{q:`Roll a fair die ${n} times. P(at least one 6)?`,ans:1-(5/6)**n,tol:PROB_TOL,sol:`1 − (5/6)^${n} = ${r4(1-(5/6)**n)}`}}},
  dice:{label:"Dice sums",min:1,gen(L){
    if(L>=4){const s=ri(6,15);let c=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let d=1;d<=6;d++)if(a+b+d===s)c++;
      return{q:`Roll three fair dice. P(sum = ${s})?`,ans:c/216,tol:PROB_TOL,sol:`${c} of 216 outcomes sum to ${s} → ${fr(c,216)}`}}
    const s=ri(2,12);const c=6-Math.abs(7-s);
    if(L>=2&&Math.random()<.5){const t=ri(5,10);let k=0;for(let x=t;x<=12;x++)k+=6-Math.abs(7-x);
      return{q:`Roll two fair dice. P(sum ≥ ${t})?`,ans:k/36,tol:PROB_TOL,sol:`Count sums ${t}..12: ${k} of 36 → ${fr(k,36)}`}}
    return{q:`Roll two fair dice. P(sum = ${s})?`,ans:c/36,tol:PROB_TOL,sol:`${c} ways out of 36 → ${fr(c,36)}`}}},
  cards:{label:"Cards",min:2,gen(L){
    const t=pick([
      {q:"Draw 2 cards from a 52-card deck. P(same suit)?",n:12,d:51,s:"First card any suit; 12 of the remaining 51 match → 12/51 = 4/17"},
      {q:"Draw 2 cards. P(both aces)?",n:4*3,d:52*51,s:"(4/52)(3/51) = 1/221"},
      {q:"Draw 2 cards. P(first is an ace, second is a king)?",n:16,d:52*51,s:"(4/52)(4/51) = 4/663"},
      {q:"Draw 2 cards. P(at least one heart)?",n:52*51-39*38,d:52*51,s:"1 − (39/52)(38/51) = 15/34"},
      {q:"Draw 3 cards. P(all red)?",n:26*25*24,d:52*51*50,s:"(26/52)(25/51)(24/50) = 2/17"},
      {q:"Draw 5 cards. P(flush, incl. straight flushes)?",n:4*comb(13,5),d:comb(52,5),s:"4·C(13,5)/C(52,5) = 5148/2598960 ≈ 0.00198"},
      {q:"Draw 2 cards. P(they form a pair)?",n:3,d:51,s:"Second card matches rank: 3/51 = 1/17"},
    ]);
    return{q:t.q,ans:t.n/t.d,tol:{abs:0.0015,rel:0.01},sol:t.s}}},
  bayes:{label:"Bayes",min:3,gen(L){
    const p=pick([1,2,5,10]),se=pick([90,95,99]),fp=pick([1,2,5,10]);
    const num=p*se,den=p*se+(100-p)*fp;
    return{q:`A condition affects ${p}% of people. A test catches ${se}% of cases and gives false positives ${fp}% of the time. You test positive. P(you have it)?`,ans:num/den,tol:PROB_TOL,
      sol:`P(+|D)P(D) / P(+) = ${se/100}·${p/100} / (${se/100}·${p/100} + ${fp/100}·${(100-p)/100}) = ${r4(num/den)}`}}},
  counting:{label:"Counting",min:2,gen(L){
    if(Math.random()<.5){const w=pick(["LEVEL","BANANA","STATS","COFFEE","PEPPER","LETTER","ALGEBRA"]);
      const cnt={};for(const ch of w)cnt[ch]=(cnt[ch]||0)+1;let d=1;const parts=[];for(const k in cnt){d*=fact(cnt[k]);if(cnt[k]>1)parts.push(cnt[k]+"!")}
      const ans=fact(w.length)/d;return{q:`How many distinct arrangements of the letters in ${w}?`,ans,sol:`${w.length}! / (${parts.join("·")||"1"}) = ${ans}`}}
    const n=ri(6,L+9),k=ri(2,Math.min(5,n-2));return{q:`How many ways to choose a team of ${k} from ${n} people?`,ans:comb(n,k),sol:`C(${n},${k}) = ${comb(n,k)}`}}},
  waiting:{label:"Waiting times",min:3,gen(L){
    const t=pick([
      {q:"Expected number of rolls of a fair die until the first 6?",a:6,s:"Geometric with p = 1/6 → E = 1/p = 6"},
      {q:"Expected number of fair coin flips until two heads in a row (HH)?",a:6,s:"States: E0 = 1 + ½E1 + ½E0, E1 = 1 + ½·0 + ½E0 → E0 = 6"},
      {q:"Expected number of fair coin flips until you see H followed by T (HT)?",a:4,s:"Wait for H (2 flips), then wait for T (2 flips) → 4"},
      {q:"Expected number of die rolls to see all six faces?",a:14.7,s:"Coupon collector: 6(1 + 1/2 + … + 1/6) = 14.7"},
      {q:"A coin lands heads with p = 0.2. Expected flips until the first head?",a:5,s:"1/p = 5"},
      {q:"Expected number of fair coin flips until three heads in a row?",a:14,s:"2^(n+1) − 2 with n = 3 → 14"},
    ]);return{q:t.q,ans:t.a,tol:{abs:0.05},sol:t.s}}},
 }},
 ev:{name:"Expected value",subs:{
  bets:{label:"Simple bets",min:1,gen(L){
    const p=pick([0.2,0.25,0.3,0.4,0.6,0.1]),w=ri(2,20)*5,l=ri(1,10)*5;const ans=r4(p*w-(1-p)*l);
    return{q:`A bet wins £${w} with probability ${p} and loses £${l} otherwise. EV per bet (£)?`,ans,tol:{abs:0.01},sol:`${p}·${w} − ${r4(1-p)}·${l} = ${ans}`}}},
  dicegames:{label:"Dice games",min:2,gen(L){
    const t=pick([
      {q:"You roll a fair die and are paid its face value in £. Fair price to play?",a:3.5,s:"(1+…+6)/6 = 3.5",m:1},
      {q:"You roll a die and are paid the square of the face. Fair price?",a:91/6,s:"(1+4+9+16+25+36)/6 = 91/6 ≈ 15.17",m:2},
      {q:"Roll two dice, paid the maximum. Expected payout?",a:161/36,s:"P(max=k) = (2k−1)/36 → Σk(2k−1)/36 = 161/36 ≈ 4.47",m:3},
      {q:"Roll a die, paid face value. You may reroll once (must take the reroll). Optimal EV?",a:4.25,s:"Keep 4,5,6 (avg 5) else reroll for 3.5 → ½·5 + ½·3.5 = 4.25",m:3},
      {q:"Same game, but you may reroll up to twice. Optimal EV?",a:14/3,s:"With one reroll left the game is worth 4.25 → keep 5,6: (2/6)·5.5 + (4/6)·4.25 = 4.667",m:4},
      {q:"Roll two dice, paid the product. Expected payout?",a:12.25,s:"Independent → E[X]E[Y] = 3.5² = 12.25",m:2},
      {q:"Roll two dice, paid |difference|. Expected payout?",a:35/18,s:"Σ|i−j|/36 = 70/36 ≈ 1.944",m:4},
      {q:"Flip a fair coin until tails; paid £ number of heads seen. EV?",a:1,s:"Heads count is geometric(½) on {0,1,…} → mean 1",m:3},
    ].filter(x=>x.m<=L+1));return{q:t.q,ans:t.a,tol:{abs:0.01},sol:t.s}}},
  linearity:{label:"Linearity of expectation",min:3,gen(L){
    const n=ri(3,10);
    const t=pick([
      {q:`Shuffle ${n} labelled letters into ${n} envelopes at random. Expected number in the right envelope?`,a:1,s:"Each has 1/n chance; n·(1/n) = 1"},
      {q:`Roll a die ${n} times. Expected number of distinct faces seen?`,a:6*(1-(5/6)**n),s:`6·(1 − (5/6)^${n}) = ${r4(6*(1-(5/6)**n))}`},
      {q:`Flip ${n} coins in a row. Expected number of HH adjacent pairs?`,a:(n-1)/4,s:`${n-1} adjacent pairs × 1/4 = ${r4((n-1)/4)}`},
    ]);return{q:t.q,ans:t.a,tol:{abs:0.01},sol:t.s}}},
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
 stats:{name:"Statistics",subs:{
  binom:{label:"Binomial mean / variance",min:1,gen(L){
    const n=ri(10,100),p=pick([0.1,0.2,0.25,0.4,0.5,0.6]);const v=Math.random()<.5;
    return{q:`X ~ Bin(${n}, ${p}). ${v?"Var(X)":"E[X]"}?`,ans:r4(v?n*p*(1-p):n*p),tol:{abs:0.01},sol:v?`np(1−p) = ${r4(n*p*(1-p))}`:`np = ${r4(n*p)}`}}},
  dicevar:{label:"Variance of dice",min:2,gen(L){
    const n=ri(1,L+2);const sd=L>=4&&Math.random()<.5;const v=n*35/12;
    return{q:`Roll ${n} fair ${n>1?"dice":"die"}. ${sd?"SD":"Variance"} of the total?`,ans:sd?Math.sqrt(v):v,tol:{abs:0.01},sol:`Var(one die) = 35/12; total = ${n}·35/12 = ${r4(v)}${sd?`; SD = √ = ${r4(Math.sqrt(v))}`:""}`}}},
  uniform:{label:"Uniform & order statistics",min:3,gen(L){
    const t=pick([
      ()=>{const a=ri(0,5),b=a+ri(2,12);return{q:`X ~ U(${a}, ${b}). Var(X)?`,ans:(b-a)**2/12,s:`(b−a)²/12 = ${r4((b-a)**2/12)}`}},
      ()=>({q:"X, Y ~ U(0,1) independent. E[max(X,Y)]?",ans:2/3,s:"E[max of n] = n/(n+1) = 2/3"}),
      ()=>{const n=ri(2,9);return{q:`${n} independent U(0,1) draws. E[minimum]?`,ans:1/(n+1),s:`1/(n+1) = ${r4(1/(n+1))}`}},
      ()=>({q:"X, Y ~ U(0,1) independent. P(X + Y < 1/2)?",ans:1/8,s:"Triangle area ½·(½)² = 1/8"}),
    ]);const o=t();return{q:o.q,ans:o.ans,tol:{abs:0.005},sol:o.s}}},
  normal:{label:"Normal distribution",min:3,gen(L){
    const t=pick([[1,0.8413],[1.645,0.95],[1.96,0.975],[2,0.9772],[-1,0.1587],[-2,0.0228],[3,0.99865]]);
    const mu=ri(50,120),sg=ri(2,15);
    return{q:`X ~ N(${mu}, ${sg}²). P(X < ${r4(mu+t[0]*sg)})?`,ans:t[1],tol:{abs:0.005},sol:`z = ${t[0]} → Φ(${t[0]}) ≈ ${t[1]}`}}},
 }},
};
/* Estimation questions for market making (true values) */
const FERMI=[
 ["Height of the Eiffel Tower (m)",330],["Height of Mount Everest (m)",8849],["Earth's equatorial circumference (km)",40075],
 ["Speed of sound in air at 20°C (m/s)",343],["Bones in the adult human body",206],["Year the Bank of England was founded",1694],
 ["UN member states",193],["Seconds in a day",86400],["Keys on a standard piano",88],["Mean Earth–Moon distance (km)",384400],
 ["Speed of light (km/s)",299792],["Length of the River Thames (km)",346],["London Underground stations",272],
 ["Height of the Shard (m)",310],["Squares of all sizes on a chessboard",204],["2^30",1073741824],["13!",6227020800],
 ["√2026",45.01],["e^5",148.41],["ln(1000)",6.908],["1.05^20",2.653],["Primes below 1000",168],["Earth's diameter (km)",12742],
 ["Marathon distance (km)",42.195],["17 × 23 × 31",12121],["7^7",823543],["Year Imperial College was founded",1907],
 ["Light travel time from Sun to Earth (s)",499],["Days in 10 years incl. leap days (typical decade)",3652],["Number of ways to choose 6 from 49",13983816],
];
const SKILL_ORDER=["arith","prob","ev","seq","stats","mm"];
const SKILL_NAME={...Object.fromEntries(Object.entries(SKILLS).map(([k,v])=>[k,v.name])),mm:"Market making"};
const LVL_NAME=["","Warm-up","Foundation","Interview","Hard","Desk-ready"];

/* ---------- state ---------- */
function blankState(){return{v:1,ratings:Object.fromEntries(SKILL_ORDER.map(k=>[k,950])),subs:{},mistakes:[],days:{},games:{sprint:{best:0,hist:[]},mm:{best:0,hist:[]},ladder:{best:0,hist:[]}},updated:null}}
let S=blankState();
let DAY={date:todayKey(),attempts:[]};
let db=null,storeMode="none",PLAN=null,READY=false;

function levelFor(skill){return clamp(1+Math.floor((S.ratings[skill]-800)/120),1,5)}
function subStat(key){return S.subs[key]||(S.subs[key]={n:0,c:0,ms:0,last:null})}
function accOf(st){return(st.c+1)/(st.n+2)}
function daysSince(d){if(!d)return 14;return Math.max(0,(Date.parse(todayKey())-Date.parse(d))/864e5)}

function pickSub(skill,L){
  const subs=Object.entries(SKILLS[skill].subs).filter(([k,s])=>s.min<=L);
  const w=subs.map(([k])=>{const st=subStat(skill+"."+k);return 1+2.5*(1-accOf(st))+0.25*Math.min(daysSince(st.last),6)});
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<subs.length;i++){r-=w[i];if(r<=0)return subs[i][0]}return subs[0][0];
}
function makeQ(skill,sub,L){
  if(skill==="mm"){const f=pick(FERMI);return{skill:"mm",sub:"fermi",L:3,q:f[0],ans:f[1],mm:true,sol:`True value: ${fmt(f[1])}`}}
  L=L||levelFor(skill);if(Math.random()<.25)L=clamp(L+pick([-1,1]),1,5);
  sub=sub||pickSub(skill,L);
  const s=SKILLS[skill].subs[sub];L=Math.max(L,s.min);
  return{skill,sub,L,...s.gen(L)};
}
function skillWeight(k){
  if(k==="mm")return 0;
  const r=S.ratings[k];const subs=Object.keys(SKILLS[k].subs).map(s=>subStat(k+"."+s));
  const n=subs.reduce((a,s)=>a+s.n,0),c=subs.reduce((a,s)=>a+s.c,0);
  const last=subs.map(s=>s.last).filter(Boolean).sort().pop();
  return 1+Math.max(0,(1250-r)/150)+3*(1-(c+1)/(n+2))+0.3*Math.min(daysSince(last),7);
}
function buildDaily(){
  const qs=[];
  const review=S.mistakes.filter(m=>m.skill!=="mm").slice(0,3);
  for(const m of review){const q=m.qobj?{...m.qobj}:makeQ(m.skill,m.sub,m.L);q.review=m.id;qs.push(q)}
  if(PLAN&&Array.isArray(PLAN.questions)&&S.planDone!==PLAN.id){for(const pq of PLAN.questions.slice(0,6)){const q=planQ(pq);if(q)qs.push(q)}}
  const ks=SKILL_ORDER.filter(k=>k!=="mm");
  while(qs.length<9){const w=ks.map(skillWeight);let r=Math.random()*w.reduce((a,b)=>a+b,0);let k=ks[0];for(let i=0;i<ks.length;i++){r-=w[i];if(r<=0){k=ks[i];break}}qs.push(makeQ(k))}
  qs.push(makeQ("mm"));
  return qs;
}
function planQ(pq){
  if(!pq||typeof pq.q!=="string")return null;
  const skill=SKILL_ORDER.includes(pq.skill)?pq.skill:"prob";
  const mm=!!pq.mm;const ans=Number(pq.ans);if(!isFinite(ans))return null;
  return{skill,sub:mm?"fermi":"coach",L:clamp(Number(pq.L)||2,1,5),q:String(pq.q).slice(0,500),ans,mm,custom:!mm,
    tol:pq.tol&&typeof pq.tol==="object"?{abs:Number(pq.tol.abs)||0,rel:Number(pq.tol.rel)||0}:{abs:1e-6,rel:1e-6},
    sol:String(pq.sol||"").slice(0,800),unit:Number(pq.unit)||0,secs:Number(pq.secs)||0,src:typeof pq.src==="string"?pq.src.slice(0,300):"",label:String(pq.label||"Coach question").slice(0,40),fromPlan:true};
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
const TARGETS={arith:[6,8,12,15,20],seq:[15,20,25,30,40],prob:[20,30,45,60,90],ev:[20,30,45,60,90],stats:[20,30,45,60,90],mm:[30,30,30,40,45]};
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
  const exp=1/(1+10**((D-r)/400));
  const res=q.mm?score/100:(ok?(ms<=targetSecs(q)*1000?1:0.85):0);
  S.ratings[q.skill]=Math.round(r+28*(res-exp));
  const day=S.days[todayKey()]||(S.days[todayKey()]={n:0,c:0,daily:false});day.n++;if(ok)day.c++;day.r={...S.ratings};
  if(!ok&&!q.mm&&!q.review){S.mistakes.unshift({...(q.custom?{qobj:{skill:q.skill,sub:q.sub,L:q.L,q:q.q,ans:q.ans,tol:q.tol,sol:q.sol,label:q.label,custom:true}}:{}),id:Date.now().toString(36)+ri(0,999),skill:q.skill,sub:q.sub,L:q.L,q:q.q,ans:r4(q.ans),given:String(given).slice(0,40),sol:q.sol,t:todayKey(),fixes:0});S.mistakes=S.mistakes.slice(0,60)}
  if(q.review){const m=S.mistakes.find(m=>m.id===q.review);if(m){if(ok){m.fixes++;if(m.fixes>=2)S.mistakes=S.mistakes.filter(x=>x!==m)}else m.fixes=0}}
  if(q.mm&&score<40){S.mistakes=S.mistakes.filter(m=>m.skill!=="mm"||m.q!==q.q);S.mistakes.push({id:Date.now().toString(36),skill:"mm",sub:"fermi",L:3,q:q.q,ans:q.ans,given:String(given),sol:q.sol,t:todayKey(),fixes:0})}
  if(q.unit){const u=(S.units=S.units||{})[q.unit]||(S.units[q.unit]={a:0,c:0});u.a++;if(ok)u.c++;u.last=todayKey()}
  DAY.attempts.push({t:new Date().toISOString().slice(11,19),skill:q.skill,sub:q.sub,L:q.L,ok,ms,q:q.q.slice(0,160),ans:r4(q.ans),given:String(given).slice(0,40),...(q.mm?{score}:{})});
  DAY.attempts=DAY.attempts.slice(-300);
  queueSave();renderStrip();
}

/* ---------- persistence (browser only) ---------- */
let saveTimer=null;
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(lsSave,400)}
function lsSave(){S.updated=new Date().toISOString();
  const ks=Object.keys(S.days).sort();if(ks.length>150)for(const k of ks.slice(0,ks.length-150))delete S.days[k];
  try{localStorage.setItem("qd_state",JSON.stringify(S));localStorage.setItem("qd_day",JSON.stringify(DAY))}catch(e){}}
function mergeState(x){if(!x)return;const b=blankState();S={...b,...x,ratings:{...b.ratings,...(x.ratings||{})},games:{...b.games,...(x.games||{})}}}
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

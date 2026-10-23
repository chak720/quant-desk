"use strict";
/* Quant Desk: options visualiser and probability simulators (Labs sub-tabs). Uses labs.js chart helpers. */

/* ---------- options visualiser ---------- */
const OPT_PRESETS={
  "Long call":[{t:"call",k:0,q:1}],"Long put":[{t:"put",k:0,q:1}],"Short put":[{t:"put",k:0,q:-1}],
  "Straddle":[{t:"call",k:0,q:1},{t:"put",k:0,q:1}],"Strangle":[{t:"call",k:10,q:1},{t:"put",k:-10,q:1}],
  "Bull call spread":[{t:"call",k:-5,q:1},{t:"call",k:5,q:-1}],"Bear put spread":[{t:"put",k:5,q:1},{t:"put",k:-5,q:-1}],
  "Butterfly":[{t:"call",k:-10,q:1},{t:"call",k:0,q:-2},{t:"call",k:10,q:1}],"Iron condor":[{t:"put",k:-20,q:1},{t:"put",k:-10,q:-1},{t:"call",k:10,q:-1},{t:"call",k:20,q:1}],
  "Covered call":[{t:"stock",k:0,q:1},{t:"call",k:10,q:-1}],"Protective put":[{t:"stock",k:0,q:1},{t:"put",k:-10,q:1}],
};
function impliedVol(type,price,S,K,T,r){
  let lo=0.001,hi=5;const f=s=>bs(type,S,K,s,T,r).price-price;
  if(f(lo)>0||f(hi)<0)return NaN;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(f(m)>0)hi=m;else lo=m}return(lo+hi)/2;
}
function renderOptions(host){
  let legs=OPT_PRESETS["Long call"].map(l=>({...l})),greek="delta",preset="Long call";
  host.innerHTML=`<div class="card stack"><h3>Options visualiser</h3><h2>Black–Scholes, the Greeks and any strategy you can build</h2>
    <p class="muted measure">Set the market, then build a position from calls, puts and stock. The top chart shows its value today, halfway to expiry and at expiry. The second chart shows how a Greek changes with the stock price. Strikes are set relative to the centre strike K.</p>
    <div class="controls">${slider("vS","Stock price S",50,150,0.5,100)}${slider("vK","Centre strike K",60,140,1,100)}${slider("vv","Volatility σ",0.05,1,0.01,0.25,x=>pctf(x,0))}${slider("vt","Days to expiry",1,730,1,90)}${slider("vr","Interest rate r",0,0.1,0.0025,0.04,x=>pctf(x,2))}</div>
    <div class="row" role="group" aria-label="Preset strategies">${Object.keys(OPT_PRESETS).map(k=>`<button class="btn ghost chip" data-pre="${esc(k)}" aria-pressed="${k===preset}">${esc(k)}</button>`).join("")}</div>
    <div class="legs" id="vlegs"></div>
    <div class="stats" id="vst"></div>
    <div id="vch"></div>
    <div class="row" role="group" aria-label="Greek to chart">${["delta","gamma","vega","theta"].map(g=>`<button class="btn ghost chip" data-gk="${g}" aria-pressed="${g===greek}">${g[0].toUpperCase()+g.slice(1)}</button>`).join("")}</div>
    <div id="vgk"></div>
    <div class="cols2">
      <div class="stack"><h3>Single option breakdown</h3><p class="muted small">One option at the centre strike.</p><div class="row" role="group" aria-label="Option type"><button class="btn ghost chip" data-ty="call" aria-pressed="true">Call</button><button class="btn ghost chip" data-ty="put" aria-pressed="false">Put</button></div><table class="kv" id="vtab"></table></div>
      <div class="stack"><h3>Implied volatility</h3><p class="muted small">Type a market price for the centre-strike option and solve for the σ that makes Black–Scholes match it.</p>
        <label class="form" for="vivp">Market price<input type="text" id="vivp" inputmode="decimal" autocomplete="off" placeholder="e.g. 6.50"></label><p id="vivo" class="small" role="status"></p></div></div>
    <details class="maths"><summary>Show the maths</summary><pre>${esc(`d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)      d2 = d1 − σ√T
Call = S·N(d1) − K·e^(−rT)·N(d2)
Put  = K·e^(−rT)·N(−d2) − S·N(−d1)
Put–call parity: C − P = S − K·e^(−rT)

Delta  ∂V/∂S    call N(d1), put N(d1) − 1
Gamma  ∂²V/∂S²  N'(d1) / (S·σ·√T)        same for calls and puts
Vega   ∂V/∂σ    S·N'(d1)·√T              shown per 1 vol point
Theta  ∂V/∂t    shown per calendar day
Rho    ∂V/∂r    shown per 1% move in rates

Implied vol has no closed form, so it is found by bisection:
keep halving the σ interval until the model price matches.`)}</pre></details>
    <div class="lsec"><b>Try this</b><ul>
      <li>Gamma peaks at the strike and grows as expiry nears. Drag days to expiry down to 5 and watch the spike.</li>
      <li>Build a straddle: delta is near zero at the strike but gamma and vega are large. You're long volatility, not direction.</li>
      <li>Short put vs covered call: compare the expiry payoffs. They're the same shape (put–call parity).</li>
      <li>Set S = K, r = 0, 365 days, σ = 20%. The call is worth about 0.4 × S × σ√T = 8.</li></ul></div>
    <div class="stack"><h3>Intuition check</h3><p class="muted small">Five quick options questions an interviewer might ask, scored with feedback. Estimates within about 5–10% count.</p>
      <div class="row"><button class="btn accent" id="voq">Test my options intuition</button>${reportLink("Options visualiser")}</div><div id="voqhost"></div></div></div>`;
  const vch=chartBox(host.querySelector("#vch"),"Position value against stock price"),vgk=chartBox(host.querySelector("#vgk"),"Greek against stock price");
  let ty="call";
  const ids=["vS","vK","vv","vt","vr"];const fm=[null,null,x=>pctf(x,0),null,x=>pctf(x,2)];
  const legsUI=()=>{host.querySelector("#vlegs").innerHTML=`<table class="legtbl"><thead><tr><th>Leg</th><th>Strike offset</th><th>Quantity</th><th></th></tr></thead><tbody>${legs.map((l,i)=>`<tr>
      <td><select data-i="${i}" data-f="t" aria-label="Leg ${i+1} type">${["call","put","stock"].map(t=>`<option ${t===l.t?"selected":""}>${t}</option>`).join("")}</select></td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-f="k" value="${l.k}" ${l.t==="stock"?"disabled":""} aria-label="Leg ${i+1} strike offset"></td>
      <td><input type="text" inputmode="decimal" data-i="${i}" data-f="q" value="${l.q}" aria-label="Leg ${i+1} quantity, negative to sell"></td>
      <td><button class="btn ghost chip" data-del="${i}" aria-label="Remove leg ${i+1}">Remove</button></td></tr>`).join("")}</tbody></table>
      <div class="row"><button class="btn ghost chip" id="vadd">Add leg</button><span class="muted small">Quantity below zero means you sold it.</span></div>`;
    host.querySelectorAll("#vlegs [data-f]").forEach(el=>el.addEventListener("change",()=>{const l=legs[+el.dataset.i];const v=el.dataset.f==="t"?el.value:Number(el.value);if(el.dataset.f!=="t"&&!isFinite(v))return;l[el.dataset.f]=v;preset=null;mark();legsUI();draw()}));
    host.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{legs.splice(+b.dataset.del,1);preset=null;mark();legsUI();draw()});
    host.querySelector("#vadd").onclick=()=>{legs.push({t:"call",k:0,q:1});preset=null;mark();legsUI();draw()};};
  const mark=()=>host.querySelectorAll("[data-pre]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.pre===preset)));
  const get=wireSliders(host,ids,fm,()=>draw());
  function draw(){
    const {vS:S,vK:K,vv:sig,vt:days,vr:r}=get(),T=days/365;
    const val=(s,t)=>legs.reduce((a,l)=>a+l.q*(l.t==="stock"?s:bs(l.t,s,K+l.k,sig,t,r).price),0);
    const gr=(s,t,g)=>legs.reduce((a,l)=>a+l.q*(l.t==="stock"?(g==="delta"?1:0):bs(l.t,s,K+l.k,sig,t,r)[g]),0);
    const xs=Array.from({length:161},(_,i)=>K*0.5+i*K/160),cost=val(S,T);
    const lines=[[T,"s1",`Today (${days} days)`],[T/2,"s3",`Halfway (${Math.round(days/2)} days)`],[0,"s2","At expiry"]];
    const ser=lines.map(([t,cls,label])=>({pts:xs.map(x=>[x,val(x,t)-cost]),cls,label}));const ys=ser.flatMap(s=>s.pts.map(p=>p[1]));
    const pad=(Math.max(...ys)-Math.min(...ys))*0.08+0.5;
    chart(vch,{h:260,xr:[xs[0],xs[xs.length-1]],yr:[Math.min(...ys)-pad,Math.max(...ys)+pad],xlabel:"stock price · P&L against today's value",series:ser,refY:[{y:0}],refX:[{x:S,label:"S now"}],dots:[{x:S,y:0,cls:"s1"}],
      snap:x=>Math.round(x*2)/2,tip:x=>`<b>S = ${x}</b><br>Today ${f2(val(x,T)-cost)}<br>Halfway ${f2(val(x,T/2)-cost)}<br>Expiry ${f2(val(x,0)-cost)}`});
    const gser=lines.slice(0,2).concat([[Math.max(T/8,1/365),"s2",`${Math.max(1,Math.round(days/8))} days left`]]).map(([t,cls,label])=>({pts:xs.map(x=>[x,gr(x,t,greek)]),cls,label}));
    const gy=gser.flatMap(s=>s.pts.map(p=>p[1]).filter(isFinite));const gp=(Math.max(...gy)-Math.min(...gy))*0.08||0.01;
    chart(vgk,{h:200,xr:[xs[0],xs[xs.length-1]],yr:[Math.min(...gy,0)-gp,Math.max(...gy,0)+gp],xlabel:`stock price · position ${greek}`,series:gser,refY:[{y:0}],refX:[{x:S,label:"S now"}],
      snap:x=>Math.round(x*2)/2,tip:x=>{const i=clamp(Math.round((x-xs[0])/(K/160)),0,xs.length-1);return`<b>S = ${x} · ${greek}</b><br>${gser.map(s=>`${esc(s.label)}: ${s.pts[i][1].toFixed(greek==="gamma"?4:3)}`).join("<br>")}`}});
    const be=[];const ex=xs.map(x=>val(x,0)-cost);for(let i=1;i<xs.length;i++)if(Math.sign(ex[i])!==Math.sign(ex[i-1])&&ex[i-1]!==0)be.push(f2(xs[i-1]+(xs[i]-xs[i-1])*(-ex[i-1])/(ex[i]-ex[i-1])));
    host.querySelector("#vst").innerHTML=stat("Position value",f2(cost))+stat("Delta",f2(gr(S,T,"delta")))+stat("Gamma",gr(S,T,"gamma").toFixed(4))+stat("Vega / vol pt",f2(gr(S,T,"vega")))+stat("Theta / day",f2(gr(S,T,"theta")))+stat("Breakevens at expiry",be.length?be.join(", "):"none in range");
    const o=bs(ty,S,K,sig,T,r),other=bs(ty==="call"?"put":"call",S,K,sig,T,r),C=ty==="call"?o.price:other.price,P=ty==="call"?other.price:o.price,intr=ty==="call"?Math.max(S-K,0):Math.max(K-S,0);
    host.querySelector("#vtab").innerHTML=[["Price",f2(o.price)],["Intrinsic value",f2(intr)],["Time value",f2(o.price-intr)],["d1 / d2",`${f2(o.d1)} / ${f2(o.d2)}`],["N(d1) / N(d2)",`${Ncdf(o.d1).toFixed(3)} / ${Ncdf(o.d2).toFixed(3)}`],["Delta",o.delta.toFixed(3)],["Gamma",o.gamma.toFixed(4)],["Vega (per vol pt)",f2(o.vega)],["Theta (per day)",o.theta.toFixed(3)],["Rho (per 1%)",o.rho.toFixed(3)],["Parity: C − P",f2(C-P)],["Parity: S − Ke^(−rT)",f2(S-K*Math.exp(-r*T))]].map(([k,v])=>`<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("");
    const p=parseNum(host.querySelector("#vivp").value);const ivo=host.querySelector("#vivo");
    if(isFinite(p)&&p>0){const iv=impliedVol(ty,p,S,K,T,r);ivo.textContent=isFinite(iv)?`Implied volatility for a ${ty} at ${f2(p)}: ${pctf(iv,1)}. Your slider σ gives ${f2(o.price)}.`:`No volatility gives that price. A ${ty} here must be worth between ${f2(Math.max(0,ty==="call"?S-K*Math.exp(-r*T):K*Math.exp(-r*T)-S))} and ${f2(ty==="call"?S:K*Math.exp(-r*T))}.`}else ivo.textContent="";
  }
  host.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{preset=b.dataset.pre;legs=OPT_PRESETS[preset].map(l=>({...l}));mark();legsUI();draw()});
  host.querySelectorAll("[data-gk]").forEach(b=>b.onclick=()=>{greek=b.dataset.gk;host.querySelectorAll("[data-gk]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));draw()});
  host.querySelectorAll("[data-ty]").forEach(b=>b.onclick=()=>{ty=b.dataset.ty;host.querySelectorAll("[data-ty]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));draw()});
  host.querySelector("#vivp").addEventListener("input",draw);
  host.querySelector("#voq").onclick=()=>{const h=host.querySelector("#voqhost");runner(h,{questions:optionQuiz(),title:"Options intuition",onDone:items=>{
    const right=items.filter(x=>x.ok).length;h.innerHTML=`<div class="card stack qin"><h3>Options intuition</h3><div class="big tabular">${right}/${items.length}</div>${reviewHTML(items,{title:"Your feedback",drill:false})}<div class="row"><button class="btn accent" id="voq2">Try another five</button></div></div>`;
    h.querySelector("#voq2").onclick=()=>host.querySelector("#voq").click()}});h.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"})};
  legsUI();draw();
}
/* generated options questions: numbers change each time, answers come from Black–Scholes */
function optionQuiz(){
  const T=[
    ()=>{const S=pick([50,80,100,150,200]),sg=pick([0.15,0.2,0.3,0.4]),m=pick([3,6,12]),t=m/12,a=bs("call",S,S,sg,t).price;
      return{q:`Stock ${S}, at-the-money call, ${pctf(sg,0)} volatility, ${m} months, zero rates. Estimate the call price.`,ans:a,tol:{rel:0.08},sol:`Rule of thumb 0.4·S·σ·√T = 0.4 × ${S} × ${sg} × √${r4(t)} ≈ ${f2(0.4*S*sg*Math.sqrt(t))}. Black–Scholes: ${f2(a)}.`}},
    ()=>{const S=100,K=pick([80,90,100,110,120]),sg=0.25,t=0.5,d=bs("call",S,K,sg,t).delta;
      return{q:`Stock 100, call strike ${K}, 25% volatility, 6 months, zero rates. Roughly what's the call's delta? (decimal)`,ans:d,tol:{abs:0.06},sol:`N(d1) = ${d.toFixed(3)}. At the money it's a bit above 0.5; deep in the money it approaches 1, far out of the money 0.`}},
    ()=>{const S=pick([95,100,105,110]),K=100,C=ri(6,14);
      return{q:`Zero rates. Stock ${S}, the 100-strike call costs ${C}. What does the 100-strike put cost?`,ans:C-S+K,tol:{abs:0.01},sol:`Put–call parity: P = C − S + K = ${C} − ${S} + 100 = ${C-S+K}.`}},
    ()=>{const S=pick([100,200]),sg=pick([0.2,0.3]),t=pick([0.25,1]),a=bs("call",S,S,sg,t).price+bs("put",S,S,sg,t).price;
      return{q:`Estimate the price of an at-the-money straddle: stock ${S}, volatility ${pctf(sg,0)}, ${t===1?"1 year":"3 months"}, zero rates.`,ans:a,tol:{rel:0.08},sol:`Two ATM options: about 0.8·S·σ·√T = ${f2(0.8*S*sg*Math.sqrt(t))}. Black–Scholes: ${f2(a)}.`}},
    ()=>{const S=pick([100,250]),t=pick([0.25,1]),v=bs("call",S,S,0.2,t).vega;
      return{q:`Stock ${S}, at-the-money option, ${t===1?"1 year":"3 months"} to expiry. Roughly how much does its price change for a 1 point rise in volatility?`,ans:v,tol:{rel:0.1},sol:`ATM vega ≈ 0.4·S·√T / 100 = ${f2(0.4*S*Math.sqrt(t)/100)} per vol point. Black–Scholes: ${f2(v)}.`}},
    ()=>{const S=100,k=pick([2,4,9]),a=bs("call",S,S,0.2,1).price/Math.sqrt(k);
      return{q:`A 1-year at-the-money call is worth 7.97. Roughly what's the same option worth with 1/${k} of the time left?`,ans:a,tol:{rel:0.06},sol:`ATM value scales with √T: 7.97 / √${k} ≈ ${f2(a)}.`}},
  ];
  return [...T].sort(()=>Math.random()-.5).slice(0,5).map(f=>({skill:"fin",sub:"options",L:3,label:"Options intuition",custom:true,secs:45,...f()}));
}

/* ---------- probability simulators ----------
   Each puzzle: predict, run a Monte Carlo simulation that converges on screen, compare with the exact answer. */
const SIMS=[
{id:"monty",title:"Monty Hall",ask:"You pick one of three doors. The host, who knows where the car is, opens a different door with a goat and offers a switch. If you always switch, what's your chance of winning? (decimal)",
 truth:()=>2/3,fmtv:x=>f2(x),
 solution:"Your first pick is right 1/3 of the time. The host never reveals the car, so his choice adds no information about your door: it stays at 1/3. The remaining 2/3 sits entirely on the other closed door. Switching wins 2/3 of the time.",
 params:"",
 trial:()=>{const car=ri(0,2),pick=ri(0,2);return pick!==car?1:0},
 extra(host){
   let st={};host.innerHTML=`<div class="doors" role="group" aria-label="Doors"></div><p class="small" id="mhmsg">Pick a door.</p><div class="row"><span class="muted small" id="mhscore"></span></div>`;
   const sc={sw:[0,0],st:[0,0]};
   const reset=()=>{st={car:ri(0,2),pick:null,open:null,done:false};draw();host.querySelector("#mhmsg").textContent="Pick a door."};
   const draw=()=>{host.querySelector(".doors").innerHTML=[0,1,2].map(i=>{const open=st.open===i||st.done;return`<button class="door ${st.pick===i?"picked":""} ${open?"open":""}" data-d="${i}" ${st.done||st.open===i?"disabled":""} aria-label="Door ${i+1}${open?(i===st.car?", car":", goat"):""}">${open?(i===st.car?"Car":"Goat"):`Door ${i+1}`}</button>`}).join("");
     host.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>choose(+b.dataset.d));
     host.querySelector("#mhscore").textContent=`You, switching: ${sc.sw[0]}/${sc.sw[1]} · staying: ${sc.st[0]}/${sc.st[1]}`};
   const choose=i=>{const m=host.querySelector("#mhmsg");
     if(st.pick===null){st.pick=i;const opts=[0,1,2].filter(d=>d!==i&&d!==st.car);st.open=pick(opts);draw();m.textContent=`The host opens door ${st.open+1}: a goat. Click your door to stay, or the other closed door to switch.`;return}
     const sw=i!==st.pick,win=i===st.car;sc[sw?"sw":"st"][1]++;if(win)sc[sw?"sw":"st"][0]++;st.done=true;st.pick=i;draw();
     m.innerHTML=`You ${sw?"switched":"stayed"} and ${win?"won the car":"got a goat"}. <button class="btn ghost chip" id="mhagain">Play again</button>`;host.querySelector("#mhagain").onclick=reset};
   reset();
 },
 trial2:()=>{const car=ri(0,2),pick=ri(0,2);return pick===car?1:0},label:"Switch wins",label2:"Stay wins"},

{id:"coupon",title:"Coupon collector",ask:"How many rolls of a fair die, on average, until you've seen all six faces?",
 truth:p=>p.n*Array.from({length:p.n},(_,i)=>1/(i+1)).reduce((a,b)=>a+b,0),fmtv:x=>f2(x),
 params:`n`,paramUI:()=>slider("cn","Number of distinct coupons n",2,50,1,6),readP:h=>({n:Number(h.querySelector("#cn").value)}),
 solution:"After collecting k distinct coupons, each draw is new with probability (n − k)/n, so the wait is geometric with mean n/(n − k). Add the waits: n(1/n + 1/(n−1) + … + 1/1) = n·Hₙ. For a die, 6 × 2.45 = 14.7. The last coupon alone takes n draws on average, which is why the tail is long.",
 trial:p=>{const seen=new Set();let k=0;while(seen.size<p.n){seen.add(ri(1,p.n));k++}return k},hist:true},

{id:"ruin",title:"Gambler's ruin",ask:"You start with £10 and bet £1 at a time on a fair coin until you reach £20 or go broke. Probability you reach £20? (decimal)",
 truth:p=>{const q=1-p.p;return Math.abs(p.p-.5)<1e-9?p.i/p.N:(1-(q/p.p)**p.i)/(1-(q/p.p)**p.N)},fmtv:x=>f2(x),
 paramUI:()=>slider("gi","Starting £",1,49,1,10)+slider("gN","Target £",5,50,1,20)+slider("gp","P(win each bet)",0.4,0.6,0.01,0.5,x=>f2(x)),
 readP:h=>{let i=Number(h.querySelector("#gi").value),N=Number(h.querySelector("#gN").value);if(i>=N)i=N-1;return{i,N,p:Number(h.querySelector("#gp").value)}},
 solution:"Let Pᵢ be the chance of reaching N from £i. Then Pᵢ = p·Pᵢ₊₁ + q·Pᵢ₋₁ with P₀ = 0 and P_N = 1. For a fair coin the solution is linear: Pᵢ = i/N. Otherwise Pᵢ = (1 − (q/p)ⁱ)/(1 − (q/p)ᴺ). A small edge against you is brutal: at p = 0.49, starting with £10 for £20, you win only about 40% of the time. This is why the casino always wins over many bets.",
 trial:p=>{let x=p.i,n=0;while(x>0&&x<p.N&&n<1e5){x+=Math.random()<p.p?1:-1;n++}return x>=p.N?1:0},paths:true},

{id:"birthday",title:"Birthday problem",ask:"In a room of 23 people, what's the probability at least two share a birthday? (decimal)",
 truth:p=>{let q=1;for(let j=0;j<p.k;j++)q*=(365-j)/365;return 1-q},fmtv:x=>f2(x),
 paramUI:()=>slider("bk","People in the room",2,80,1,23),readP:h=>({k:Number(h.querySelector("#bk").value)}),
 solution:"Count the complement: everyone different. The second person avoids the first with probability 364/365, the third avoids both with 363/365, and so on. P(all different) = ∏(365 − j)/365 for j = 0…k−1. At 23 people that's 0.493, so a shared birthday is more likely than not. The intuition: 23 people form 253 pairs.",
 trial:p=>{const s=new Set();for(let j=0;j<p.k;j++){const b=ri(1,365);if(s.has(b))return 1;s.add(b)}return 0}},

{id:"pattern",title:"Waiting for HH vs HT",ask:"Flip a fair coin until you see two heads in a row (HH). Expected number of flips?",
 truth:p=>{const s=p.pat;let e=0;for(let k=1;k<=s.length;k++)if(s.slice(0,k)===s.slice(s.length-k))e+=2**k;return e},fmtv:x=>f2(x),
 paramUI:()=>`<label class="sl" for="pp"><span>Pattern</span><select id="pp">${["HH","HT","HHH","HTH","HHT","THH"].map(x=>`<option>${x}</option>`).join("")}</select></label>`,readP:h=>({pat:h.querySelector("#pp").value}),
 solution:"HT and HH look equally likely but HH takes longer: 6 flips vs 4. After a miss on HT (an H then H), you still have the H you need. After a miss on HH (H then T), you're back to the start. A neat formula: add 2ᵏ for every k where the first k letters of the pattern equal its last k letters. HH: 2 + 4 = 6. HT: 4. HTH: 2 + 8 = 10.",
 trial:p=>{let s="",n=0;while(!s.endsWith(p.pat)){s=(s+(Math.random()<.5?"H":"T")).slice(-p.pat.length);n++}return n},hist:true},

{id:"stick",title:"Broken stick triangle",ask:"Break a stick at two uniformly random points. Probability the three pieces form a triangle? (decimal)",
 truth:()=>0.25,fmtv:x=>f2(x),
 solution:"The pieces form a triangle when every piece is shorter than half the stick. With break points x and y uniform on the unit square, the bad regions (one piece ≥ ½) cover three quarters of the square, leaving 1/4. Drawing the square and shading the regions is the fastest interview approach.",
 trial:()=>{const a=Math.random(),b=Math.random(),x=Math.min(a,b),y=Math.max(a,b);return x<.5&&y-x<.5&&1-y<.5?1:0}},

{id:"pi",title:"Estimating π with random points",ask:"Throw points uniformly into a square around a circle. What fraction land inside the circle? (decimal)",
 truth:()=>Math.PI/4,fmtv:x=>x.toFixed(4),
 solution:"The circle's area is πr² and the square's is (2r)² = 4r², so the fraction inside is π/4 ≈ 0.785. Multiply the simulated fraction by 4 to estimate π. The error shrinks like 1/√n: 100 times more points buys only one more correct digit. That's the fundamental cost of Monte Carlo, and the same reason option prices from simulation need many paths.",
 trial:()=>{const x=Math.random()*2-1,y=Math.random()*2-1;return x*x+y*y<=1?1:0},scatter:true},
];
const SIM_TRAPS={monty:"The usual trap is 1/2: two doors left feels like a coin flip, but the host's choice isn't random.",
 coupon:"Most people underestimate: the last few coupons take by far the longest.",ruin:"For a fair game the answer is simply start ÷ target. A small edge against you makes it fall fast.",
 birthday:"Intuition compares everyone with yourself (23/365). The real count is pairs: 23 people make 253.",pattern:"HH and HT feel symmetric, but a failed HH attempt can send you back to the start.",
 stick:"Many guess 1/2. Drawing the unit square and shading the bad regions gets it in seconds.",pi:"It's a ratio of areas: circle over square, πr² ÷ 4r²."};
function simVerdict(sim,pred,tr){if(!isFinite(pred))return"";const e=Math.abs(pred-tr)/Math.max(1e-9,Math.abs(tr));
  return e<=0.03?`<b>Spot on.</b> Your prediction was within 3% of the exact answer.`:e<=0.15?`<b>Close.</b> You were ${pctf(e,0)} off. ${esc(SIM_TRAPS[sim.id]||"")}`:`<b>Off by ${pctf(e,0)}.</b> ${esc(SIM_TRAPS[sim.id]||"")} Open the solution below.`}
function simDone(id){return!!(S.sims&&S.sims[id]&&S.sims[id].done)}
function renderProb(host){
  const n=SIMS.filter(s=>simDone(s.id)).length;
  host.innerHTML=`<div class="card stack"><h3 id="simcount">Probability simulators · ${n} / ${SIMS.length} solved</h3><h2>Predict, simulate, then see why</h2>
    <p class="muted measure">Classic interview puzzles. Write your prediction first, then run thousands of random trials and watch the estimate converge. A puzzle counts as solved once you've predicted and run at least 1,000 trials.</p></div>
    <ol class="units">${SIMS.map((s,i)=>`<li class="card unit ${simDone(s.id)?"done":""}"><button class="unithead" data-sim="${s.id}" aria-expanded="false"><span class="unum tabular">${i+1}</span><span class="utitle">${esc(s.title)}</span><span class="pill ${simDone(s.id)?"ok":"todo"}">${simDone(s.id)?"solved":"open"}</span></button><div class="unitbody" hidden></div></li>`).join("")}</ol>`;
  host.querySelectorAll("[data-sim]").forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;const open=body.hidden;body.hidden=!open;b.setAttribute("aria-expanded",String(open));
    if(open&&!body.dataset.built){body.dataset.built="1";buildSim(SIMS.find(s=>s.id===b.dataset.sim),body);bumpDay("labs")}});
}
function buildSim(sim,body){
  body.classList.add("qin");const rec=(S.sims=S.sims||{})[sim.id]||{};
  body.innerHTML=`<p class="q">${esc(sim.ask)}</p>
    ${sim.extra?`<div class="demo"><b class="small">Play it yourself</b><div class="mhost"></div></div>`:""}
    <div class="demo">
      ${sim.paramUI?`<div class="controls">${sim.paramUI()}</div>`:""}
      <div class="row"><label class="form" for="pred-${sim.id}" style="flex:1;min-width:160px">Your prediction${sim.paramUI?" (for the settings above)":""}<input type="text" id="pred-${sim.id}" inputmode="decimal" autocomplete="off" value="${rec.pred!=null?esc(rec.pred):""}" placeholder="e.g. 0.5 or 1/2"></label></div>
      <div class="row">${[100,1000,10000,100000].map(n=>`<button class="btn ${n===10000?"accent":"ghost"}" data-run="${n}">Run ${n.toLocaleString("en-GB")}</button>`).join("")}<button class="btn ghost" data-reset>Reset</button></div>
      <div class="stats" id="ss-${sim.id}"></div><p class="small sv" id="sv-${sim.id}" role="status"></p><div class="sch"></div>${sim.hist||sim.paths||sim.scatter?`<div class="sch2"></div>`:""}
    </div>
    <details class="maths"><summary>Show the solution</summary><p>${esc(sim.solution)}</p></details><div class="row">${reportLink("Probability simulator: "+sim.title)}</div>`;
  if(sim.extra)sim.extra(body.querySelector(".mhost"));
  const cv=chartBox(body.querySelector(".sch"),"Running estimate"),cv2=body.querySelector(".sch2")?chartBox(body.querySelector(".sch2"),"Distribution"):null;
  let run=null,state;
  const P=()=>sim.readP?sim.readP(body):{};
  const reset=()=>{if(run)cancelAnimationFrame(run);run=null;state={n:0,sum:0,sum2:0,sum2b:0,trace:[],trace2:[],vals:[],pts:[]};drawS()};
  function drawS(){
    const p=P(),tr=sim.truth(p),pred=parseNum(body.querySelector(`#pred-${sim.id}`).value);
    const est=state.n?state.sum/state.n:NaN,se=state.n>1?Math.sqrt(Math.max(0,state.sum2/state.n-est*est)/state.n):NaN;
    body.querySelector(`#ss-${sim.id}`).innerHTML=stat("Trials",state.n.toLocaleString("en-GB"))+stat("Simulated",state.n?sim.fmtv(est)+(isFinite(se)?` ± ${sim.fmtv(2*se)}`:""):"–")+stat("Your prediction",isFinite(pred)?sim.fmtv(pred):"–")+stat("Exact answer",state.n>=1000||rec.done?sim.fmtv(tr):"run 1,000 to reveal")+(sim.trial2&&state.n?stat(sim.label2,sim.fmtv(state.sum2b/state.n)):"");
    body.querySelector(`#sv-${sim.id}`).innerHTML=state.n>=1000&&!run?simVerdict(sim,pred,tr):"";
    const tr1=state.trace,lastN=tr1.length?tr1[tr1.length-1][0]:10;
    const ys=[tr,...tr1.map(p=>p[1]),...state.trace2.map(p=>p[1]),...(isFinite(pred)?[pred]:[])];
    const lo=Math.min(...ys),hi=Math.max(...ys),pad=(hi-lo)*0.1||Math.abs(tr)*0.1||0.1;
    chart(cv,{h:200,xr:[0,Math.max(10,lastN)],yr:[Math.max(sim.hist?0:-1,lo-pad),hi+pad],xlabel:"number of trials",xfmt:v=>fmtTick(Math.round(v)),
      series:[{pts:tr1,cls:"s1",label:sim.label||"Simulated estimate"},...(sim.trial2?[{pts:state.trace2,cls:"s2",label:sim.label2}]:[])],refY:[{y:tr},...(isFinite(pred)?[{y:pred}]:[])],legend:true,
      tip:x=>{const q=tr1.reduce((a,b)=>Math.abs(b[0]-x)<Math.abs(a[0]-x)?b:a,tr1[0]||[0,NaN]);return`<b>${Math.round(q[0]).toLocaleString("en-GB")} trials</b><br>Estimate ${sim.fmtv(q[1])}`}});
    if(cv2&&sim.hist&&state.vals.length){const v=state.vals,mx=Math.min(quantile(v,0.995),Math.max(...v)),bw=Math.max(1,Math.ceil(mx/40));const bins=[];for(let a=0;a<=mx;a+=bw)bins.push([a,a+bw,0]);for(const x of v){const b=Math.min(bins.length-1,Math.floor(x/bw));if(b>=0)bins[b][2]++}
      chart(cv2,{h:160,xr:[0,mx+bw],yr:[0,Math.max(...bins.map(b=>b[2]))*1.15],xlabel:"value in one trial",bars:[{bins,cls:"s1",label:"Trials"}],refX:[{x:tr,cls:"s2",label:"mean"}],
        tip:x=>{const b=bins.find(b=>x>=b[0]&&x<b[1]);return b?`<b>${b[0]}${bw>1?`–${b[1]-1}`:""}</b><br>${b[2].toLocaleString("en-GB")} trials`:""}})}
    if(cv2&&sim.paths){const p=P();const paths=[];for(let k=0;k<12;k++){let x=p.i,t=0;const pts=[[0,x]];while(x>0&&x<p.N&&t<600){x+=Math.random()<p.p?1:-1;t++;pts.push([t,x])}paths.push(pts)}
      const tm=Math.max(...paths.map(q=>q[q.length-1][0]));chart(cv2,{h:180,xr:[0,tm],yr:[0,p.N],xlabel:"bets · 12 sample games",series:paths.map(q=>({pts:q,cls:q[q.length-1][1]>=p.N?"s3":"s2",w:1.5,alpha:.7})),refY:[{y:p.N},{y:p.i}]})}
    if(cv2&&sim.scatter){chart(cv2,{h:Math.min(320,(cv2.clientWidth||300)),xr:[-1,1],yr:[-1,1],points:[{pts:state.pts.filter(q=>q[2]),cls:"s1",label:"Inside the circle"},{pts:state.pts.filter(q=>!q[2]),cls:"s2",label:"Outside"}],legend:true,
      series:[{pts:Array.from({length:121},(_,i)=>[Math.cos(i/120*2*Math.PI),Math.sin(i/120*2*Math.PI)]),cls:"muted",w:1}]});
      if(state.n)body.querySelector(`#ss-${sim.id}`).insertAdjacentHTML("beforeend",stat("π estimate (4 × fraction)",(4*state.sum/state.n).toFixed(4)))}
  }
  function go(N){if(run)cancelAnimationFrame(run);const p=P(),target=state.n+N,t0=performance.now();
    const step=()=>{const left=target-state.n,batch=Math.max(1,Math.ceil(N/45));
      for(let k=0;k<Math.min(batch,left);k++){const v=sim.trial(p);state.n++;state.sum+=v;state.sum2+=v*v;if(sim.trial2)state.sum2b+=sim.trial2(p);if(sim.hist)state.vals.push(v);
        if(sim.scatter&&state.pts.length<4000){const x=Math.random()*2-1,y=Math.random()*2-1;state.pts.push([x,y,x*x+y*y<=1])}}
      state.trace.push([state.n,state.sum/state.n]);if(sim.trial2)state.trace2.push([state.n,state.sum2b/state.n]);
      if(state.trace.length>400){state.trace=state.trace.filter((_,i)=>i%2===0);state.trace2=state.trace2.filter((_,i)=>i%2===0)}
      drawS();
      if(state.n<target&&performance.now()-t0<8000)run=requestAnimationFrame(step);else{run=null;finish()}};
    run=requestAnimationFrame(step)}
  function finish(){const pred=parseNum(body.querySelector(`#pred-${sim.id}`).value);const r=S.sims[sim.id]||(S.sims[sim.id]={done:false});
    if(isFinite(pred))r.pred=body.querySelector(`#pred-${sim.id}`).value.trim();r.runs=(r.runs||0)+1;
    if(isFinite(pred)&&state.n>=1000&&!r.done){r.done=true;r.t=todayKey();toast(`Solved: ${sim.title}`)}const sc=$("#simcount");if(sc)sc.textContent=`Probability simulators · ${SIMS.filter(x=>simDone(x.id)).length} / ${SIMS.length} solved`;queueSave();rec.done=r.done;drawS();
    const pill=body.previousElementSibling.querySelector(".pill");if(r.done){pill.className="pill ok";pill.textContent="solved";body.closest(".unit").classList.add("done")}}
  body.querySelectorAll("[data-run]").forEach(b=>b.onclick=()=>{const pred=body.querySelector(`#pred-${sim.id}`);if(!pred.value.trim()&&!rec.done){pred.focus();pred.setAttribute("aria-invalid","true");pred.placeholder="Make a prediction first";return}pred.removeAttribute("aria-invalid");go(Number(b.dataset.run))});
  body.querySelector("[data-reset]").onclick=reset;
  body.querySelectorAll(".controls input,.controls select").forEach(el=>el.addEventListener("input",()=>{if(el.type==="range"){const v=body.querySelector("#"+el.id+"v");if(v)v.textContent=el.id==="gp"?f2(Number(el.value)):el.value}reset()}));
  body.querySelector(`#pred-${sim.id}`).addEventListener("input",()=>{if(!run)drawS()});
  reset();
}

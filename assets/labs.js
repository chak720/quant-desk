"use strict";
/* Quant Desk labs: interactive simulations that show how core quant finance ideas work,
   plus the Kelly game, progress charts and the public practice log. Uses engine.js helpers. */

/* ---------- maths helpers ---------- */
function randn(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function erf(x){const s=Math.sign(x);x=Math.abs(x);const t=1/(1+0.3275911*x);
  const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y}
const Ncdf=x=>0.5*(1+erf(x/Math.SQRT2));
const Npdf=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
/* Black–Scholes with continuous rate r. vega per 1 vol point, theta per calendar day, rho per 1% rate move */
function bs(type,S,K,sig,T,r=0){
  if(T<=0||sig<=0){const p=type==="call"?Math.max(S-K,0):Math.max(K-S,0);return{price:p,delta:type==="call"?(S>K?1:0):(S<K?-1:0),gamma:0,vega:0,theta:0,rho:0,d1:NaN,d2:NaN}}
  const sq=Math.sqrt(T),d1=(Math.log(S/K)+(r+sig*sig/2)*T)/(sig*sq),d2=d1-sig*sq,disc=K*Math.exp(-r*T);
  const call=type==="call",price=call?S*Ncdf(d1)-disc*Ncdf(d2):disc*Ncdf(-d2)-S*Ncdf(-d1);
  const theta=(-S*Npdf(d1)*sig/(2*sq)+(call?-r*disc*Ncdf(d2):r*disc*Ncdf(-d2)))/365;
  return{price,d1,d2,delta:call?Ncdf(d1):Ncdf(d1)-1,gamma:Npdf(d1)/(S*sig*sq),vega:S*Npdf(d1)*sq/100,theta,rho:(call?disc*T*Ncdf(d2):-disc*T*Ncdf(-d2))/100};
}
const quantile=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[clamp(Math.floor(q*(s.length-1)),0,s.length-1)]};
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1))};
const f2=x=>(Math.round(x*100)/100).toFixed(2);
const pctf=(x,d=1)=>(x*100).toFixed(d)+"%";

/* ---------- chart: one canvas, one y-axis, recessive grid, crosshair tooltip ---------- */
const CHARTS=new Set();
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function niceStep(span,n){const raw=span/Math.max(1,n),p=10**Math.floor(Math.log10(raw)),m=raw/p;return(m<1.5?1:m<3?2:m<7?5:10)*p}
function tickVals(a,b,n){const st=niceStep(b-a,n);const out=[];for(let v=Math.ceil(a/st)*st;v<=b+st*1e-9;v+=st)out.push(Math.abs(v)<st*1e-9?0:v);return out}
function chartBox(host,label){
  host.innerHTML=`<div class="chartwrap"><canvas role="img" aria-label="${esc(label)}"></canvas><div class="ctip" hidden></div></div><div class="legend"></div>`;
  return host.querySelector("canvas");
}
function chart(cv,o){cv._o=o;CHARTS.add(cv);drawChart(cv);if(!cv._wired){cv._wired=true;wireHover(cv)}}
function drawChart(cv,hx){
  const o=cv._o;if(!o||!cv.isConnected){CHARTS.delete(cv);return}
  const dpr=window.devicePixelRatio||1,W=cv.clientWidth||600,H=o.h||240;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.height=H+"px";
  const c=cv.getContext("2d");c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
  const col={ink:cssv("--ink"),muted:cssv("--muted"),line:cssv("--line"),surface:cssv("--surface"),s1:cssv("--s1"),s2:cssv("--s2"),s3:cssv("--s3"),bid:cssv("--bid"),ask:cssv("--ask")};
  let [x0,x1]=o.xr,[y0,y1]=o.yr;if(o.logy){y0=Math.log10(y0);y1=Math.log10(y1)}
  const L=50,R=12,T=12,B=o.xlabel?38:24,pw=W-L-R,ph=H-T-B;
  const X=x=>L+(x-x0)/(x1-x0)*pw,Y=y=>{const v=o.logy?Math.log10(Math.max(y,1e-9)):y;return T+(1-(v-y0)/(y1-y0))*ph};
  cv._map={X,L,pw,x0,x1,T,ph};
  c.font=`11px ${cssv("--mono")}`;c.textBaseline="middle";c.lineWidth=1;
  const yt=o.logy?(()=>{const out=[];for(let k=Math.floor(y0);k<=Math.ceil(y1);k++)for(const m of [1,2,5]){const v=k+Math.log10(m);if(v>=y0&&v<=y1)out.push(v)}return out.length>6?out.filter(v=>Number.isInteger(Math.round(v*1e6)/1e6)||Math.abs(v-Math.round(v)-Math.log10(2))>0.01):out})():tickVals(y0,y1,4);
  for(const v of yt){const yy=o.logy?Y(10**v):Y(v);c.strokeStyle=col.line;c.beginPath();c.moveTo(L,Math.round(yy)+.5);c.lineTo(W-R,Math.round(yy)+.5);c.stroke();
    c.fillStyle=col.muted;c.textAlign="right";c.fillText((o.yfmt||fmtTick)(o.logy?10**v:v),L-6,yy)}
  c.textAlign="center";c.textBaseline="top";
  for(const v of tickVals(x0,x1,Math.max(2,Math.floor(pw/90)))){const t=(o.xfmt||fmtTick)(v),hw=c.measureText(t).width/2;c.fillStyle=col.muted;c.fillText(t,clamp(X(v),hw+2,W-hw-2),T+ph+6)}
  if(o.xlabel){c.fillText(o.xlabel,L+pw/2,T+ph+22)}
  c.save();c.beginPath();c.rect(L,T-2,pw,ph+4);c.clip();
  if(o.bars)for(const b of o.bars){c.fillStyle=col[b.cls||"s1"];for(const [a,z,v] of b.bins){if(!v)continue;const xa=X(a)+1,xz=X(z)-1,yy=Y(v);const r=Math.min(4,(xz-xa)/2);
    c.beginPath();c.moveTo(xa,Y(0));c.lineTo(xa,yy+r);c.quadraticCurveTo(xa,yy,xa+r,yy);c.lineTo(xz-r,yy);c.quadraticCurveTo(xz,yy,xz,yy+r);c.lineTo(xz,Y(0));c.fill()}}
  for(const r of o.refY||[]){c.strokeStyle=col.muted;c.setLineDash([4,4]);c.beginPath();c.moveTo(L,Y(r.y));c.lineTo(W-R,Y(r.y));c.stroke();c.setLineDash([])}
  for(const r of o.refX||[]){c.strokeStyle=col[r.cls||"muted"];c.setLineDash([4,4]);c.beginPath();c.moveTo(X(r.x),T);c.lineTo(X(r.x),T+ph);c.stroke();c.setLineDash([])}
  /* bands: shaded x-ranges (e.g. when a strategy holds a position); points: scatter dots */
  for(const b of o.bands||[]){c.fillStyle=col[b.cls||"s1"];c.globalAlpha=b.alpha??.1;c.fillRect(X(b.x0),T,Math.max(1,X(b.x1)-X(b.x0)),ph);c.globalAlpha=1}
  for(const p of o.points||[]){c.fillStyle=col[p.cls||"s1"];c.globalAlpha=p.alpha??.8;for(const [x,y] of p.pts){c.fillRect(X(x)-1.5,Y(y)-1.5,3,3)}c.globalAlpha=1}
  for(const s of o.series||[]){c.strokeStyle=col[s.cls||"s1"];c.lineWidth=s.w||2;c.lineJoin="round";if(s.dash)c.setLineDash(s.dash);
    if(s.fill&&s.pts.length){c.fillStyle=col[s.cls||"s1"];c.globalAlpha=.14;c.beginPath();c.moveTo(X(s.pts[0][0]),Y(o.logy?y0:0));s.pts.forEach(([x,y])=>c.lineTo(X(x),Y(y)));c.lineTo(X(s.pts[s.pts.length-1][0]),Y(o.logy?y0:0));c.fill()}
    c.globalAlpha=s.alpha??1;c.beginPath();s.pts.forEach(([x,y],i)=>{i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y))});c.stroke();c.setLineDash([]);c.globalAlpha=1}
  c.restore();
  for(const d of o.dots||[]){c.fillStyle=col[d.cls||"s1"];c.strokeStyle=col.surface;c.lineWidth=2;c.beginPath();c.arc(X(d.x),Y(d.y),5,0,7);c.fill();c.stroke()}
  (o.refX||[]).forEach((r,i)=>{if(!r.label)return;c.fillStyle=col.muted;c.textAlign="left";c.textBaseline="top";c.fillText(r.label,Math.min(X(r.x)+4,W-R-c.measureText(r.label).width),T+i*14)});
  if(hx!=null){c.strokeStyle=col.ink;c.globalAlpha=.35;c.beginPath();c.moveTo(X(hx)+.5,T);c.lineTo(X(hx)+.5,T+ph);c.stroke();c.globalAlpha=1}
  const lg=cv.closest(".chartwrap")?.nextElementSibling;
  if(lg&&lg.classList.contains("legend")){const items=(o.series||[]).concat(o.bars||[],o.points||[]).filter(s=>s.label);
    lg.innerHTML=items.length>=2||o.legend?items.map(s=>`<span><i class="sw ${s.cls||"s1"}${s.dash?" dash":""}${s.bins||(s.pts&&!s.w&&o.points&&o.points.includes(s))?" box":""}"></i>${esc(s.label)}</span>`).join(""):""}
}
function fmtTick(v){const a=Math.abs(v);if(a>=1e6)return r4(v/1e6)+"m";if(a>=1e4)return r4(v/1e3)+"k";return String(r4(v))}
function wireHover(cv){
  const tip=cv.parentElement.querySelector(".ctip");
  const move=e=>{const o=cv._o,m=cv._map;if(!o||!o.tip||!m)return;const rect=cv.getBoundingClientRect();const px=e.clientX-rect.left;
    if(px<m.L||px>m.L+m.pw){leave();return}
    let x=m.x0+(px-m.L)/m.pw*(m.x1-m.x0);if(o.snap)x=o.snap(x);drawChart(cv,x);
    tip.innerHTML=o.tip(x);tip.hidden=false;const tw=tip.offsetWidth;tip.style.left=clamp(m.X(x)+12,0,rect.width-tw)+"px";if(m.X(x)+12+tw>rect.width)tip.style.left=Math.max(0,m.X(x)-tw-12)+"px";tip.style.top=m.T+"px"};
  const leave=()=>{tip.hidden=true;drawChart(cv)};
  cv.addEventListener("pointermove",move);cv.addEventListener("pointerdown",move);cv.addEventListener("pointerleave",leave);
}
function redrawCharts(){for(const cv of CHARTS)drawChart(cv)}
window.addEventListener("resize",()=>{clearTimeout(redrawCharts.t);redrawCharts.t=setTimeout(redrawCharts,120)});
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",redrawCharts)}catch(e){}

/* ---------- small UI builders ---------- */
function slider(id,label,min,max,step,val,fmtv){return`<label class="sl" for="${id}"><span>${esc(label)} <b class="tabular" id="${id}v">${fmtv?fmtv(val):val}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`}
function wireSliders(host,ids,fmts,onchange){
  const get=()=>Object.fromEntries(ids.map(id=>[id,Number(host.querySelector("#"+id).value)]));
  ids.forEach((id,i)=>host.querySelector("#"+id).addEventListener("input",()=>{const v=get();host.querySelector("#"+id+"v").textContent=fmts[i]?fmts[i](v[id]):v[id];onchange(v)}));
  return get;
}
const stat=(k,v,id)=>`<div class="stat"><span class="k">${esc(k)}</span><span class="v tabular" ${id?`id="${id}"`:""}>${v}</span></div>`;

/* ---------- labs ---------- */
const LABS=[
{id:"compound",title:"Returns, compounding and volatility drag",
 blurb:"Why a stock averaging +10% a year can still leave most investors behind.",
 intro:[["Simple vs log returns","A simple return is (P₁ − P₀)/P₀. A log return is ln(P₁/P₀). Log returns add up over time, so quants model prices with them. For small moves the two are almost equal."],
  ["Volatility drag","If yearly returns average μ with volatility σ, the typical (median) investor grows at about μ − σ²/2, not μ. Up 50% then down 50% leaves you at 0.75, not 1. The higher the volatility, the bigger the gap between the average outcome and the typical one."]],
 maths:"Price model (geometric Brownian motion):\n  ln(S_t / S_0) ~ Normal((μ − σ²/2)·t, σ²·t)\n\nMean wealth:   E[S_t] = S_0 · e^(μt)\nMedian wealth: S_0 · e^((μ − σ²/2)t)\n\nEach month the simulation draws\n  r = (μ − σ²/2)/12 + σ·√(1/12)·Z,   Z ~ N(0,1)\nand multiplies the price by e^r.",
 tryit:["Set volatility to 0: every path is the same smooth curve.","Push volatility to 50% with a 10% mean. Watch the median fall while the mean keeps rising.","Find the volatility where the median investor makes nothing at a 10% mean. (Answer: σ ≈ 45%, since σ²/2 = 10%.)"],
 render(host){
  host.innerHTML=`<div class="controls">${slider("mu","Mean annual return",0,0.25,0.01,0.08,x=>pctf(x))}${slider("sig","Volatility",0,0.6,0.01,0.2,x=>pctf(x,0))}${slider("yrs","Years",1,30,1,20)}</div>
   <div class="stats" id="cst"></div><div id="cch"></div><div class="row"><button class="btn ghost" id="cre">New random paths</button></div>`;
  const cv=chartBox(host.querySelector("#cch"),"Simulated wealth paths");
  const draw=v=>{const {mu,sig,yrs}=v,N=60,steps=yrs*12;const paths=[];
    for(let p=0;p<N;p++){let w=100;const pts=[[0,w]];for(let i=1;i<=steps;i++){w*=Math.exp((mu-sig*sig/2)/12+sig*Math.sqrt(1/12)*randn());pts.push([i/12,w])}paths.push(pts)}
    const fin=paths.map(p=>p[p.length-1][1]);const med=t=>100*Math.exp((mu-sig*sig/2)*t),avg=t=>100*Math.exp(mu*t);
    const line=f=>Array.from({length:steps+1},(_,i)=>[i/12,f(i/12)]);
    const hi=Math.max(quantile(fin,0.95),avg(yrs))*1.1,lo=Math.max(1,Math.min(quantile(fin,0.03),100)*0.8);
    chart(cv,{h:260,xr:[0,yrs],yr:[lo,hi],logy:true,xlabel:"years",yfmt:v=>"£"+fmtTick(Math.round(v)),
      series:[...paths.map(p=>({pts:p,cls:"muted",w:1,alpha:.22})),{pts:line(avg),cls:"s2",label:"Mean: e^(μt)"},{pts:line(med),cls:"s1",label:"Median: e^((μ − σ²/2)t)"}],
      refY:[{y:100}],legend:true,snap:x=>Math.round(x*12)/12,
      tip:x=>{const i=Math.round(x*12);const vals=paths.map(p=>p[i][1]);return`<b>Year ${f2(x)}</b><br>Mean ${"£"+Math.round(avg(x))}<br>Median ${"£"+Math.round(med(x))}<br>Below £100: ${pctf(vals.filter(v=>v<100).length/N,0)} of paths`}});
    host.querySelector("#cst").innerHTML=stat("Mean final wealth","£"+Math.round(avg(yrs)))+stat("Median final wealth","£"+Math.round(med(yrs)))+stat("Growth rate of the median",pctf(mu-sig*sig/2))+stat("Paths that lost money",pctf(fin.filter(x=>x<100).length/N,0));};
  const get=wireSliders(host,["mu","sig","yrs"],[x=>pctf(x),x=>pctf(x,0),null],draw);
  host.querySelector("#cre").onclick=()=>draw(get());draw(get());
 },
 quiz:[
  {q:"A stock goes up 20% then down 20%. Total return in %?",ans:-4,pct:true,tol:{abs:0.05},sol:"1.2 × 0.8 = 0.96 → −4%"},
  {q:"Mean annual return 12%, volatility 40%. Approximate growth rate of the median investor, in %?",ans:4,pct:true,tol:{abs:0.2},sol:"μ − σ²/2 = 12% − 0.16/2 = 12% − 8% = 4%"},
  {q:"Log returns of +0.10 and −0.05 over two days. Total log return (decimal)?",ans:0.05,tol:{abs:0.001},sol:"Log returns add: 0.10 − 0.05 = 0.05"}]},

{id:"walk",title:"Random walks and the √t rule",
 blurb:"Why risk grows with the square root of time, and what a random price looks like.",
 intro:[["A coin-flip price","Each step the price moves +1 or −1 with equal chance. That's a random walk, the simplest model of a price nobody can predict. Its expected position never changes, but its spread keeps growing."],
  ["The √t rule","After n steps the standard deviation is √n, not n. Four times as long means twice as much risk. That's why daily volatility × √252 gives annual volatility, and why the band around the paths below curves like a parabola on its side."]],
 maths:"Position after n steps: X_n = ε_1 + … + ε_n, ε = ±1\nE[X_n] = 0\nVar(X_n) = n·Var(ε) = n   →   SD = √n\n\nBy the central limit theorem X_n/√n → N(0,1),\nso about 68% of walks end within ±√n\nand about 95% within ±2√n.",
 tryit:["Count how many paths end outside the ±2√n band. It should be about 1 in 20.","Increase the number of steps fourfold and check that the band only doubles in width.","Look at a single path: it has long runs that look like trends. Pure randomness produces patterns."],
 render(host){
  host.innerHTML=`<div class="controls">${slider("ws","Steps",20,1000,10,250)}${slider("wn","Paths",5,200,5,40)}</div><div class="stats" id="wst"></div><div id="wch"></div><div id="whi"></div><div class="row"><button class="btn ghost" id="wre">New random paths</button></div>`;
  const cv=chartBox(host.querySelector("#wch"),"Random walk paths"),hv=chartBox(host.querySelector("#whi"),"Histogram of final positions");
  const draw=({ws,wn})=>{const paths=[],fin=[];for(let p=0;p<wn;p++){let x=0;const pts=[[0,0]];for(let i=1;i<=ws;i++){x+=Math.random()<.5?1:-1;pts.push([i,x])}paths.push(pts);fin.push(x)}
    const lim=Math.max(3*Math.sqrt(ws),...fin.map(Math.abs))*1.05;const band=k=>Array.from({length:51},(_,i)=>{const t=i/50*ws;return[t,k*Math.sqrt(t)]});
    chart(cv,{h:240,xr:[0,ws],yr:[-lim,lim],xlabel:"step",series:[...paths.map(p=>({pts:p,cls:"s1",w:1,alpha:.35})),{pts:band(2),cls:"s2",dash:[5,4],label:"±2√n band"},{pts:band(-2),cls:"s2",dash:[5,4]}],legend:true,snap:Math.round,
      tip:x=>{const v=paths.map(p=>p[x][1]);return`<b>Step ${x}</b><br>Spread (SD) ${f2(sd(v))}<br>√n = ${f2(Math.sqrt(x))}`}});
    const bw=Math.max(2,Math.round(Math.sqrt(ws)/3)*2),bins=[];for(let a=-Math.ceil(lim/bw)*bw;a<lim;a+=bw)bins.push([a,a+bw,fin.filter(v=>v>=a&&v<a+bw).length]);
    const ymax=Math.max(...bins.map(b=>b[2]),wn*bw*Npdf(0)/Math.sqrt(ws))*1.15;
    const curve=Array.from({length:81},(_,i)=>{const x=-lim+i/80*2*lim;return[x,wn*bw*Npdf(x/Math.sqrt(ws))/Math.sqrt(ws)]});
    chart(hv,{h:180,xr:[-lim,lim],yr:[0,ymax],xlabel:"final position",bars:[{bins,cls:"s1",label:"Simulated paths"}],series:[{pts:curve,cls:"s2",label:"Normal curve, SD √n"}],
      tip:x=>{const b=bins.find(b=>x>=b[0]&&x<b[1]);return b?`<b>${b[0]} to ${b[1]}</b><br>${b[2]} paths`:""}});
    const inside=fin.filter(v=>Math.abs(v)<=Math.sqrt(ws)).length/wn;
    host.querySelector("#wst").innerHTML=stat("√n",f2(Math.sqrt(ws)))+stat("Measured SD of final positions",f2(sd(fin)))+stat("Ended within ±√n",pctf(inside,0)+" (theory 68%)");};
  const get=wireSliders(host,["ws","wn"],[null,null],draw);host.querySelector("#wre").onclick=()=>draw(get());draw(get());
 },
 quiz:[
  {q:"A random walk of ±1 steps runs for 400 steps. Standard deviation of the final position?",ans:20,tol:{abs:0.01},sol:"√400 = 20"},
  {q:"Daily volatility is 1%. Volatility over 16 trading days, in %?",ans:4,pct:true,tol:{abs:0.05},sol:"1% × √16 = 4%"},
  {q:"About what fraction of random walks end more than 2 SDs from the start? (decimal)",ans:0.05,tol:{abs:0.006},sol:"Normal approximation: P(|Z| > 2) ≈ 0.0455, about 5%"}]},

{id:"sharpe",title:"Sharpe ratios and backtest luck",
 blurb:"Test enough strategies with no edge and one will look brilliant. This is how backtests lie.",
 intro:[["Sharpe ratio","Sharpe = (return − risk-free rate) / volatility, usually annualised. It measures return per unit of risk. Above 1 is good for a long-only fund; top trading desks run strategies with Sharpe 2 to 5."],
  ["Multiple testing","Every strategy below has a true Sharpe of exactly zero: daily returns are pure noise. But if you test hundreds and keep the best, the winner looks great. Its backtest is luck, and it will disappoint live. Quant researchers guard against this with out-of-sample tests and by counting how many ideas they tried."]],
 maths:"Annualised Sharpe from daily returns r_d:\n  SR = mean(r_d) / sd(r_d) × √252\n\nWith zero true edge over Y years, the measured\nSharpe is roughly N(0, 1/Y), so SE ≈ 1/√Y.\n\nThe best of N such noise strategies is about\n  √(2·ln N) / √Y\nabove zero. More ideas tried → a higher bar for 'real'.",
 tryit:["Set strategies to 1. The Sharpe lands near zero, as it should.","Try 200 strategies over 2 years. The best one shows a Sharpe above 2 from pure luck.","Now raise the years to 10. Longer histories shrink the luck."],
 render(host){
  host.innerHTML=`<div class="controls">${slider("sn","Strategies tested",1,500,1,100)}${slider("sy","Years of history",1,10,1,3)}</div><div class="stats" id="sst"></div><div id="sch"></div><div id="shi"></div><div class="row"><button class="btn ghost" id="sre">Rerun with new noise</button></div>`;
  const cv=chartBox(host.querySelector("#sch"),"Equity curves"),hv=chartBox(host.querySelector("#shi"),"Histogram of Sharpe ratios");
  const draw=({sn,sy})=>{const days=sy*252,curves=[],sharpes=[];
    for(let k=0;k<sn;k++){let eq=0,s=0,s2=0;const pts=[[0,0]];for(let d=1;d<=days;d++){const r=0.01*randn();eq+=r;s+=r;s2+=r*r;if(d%5===0||d===days)pts.push([d/252,eq*100])}
      const m=s/days,v=Math.sqrt(Math.max(1e-12,s2/days-m*m));sharpes.push(m/v*Math.sqrt(252));curves.push(pts)}
    const bi=sharpes.indexOf(Math.max(...sharpes));const show=curves.slice(0,30).filter((_,i)=>i!==bi);
    const all=[...show,curves[bi]].flatMap(p=>p.map(q=>q[1]));const lo=Math.min(...all),hi=Math.max(...all);
    chart(cv,{h:240,xr:[0,sy],yr:[lo-5,hi+5],xlabel:"years",yfmt:v=>fmtTick(v)+"%",series:[...show.map(p=>({pts:p,cls:"muted",w:1,alpha:.3})),{pts:curves[bi],cls:"s2",label:`Best of ${sn} (luck)`}],refY:[{y:0}],legend:true,
      tip:x=>{const p=curves[bi];const q=p.reduce((a,b)=>Math.abs(b[0]-x)<Math.abs(a[0]-x)?b:a);return`<b>Year ${f2(q[0])}</b><br>Best strategy: ${f2(q[1])}% cumulative`}});
    const bw=0.25,bins=[];for(let a=-4;a<4;a+=bw)bins.push([a,a+bw,sharpes.filter(s=>s>=a&&s<a+bw).length]);
    chart(hv,{h:170,xr:[-3.5,3.5],yr:[0,Math.max(...bins.map(b=>b[2]))*1.15+0.5],xlabel:"annualised Sharpe ratio (true Sharpe = 0)",bars:[{bins,cls:"s1"}],refX:[{x:sharpes[bi],cls:"s2",label:"best"}],
      tip:x=>{const b=bins.find(b=>x>=b[0]&&x<b[1]);return b?`<b>Sharpe ${f2(b[0])} to ${f2(b[1])}</b><br>${b[2]} strategies`:""}});
    host.querySelector("#sst").innerHTML=stat("Best measured Sharpe",f2(sharpes[bi]))+stat("Theory for the best",f2(Math.sqrt(2*Math.log(Math.max(sn,1.0001)))/Math.sqrt(sy)))+stat("Standard error of one Sharpe",f2(1/Math.sqrt(sy)))+stat("Strategies with Sharpe > 1",String(sharpes.filter(s=>s>1).length));};
  const get=wireSliders(host,["sn","sy"],[null,null],draw);host.querySelector("#sre").onclick=()=>draw(get());draw(get());
 },
 quiz:[
  {q:"A strategy returns 15% a year with 10% volatility. Risk-free rate is 3%. Sharpe ratio?",ans:1.2,tol:{abs:0.01},sol:"(15 − 3) / 10 = 1.2"},
  {q:"A zero-edge strategy is backtested over 4 years. Roughly what's the standard error of its measured Sharpe?",ans:0.5,tol:{abs:0.02},sol:"≈ 1/√years = 1/√4 = 0.5"},
  {q:"Daily mean return 0.05%, daily SD 1%. Annualised Sharpe (252 days, zero risk-free)?",ans:0.05*Math.sqrt(252),tol:{abs:0.03},sol:"(0.05/1) × √252 ≈ 0.05 × 15.87 ≈ 0.79"}]},

{id:"kelly",title:"Kelly criterion and position sizing",
 blurb:"Having an edge isn't enough. Bet too big and you still go broke.",
 intro:[["Sizing matters as much as edge","Say a coin lands heads 60% of the time and pays even money. Every bet has positive expected value, yet if you bet everything each time you'll be wiped out by the first tails. The question is what fraction of your bankroll to risk."],
  ["The Kelly fraction","Kelly maximises the long-run growth rate of your wealth: f* = p − q/b for a bet paying b:1. At 60% even money that's 20%. Bet double Kelly and your growth rate falls to zero. Most traders bet half Kelly or less, giving up a little growth for much smaller drawdowns."]],
 maths:"Bet a fraction f each round. Win → wealth × (1 + b·f), lose → × (1 − f).\nLong-run growth rate per bet:\n  g(f) = p·ln(1 + b·f) + q·ln(1 − f)\n\nSet g'(f) = 0:\n  f* = p − q/b\n\nAt even money (b = 1): f* = p − q = 2p − 1.\nAt f = 2f*, g ≈ 0. Beyond it, g < 0.",
 tryit:["Set your fraction to the Kelly marker and note the median final wealth.","Move to twice Kelly: the average path still looks fine on paper, but the median collapses.","Set the win probability to 50%. Kelly says bet nothing. Any bet only adds risk."],
 render(host){
  host.innerHTML=`<div class="controls">${slider("kp","Win probability (even money)",0.5,0.75,0.01,0.6)}${slider("kf","Fraction bet each round",0,1,0.01,0.2,x=>pctf(x,0))}</div><div class="stats" id="kst"></div><div id="kgr"></div><div id="kch"></div><div class="row"><button class="btn ghost" id="kre">New random flips</button></div>`;
  const gv=chartBox(host.querySelector("#kgr"),"Growth rate by bet fraction"),cv=chartBox(host.querySelector("#kch"),"Wealth paths");
  const draw=({kp,kf})=>{const q=1-kp,ks=Math.max(0,kp-q),g=f=>f>=1?-Infinity:kp*Math.log(1+f)+q*Math.log(1-f);
    const curve=Array.from({length:99},(_,i)=>[i/100,g(i/100)]);const gmin=Math.min(-0.05,g(Math.min(0.98,Math.max(2.2*ks,0.4))));
    chart(gv,{h:190,xr:[0,0.98],yr:[gmin,Math.max(0.01,g(ks))*1.4],xlabel:"fraction of bankroll bet",xfmt:v=>Math.round(v*100)+"%",yfmt:v=>r4(v*100)+"%",
      series:[{pts:curve,cls:"s1",label:"Growth rate per bet"}],refY:[{y:0}],refX:[{x:ks,cls:"s3",label:"Kelly "+pctf(ks,0)}],dots:[{x:Math.min(kf,0.98),y:Math.max(gmin,g(Math.min(kf,0.98))),cls:"s2"}],
      snap:x=>Math.round(x*100)/100,tip:x=>`<b>Bet ${Math.round(x*100)}%</b><br>Growth ${(g(x)*100).toFixed(2)}% per bet`});
    const N=30,R=200,paths=[],fin=[];
    for(let k=0;k<N;k++){let w=1;const pts=[[0,1]];for(let i=1;i<=R;i++){w*=Math.random()<kp?1+kf:1-kf;w=Math.max(w,1e-6);pts.push([i,w])}paths.push(pts);fin.push(w)}
    const lo=Math.max(1e-4,Math.min(0.1,quantile(fin,0.05))),hi=Math.max(10,quantile(fin,0.95)*2);
    chart(cv,{h:220,xr:[0,R],yr:[lo,hi],logy:true,xlabel:"bets",yfmt:v=>"×"+(v<1?r4(v):fmtTick(v)),series:paths.map(p=>({pts:p,cls:"s1",w:1,alpha:.3})),refY:[{y:1}],snap:Math.round,
      tip:x=>{const v=paths.map(p=>p[x][1]);return`<b>After ${x} bets</b><br>Median ×${f2(quantile(v,0.5))}<br>Down >90%: ${pctf(v.filter(w=>w<0.1).length/N,0)}`}});
    host.querySelector("#kst").innerHTML=stat("Kelly fraction",pctf(ks,0))+stat("Your growth per bet",(g(kf)*100).toFixed(2)+"%")+stat("Median wealth after 200 bets","×"+f2(quantile(fin,0.5)))+stat("Paths down more than 90%",pctf(fin.filter(w=>w<0.1).length/N,0));};
  const get=wireSliders(host,["kp","kf"],[x=>pctf(x,0),x=>pctf(x,0)],draw);host.querySelector("#kre").onclick=()=>draw(get());draw(get());
 },
 quiz:[
  {q:"A coin wins 55% of the time at even money. Kelly fraction (decimal)?",ans:0.1,tol:{abs:0.002},sol:"f* = 2p − 1 = 0.10"},
  {q:"A bet wins 40% of the time and pays 2:1. Kelly fraction (decimal)?",ans:0.1,tol:{abs:0.002},sol:"f* = p − q/b = 0.4 − 0.6/2 = 0.10"},
  {q:"Kelly says bet 20%. At roughly what fraction does your long-run growth rate fall to zero? (decimal)",ans:0.4,tol:{abs:0.03},sol:"About twice Kelly: 0.40"}]},

{id:"options",title:"Options: payoffs, pricing and Greeks",
 blurb:"Build option positions, see their payoff, and watch Black–Scholes value them before expiry.",
 intro:[["Calls and puts","A call gives the right to buy at the strike K, so at expiry it pays max(S − K, 0). A put gives the right to sell, paying max(K − S, 0). Combine them and you can shape almost any payoff."],
  ["Value before expiry","Before expiry an option is worth more than its payoff because the stock can still move. Black–Scholes prices that using volatility and time. The Greeks measure sensitivity: delta to the stock price, gamma to how delta changes, vega to volatility, theta to time passing."]],
 maths:"Black–Scholes (zero interest rate):\n  d1 = [ln(S/K) + σ²T/2] / (σ√T),  d2 = d1 − σ√T\n  Call = S·N(d1) − K·N(d2)\n  Put  = K·N(−d2) − S·N(−d1)\n\nPut–call parity: C − P = S − K\nCall delta = N(d1); put delta = N(d1) − 1\n\nRule of thumb: an at-the-money option ≈ 0.4 · S · σ · √T",
 tryit:["Pick a straddle and drag days to expiry toward 0. The curve sinks onto the V-shaped payoff: that's theta.","Raise volatility. Every long option gets more valuable: that's vega.","Check the rule of thumb: S = 100, K = 100, σ = 20%, 365 days gives about 0.4 × 100 × 0.2 = 8."],
 render(host){
  const STRATS={"Long call":[["call",0,1]],"Long put":[["put",0,1]],"Short call":[["call",0,-1]],"Straddle":[["call",0,1],["put",0,1]],"Bull call spread":[["call",-10,1],["call",10,-1]],"Butterfly":[["call",-10,1],["call",0,-2],["call",10,1]],"Covered call":[["stock",0,1],["call",10,-1]]};
  host.innerHTML=`<div class="row" role="group" aria-label="Strategy">${Object.keys(STRATS).map((k,i)=>`<button class="btn ghost chip" data-st="${esc(k)}" aria-pressed="${i===0}">${esc(k)}</button>`).join("")}</div>
   <div class="controls">${slider("oS","Stock price now",50,150,1,100)}${slider("oK","Strike (centre)",70,130,5,100)}${slider("ov","Volatility",0.05,0.8,0.01,0.25,x=>pctf(x,0))}${slider("ot","Days to expiry",0,365,1,90)}</div>
   <div class="stats" id="ost"></div><div id="och"></div><p class="muted small" id="olegs"></p>`;
  const cv=chartBox(host.querySelector("#och"),"Option position value");let cur="Long call";
  const draw=({oS,oK,ov,ot})=>{const legs=STRATS[cur],T=ot/365;
    const val=(S,t)=>legs.reduce((a,[ty,dk,n])=>a+n*(ty==="stock"?S:bs(ty,S,oK+dk,ov,t).price),0);
    const cost=val(oS,T);const xs=Array.from({length:121},(_,i)=>50+i*100/120);
    const pay=xs.map(S=>[S,val(S,0)-cost]),now=xs.map(S=>[S,val(S,T)-cost]);const ys=[...pay,...now].map(p=>p[1]);
    const g=legs.reduce((a,[ty,dk,n])=>{if(ty==="stock")return{...a,delta:a.delta+n};const b=bs(ty,oS,oK+dk,ov,T);return{delta:a.delta+n*b.delta,gamma:a.gamma+n*b.gamma,vega:a.vega+n*b.vega,theta:a.theta+n*b.theta}},{delta:0,gamma:0,vega:0,theta:0});
    chart(cv,{h:250,xr:[50,150],yr:[Math.min(...ys)-2,Math.max(...ys)+2],xlabel:"stock price",series:[{pts:pay,cls:"s2",label:"P&L at expiry"},{pts:now,cls:"s1",label:`P&L today (${ot} days left)`}],refY:[{y:0}],refX:[{x:oS,label:"now"}],dots:[{x:oS,y:0,cls:"s1"}],
      snap:x=>Math.round(x),tip:x=>`<b>Stock at ${x}</b><br>Today: ${f2(val(x,T)-cost)}<br>At expiry: ${f2(val(x,0)-cost)}`});
    host.querySelector("#ost").innerHTML=stat("Position value",f2(cost))+stat("Delta",f2(g.delta))+stat("Gamma",g.gamma.toFixed(3))+stat("Vega (per 1 vol pt)",f2(g.vega))+stat("Theta (per day)",f2(g.theta));
    host.querySelector("#olegs").textContent="Legs: "+legs.map(([ty,dk,n])=>`${n>0?"long":"short"} ${Math.abs(n)>1?Math.abs(n)+" × ":""}${ty==="stock"?"stock":ty+" K="+(oK+dk)}`).join(", ")+". P&L is measured against today's value.";};
  const get=wireSliders(host,["oS","oK","ov","ot"],[null,null,x=>pctf(x,0),null],draw);
  host.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{cur=b.dataset.st;host.querySelectorAll("[data-st]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));draw(get())});draw(get());
 },
 quiz:[
  {q:"A 100-strike put expires with the stock at 87. Payoff?",ans:13,tol:{abs:0.01},sol:"max(100 − 87, 0) = 13"},
  {q:"Zero rates. Stock 100, a 95-strike call costs 8. What does the 95-strike put cost?",ans:3,tol:{abs:0.01},sol:"C − P = S − K → P = 8 − (100 − 95) = 3"},
  {q:"Rule of thumb: at-the-money option, S = 200, σ = 20%, T = 1 year. Approximate price?",ans:16,tol:{abs:0.5},sol:"0.4 × 200 × 0.2 × √1 = 16 (Black–Scholes gives 15.9)"}]},

{id:"diversify",title:"Diversification and correlation",
 blurb:"Why combining risky assets can lower risk, and why correlation decides how much.",
 intro:[["Risk doesn't simply add","Mix two assets and the portfolio's volatility depends on how they move together. With correlation below 1, some of their wiggles cancel out. That's the only free lunch in finance."],
  ["The limit of diversification","With many assets, idiosyncratic risk averages away, but the shared part doesn't. With average correlation ρ, portfolio volatility can never fall below σ√ρ, however many assets you hold."]],
 maths:"Two assets, weight w in asset A:\n  σ_p² = w²σ_A² + (1−w)²σ_B² + 2w(1−w)ρσ_Aσ_B\n  μ_p  = wμ_A + (1−w)μ_B\n\nN equal-weighted assets, each vol σ, pairwise corr ρ:\n  σ_p = σ·√(ρ + (1−ρ)/N)  →  σ√ρ as N → ∞",
 tryit:["Set correlation to 1: the curve becomes a straight line and diversification does nothing.","Set correlation to −1 and find the weight where risk drops to zero.","In the second chart, see how quickly the benefit flattens after about 20 assets."],
 render(host){
  host.innerHTML=`<div class="controls">${slider("dr","Correlation ρ",-1,1,0.05,0.2,x=>f2(x))}${slider("dw","Weight in asset A",0,1,0.05,0.5,x=>pctf(x,0))}</div><div class="stats" id="dst"></div><div id="dch"></div><p class="muted small">Below: many assets, each with 25% volatility and pairwise correlation ρ (negative ρ treated as 0).</p><div id="dn"></div>`;
  const cv=chartBox(host.querySelector("#dch"),"Risk and return by weight"),nv=chartBox(host.querySelector("#dn"),"Portfolio risk by number of assets");
  const A={m:0.10,s:0.25},B={m:0.05,s:0.12};
  const draw=({dr,dw})=>{const pv=w=>Math.sqrt(w*w*A.s*A.s+(1-w)**2*B.s*B.s+2*w*(1-w)*dr*A.s*B.s),pm=w=>w*A.m+(1-w)*B.m;
    const ws=Array.from({length:101},(_,i)=>i/100);const pts=ws.map(w=>[pv(w)*100,pm(w)*100]);const mv=ws.reduce((a,w)=>pv(w)<pv(a)?w:a,0);
    chart(cv,{h:230,xr:[0,28],yr:[4,11],xlabel:"volatility (%)",yfmt:v=>v+"%",series:[{pts,cls:"s1",label:"All mixes of A and B"}],dots:[{x:B.s*100,y:B.m*100,cls:"s3"},{x:A.s*100,y:A.m*100,cls:"s3"},{x:pv(dw)*100,y:pm(dw)*100,cls:"s2"}],
      tip:x=>{const w=ws.reduce((a,w)=>Math.abs(pv(w)*100-x)<Math.abs(pv(a)*100-x)&&pm(w)>=pm(mv)?w:a,1);return`<b>${pctf(w,0)} in A</b><br>Vol ${pctf(pv(w))}<br>Return ${pctf(pm(w))}`}});
    const Ns=Array.from({length:50},(_,i)=>i+1);const nr=Math.max(0,dr);
    chart(nv,{h:170,xr:[1,50],yr:[0,26],xlabel:"number of assets",yfmt:v=>v+"%",series:[{pts:Ns.map(n=>[n,25*Math.sqrt(nr+(1-nr)/n)]),cls:"s1",label:"Portfolio volatility"}],refY:[{y:25*Math.sqrt(nr)}],snap:x=>clamp(Math.round(x),1,50),
      tip:x=>`<b>${x} assets</b><br>Vol ${f2(25*Math.sqrt(nr+(1-nr)/x))}%<br>Floor ${f2(25*Math.sqrt(nr))}%`});
    host.querySelector("#dst").innerHTML=stat("Asset A","10% return, 25% vol")+stat("Asset B","5% return, 12% vol")+stat("Your mix",`${pctf(pm(dw))} return, ${pctf(pv(dw))} vol`)+stat("Lowest-risk mix",`${pctf(mv,0)} in A → ${pctf(pv(mv))} vol`);};
  const get=wireSliders(host,["dr","dw"],[x=>f2(x),x=>pctf(x,0)],draw);draw(get());
 },
 quiz:[
  {q:"Two assets, each 20% vol, correlation 0, held 50/50. Portfolio volatility in %?",ans:20/Math.SQRT2,pct:true,tol:{abs:0.1},sol:"20 × √(½) ≈ 14.1%"},
  {q:"Two assets, each 30% vol, correlation −1, held 50/50. Portfolio volatility in %?",ans:0,pct:true,tol:{abs:0.05},sol:"Perfectly offsetting: σ√((1+ρ)/2) = 0"},
  {q:"Many assets, each 20% vol, average correlation 0.25. Lowest achievable portfolio volatility in %?",ans:10,pct:true,tol:{abs:0.1},sol:"σ√ρ = 20 × 0.5 = 10%"}]},

{id:"book",title:"Order books, spreads and market impact",
 blurb:"How a trade actually gets filled, and why big orders cost more than the quoted price.",
 intro:[["The limit order book","Exchanges match buyers and sellers through a book of resting limit orders. The best bid is the highest price someone will buy at, the best ask the lowest someone will sell at. The mid is halfway between them."],
  ["Walking the book","A market buy order takes the cheapest asks first. If it's bigger than the size at the best ask, it eats into worse prices. The gap between your average fill price and the mid is your cost: half the spread plus market impact. Large traders split orders over time to keep that cost down."]],
 maths:"mid    = (best bid + best ask) / 2\nspread = best ask − best bid\n\nMarket buy of Q shares fills level by level:\n  avg price = Σ (price_i × filled_i) / Q\n  cost (bps) = (avg price − mid) / mid × 10,000\n\nA common model: impact grows like √Q.",
 tryit:["Buy 100 shares: you pay half the spread and nothing more.","Buy 2,000 shares and count how many price levels you take out.","Press 'New book' a few times. Thin books make the same order much more expensive."],
 render(host){
  host.innerHTML=`<div class="controls">${slider("bq","Market buy size (shares)",100,5000,100,1200)}</div><div class="stats" id="bst"></div><div id="bch"></div><div class="row"><button class="btn ghost" id="bre">New book</button></div><div class="booktbl" id="btb"></div>`;
  const cv=chartBox(host.querySelector("#bch"),"Order book depth");let book;
  const mk=()=>{const mid=100,sp=pick([0.02,0.04,0.06]),thin=Math.random()<.4;const lv=(side)=>Array.from({length:12},(_,i)=>({p:r4(mid+side*(sp/2+i*0.02)),q:ri(thin?50:150,thin?300:700)}));book={bids:lv(-1),asks:lv(1)}};
  const draw=({bq})=>{const {bids,asks}=book;const mid=(bids[0].p+asks[0].p)/2;let left=bq,cost=0,lvls=0;const fills=[];
    for(const a of asks){if(left<=0)break;const t=Math.min(left,a.q);cost+=t*a.p;left-=t;lvls++;fills.push(t)}
    const filled=bq-left,avg=filled?cost/filled:0;
    const cum=(arr)=>{let s=0;return arr.map(l=>(s+=l.q,[l.p,s]))};
    const step=pts=>pts.flatMap(([p,s],i)=>i?[[p,pts[i-1][1]],[p,s]]:[[p,0],[p,s]]);
    const cb=cum(bids),ca=cum(asks);const ymax=Math.max(cb[cb.length-1][1],ca[ca.length-1][1])*1.05;
    chart(cv,{h:220,xr:[bids[bids.length-1].p-0.01,asks[asks.length-1].p+0.01],yr:[0,ymax],xlabel:"price",xfmt:v=>v.toFixed(2),yfmt:v=>fmtTick(v),
      series:[{pts:step(cb),cls:"s3",label:"Bids (cumulative size)"},{pts:step(ca),cls:"s2",label:"Asks (cumulative size)"}],refX:[{x:mid,label:"mid"},...(filled?[{x:avg,cls:"s1",label:"your avg fill"}]:[])],refY:[{y:bq}],
      tip:x=>{const a=ca.filter(c=>c[0]<=x).pop(),b=cb.filter(c=>c[0]>=x).pop();return`<b>Price ${x.toFixed(3)}</b>`+(a?`<br>Asks at or below: ${a[1]}`:"")+(b?`<br>Bids at or above: ${b[1]}`:"")}});
    host.querySelector("#bst").innerHTML=stat("Best bid / ask",`${bids[0].p.toFixed(2)} / ${asks[0].p.toFixed(2)}`)+stat("Spread",(asks[0].p-bids[0].p).toFixed(2))+stat("Your average fill",filled?avg.toFixed(4):"–")+stat("Cost vs mid",filled?f2((avg-mid)/mid*1e4)+" bps":"–")+stat("Levels taken",`${lvls}${left>0?` (book ran out, ${left} unfilled)`:""}`);
    host.querySelector("#btb").innerHTML=`<table><caption class="sr">Ask side of the book</caption><thead><tr><th>Ask price</th><th>Size</th><th>You take</th></tr></thead><tbody>${asks.slice(0,8).map((a,i)=>`<tr class="${fills[i]?"hit":""}"><td>${a.p.toFixed(2)}</td><td>${a.q}</td><td>${fills[i]||""}</td></tr>`).join("")}</tbody></table>`;};
  const get=wireSliders(host,["bq"],[null],draw);host.querySelector("#bre").onclick=()=>{mk();draw(get())};mk();draw(get());
 },
 quiz:[
  {q:"Best bid 99.96, best ask 100.04. What's the mid?",ans:100,tol:{abs:0.001},sol:"(99.96 + 100.04) / 2 = 100.00"},
  {q:"Asks: 200 shares at 10.00, 300 at 10.02. You buy 500 at market. Average price?",ans:10.012,tol:{abs:0.0005},sol:"(200·10.00 + 300·10.02) / 500 = 10.012"},
  {q:"Mid is 50.00 and your average buy fill is 50.05. Cost in basis points?",ans:10,tol:{abs:0.05},sol:"0.05 / 50 × 10,000 = 10 bps"}]},
];

function labDone(id){return!!(S.labs&&S.labs[id]&&S.labs[id].done)}
let LABTAB=(()=>{try{return localStorage.getItem("qd_labtab")||"concepts"}catch(e){return"concepts"}})();
function renderLabs(){
  const top=$("#v-labs"),tabs=[["concepts","Concept labs"],["options","Options visualiser"],["prob","Probability simulators"]];
  top.innerHTML=`<div class="subnav" role="tablist" aria-label="Labs sections">${tabs.map(([k,l])=>`<button role="tab" data-lt="${k}" aria-selected="${k===LABTAB}">${l}</button>`).join("")}</div><div id="labpane" class="panel"></div>`;
  top.querySelectorAll("[data-lt]").forEach(b=>b.onclick=()=>{LABTAB=b.dataset.lt;try{localStorage.setItem("qd_labtab",LABTAB)}catch(e){}renderLabs()});
  const pane=top.querySelector("#labpane");
  if(LABTAB==="options"){renderOptions(pane);return}
  if(LABTAB==="prob"){renderProb(pane);return}
  renderConceptLabs(pane);
}
function renderConceptLabs(host){
  const n=LABS.filter(l=>labDone(l.id)).length;
  host.innerHTML=`<div class="card stack"><h3>Quant finance labs · ${n} / ${LABS.length} complete</h3><h2>See how it works, then check yourself</h2>
    <p class="muted measure">Each lab is a live simulation. Move the sliders, follow the "Try this" prompts and open "Show the maths" to see what's running. Pass the three-question check (2 out of 3) to complete it.</p>
    <div class="bar"><i style="width:${n/LABS.length*100}%"></i></div></div>
    <ol class="units">${LABS.map((l,i)=>`<li class="card unit ${labDone(l.id)?"done":""}"><button class="unithead" data-lab="${l.id}" aria-expanded="false">
      <span class="unum tabular">${i+1}</span><span class="utitle">${esc(l.title)}<span class="muted small ublurb">${esc(l.blurb)}</span></span>
      <span class="pill ${labDone(l.id)?"ok":"todo"}">${labDone(l.id)?"done":"open"}</span></button><div class="unitbody" hidden></div></li>`).join("")}</ol>`;
  host.querySelectorAll("[data-lab]").forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;const open=body.hidden;body.hidden=!open;b.setAttribute("aria-expanded",String(open));
    if(open&&!body.dataset.built){body.dataset.built="1";buildLab(LABS.find(l=>l.id===b.dataset.lab),body);bumpDay("labs")}});
}
function buildLab(lab,body){
  body.classList.add("qin");
  body.innerHTML=`<div class="lessonbody">${lab.intro.map(([h,p])=>`<div class="lsec"><b>${esc(h)}</b><p>${esc(p)}</p></div>`).join("")}</div>
    <div class="demo"></div>
    <div class="lsec"><b>Try this</b><ul>${lab.tryit.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
    <details class="maths"><summary>Show the maths</summary><pre>${esc(lab.maths)}</pre></details>
    <div class="row"><button class="btn accent" data-check>Check yourself · 3 questions</button>${labDone(lab.id)?`<span class="pill ok">passed</span>`:""}</div><div class="uhost"></div>`;
  lab.render(body.querySelector(".demo"));
  body.querySelector("[data-check]").onclick=()=>{const uh=body.querySelector(".uhost");let right=0;
    const qs=lab.quiz.map(q=>planQ({skill:"fin",label:lab.title.split(/[,:]/)[0],L:3,secs:60,...q})).filter(Boolean);
    runner(uh,{questions:qs,title:"Lab check",onAnswer:(q,ok)=>{if(ok)right++},onDone:items=>{
      const pass=right>=2;const rec=S.labs[lab.id]||(S.labs[lab.id]={done:false,best:0});rec.best=Math.max(rec.best,right);if(pass&&!rec.done){rec.done=true;rec.t=todayKey()}queueSave();
      uh.innerHTML=`<div class="card stack qin"><h3>Lab check</h3><div class="big tabular">${right}/3</div><p class="muted">${pass?"Lab complete. It now counts on your public log.":"Two out of three completes the lab. Play with the demo again, then retry."}</p>${reviewHTML(items,{title:"Your feedback",drill:false})}<div class="row"><button class="btn" id="lb">Back to labs</button></div></div>`;
      uh.querySelector("#lb").onclick=()=>{renderLabs();$("#v-labs").scrollIntoView({block:"start"})};}});
    uh.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});};
}

/* ---------- games: Kelly betting and order-flow market making ---------- */
function playKelly(host){
  const p=pick([0.55,0.58,0.6,0.62,0.65]),R=40,ks=2*p-1;let w=100,kw=100,i=0;const bets=[];const hist=[[0,100]],khist=[[0,100]];
  host.innerHTML=`<div class="card ticket"><div class="meta"><span>Kelly casino · coin lands heads ${pctf(p,0)} · even money</span><span id="kr">Round 1 / ${R}</span></div>
    <p class="muted small">Choose how much of your bankroll to bet on heads each round. A bot betting exactly Kelly (${pctf(ks,0)}) plays the same flips. Beat it.</p>
    <div class="stats">${stat("Your bankroll","£100","kw")}${stat("Kelly bot","£100","kk")}${stat("Last flip","–","kl")}</div>
    ${slider("kb","Bet this round",0,1,0.01,0.1,x=>pctf(x,0))}
    <div class="row"><button class="btn accent" id="kgo">Flip</button><button class="btn ghost" id="kend">End game</button></div><div id="kgc"></div></div>`;
  const cv=chartBox(host.querySelector("#kgc"),"Bankroll over time");
  host.querySelector("#kb").oninput=e=>{host.querySelector("#kbv").textContent=pctf(Number(e.target.value),0)};
  const drawC=()=>{const all=[...hist,...khist].map(x=>x[1]);chart(cv,{h:180,xr:[0,R],yr:[Math.max(0.5,Math.min(...all)*0.8),Math.max(...all)*1.2],logy:true,xlabel:"round",yfmt:v=>"£"+fmtTick(Math.round(v)),
    series:[{pts:khist,cls:"s3",label:"Kelly bot",dash:[5,4]},{pts:hist,cls:"s1",label:"You"}],snap:x=>clamp(Math.round(x),0,i),tip:x=>`<b>Round ${x}</b><br>You £${f2(hist[x][1])}<br>Kelly £${f2(khist[x][1])}`})};
  const finish=()=>{const score=Math.round(w),avg=bets.length?mean(bets):0,notes=[`Your average bet was ${pctf(avg,0)} of your bankroll; Kelly is ${pctf(ks,0)}.`];
    if(avg>ks*1.6)notes.push("You over-bet. Above about twice Kelly your long-run growth turns negative, even with an edge. Luck can hide this in one game, never over many.");
    else if(avg<ks*0.4)notes.push("You under-bet. Safe, but you left most of the growth on the table. Half Kelly is a common practical compromise.");
    else notes.push("Sensible sizing, close to Kelly or a fraction of it.");
    notes.push(w>kw?"You beat the Kelly bot on these flips. Over many games, betting Kelly maximises the typical outcome, so check your sizing rather than the result.":"The Kelly bot finished ahead on the same flips.");
    endGame(host,"kelly",score,`Final bankroll (£). Kelly bot finished on £${Math.round(kw)}.`,notes)};
  host.querySelector("#kgo").onclick=()=>{const f=Number(host.querySelector("#kb").value),win=Math.random()<p;bets.push(f);
    w=Math.max(0,w*(win?1+f:1-f));kw*=win?1+ks:1-ks;i++;hist.push([i,Math.max(w,0.01)]);khist.push([i,kw]);
    host.querySelector("#kw").textContent="£"+f2(w);host.querySelector("#kk").textContent="£"+f2(kw);host.querySelector("#kl").textContent=win?"Heads, you win":"Tails, you lose";
    host.querySelector("#kr").textContent=`Round ${Math.min(i+1,R)} / ${R}`;drawC();if(i>=R||w<0.01)finish()};
  host.querySelector("#kend").onclick=finish;drawC();
}
/* ---------- public practice log ---------- */
const OWNER="Chakshu Chopra";
function streaks(days){
  const has=k=>days[k]&&(days[k].daily||days[k].n>0||days[k].labs>0||days[k].g>0||days[k].bt>0||days[k].iv>0);let cur=0;const d=new Date();if(!has(d.toLocaleDateString("en-CA")))d.setDate(d.getDate()-1);
  while(has(d.toLocaleDateString("en-CA"))){cur++;d.setDate(d.getDate()-1)}
  let best=0,run=0,prev=null;for(const k of Object.keys(days).filter(has).sort()){run=prev&&(Date.parse(k)-Date.parse(prev))/864e5===1?run+1:1;best=Math.max(best,run);prev=k}
  return{cur,best};
}
function publicSnapshot(){
  const days=Object.fromEntries(Object.entries(S.days).sort().slice(-400).map(([k,v])=>[k,{n:v.n||0,c:v.c||0,daily:!!v.daily,labs:v.labs||0,g:v.g||0,bt:v.bt||0,iv:v.iv||0,...(v.r?{r:v.r}:{})}]));
  const dk=(S.games.desk&&S.games.desk.hist)||[];
  return{quantDeskLog:1,owner:OWNER,updated:new Date().toISOString(),ratings:Object.fromEntries(SKILL_ORDER.map(k=>[k,S.ratings[k]])),lv:Object.fromEntries(SKILL_ORDER.map(k=>[k,lvOf(k)])),
    labs:LABS.map(l=>({id:l.id,title:l.title,done:labDone(l.id),t:S.labs[l.id]?.t||null})),units:{done:UNITS.filter(u=>unitDone(u.n)).length,total:UNITS.length},
    games:Object.fromEntries(Object.entries(S.games).map(([k,v])=>[k,v.best])),
    desk:{sessions:dk.length,best:dk.length?S.games.desk.best:null,avg10:dk.length?Math.round(mean(dk.slice(-10).map(h=>h.s))*100)/100:null,hard:dk.filter(h=>h.df==="hard").length},
    sims:{done:SIMS.filter(s=>simDone(s.id)).length,total:SIMS.length},
    iv:(()=>{const h=(S.iv&&S.iv.hist)||[],m=h.filter(x=>x.max>=50);return{sessions:h.length,mocks:m.length,best:m.length?Math.max(...m.map(x=>x.score)):null,avg:h.length?Math.round(mean(h.map(x=>x.score/x.max))*100):null,seen:S.iv?Object.keys(S.iv.seen).length:0,total:IVQ.length}})(),days};
}
function heatmap(days,weeks=26){
  const end=new Date();const start=new Date(end);start.setDate(start.getDate()-(weeks*7-1));
  start.setDate(start.getDate()-((start.getDay()+6)%7));const cells=[];const d=new Date(start);
  while(d<=end){const k=d.toLocaleDateString("en-CA"),v=days[k]||{};const n=(v.n||0)+(v.labs||0)*3+(v.g||0)*3+(v.bt||0)*3+(v.iv||0)*5;
    cells.push(`<i class="${n>=25?"l3":n>=10?"l2":n>0?"l1":""} ${k===todayKey()?"today":""}" title="${k}: ${v.n||0} questions${v.labs?`, ${v.labs} labs`:""}${v.g?`, ${v.g} games`:""}${v.daily?", daily set done":""}"></i>`);d.setDate(d.getDate()+1)}
  return`<div class="cal" role="img" aria-label="Practice activity over the last ${weeks} weeks">${cells.join("")}</div><div class="calkey muted small"><span>Less</span><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>More</span></div>`;
}
function logHTML(snap,{published}){
  const days=snap.days||{},ks=Object.keys(days).sort();const {cur,best}=streaks(days);
  const active=ks.filter(k=>days[k].n||days[k].daily||days[k].labs||days[k].g||days[k].bt||days[k].iv);let n=0,c=0;for(const k of ks){n+=days[k].n;c+=days[k].c}
  const recent=active.slice(-10).reverse();const labsDone=(snap.labs||[]).filter(l=>l.done).length;
  return`<div class="card stack"><h3>${published?"Public practice log":"Preview of your log"}</h3><h2>${esc(snap.owner||OWNER)} · quant finance practice</h2>
    <p class="muted small">${published?`Last published ${new Date(snap.updated).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}.`:"This is what visitors will see after you publish."}</p>
    <div class="stats">${stat("Current streak",cur+(cur===1?" day":" days"))}${stat("Longest streak",best+(best===1?" day":" days"))}${stat("Days practised",String(active.length))}${stat("Questions answered",n.toLocaleString("en-GB"))}${stat("Accuracy",n?pctf(c/n,0):"–")}${stat("Labs complete",`${labsDone} / ${(snap.labs||[]).length}`)}</div>
    ${heatmap(days)}</div>
    <div class="card stack"><h3>Progress over time</h3><div id="logcharts"></div></div>
    <div class="grid tight">${Object.entries(snap.ratings||{}).map(([k,r])=>{const v=snap.lv&&snap.lv[k]?Number(snap.lv[k]):clamp(1+(r-800)/120,1,5.99),L=clamp(Math.floor(v),1,5);return`<div class="card skill"><div class="top"><h3>${esc(SKILL_NAME[k]||k)}</h3><span class="lvl">L${L} ${LVL_NAME[L]}</span></div><span class="r tabular">${r}</span><div class="bar" title="Progress to the next level"><i style="width:${clamp((L>=5?1:v-L)*100,3,100)}%"></i></div></div>`}).join("")}</div>
    <div class="card stack"><h3>Recent sessions</h3><div class="list">${recent.length?recent.map(k=>{const v=days[k];return`<div><span>${new Date(k).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span><span class="muted tabular small">${[v.n?`${v.n} qs · ${Math.round(v.c/v.n*100)}%`:"",v.daily?"daily set":"",v.labs?`${v.labs} lab${v.labs>1?"s":""}`:"",v.g?`${v.g} game${v.g>1?"s":""}`:"",v.bt?"backtesting":"",v.iv?`${v.iv} interview${v.iv>1?"s":""}`:""].filter(Boolean).join(" · ")}</span></div>`}).join(""):`<div><span class="muted">No sessions yet.</span></div>`}</div></div>
    <div class="card stack"><h3>Labs and track</h3><div class="list">${(snap.labs||[]).map(l=>`<div><span>${esc(l.title)}</span><span class="pill ${l.done?"ok":"todo"}">${l.done?"done":"not yet"}</span></div>`).join("")}<div><span>Market-making track units</span><span class="tabular small">${snap.units?`${snap.units.done} / ${snap.units.total}`:"–"}</span></div>${snap.sims?`<div><span>Probability puzzles solved by simulation</span><span class="tabular small">${snap.sims.done} / ${snap.sims.total}</span></div>`:""}</div></div>
    ${snap.iv&&snap.iv.sessions?`<div class="card stack"><h3>Interview practice</h3><div class="stats">${stat("Sessions",String(snap.iv.sessions))}${stat("Mock interviews",String(snap.iv.mocks))}${stat("Best mock",snap.iv.best!=null?snap.iv.best+" / 50":"–")}${stat("Average score",snap.iv.avg+"%")}${stat("Questions attempted",`${snap.iv.seen} / ${snap.iv.total}`)}</div></div>`:""}
    ${snap.desk&&snap.desk.sessions?`<div class="card stack"><h3>Market-making simulator</h3><div class="stats">${stat("Sessions traded",String(snap.desk.sessions))}${stat("Best P&L",f2(snap.desk.best))}${stat("Average P&L, last 10",f2(snap.desk.avg10))}${stat("Hard-mode sessions",String(snap.desk.hard))}</div></div>`:""}`;
}
let PUBLISHED=null;
async function loadPublished(){try{const r=await fetch("progress.json",{cache:"no-store"});if(r.ok){const j=await r.json();if(j&&j.quantDeskLog)PUBLISHED=j}}catch(e){}}
const REPO="chak720/quant-desk",BRANCH="main";
function unpublished(){return Object.keys(S.days).length>0&&(!PUBLISHED||Date.parse(PUBLISHED.updated)<Date.parse(S.updated||0))}
function renderLog(){
  const host=$("#v-log");
  host.innerHTML=PUBLISHED?logHTML(PUBLISHED,{published:true}):`<div class="card stack"><h3>Public practice log</h3><h2>Nothing published yet</h2><p class="muted measure">Practice happens in the browser. Once it's published from Profile, this page shows the streak, activity calendar, rating chart and completed labs to anyone who visits.</p></div>`;
  if(PUBLISHED)progressCharts(host.querySelector("#logcharts"),PUBLISHED.days);
  if(unpublished())host.insertAdjacentHTML("afterbegin",`<div class="banner row between"><span>Your browser has practice that isn't on the public log yet.</span><button class="btn ghost chip" data-pub>Publish now</button></div>`);
  host.querySelector("[data-pub]")?.addEventListener("click",e=>publishFlow(e.target.closest(".banner")));
}
function visitorCard(){
  const {cur}=streaks(PUBLISHED.days||{});const n=Object.values(PUBLISHED.days||{}).filter(v=>v.n||v.daily||v.labs||v.g).length;
  return`<div class="card visitor"><div><h3>${esc(PUBLISHED.owner||OWNER)}'s practice</h3><p><b class="tabular">${cur}</b>-day streak · <b class="tabular">${n}</b> days practised</p></div><a class="btn ghost" href="#log">View the practice log</a></div>`;
}

/* ---------- progress charts: rating over time and daily volume ---------- */
function progressCharts(host,days){
  if(!host)return;const ks=Object.keys(days||{}).sort();const pts=ks.filter(k=>days[k].r);
  if(!ks.length){host.innerHTML=`<p class="muted small">Charts appear once there's some practice to show.</p>`;return}
  const t0=Date.parse(ks[0]),dx=k=>Math.round((Date.parse(k)-t0)/864e5),dl=x=>new Date(t0+x*864e5).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const overall=r=>Math.round(mean(SKILL_ORDER.map(k=>r[k]).filter(v=>v!=null)));const sel=host.dataset.sel||"all";
  host.innerHTML=`${pts.length>=2?`<div class="row" role="group" aria-label="Topic to compare">${["all",...SKILL_ORDER].map(k=>`<button class="btn ghost chip" data-ts="${k}" aria-pressed="${k===sel}">${k==="all"?"Overall":esc(SKILL_NAME[k])}</button>`).join("")}</div><div class="rch"></div><p class="muted small">Dashed line: 1250, interview level. Ratings rise for right answers on pace and fall for misses.</p>`:`<p class="muted small">The rating chart starts after two days of practice.</p>`}<div class="qch"></div>`;
  if(pts.length>=2){
    const rcv=chartBox(host.querySelector(".rch"),"Rating over time");
    const ov=pts.map(k=>[dx(k),overall(days[k].r)]),tp=sel==="all"?null:pts.filter(k=>days[k].r[sel]!=null).map(k=>[dx(k),days[k].r[sel]]);
    const ys=[...ov,...(tp||[]),[0,1250]].map(p=>p[1]),xs=ov.map(p=>p[0]);
    chart(rcv,{h:220,xr:[xs[0],Math.max(xs[0]+1,xs[xs.length-1])],yr:[Math.floor((Math.min(...ys)-30)/50)*50,Math.ceil((Math.max(...ys)+30)/50)*50],xfmt:dl,
      series:[{pts:ov,cls:"s1",label:"Overall rating"},...(tp?[{pts:tp,cls:"s2",label:SKILL_NAME[sel]}]:[])],refY:[{y:1250}],
      snap:x=>xs.reduce((a,b)=>Math.abs(b-x)<Math.abs(a-x)?b:a,xs[0]),
      tip:x=>{const k=pts.find(k=>dx(k)===x);if(!k)return"";const r=days[k].r;return`<b>${dl(x)}</b><br>Overall ${overall(r)}${sel!=="all"&&r[sel]!=null?`<br>${esc(SKILL_NAME[sel])} ${r[sel]}`:""}`}});
    host.querySelectorAll("[data-ts]").forEach(b=>b.onclick=()=>{host.dataset.sel=b.dataset.ts;progressCharts(host,days)});
  }
  const qcv=chartBox(host.querySelector(".qch"),"Questions answered per day");const last=ks.slice(-60),q0=dx(last[0]),q1=dx(last[last.length-1]);
  chart(qcv,{h:140,xr:[q0-0.5,q1+0.5],yr:[0,Math.max(10,...last.map(k=>days[k].n||0))*1.1],xfmt:x=>Number.isInteger(x)?dl(x):"",
    bars:[{bins:last.map(k=>[dx(k)-0.45,dx(k)+0.45,days[k].n||0]),cls:"s3",label:"Questions answered per day"}],legend:true,
    snap:x=>Math.round(x),tip:x=>{const k=last.find(k=>dx(k)===x);const v=k&&days[k];return v?`<b>${dl(x)}</b><br>${v.n||0} questions${v.n?` · ${Math.round(v.c/v.n*100)}% right`:""}${v.daily?"<br>Daily set done":""}`:`<b>${dl(x)}</b><br>No practice`}});
}

/* ---------- publishing: copy the snapshot, then paste it into GitHub's editor. No token is stored anywhere. ---------- */
function ghEditUrl(){return PUBLISHED?`https://github.com/${REPO}/edit/${BRANCH}/progress.json`:`https://github.com/${REPO}/new/${BRANCH}?filename=progress.json`}
async function publishFlow(host){
  const txt=JSON.stringify(publicSnapshot());let copied=false;
  try{await navigator.clipboard.writeText(txt);copied=true}catch(e){}
  const out=host.querySelector(".pubout")||host.appendChild(Object.assign(document.createElement("div"),{className:"pubout stack"}));
  out.innerHTML=`<ol class="steps small">
      <li>${copied?"Your log is copied.":"Copy the text in the box below."}</li>
      <li><a href="${ghEditUrl()}" target="_blank" rel="noopener">Open progress.json on GitHub</a>${PUBLISHED?" and select everything in the editor":""}.</li>
      <li>Paste, then press <b>Commit changes</b>. The public log updates within a few minutes.</li></ol>
    ${copied?"":`<label class="small" for="pubtxt">Your log</label><textarea id="pubtxt" rows="3" readonly>${esc(txt)}</textarea>`}`;
  const ta=out.querySelector("textarea");if(ta){ta.focus();ta.select()}
  if(copied)window.open(ghEditUrl(),"_blank","noopener");
}
function renderPubCard(host){
  const when=PUBLISHED?new Date(PUBLISHED.updated).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):null;
  host.innerHTML=`<h3>Public log</h3>
    <p class="muted measure">Visitors see your streak, activity calendar, rating chart, levels, labs and game bests on the <a href="#log">Log</a> page. Individual answers and mistakes stay private. ${when?`Last published ${when}.`:"Nothing published yet."}</p>
    ${unpublished()?`<p class="small">You've practised since your last publish.</p>`:""}
    <div class="row"><button class="btn accent" id="pubgo">Publish to public log</button><button class="btn ghost" id="prevp">Preview</button><button class="btn ghost" id="pubdl">Download file</button></div>`;
  host.querySelector("#pubgo").onclick=()=>publishFlow(host);
  host.querySelector("#pubdl").onclick=downloadSnapshot;
  host.querySelector("#prevp").onclick=()=>{const v=$("#v-log");v.innerHTML=logHTML(publicSnapshot(),{published:false});progressCharts(v.querySelector("#logcharts"),S.days);go("log",true,false)};
}
function downloadSnapshot(){
  const blob=new Blob([JSON.stringify(publicSnapshot(),null,1)],{type:"application/json"});const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="progress.json";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}

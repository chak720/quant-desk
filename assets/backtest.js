"use strict";
/* Quant Desk: backtesting playground. Real historical prices (bundled in data/) or your own CSV,
   simple rule-based strategies, and the statistics a quant desk would ask about. */

const BT_DATA=[
 {key:"sp500",name:"S&P 500 index",span:"2007–2016, daily"},{key:"aapl",name:"Apple",span:"2007–2016, daily"},{key:"msft",name:"Microsoft",span:"2007–2016, daily"},
 {key:"ibm",name:"IBM",span:"2007–2016, daily"},{key:"sbux",name:"Starbucks",span:"2007–2016, daily"},{key:"goog",name:"Google",span:"2004–2013, daily"},
 {key:"brent",name:"Brent crude oil",span:"1987–today, daily"},{key:"gbpusd",name:"GBP/USD",span:"1971–today, daily"},{key:"vix",name:"VIX volatility index",span:"1990–today, daily"},
 {key:"sp500m",name:"S&P 500 since 1871",span:"monthly"},
];
const BT_CACHE={};
/* rolling helpers on prefix sums: O(n) */
function rollMean(c,L){const out=new Array(c.length).fill(NaN);let s=0;for(let i=0;i<c.length;i++){s+=c[i];if(i>=L)s-=c[i-L];if(i>=L-1)out[i]=s/L}return out}
function rollSd(c,L){const out=new Array(c.length).fill(NaN);let s=0,s2=0;for(let i=0;i<c.length;i++){s+=c[i];s2+=c[i]*c[i];if(i>=L){s-=c[i-L];s2-=c[i-L]**2}if(i>=L-1){const m=s/L;out[i]=Math.sqrt(Math.max(1e-12,s2/L-m*m))}}return out}
function rsi(c,L){const out=new Array(c.length).fill(NaN);let up=0,dn=0;for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],u=Math.max(d,0),w=Math.max(-d,0);
  if(i<=L){up+=u/L;dn+=w/L}else{up=(up*(L-1)+u)/L;dn=(dn*(L-1)+w)/L}if(i>=L)out[i]=dn===0?100:100-100/(1+up/dn)}return out}

/* Each strategy returns pos[t]: the position held from the close of day t to the close of day t+1,
   decided using prices up to and including day t only. That one-day lag is what prevents look-ahead bias. */
const STRATS=[
 {id:"hold",name:"Buy and hold",desc:"Always fully invested. The benchmark every strategy has to beat after costs.",params:[],
  signal(c){return c.map(()=>1)}},
 {id:"ma",name:"Moving-average crossover",desc:"Trend following: long when the fast average is above the slow one. Short (if allowed) when it's below.",
  params:[{id:"fast",label:"Fast average (periods)",min:2,max:100,step:1,def:20},{id:"slow",label:"Slow average (periods)",min:10,max:300,step:5,def:100}],
  sweep:{a:"fast",b:"slow",av:[5,10,15,20,30,40,50,60],bv:[40,60,80,100,120,150,200,250]},valid:p=>p.fast<p.slow,invalidMsg:"The fast average must be shorter than the slow one, so this strategy never trades. Shorten the fast average or lengthen the slow one.",
  signal(c,p,short){const f=rollMean(c,p.fast),s=rollMean(c,p.slow);return c.map((_,t)=>isNaN(s[t])||p.fast>=p.slow?0:f[t]>s[t]?1:short?-1:0)}},
 {id:"mr",name:"Mean reversion (z-score)",desc:"Buy when the price is unusually far below its recent average, sell when it's back. Short the mirror image if allowed.",
  params:[{id:"look",label:"Lookback (periods)",min:5,max:120,step:1,def:20},{id:"entry",label:"Entry z-score",min:0.5,max:3,step:0.1,def:1.5},{id:"exit",label:"Exit z-score",min:-1,max:1,step:0.1,def:0}],
  sweep:{a:"look",b:"entry",av:[5,10,15,20,30,40,60,90],bv:[0.75,1,1.25,1.5,1.75,2,2.5,3]},
  signal(c,p,short){const m=rollMean(c,p.look),s=rollSd(c,p.look);let cur=0;return c.map((x,t)=>{if(isNaN(m[t]))return 0;const z=(x-m[t])/s[t];
    if(cur===0){if(z<-p.entry)cur=1;else if(short&&z>p.entry)cur=-1}else if(cur===1&&z>-p.exit)cur=0;else if(cur===-1&&z<p.exit)cur=0;return cur})}},
 {id:"mom",name:"Time-series momentum",desc:"Long if the price is higher than it was N periods ago by more than a threshold, short (if allowed) if lower.",
  params:[{id:"look",label:"Lookback (periods)",min:5,max:300,step:5,def:120},{id:"thr",label:"Threshold %",min:0,max:10,step:0.5,def:0}],
  sweep:{a:"look",b:"thr",av:[10,20,40,60,90,120,180,250],bv:[0,1,2,3,4,5,7,10]},
  signal(c,p,short){return c.map((x,t)=>{if(t<p.look)return 0;const r=(x/c[t-p.look]-1)*100;return r>p.thr?1:short&&r<-p.thr?-1:0})}},
 {id:"rsi",name:"RSI reversal",desc:"Buy when the 14-period RSI shows the asset is oversold, sell once it recovers. Classic technical indicator, often weaker than it looks.",
  params:[{id:"per",label:"RSI period",min:2,max:30,step:1,def:14},{id:"lo",label:"Buy below",min:5,max:45,step:1,def:30},{id:"hi",label:"Exit above",min:50,max:90,step:1,def:55}],
  sweep:{a:"per",b:"lo",av:[2,3,5,7,10,14,20,30],bv:[10,15,20,25,30,35,40,45]},
  signal(c,p,short){const r=rsi(c,p.per);let cur=0;return c.map((_,t)=>{if(isNaN(r[t]))return 0;
    if(cur===0){if(r[t]<p.lo)cur=1;else if(short&&r[t]>100-p.lo)cur=-1}else if(cur===1&&r[t]>p.hi)cur=0;else if(cur===-1&&r[t]<100-p.hi)cur=0;return cur})}},
];
function periodsPerYear(d){const g=[];for(let i=1;i<Math.min(d.length,300);i++)g.push((Date.parse(d[i])-Date.parse(d[i-1]))/864e5);g.sort((a,b)=>a-b);const m=g[Math.floor(g.length/2)]||1;return m<=4?252:m<=10?52:12}
function runBT(c,pos,costBps){
  const n=c.length,ret=new Array(n).fill(0),bh=new Array(n).fill(0);
  for(let t=1;t<n;t++){const r=c[t]/c[t-1]-1;bh[t]=r;ret[t]=pos[t-1]*r-Math.abs(pos[t-1]-(t>=2?pos[t-2]:0))*costBps/1e4}
  return{ret,bh};
}
function stats(ret,pos,a,b,ppy){
  const r=ret.slice(a+1,b+1),n=r.length;if(n<2)return null;let eq=1,peak=1,mdd=0;
  for(const x of r){eq*=1+x;peak=Math.max(peak,eq);mdd=Math.min(mdd,eq/peak-1)}
  const m=mean(r),s=sd(r),dn=Math.sqrt(r.reduce((acc,x)=>acc+Math.min(0,x)**2,0)/n),yrs=n/ppy;
  let trades=0,wins=0,cur=0,tr=1;for(let t=a;t<b;t++){const p=pos[t],prev=t>a?pos[t-1]:0;
    if(p!==prev){if(prev!==0){if(tr>1)wins++;}if(p!==0){trades++;tr=1}}if(p!==0)tr*=1+ret[t+1]}
  if(pos[b-1]!==0&&tr>1)wins++;
  const exp=pos.slice(a,b).filter(p=>p!==0).length/Math.max(1,b-a);
  const cagr=eq>0?eq**(1/yrs)-1:-1;
  return{total:eq-1,cagr,vol:s*Math.sqrt(ppy),sharpe:s>0?m/s*Math.sqrt(ppy):0,sortino:dn>0?m/dn*Math.sqrt(ppy):0,mdd,calmar:mdd<0?cagr/-mdd:0,trades,win:trades?wins/trades:NaN,exp,yrs};
}
function parseCSV(txt){
  const lines=txt.trim().split(/\r?\n/).map(l=>l.split(/,|;|\t/).map(x=>x.trim().replace(/^"|"$/g,"")));
  const head=lines[0].map(h=>h.toLowerCase());const hasHead=lines[0].some(x=>isNaN(Number(x))&&isNaN(Date.parse(x)));
  const rows=hasHead?lines.slice(1):lines;
  let di=hasHead?head.findIndex(h=>/date|time/.test(h)):-1;if(di<0)di=rows[0].findIndex(x=>!isNaN(Date.parse(x))&&isNaN(Number(x)));
  let ci=hasHead?["adj close","adj_close","adjusted","close","price","value"].map(k=>head.indexOf(k)).find(i=>i>=0)??-1:-1;
  if(ci<0)for(let j=rows[0].length-1;j>=0;j--)if(j!==di&&isFinite(Number(rows[0][j]))){ci=j;break}
  if(di<0||ci<0)throw new Error("Couldn't find a date column and a price column.");
  const pts=rows.map(r=>[r[di],Number(r[ci])]).filter(([d,v])=>!isNaN(Date.parse(d))&&isFinite(v)&&v>0).map(([d,v])=>[new Date(Date.parse(d)).toISOString().slice(0,10),v]).sort((x,y)=>x[0]<y[0]?-1:1);
  if(pts.length<50)throw new Error("Need at least 50 rows of prices.");
  return{key:"upload",name:"Your upload",source:"CSV you uploaded",note:"",d:pts.map(p=>p[0]),c:pts.map(p=>p[1])};
}
const BT={data:null,strat:"ma",p:{},short:false,cost:5,split:70,from:null,to:null};
async function loadBT(key){if(BT_CACHE[key])return BT_CACHE[key];const r=await fetch(`data/${key}.json`);if(!r.ok)throw new Error("Couldn't load that dataset.");return BT_CACHE[key]=await r.json()}

function renderBacktest(){
  const host=$("#v-backtest");
  host.innerHTML=`<div class="card stack"><h3>Backtesting playground</h3><h2>Test trading rules on real prices</h2>
    <p class="muted measure">Pick a market and a strategy, set its parameters and costs, and see how it would have done: the equity curve, drawdowns, Sharpe ratio and more. The test split holds back the most recent data so you can see whether a rule tuned on the past keeps working.</p>
    <div class="controls">
      <label class="sl" for="btd"><span>Market</span><select id="btd">${BT_DATA.map(d=>`<option value="${d.key}">${esc(d.name)} (${esc(d.span)})</option>`).join("")}<option value="upload">Upload a CSV…</option></select></label>
      <label class="sl" for="bts"><span>Strategy</span><select id="bts">${STRATS.map(s=>`<option value="${s.id}" ${s.id===BT.strat?"selected":""}>${esc(s.name)}</option>`).join("")}</select></label></div>
    <div id="btup" hidden class="stack"><label class="form" for="btfile">CSV with a date column and a price column (Yahoo Finance and most exports work)<input type="file" id="btfile" accept=".csv,text/csv,text/plain"></label><p class="small" id="btupmsg" role="status"></p></div>
    <p class="muted small" id="btsrc"></p>
    <p class="small" id="btdesc"></p>
    <div class="controls" id="btparams"></div>
    <div class="controls">
      ${slider("btc","Trading cost per change (bps)",0,50,1,BT.cost)}${slider("btsp","Training data (rest is the test)",50,100,5,BT.split,x=>x+"%")}
      <label class="sl" for="btfrom"><span>From</span><select id="btfrom"></select></label><label class="sl" for="btto"><span>To</span><select id="btto"></select></label></div>
    <label class="check1"><input type="checkbox" id="btsh" ${BT.short?"checked":""}> Allow short positions</label>
    </div>
    <div id="btout"><div class="card"><p class="muted">Loading prices…</p></div></div>`;
  const $h=s=>host.querySelector(s);
  const paramsUI=()=>{const st=STRATS.find(s=>s.id===BT.strat);BT.p=Object.fromEntries(st.params.map(p=>[p.id,BT.p[p.id]??p.def]));
    $h("#btdesc").textContent=st.desc;$h("#btparams").innerHTML=st.params.map(p=>slider("bp-"+p.id,p.label,p.min,p.max,p.step,BT.p[p.id])).join("");
    st.params.forEach(p=>{const el=$h("#bp-"+p.id);el.addEventListener("input",()=>{BT.p[p.id]=Number(el.value);$h("#bp-"+p.id+"v").textContent=el.value;schedule()})});};
  const yearsUI=()=>{const ys=[...new Set(BT.data.d.map(d=>d.slice(0,4)))];BT.from=ys.includes(BT.from)?BT.from:ys[0];BT.to=ys.includes(BT.to)?BT.to:ys[ys.length-1];
    $h("#btfrom").innerHTML=ys.map(y=>`<option ${y===BT.from?"selected":""}>${y}</option>`).join("");$h("#btto").innerHTML=ys.map(y=>`<option ${y===BT.to?"selected":""}>${y}</option>`).join("")};
  let tmr=null;const schedule=()=>{clearTimeout(tmr);tmr=setTimeout(()=>drawBT($h("#btout")),60)};
  const load=async key=>{$h("#btup").hidden=key!=="upload";if(key==="upload"){if(!BT_CACHE.upload){$h("#btout").innerHTML=`<div class="card"><p class="muted">Choose a CSV file above.</p></div>`;return}BT.data=BT_CACHE.upload}
    else{$h("#btout").innerHTML=`<div class="card"><p class="muted">Loading prices…</p></div>`;try{BT.data=await loadBT(key)}catch(e){$h("#btout").innerHTML=`<div class="card"><p>${esc(e.message)} Check your connection and pick the market again.</p></div>`;return}}
    $h("#btsrc").textContent=`Source: ${BT.data.source}. ${BT.data.d.length.toLocaleString("en-GB")} prices from ${BT.data.d[0]} to ${BT.data.d[BT.data.d.length-1]}. ${BT.data.note||""}`;BT.from=BT.to=null;yearsUI();schedule()};
  $h("#btd").onchange=e=>load(e.target.value);
  $h("#bts").onchange=e=>{BT.strat=e.target.value;BT.p={};paramsUI();schedule()};
  $h("#btfile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{BT_CACHE.upload=parseCSV(await f.text());BT_CACHE.upload.name=f.name;$h("#btupmsg").textContent=`Loaded ${BT_CACHE.upload.c.length.toLocaleString("en-GB")} prices.`;load("upload")}catch(err){$h("#btupmsg").textContent=err.message+" Expected columns like Date, Close."}};
  wireSliders(host,["btc","btsp"],[null,x=>x+"%"],v=>{BT.cost=v.btc;BT.split=v.btsp;schedule()});
  $h("#btsh").onchange=e=>{BT.short=e.target.checked;schedule()};
  $h("#btfrom").onchange=e=>{BT.from=e.target.value;schedule()};$h("#btto").onchange=e=>{BT.to=e.target.value;schedule()};
  paramsUI();load("sp500");
}
let BT_RUNS_TODAY=0;
function drawBT(out){
  const D=BT.data;if(!D)return;const st=STRATS.find(s=>s.id===BT.strat);
  let a=D.d.findIndex(d=>d.slice(0,4)>=BT.from),b=D.d.length-1;while(b>0&&D.d[b].slice(0,4)>BT.to)b--;
  if(a<0||b-a<60){out.innerHTML=`<div class="card"><p>Pick a wider date range: at least 60 prices are needed.</p></div>`;return}
  const d=D.d.slice(a,b+1),c=D.c.slice(a,b+1),n=c.length,ppy=periodsPerYear(d),sp=BT.split>=100?n-1:Math.floor((n-1)*BT.split/100);
  const pos=st.signal(c,BT.p,BT.short),{ret,bh}=runBT(c,pos,BT.cost),hold=c.map(()=>1);
  const S1=stats(ret,pos,0,n-1,ppy),SI=stats(ret,pos,0,sp,ppy),SO=sp<n-1?stats(ret,pos,sp,n-1,ppy):null,B1=stats(bh,hold,0,n-1,ppy),BO=SO?stats(bh,hold,sp,n-1,ppy):null;
  if(++BT_RUNS_TODAY===1)bumpDay("bt");
  const eq=[1],eb=[1];for(let t=1;t<n;t++){eq.push(eq[t-1]*(1+ret[t]));eb.push(eb[t-1]*(1+bh[t]))}
  const dd=[],ddb=[];let pk=1,pkb=1;for(let t=0;t<n;t++){pk=Math.max(pk,eq[t]);pkb=Math.max(pkb,eb[t]);dd.push(eq[t]/pk-1);ddb.push(eb[t]/pkb-1)}
  const step=Math.max(1,Math.floor(n/1400)),idx=[];for(let t=0;t<n;t+=step)idx.push(t);if(idx[idx.length-1]!==n-1)idx.push(n-1);
  const yrsSpan=(Date.parse(d[n-1])-Date.parse(d[0]))/3.156e10,xf=v=>{const i=clamp(Math.round(v),0,n-1);return yrsSpan>3?d[i].slice(0,4):new Date(d[i]).toLocaleDateString("en-GB",{month:"short",year:"2-digit"})};
  const bands=[];let s0=null;for(let t=0;t<=n;t++){const p=t<n?pos[t]:0;if(s0&&p!==s0.p){bands.push({x0:s0.t,x1:t,cls:s0.p>0?"s3":"s2",alpha:.12});s0=null}if(!s0&&p!==0&&t<n)s0={t,p}}
  const fmtS=(s,k)=>!s?"–":k==="sharpe"||k==="sortino"||k==="calmar"?f2(s[k]):k==="trades"?String(s[k]):k==="win"?(isFinite(s.win)?pctf(s.win,0):"–"):pctf(s[k],1);
  const rowsDef=[["Total return","total"],["CAGR (per year)","cagr"],["Volatility (per year)","vol"],["Sharpe ratio","sharpe"],["Sortino ratio","sortino"],["Max drawdown","mdd"],["Calmar ratio","calmar"],["Trades","trades"],["Winning trades","win"],["Time in market","exp"]];
  const years={};for(let t=1;t<n;t++){const y=d[t].slice(0,4);(years[y]=years[y]||[1,1]);years[y][0]*=1+ret[t];years[y][1]*=1+bh[t]}
  out.innerHTML=`${st.valid&&!st.valid(BT.p)?`<div class="banner">${esc(st.invalidMsg)}</div>`:""}<div class="card stack"><h3>Results · ${esc(st.name)} on ${esc(D.name)}</h3>
    <div class="stats">${stat("Sharpe (all)",f2(S1.sharpe))}${stat("Sharpe in test",SO?f2(SO.sharpe):"no test split")}${stat("CAGR",pctf(S1.cagr))}${stat("Max drawdown",pctf(S1.mdd))}${stat("Buy-and-hold Sharpe",f2(B1.sharpe))}${stat("Trades",String(S1.trades))}</div>
    <div><h3>Price${st.id==="ma"?" and moving averages":""} · shaded when in a position</h3><div id="btp"></div></div>
    <div><h3>Growth of £1</h3><div id="bte"></div></div>
    <div><h3>Drawdown from peak</h3><div id="btdd"></div></div>
    <div class="tablewrap"><table class="kv mtab"><thead><tr><th></th><th>Strategy, all</th><th>Training</th><th>Test</th><th>Buy and hold</th><th>B&amp;H test</th></tr></thead><tbody>${rowsDef.map(([l,k])=>`<tr><th>${l}</th><td>${fmtS(S1,k)}</td><td>${fmtS(SI,k)}</td><td>${fmtS(SO,k)}</td><td>${fmtS(B1,k)}</td><td>${fmtS(BO,k)}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted small">Sharpe and Sortino assume a zero risk-free rate. ${ppy===252?"Daily":ppy===52?"Weekly":"Monthly"} data, annualised with ${ppy} periods a year. Costs are charged on every change in position.</p>
    <details><summary>Year-by-year returns</summary><div class="tablewrap"><table class="kv mtab"><thead><tr><th>Year</th><th>Strategy</th><th>Buy and hold</th></tr></thead><tbody>${Object.entries(years).map(([y,[s,h]])=>`<tr><th>${y}</th><td class="${s>=1?"pos":"neg"}">${pctf(s-1,1)}</td><td class="${h>=1?"pos":"neg"}">${pctf(h-1,1)}</td></tr>`).join("")}</tbody></table></div></details>
    <details class="maths"><summary>Show the code</summary><pre>${esc(st.signal.toString())}</pre><p class="small">pos[t] is the position held from day t's close to day t+1's close, so a signal can only use prices up to day t. Strategy return on day t+1 = pos[t] × price return − cost × |change in position|.</p></details>
    </div>
    <div class="card stack"><h3>Desk review of this backtest</h3><ul class="tips">${btCritique(st,S1,SI,SO,B1,BO,BT,ppy,n).map(t=>`<li>${t}</li>`).join("")}</ul><div class="row">${reportLink("Backtest: "+st.name+" on "+D.name)}</div></div>
    ${st.sweep?`<div class="card stack"><h3>Parameter sweep · the overfitting test</h3><p class="muted measure">Every cell is a full backtest on the training data, coloured by Sharpe ratio. Click a cell to use those settings. Then look at the test Sharpe of the best training cell: it's usually much lower. Picking the best of many tries is how backtests lie.</p><div id="btsw"></div><p class="small" id="btswnote"></p></div>`:""}
    <div class="card stack"><h3>What to watch for</h3><ul class="tips">
      <li><b>Look-ahead bias.</b> Using information you wouldn't have had at the time. Here every signal is lagged one period.</li>
      <li><b>Overfitting.</b> Tuning parameters until the past looks great. Judge a strategy on the test period it never saw.</li>
      <li><b>Costs.</b> Strategies that trade a lot (try RSI with period 2) can look brilliant at 0 bps and lose money at 10 bps.</li>
      <li><b>Survivorship.</b> Apple and Google are here because they survived and won. A strategy tested only on winners looks better than it is.</li>
      <li><b>One path.</b> History happened once. A Sharpe of 0.5 over 10 years has a standard error of about 0.3.</li></ul></div>`;
  const tipAt=x=>{const i=clamp(Math.round(x),0,n-1);return`<b>${d[i]}</b><br>Price ${fmtTick(c[i])}<br>Position ${pos[i]>0?"long":pos[i]<0?"short":"flat"}<br>Strategy £${f2(eq[i])} · B&amp;H £${f2(eb[i])}`};
  const snap=x=>clamp(Math.round(x),0,n-1);const split=SO?[{x:sp,label:"test starts"}]:[];
  const pc=chartBox(out.querySelector("#btp"),"Price"),ec=chartBox(out.querySelector("#bte"),"Growth of one pound"),dc=chartBox(out.querySelector("#btdd"),"Drawdown");
  const pser=[{pts:idx.map(t=>[t,c[t]]),cls:"muted",w:1.5,label:"Price"}];
  if(st.id==="ma"){const f=rollMean(c,BT.p.fast),s=rollMean(c,BT.p.slow);pser.push({pts:idx.filter(t=>!isNaN(f[t])).map(t=>[t,f[t]]),cls:"s1",label:`${BT.p.fast}-period average`},{pts:idx.filter(t=>!isNaN(s[t])).map(t=>[t,s[t]]),cls:"s2",label:`${BT.p.slow}-period average`})}
  const cmin=Math.min(...c),cmax=Math.max(...c);
  chart(pc,{h:220,xr:[0,n-1],yr:[cmin*0.95,cmax*1.05],logy:cmax/cmin>4,xfmt:xf,series:pser,bands,refX:split,snap,tip:tipAt,legend:true});
  const emin=Math.min(...eq,...eb),emax=Math.max(...eq,...eb);
  chart(ec,{h:220,xr:[0,n-1],yr:[emin*0.9,emax*1.1],logy:emax/emin>3,xfmt:xf,yfmt:v=>"£"+fmtTick(r4(v)),series:[{pts:idx.map(t=>[t,eb[t]]),cls:"s2",dash:[5,4],label:"Buy and hold"},{pts:idx.map(t=>[t,eq[t]]),cls:"s1",label:st.name}],refY:[{y:1}],refX:split,snap,tip:tipAt});
  const dmin=Math.min(...dd,...ddb);
  chart(dc,{h:160,xr:[0,n-1],yr:[dmin*1.1,0],xfmt:xf,yfmt:v=>Math.round(v*100)+"%",series:[{pts:idx.map(t=>[t,ddb[t]]),cls:"s2",dash:[5,4],label:"Buy and hold"},{pts:idx.map(t=>[t,dd[t]]),cls:"s1",fill:true,label:st.name}],refX:split,snap,
    tip:x=>{const i=snap(x);return`<b>${d[i]}</b><br>Strategy ${pctf(dd[i])}<br>Buy and hold ${pctf(ddb[i])}`}});
  if(st.sweep)drawSweep(out.querySelector("#btsw"),out.querySelector("#btswnote"),st,c,sp,ppy);
}
/* The questions a PM would ask about this backtest, answered from its numbers */
function btCritique(st,S1,SI,SO,B1,BO,cfg,ppy,n){
  const out=[];const f=x=>esc(f2(x));
  if(st.id==="hold")return["This is the benchmark. Pick a strategy above and see whether it beats buy and hold after costs."];
  if(st.valid&&!st.valid(cfg.p))return["These parameters never trade, so there's nothing to review."];
  if(SO){const drop=SI.sharpe-SO.sharpe;
    if(SI.sharpe>0.3&&drop>0.5)out.push(`<b>Likely overfit.</b> Sharpe fell from ${f(SI.sharpe)} in training to ${f(SO.sharpe)} on the test data. Rules tuned on the past often fade.`);
    else if(SO.sharpe>=SI.sharpe-0.2&&SO.sharpe>0.3)out.push(`<b>Held up out of sample.</b> Test Sharpe ${f(SO.sharpe)} vs training ${f(SI.sharpe)}. That's the result you want, though one test period is still one sample.`);
    if(BO&&SO.sharpe<BO.sharpe)out.push(`<b>Lost to buy and hold</b> on the test period (Sharpe ${f(SO.sharpe)} vs ${f(BO.sharpe)}). A PM would ask why take the extra complexity.`);
  }else out.push("<b>No test period.</b> Set training data below 100% so you can judge the rule on data it never saw.");
  const se=1/Math.sqrt(Math.max(0.5,S1.yrs));
  out.push(`<b>Is it significant?</b> Over ${S1.yrs.toFixed(1)} years a Sharpe estimate has a standard error of about ${f(se)}. Yours is ${f(S1.sharpe)}, ${Math.abs(S1.sharpe)>2*se?"more than two standard errors from zero":"within two standard errors of zero, so it could be luck"}.`);
  const turns=S1.trades/Math.max(0.1,S1.yrs);
  if(turns>20)out.push(`<b>High turnover:</b> about ${Math.round(turns)} trades a year. Each round trip costs ${2*cfg.cost} bps here; real spreads and slippage can be higher. Try 10–20 bps and see if it survives.`);
  if(S1.mdd<B1.mdd*0.6&&S1.cagr>0)out.push(`<b>Smoother ride:</b> max drawdown ${pctf(S1.mdd)} vs ${pctf(B1.mdd)} for buy and hold. Many strategies earn their keep by cutting crashes, not by beating returns.`);
  else if(S1.mdd<-0.4)out.push(`<b>Deep drawdown</b> of ${pctf(S1.mdd)}. Would you have kept running this after losing that much? Most investors wouldn't.`);
  if(S1.exp<0.35)out.push(`<b>Mostly in cash</b> (${pctf(S1.exp,0)} of the time). Compare returns per unit of time invested, or use the idle capital elsewhere.`);
  if(cfg.short&&S1.sharpe<0)out.push("<b>Shorting hurt.</b> Equities drift up over time, so short signals fight the trend. Try long-only.");
  return out;
}
function drawSweep(host,note,st,c,sp,ppy){
  const sw=st.sweep,grid=[];let best=null;const n=c.length;
  for(const bv of sw.bv){const row=[];for(const av of sw.av){const p={...BT.p,[sw.a]:av,[sw.b]:bv};if(st.valid&&!st.valid(p)){row.push({av,bv,si:NaN,so:NaN,bad:true});continue}const pos=st.signal(c,p,BT.short),{ret}=runBT(c,pos,BT.cost);
    const si=stats(ret,pos,0,sp,ppy),so=sp<n-1?stats(ret,pos,sp,n-1,ppy):null;const cell={av,bv,si:si?si.sharpe:0,so:so?so.sharpe:NaN};row.push(cell);if(!best||cell.si>best.si)best=cell}grid.push(row)}
  const lim=Math.max(0.5,...grid.flat().filter(x=>!x.bad).map(x=>Math.abs(x.si)));
  const color=v=>{const t=clamp(Math.abs(v)/lim,0,1);return`color-mix(in srgb,var(${v>=0?"--s1":"--s2"}) ${Math.round(12+t*78)}%,var(--surface))`};
  const pa=st.params.find(p=>p.id===sw.a),pb=st.params.find(p=>p.id===sw.b);
  host.innerHTML=`<div class="tablewrap"><table class="heat2"><caption class="sr">Training Sharpe ratio for each parameter pair</caption><thead><tr><th>${esc(pb.label)} ↓ · ${esc(pa.label)} →</th>${sw.av.map(a=>`<th>${a}</th>`).join("")}</tr></thead><tbody>${grid.map(row=>`<tr><th>${row[0].bv}</th>${row.map(x=>x.bad?`<td><span class="na" title="Not valid">–</span></td>`:`<td><button style="background:${color(x.si)}" class="${x===best?"best":""} ${x.av===BT.p[sw.a]&&x.bv===BT.p[sw.b]?"cur":""}" data-a="${x.av}" data-b="${x.bv}" title="Training Sharpe ${f2(x.si)}, test Sharpe ${isFinite(x.so)?f2(x.so):"–"}" aria-label="${pa.label} ${x.av}, ${pb.label} ${x.bv}: training Sharpe ${f2(x.si)}">${f2(x.si)}</button></td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="calkey muted small" style="justify-content:flex-start"><span>Negative Sharpe</span><i style="background:${color(-lim)}"></i><i style="background:${color(0)}"></i><i style="background:${color(lim)}"></i><span>Positive</span></div>`;
  host.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{BT.p[sw.a]=Number(b.dataset.a);BT.p[sw.b]=Number(b.dataset.b);
    const v=$("#v-backtest");for(const k of [sw.a,sw.b]){const el=v.querySelector("#bp-"+k);if(el){el.value=BT.p[k];v.querySelector("#bp-"+k+"v").textContent=BT.p[k]}}drawBT(v.querySelector("#btout"))});
  const avgSo=mean(grid.flat().map(x=>x.so).filter(isFinite));if(!best)return;
  note.textContent=isFinite(best.so)?`Best training cell: ${pa.label.toLowerCase()} ${best.av}, ${pb.label.toLowerCase()} ${best.bv}, with training Sharpe ${f2(best.si)}. On the test data it scored ${f2(best.so)}${best.so<best.si-0.3?": much worse, which is overfitting in action":""}. The average test Sharpe across every cell was ${f2(avgSo)}.`:`Set training data below 100% to see how the best cell does on unseen data.`;
}

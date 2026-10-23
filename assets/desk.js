"use strict";
/* Quant Desk: market-making simulator. You quote a two-sided market on a contract whose value is revealed bit by bit.
   Bots trade against you: noise traders trade at random, informed traders know more than you and only trade when you're wrong. */

const DESK_SCEN={
 dice:{name:"Sum of 10 dice",short:"Dice",rounds:10,wref:6,tick:0.5,
  blurb:"The contract settles at the sum of 10 fair dice. One die is revealed at the end of each round.",
  setup(){return{items:Array.from({length:10},()=>ri(1,6))}},
  fv(g,k){return g.items.slice(0,k).reduce((a,b)=>a+b,0)+3.5*(10-k)},
  informed(g,k,see){const s=Math.min(10,k+see);return g.items.slice(0,s).reduce((a,b)=>a+b,0)+3.5*(10-s)},
  final(g){return g.items.reduce((a,b)=>a+b,0)},
  shown(g,k){return g.items.slice(0,k).map(d=>`<span class="die" aria-label="die ${d}">${d}</span>`).join("")+Array.from({length:10-k},()=>`<span class="die hid" aria-label="hidden die">?</span>`).join("")},
  hint:"Fair value = revealed sum + 3.5 × dice still hidden. Each hidden die adds variance 35/12, so the uncertainty shrinks every round."},
 cards:{name:"Sum of 8 cards",short:"Cards",rounds:8,wref:10,tick:0.5,
  blurb:"The contract settles at the sum of 8 cards dealt from a 52-card deck (Ace = 1 … King = 13), without replacement. One card is revealed each round.",
  setup(){const deck=[];for(let r=1;r<=13;r++)for(let s=0;s<4;s++)deck.push(r);for(let i=deck.length-1;i>0;i--){const j=ri(0,i);[deck[i],deck[j]]=[deck[j],deck[i]]}return{items:deck.slice(0,8)}},
  fv(g,k){const seen=g.items.slice(0,k),rest=364-seen.reduce((a,b)=>a+b,0);return seen.reduce((a,b)=>a+b,0)+(8-k)*rest/(52-k)},
  informed(g,k,see){return this.fv(g,Math.min(8,k+see))},
  final(g){return g.items.reduce((a,b)=>a+b,0)},
  shown(g,k){const n=["","A","2","3","4","5","6","7","8","9","10","J","Q","K"];return g.items.slice(0,k).map(c=>`<span class="die card" aria-label="card ${c}">${n[c]}</span>`).join("")+Array.from({length:8-k},()=>`<span class="die card hid" aria-label="hidden card">?</span>`).join("")},
  hint:"Fair value = revealed sum + cards left × average of the cards still in the deck (364 minus what you've seen, divided by cards remaining). Seeing low cards raises the value of the rest."},
 stock:{name:"Mystery stock",short:"Stock",rounds:10,wref:8,tick:0.5,
  blurb:"A stock's true value is hidden: it starts with a prior of 100 ± 10. Each round a noisy news signal (true value ± 6) is published.",
  setup(){const V=Math.round(100+10*randn());return{V,items:Array.from({length:10},()=>Math.round(V+6*randn()))}},
  fv(g,k){const s=g.items.slice(0,k);return(100/100+s.reduce((a,b)=>a+b,0)/36)/(1/100+k/36)},
  informed(g,k,see){return see>=3?g.V:this.fv(g,Math.min(10,k+see*2))},
  final(g){return g.V},
  shown(g,k){return g.items.slice(0,k).map(s=>`<span class="die wide">${s}</span>`).join("")+Array.from({length:10-k},()=>`<span class="die wide hid">?</span>`).join("")},
  hint:"With a normal prior and normal signals, fair value is a precision-weighted average: (100/10² + Σsignals/6²) ÷ (1/10² + n/6²). Early signals move it a lot, later ones less."},
};
const DESK_DIFF={
 easy:{name:"Easy",alpha:0.2,see:2,limit:20,helper:true,desc:"Fair value shown. 1 in 5 traders is informed."},
 normal:{name:"Normal",alpha:0.35,see:3,limit:15,helper:false,desc:"Work out fair value yourself. About 1 in 3 traders is informed."},
 hard:{name:"Hard",alpha:0.5,see:4,limit:10,helper:false,desc:"Half the flow is informed and knows more. Tight position limit."},
};
let DESK_PICK={scen:"dice",diff:"normal"};
function renderDesk(){
  const host=$("#v-desk");const g=S.games.desk||(S.games.desk={best:0,hist:[]});
  host.innerHTML=`<div class="card stack"><h3>Market-making simulator</h3><h2>Quote two-sided markets against informed and random traders</h2>
    <p class="muted measure">This is the game trading interviews play. Each round you quote a bid and an ask. Some traders are noise: they trade at random and pay you the spread. Some are informed: they know more than you and only trade when your price is wrong. That's adverse selection. Finish with the best P&L.</p>
    <details class="maths"><summary>How to play well</summary><ul class="tips">
      <li><b>Centre on fair value.</b> Your mid should be your best estimate of what the contract settles at.</li>
      <li><b>Width pays for risk.</b> Wider markets lose less to informed traders but trade less with noise traders. Tighten as the uncertainty falls.</li>
      <li><b>Skew against your position.</b> Long 6 lots? Lower both bid and ask so you're more likely to sell. Short? Raise them.</li>
      <li><b>Flow is information.</b> If people keep buying from you, the value is probably higher than you think. Move up.</li>
      <li><b>Update after every reveal.</b> Recompute fair value before you quote again.</li></ul></details>
    <div class="pickrow"><span class="small muted">Contract</span><div class="row" role="group" aria-label="Contract">${Object.entries(DESK_SCEN).map(([k,v])=>`<button class="btn ghost chip" data-scen="${k}" aria-pressed="${k===DESK_PICK.scen}">${esc(v.name)}</button>`).join("")}</div></div>
    <div class="pickrow"><span class="small muted">Difficulty</span><div class="row" role="group" aria-label="Difficulty">${Object.entries(DESK_DIFF).map(([k,v])=>`<button class="btn ghost chip" data-diff="${k}" aria-pressed="${k===DESK_PICK.diff}">${v.name}</button>`).join("")}</div></div>
    <p class="small" id="dkdesc"></p>
    <div class="row"><button class="btn accent" id="dkgo">Start trading</button><span class="kbd">Best P&L ${g.hist.length?f2(g.best):"–"} · ${g.hist.length} sessions</span></div></div>
    <div id="dkhost"></div>`;
  const desc=()=>{host.querySelector("#dkdesc").textContent=`${DESK_SCEN[DESK_PICK.scen].blurb} ${DESK_DIFF[DESK_PICK.diff].desc}`};desc();
  host.querySelectorAll("[data-scen]").forEach(b=>b.onclick=()=>{DESK_PICK.scen=b.dataset.scen;host.querySelectorAll("[data-scen]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));desc()});
  host.querySelectorAll("[data-diff]").forEach(b=>b.onclick=()=>{DESK_PICK.diff=b.dataset.diff;host.querySelectorAll("[data-diff]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));desc()});
  host.querySelector("#dkgo").onclick=()=>{const h=host.querySelector("#dkhost");playDesk(h,DESK_PICK.scen,DESK_PICK.diff);h.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"})};
}
function playDesk(host,sk,dk){
  const sc=DESK_SCEN[sk],df=DESK_DIFF[dk],game=sc.setup(),R=sc.rounds,V=sc.final(game);
  let k=0,pos=0,cash=0,bid=null,ask=null;const fills=[],marks=[[0,0]],posh=[[0,0]],quotes=[];
  const fv0=sc.fv(game,0);bid=Math.floor((fv0-sc.wref/2)/sc.tick)*sc.tick;ask=Math.ceil((fv0+sc.wref/2)/sc.tick)*sc.tick;
  host.innerHTML=`<div class="card stack ticket">
    <div class="meta"><span>${esc(sc.name)} · ${df.name}</span><span id="dkr"></span></div>
    <div class="reveal" id="dkrev"></div>
    <div class="stats" id="dkst"></div>
    <div class="mm"><label class="b" for="dkb">Bid<input type="text" id="dkb" inputmode="decimal" autocomplete="off"></label><label class="a" for="dka">Ask<input type="text" id="dka" inputmode="decimal" autocomplete="off"></label></div>
    <div class="row nudges" role="group" aria-label="Adjust quotes">
      <button class="btn ghost chip" data-sh="-1">Both −1</button><button class="btn ghost chip" data-sh="-0.5">Both −0.5</button><button class="btn ghost chip" data-sh="0.5">Both +0.5</button><button class="btn ghost chip" data-sh="1">Both +1</button>
      <button class="btn ghost chip" data-w="-1">Tighter</button><button class="btn ghost chip" data-w="1">Wider</button>${df.helper?`<button class="btn ghost chip" id="dkctr">Centre on fair value</button>`:""}</div>
    <div class="row"><button class="btn accent" id="dkq">Quote this round</button><span class="kbd">Enter to quote</span><span class="small" id="dkmsg" role="status"></span></div>
    <div class="list" id="dkfills" aria-live="polite"></div>
    <div class="cols2"><div><h3>P&L (marked to fair value)</h3><div id="dkpnl"></div></div><div><h3>Position</h3><div id="dkpos"></div></div></div>
    ${df.helper?`<p class="muted small">${esc(sc.hint)}</p>`:`<details class="maths"><summary>Hint: how to compute fair value</summary><p>${esc(sc.hint)}</p></details>`}</div>`;
  const $h=s=>host.querySelector(s);const pc=chartBox($h("#dkpnl"),"P&L by round"),qc=chartBox($h("#dkpos"),"Position by round");
  const setQ=()=>{$h("#dkb").value=f2(bid).replace(/\.00$/,"");$h("#dka").value=f2(ask).replace(/\.00$/,"")};
  const readQ=()=>{const b=parseNum($h("#dkb").value),a=parseNum($h("#dka").value);return isFinite(b)&&isFinite(a)?[b,a]:null};
  const fvNow=()=>k>=R?V:sc.fv(game,k);
  const status=()=>{const mark=cash+pos*fvNow();
    $h("#dkr").textContent=k<R?`Round ${k+1} of ${R}`:"Settled";$h("#dkrev").innerHTML=sc.shown(game,k);
    $h("#dkst").innerHTML=stat("Position",(pos>0?"+":"")+pos+` / ±${df.limit}`)+stat("Cash",f2(cash))+stat("P&L marked",f2(mark))+(k>=R?stat("Settlement value",f2(V)):df.helper?stat("Fair value now",f2(fvNow())):stat("Revealed so far",String(k)))+stat("Fills",String(fills.length));
    const ys=marks.map(m=>m[1]);chart(pc,{h:150,xr:[0,R],yr:[Math.min(-5,...ys)*1.15,Math.max(5,...ys)*1.15],xlabel:"round",series:[{pts:marks,cls:"s1",label:"P&L"}],refY:[{y:0}],snap:x=>clamp(Math.round(x),0,marks.length-1),tip:x=>`<b>After round ${x}</b><br>P&L ${f2(marks[x][1])}`});
    chart(qc,{h:150,xr:[0,R],yr:[-df.limit,df.limit],xlabel:"round",series:[{pts:posh.flatMap(([x,v],i)=>i?[[x,posh[i-1][1]],[x,v]]:[[x,v]]),cls:"s3",label:"Position",fill:true}],refY:[{y:0}],snap:x=>clamp(Math.round(x),0,posh.length-1),tip:x=>`<b>After round ${x}</b><br>Position ${posh[x][1]}`});};
  function round(){
    const q=readQ();const m=$h("#dkmsg");
    if(!q||q[0]>=q[1]){m.textContent="Enter a bid below your ask.";return}
    [bid,ask]=q;m.textContent="";const width=ask-bid,fv=fvNow(),inf=sc.informed(game,k,df.see);quotes.push({k,bid,ask,fv,pos});
    const arrivals=4,got=[];
    for(let i=0;i<arrivals;i++){
      const informed=Math.random()<df.alpha;let side=null;
      if(informed){if(ask<=inf-0.25)side="buy";else if(bid>=inf+0.25)side="sell"}
      else if(Math.random()<clamp(1.1-width/sc.wref,0.08,0.9))side=Math.random()<.5?"buy":"sell";
      if(!side)continue;
      let size=ri(1,informed?3:2);
      if(side==="buy")size=Math.min(size,df.limit+pos);else size=Math.min(size,df.limit-pos);
      if(size<=0){got.push({blocked:true,side});continue}
      if(side==="buy"){pos-=size;cash+=ask*size}else{pos+=size;cash-=bid*size}
      const f={k:k+1,side,price:side==="buy"?ask:bid,size,informed};fills.push(f);got.push(f);
    }
    k++;marks.push([k,cash+pos*fvNow()]);posh.push([k,pos]);
    const lines=got.length?got.map(f=>f.blocked?`<div><span>A trader wanted to ${f.side==="buy"?"buy":"sell"}</span><span class="muted small">blocked by your position limit</span></div>`:`<div><span>${f.side==="buy"?`Someone <b>bought ${f.size}</b> from you at ${f2(f.price)}`:`Someone <b>sold ${f.size}</b> to you at ${f2(f.price)}`}</span><span class="muted small tabular">round ${f.k}</span></div>`).join(""):`<div><span class="muted">No trades this round.</span></div>`;
    $h("#dkfills").innerHTML=lines;
    if(k>=R)return settle();
    status();
  }
  function settle(){
    const pnl=cash+pos*V;let noise=0,infl=0,nn=0,ni=0;
    for(const f of fills){const e=(f.side==="buy"?f.price-V:V-f.price)*f.size;if(f.informed){infl+=e;ni+=f.size}else{noise+=e;nn+=f.size}}
    const avgW=mean(quotes.map(q=>q.ask-q.bid)),miss=mean(quotes.map(q=>Math.abs((q.bid+q.ask)/2-q.fv)));
    const leaned=quotes.filter(q=>Math.abs(q.pos)>=3);const skewOK=leaned.length>=3?leaned.filter(q=>Math.sign((q.bid+q.ask)/2-q.fv)===-Math.sign(q.pos)).length/leaned.length:null;
    const tips=[];
    if(miss>sc.wref/3)tips.push(`Your mid was ${f2(miss)} away from fair value on average. Recompute fair value after every reveal and centre on it.`);
    if(infl<-Math.max(5,noise*0.6))tips.push("Informed traders took a big share. Widen early when uncertainty is high, and move your quotes in the direction people are trading.");
    if(avgW>sc.wref*1.1&&nn<6)tips.push("Your markets were wide, so few noise traders dealt with you. Tighten as the uncertainty falls to earn more spread.");
    if(skewOK!=null&&skewOK<0.5)tips.push(`You leaned against your position only ${Math.round(skewOK*100)}% of the time. When long, shade both quotes down; when short, shade them up.`);
    if(Math.abs(pos)>=df.limit*0.8)tips.push("You finished near your position limit. Big inventory makes the final reveal a coin flip on your P&L.");
    if(!tips.length)tips.push("Solid session: centred quotes, sensible width and controlled inventory. Try a harder difficulty.");
    const g=S.games.desk||(S.games.desk={best:0,hist:[]});const first=!g.hist.length,best=first||pnl>g.best;if(best)g.best=Math.round(pnl*100)/100;
    g.hist.push({d:todayKey(),s:Math.round(pnl*100)/100,sc:sk,df:dk});g.hist=g.hist.slice(-60);bumpDay("g");
    marks[marks.length-1]=[k,pnl];status();
    host.querySelector(".ticket").insertAdjacentHTML("beforeend",`<div class="fb ${pnl>=0?"ok":"bad"} stack">
      <span class="verdict">Settled at ${f2(V)}. Final P&L ${pnl>=0?"+":""}${f2(pnl)}${best?" · new best":""}</span>
      <div class="stats">${stat("From noise traders",(noise>=0?"+":"")+f2(noise)+` (${nn} lots)`)}${stat("From informed traders",(infl>=0?"+":"")+f2(infl)+` (${ni} lots)`)}${stat("Average width",f2(avgW))}${stat("Mid vs fair value",f2(miss))}</div>
      <p class="small">Noise traders pay you the spread; informed traders take it back. The split above is the adverse-selection lesson in numbers.</p>
      <ul class="tips">${tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>
      <details><summary>Full trade blotter with counterparties revealed</summary><table class="kv blot"><thead><tr><th>Round</th><th>Trade</th><th>Price</th><th>Lots</th><th>Who</th><th>Your edge</th></tr></thead><tbody>${fills.map(f=>`<tr><td>${f.k}</td><td>${f.side==="buy"?"you sold":"you bought"}</td><td>${f2(f.price)}</td><td>${f.size}</td><td>${f.informed?"informed":"noise"}</td><td>${f2((f.side==="buy"?f.price-V:V-f.price)*f.size)}</td></tr>`).join("")||`<tr><td colspan="6">No trades</td></tr>`}</tbody></table></details>
      <div class="row"><button class="btn accent" id="dkagain">Play again</button></div></div>`);
    host.querySelectorAll("#dkq,[data-sh],[data-w],#dkctr,#dkb,#dka").forEach(e=>e.disabled=true);
    host.querySelector("#dkagain").onclick=()=>playDesk(host,sk,dk);
    const kb=document.querySelector("#v-desk .kbd");if(kb)kb.textContent=`Best P&L ${f2(g.best)} · ${g.hist.length} sessions`;
  }
  host.querySelectorAll("[data-sh]").forEach(b=>b.onclick=()=>{const q=readQ();if(!q)return;const d=Number(b.dataset.sh);bid=q[0]+d;ask=q[1]+d;setQ()});
  host.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{const q=readQ();if(!q)return;const d=Number(b.dataset.w)*sc.tick;if(q[1]-q[0]+2*d<=0)return;bid=q[0]-d;ask=q[1]+d;setQ()});
  const ctr=host.querySelector("#dkctr");if(ctr)ctr.onclick=()=>{const q=readQ()||[bid,ask];const w=(q[1]-q[0])/2,fv=fvNow();bid=Math.round((fv-w)/sc.tick)*sc.tick;ask=Math.round((fv+w)/sc.tick)*sc.tick;setQ()};
  host.querySelectorAll("#dkb,#dka").forEach(el=>el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();round()}}));
  host.querySelector("#dkq").onclick=round;
  setQ();status();
}

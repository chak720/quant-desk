"use strict";
/* Quant Desk UI */
/* ---------- question runner ---------- */

function runner(host,{questions,next,onDone,title,showProgress=true,onAnswer}){
  let i=0,start=0,list=questions||[],tick=null;
  function current(){return list[i]||(next?(list[i]=next(i)):null)}
  function draw(){
    const q=current();if(!q){onDone&&onDone();return}
    start=performance.now();clearInterval(tick);const tgt=targetSecs(q);
    const total=questions?questions.length:null;
    host.innerHTML=`<div class="card ticket qin">
      <div class="meta"><span>${esc(title||"")}${total?` · ${i+1} / ${total}`:""}</span><span>${esc(SKILL_NAME[q.skill])} · ${esc(q.label||(q.mm?"make a market":SKILLS[q.skill].subs[q.sub].label))} · L${q.L}${q.review?" · review":""}</span></div>
      ${showProgress&&total?`<div class="progressbar"><i style="width:${Math.max(0,i-1)/total*100}%" data-w="${i/total*100}"></i></div>`:""}
      <div class="row" style="justify-content:space-between;gap:8px"><span class="kbd">Target <b style="color:var(--ink)">${tgt}s</b> · interview pace</span><span class="tabular" id="qclock" style="font:600 14px var(--mono)">0s</span></div>
      <div class="q">${esc(q.q)}</div>
      ${q.mm?`<div class="mm"><label class="b" for="bid">Bid<input type="text" id="bid" inputmode="decimal" autocomplete="off"></label><label class="a" for="ask">Ask<input type="text" id="ask" inputmode="decimal" autocomplete="off"></label></div>
        <p class="muted" style="font-size:13px">Quote a range you think contains the true value. Tighter scores more, but a miss scores zero.</p>`
      :`<input type="text" id="ans" inputmode="decimal" autocomplete="off" placeholder="${q.pct?"Answer in %, e.g. 12.5":"Answer: 1/6, 0.167 or 16.7%"}">`}
      <div class="row"><button class="btn" id="submit">Submit</button><button class="btn ghost" id="skip">I don't know</button><span class="kbd">Enter to submit</span></div>
      <div id="fbhost"></div></div>`;
    const pb=host.querySelector(".progressbar i");if(pb)requestAnimationFrame(()=>requestAnimationFrame(()=>{pb.style.width=pb.dataset.w+"%"}));
    const clk=host.querySelector("#qclock");
    tick=setInterval(()=>{if(!clk.isConnected){clearInterval(tick);return}const t=(performance.now()-start)/1000;clk.textContent=Math.floor(t)+"s";clk.style.color=t>tgt?"var(--warn)":"var(--ink)"},250);
    const inp=host.querySelector(q.mm?"#bid":"#ans");inp.focus({preventScroll:true});
    host.querySelectorAll("input").forEach(el=>el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();host.querySelector("#submit").click()}}));
    host.querySelector("#submit").addEventListener("click",()=>safe(false));
    host.querySelector("#skip").addEventListener("click",()=>safe(true));
  }
  function safe(skipped){try{answer(skipped)}catch(e){flash("Something went wrong saving that answer: "+(e&&e.message||e)+". Press Next to carry on.");console.error(e)}}
  function answer(skipped){
    const q=current();if(host.querySelector("#submit")?.disabled)return;clearInterval(tick);const ms=Math.round(performance.now()-start);const tgt=targetSecs(q);
    let ok,given,score=0,extra="";
    if(q.mm){const b=parseNum(host.querySelector("#bid").value),a=parseNum(host.querySelector("#ask").value);
      if(!skipped&&(isNaN(b)||isNaN(a)||a<b||b<=0)){flash("Enter a positive bid and an ask at or above it.");return}
      score=skipped?0:mmScore(b,a,q.ans);ok=score>0;given=skipped?"skip":`${b}–${a}`;
      extra=ok?`Inside your market. Width ×${r4(a/b)} → ${score} pts.`:(skipped?"":`True value was outside ${fmt(b)}–${fmt(a)}.`);
    }else{given=skipped?"skip":host.querySelector("#ans").value;const v=parseNum(given);
      if(!skipped&&isNaN(v)){flash("Enter a number, a fraction like 3/8, or a percentage.");return}
      ok=!skipped&&close(q.pct&&/%/.test(given)?v*100:v,q.ans,q.tol||{abs:1e-6,rel:1e-6});}
    record(q,given,ok,ms,score);onAnswer&&onAnswer(q,ok,score);for(const ev of LEVEL_EVENTS.splice(0))if(ev.to>ev.from)toast(`Level up: ${SKILL_NAME[ev.skill]} is now L${ev.to} ${LVL_NAME[ev.to]}`);
    host.querySelectorAll("input,#submit,#skip").forEach(el=>el.disabled=true);
    const card=host.querySelector(".ticket");card.classList.remove("qin");card.classList.add(ok?"good":"shake");
    const fb=host.querySelector("#fbhost");
    fb.innerHTML=`<div class="fb ${ok?"ok":"bad"}"><span class="verdict">${q.mm?(ok?`${score} / 100`:"0 / 100"):(ok?"Correct":"Not quite")} <span class="muted" style="font-weight:400">· ${(ms/1000).toFixed(1)}s of ${tgt}s target${ms>tgt*1000?" (over)":""}</span></span>
      ${extra?`<span>${esc(extra)}</span>`:""}
      <span class="muted">Answer: <span class="tabular" style="font-family:var(--mono)">${esc(fmt(q.ans))}</span></span>
      <div class="sol">${esc(q.sol)}</div>${q.src?`<span class="muted" style="font-size:12.5px">Source: ${/^https?:\/\//.test(q.src)?`<a href="${esc(q.src)}" target="_blank" rel="noopener" style="color:var(--accent)">${esc(q.src.replace(/^https?:\/\/(www\.)?/,"").slice(0,60))}</a>`:esc(q.src)}</span>`:""}</div>
      <div class="row" style="margin-top:10px"><button class="btn accent" id="nextbtn">Next</button>${!ok&&sampleFn?`<button class="btn ghost" id="explain">Explain this to me</button>`:""}</div><div id="exp" class="coachout" style="margin-top:10px"></div>`;
    const nb=fb.querySelector("#nextbtn");nb.focus({preventScroll:true});nb.onclick=()=>{i++;draw()};
    const ex=fb.querySelector("#explain");if(ex)ex.onclick=()=>explain(q,given,fb.querySelector("#exp"),ex);
  }
  function flash(t){const fb=host.querySelector("#fbhost");fb.innerHTML=`<p style="color:var(--ask);font-size:13px">${esc(t)}</p>`}
  draw();
  return{stop(){host.innerHTML=""}};
}


const GAMES=[
  {k:"sprint",name:"Arithmetic sprint",d:"120 seconds. Answers check as you type. Ranges grow with your mental maths rating.",fmt:b=>b,play:h=>playSprint(h)},
  {k:"mm",name:"Market maker",d:"Five estimates. Quote a bid and ask around the true value. Tight and right scores most.",fmt:b=>b+"/500",play:h=>playMM(h)},
  {k:"ladder",name:"Probability ladder",d:"Probability, EV and stats. Every two correct answers steps the level up. Three misses and you're out.",fmt:b=>b,play:h=>playLadder(h)},
  {k:"kelly",name:"Kelly casino",d:"40 flips of a biased coin. Size each bet and try to beat a bot that bets exactly Kelly.",fmt:b=>"£"+b,play:h=>playKelly(h)},
  {k:"desk",name:"Market-making simulator",d:"Quote dice, card and stock markets against informed and random traders. Opens the Desk tab.",fmt:b=>f2(b),play:()=>go("desk")},
];
function renderGames(){
  const host=$("#v-games");
  host.innerHTML=`<div class="games">${GAMES.map(G=>`<div class="card game"><div><h3>${esc(G.name)}</h3><p class="muted" style="margin-top:6px">${esc(G.d)}</p></div><div class="row" style="justify-content:space-between"><span class="kbd">Best <b class="tabular" style="color:var(--ink)" data-best="${G.k}">${S.games[G.k].hist.length?esc(G.fmt(S.games[G.k].best)):"–"}</b></span><button class="btn" ${READY?"":"disabled"} data-game="${G.k}">Play</button></div></div>`).join("")}</div><div id="gamehost"></div>`;
  host.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{const gh=host.querySelector("#gamehost");GAMES.find(G=>G.k===b.dataset.game).play(gh);gh.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"})});
}
function endGame(host,key,score,label){
  const g=S.games[key];const first=!g.hist.length;const best=first||score>g.best;if(best)g.best=score;g.hist.push({d:todayKey(),s:score});g.hist=g.hist.slice(-40);bumpDay("g");
  host.innerHTML=`<div class="card" style="display:flex;flex-direction:column;gap:10px"><h3>${esc(GAMES.find(G=>G.k===key).name)}</h3><div class="big tabular">${score}</div><p class="muted">${esc(label)}</p><p class="muted">${best?"New personal best.":`Best: ${g.best}`}</p><div class="row"><button class="btn" id="replay">Play again</button></div></div>`;
  host.querySelector("#replay").onclick=()=>GAMES.find(G=>G.k===key).play(host);
  renderGamesBests();
}
function renderGamesBests(){for(const G of GAMES){const b=document.querySelector(`[data-best="${G.k}"]`);if(b&&S.games[G.k].hist.length)b.textContent=G.fmt(S.games[G.k].best)}}
function playSprint(host){
  const L=levelFor("arith");let score=0,t0=performance.now(),cur,timer;
  const gen=()=>{const op=pick(["+","−","×","÷"]);const hi=[12,25,50,99,150][L-1],mh=[12,12,20,30,50][L-1];
    if(op==="+"){const a=ri(2,hi),b=ri(2,hi);return{q:`${a} + ${b}`,a:a+b}}
    if(op==="−"){const a=ri(2,hi),b=ri(2,hi);return{q:`${a+b} − ${a}`,a:b}}
    const a=ri(2,mh),b=ri(2,L>2?99:12);return op==="×"?{q:`${a} × ${b}`,a:a*b}:{q:`${a*b} ÷ ${a}`,a:b}};
  host.innerHTML=`<div class="card ticket"><div class="meta"><span>Arithmetic sprint · L${L}</span><span id="clock">120s</span></div><div class="progressbar"><i id="pb" style="width:100%"></i></div><div class="q big" id="sq"></div><input type="text" id="sin" inputmode="numeric" autocomplete="off"><div class="meta"><span>Score <b id="ss" style="color:var(--ink)">0</b></span><button class="btn ghost" id="sstop" style="padding:6px 10px">End</button></div></div>`;
  const sq=host.querySelector("#sq"),inp=host.querySelector("#sin");
  const nextQ=()=>{cur=gen();sq.textContent=cur.q;inp.value=""};nextQ();inp.focus({preventScroll:true});
  inp.oninput=()=>{if(Number(inp.value.trim())===cur.a){score++;host.querySelector("#ss").textContent=score;nextQ()}};
  const finish=()=>{clearInterval(timer);const day=S.days[todayKey()]||(S.days[todayKey()]={n:0,c:0,daily:false});
    S.ratings.arith=Math.round(S.ratings.arith+clamp((score-(20+L*6))*1.2,-20,20));S.lv.arith=clamp(lvOf("arith")+clamp((score-(20+L*6))/40,-0.2,0.3),1,5.99);endGame(host,"sprint",score,"Sprint score")};
  timer=setInterval(()=>{const left=Math.max(0,120-(performance.now()-t0)/1000);host.querySelector("#clock").textContent=Math.ceil(left)+"s";host.querySelector("#pb").style.width=left/120*100+"%";if(left<=0)finish()},200);
  host.querySelector("#sstop").onclick=finish;
}
function playMM(host){
  const pool=[...FERMI].sort(()=>Math.random()-.5).slice(0,5).map(f=>({skill:"mm",sub:"fermi",L:3,q:f[0],ans:f[1],mm:true,sol:`True value: ${fmt(f[1])}`}));let total=0;
  runner(host,{questions:pool,title:"Market maker",onAnswer:(q,ok,s)=>{total+=s},onDone:()=>endGame(host,"mm",total,"Market maker score")});
}
function playLadder(host){
  let lvl=1,streak=0,lives=3,score=0;const ks=["prob","ev","stats"];
  runner(host,{title:"Probability ladder",showProgress:false,next:()=>lives>0?{...makeQ(pick(ks),null,lvl),noStair:true}:null,onAnswer:(q,ok)=>{
    if(ok){score++;streak++;if(streak>=2){lvl=Math.min(5,lvl+1);streak=0}}else{lives--;streak=0}},onDone:()=>endGame(host,"ladder",score,"Ladder score")});
}

function renderProgress(){
  const host=$("#tab-progress");
  const weak=[];for(const k of SKILL_ORDER){const subs=k==="mm"?["fermi"]:Object.keys(SKILLS[k].subs);for(const s of subs){const st=subStat(k+"."+s);if(st.n>=2)weak.push({k,s,st,acc:st.c/st.n})}}
  weak.sort((a,b)=>a.acc-b.acc);
  const cells=[];const d=new Date();d.setDate(d.getDate()-34);
  for(let i=0;i<35;i++){const k=d.toLocaleDateString("en-CA");const v=S.days[k];const n=v?.n||0;cells.push(`<i class="${n>=20?"l3":n>=8?"l2":n>0?"l1":""} ${k===todayKey()?"today":""}" title="${k}: ${n} questions"></i>`);d.setDate(d.getDate()+1)}
  host.innerHTML=`<div class="grid">${SKILL_ORDER.map(k=>{const L=levelFor(k);const subs=k==="mm"?["fermi"]:Object.keys(SKILLS[k].subs);let n=0,c=0;subs.forEach(s=>{const st=subStat(k+"."+s);n+=st.n;c+=st.c});
      return`<div class="card skill"><div class="top"><h3>${esc(SKILL_NAME[k])}</h3><span class="lvl">L${L} ${LVL_NAME[L]}</span></div><div class="top"><span class="r tabular">${S.ratings[k]}</span><span class="muted tabular" style="font-size:13px">${n?Math.round(c/n*100)+"% of "+n:"not started"}</span></div><div class="bar" title="Progress to the next level"><i style="width:${clamp(levelProgress(k)*100,3,100)}%"></i></div><span class="muted small">${L<5?`${Math.round(levelProgress(k)*100)}% of the way to L${L+1}`:"Top level"}</span><span class="muted" style="font-size:12.5px">${(()=>{const e=eta(k);return e.ready?"At interview level (1250+)":`${esc(e.text)} to interview level${e.measured?"":" (estimate)"}`})()}</span></div>`}).join("")}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px"><h3>Last 26 weeks</h3>${heatmap(S.days)}</div>
    <div class="card stack"><h3>Progress over time</h3><div id="progcharts"></div></div>
    <div class="card" style="display:flex;flex-direction:column;gap:6px"><h3>Weak spots</h3>
      <div class="list">${weak.length?weak.slice(0,6).map(w=>`<div><span class="l">${esc(w.k==="mm"?"Estimation":SKILLS[w.k].subs[w.s].label)} <span class="muted" style="font-size:13px">· ${esc(SKILL_NAME[w.k])}</span></span><span class="pill ${w.acc<.5?"weak":w.acc<.8?"mid":"ok"} tabular">${Math.round(w.acc*100)}% · ${w.st.n}</span></div>`).join(""):`<div><span class="muted">Answer a few questions in each topic and your weakest areas show up here.</span></div>`}</div></div>
    <div class="card" style="display:flex;flex-direction:column;gap:6px"><h3>Mistakes queued for review · ${S.mistakes.length}</h3>
      <div class="list">${S.mistakes.length?S.mistakes.slice(0,10).map(m=>`<div style="flex-direction:column;align-items:stretch;gap:4px"><span>${esc(m.q)}</span><span class="muted tabular" style="font-size:13px;font-family:var(--mono)">you: ${esc(m.given)} · answer: ${esc(fmt(m.ans))} · ${m.fixes}/2 fixed</span></div>`).join(""):`<div><span class="muted">No open mistakes. Anything you miss lands here and comes back in your Daily set until you get it right twice.</span></div>`}</div></div>
    <div class="card"><h3>Labs · ${LABS.filter(l=>labDone(l.id)).length} / ${LABS.length}</h3><div class="list" style="margin-top:6px">${LABS.map(l=>`<div><span>${esc(l.title)}</span><span class="pill ${labDone(l.id)?"ok":"todo"}">${labDone(l.id)?"done":"not yet"}</span></div>`).join("")}</div></div>
    <div class="card"><h3>Games</h3><div class="list" style="margin-top:6px">${GAMES.map(G=>`<div><span>${esc(G.name)}</span><span class="tabular" style="font-family:var(--mono)">${S.games[G.k].hist.length?"best "+esc(G.fmt(S.games[G.k].best))+" · "+S.games[G.k].hist.length+" played":"not played"}</span></div>`).join("")}</div></div>`;
}

function statsSummary(){
  const skills=SKILL_ORDER.map(k=>{const subs=k==="mm"?["fermi"]:Object.keys(SKILLS[k].subs);return{skill:SKILL_NAME[k],rating:S.ratings[k],level:levelFor(k),subs:subs.map(s=>{const st=subStat(k+"."+s);return{name:k==="mm"?"estimation":SKILLS[k].subs[s].label,attempts:st.n,correct:st.c,avgSec:st.n?Math.round(st.ms/st.n/100)/10:null}})}});
  const days=Object.entries(S.days).sort().slice(-14).map(([d,v])=>({d,n:v.n,c:v.c,daily:v.daily}));
  return JSON.stringify({etaToInterviewLevel:Object.fromEntries(SKILL_ORDER.map(k=>[k,eta(k).text])),allSubs:S.subs,skills,last14days:days,openMistakes:S.mistakes.slice(0,12).map(m=>({skill:m.skill,q:m.q,given:m.given,ans:m.ans})),games:Object.fromEntries(Object.entries(S.games).map(([k,v])=>[k,{best:v.best,recent:v.hist.slice(-5)}]))});
}


/* ---------- views ---------- */
let sampleFn=null;function explain(){}
const VIEWS=["daily","learn","labs","desk","backtest","games","profile","log"];
function renderStrip(){
  const streak=streaks(S.days).cur;
  bump("#sStreak",streak);bump("#sToday",S.days[todayKey()]?.n||0);
  let n=0,c=0;for(const k of Object.keys(S.days).sort().slice(-7)){n+=S.days[k].n;c+=S.days[k].c}
  $("#sAcc").textContent=n?Math.round(c/n*100)+"%":"–";
}
function bump(sel,v){const el=$(sel);if(!el)return;if(el.textContent!==String(v)){el.textContent=v;el.classList.remove("bump");void el.offsetWidth;el.classList.add("bump")}}
function etaBlock(){
  const o=overallEta();const coach=PLAN&&PLAN.eta&&isFinite(Number(PLAN.eta.weeks))?PLAN.eta:null;
  return`<div class="eta"><span class="tag">Interview-competitive in</span><span class="etanum tabular">${esc(coach?`~${Number(coach.weeks)} weeks`:o.text)}</span>
    <span class="muted etanote">${coach&&coach.note?esc(coach.note):(o.bottleneck?`Slowest topic: ${esc(o.bottleneck)}. `:"")+(o.measured?"Based on how fast your ratings have risen.":"Starting estimate for one 10–15 minute set a day. It recalculates from your real pace after 3 days.")}</span></div>`;
}
function lessonHTML(L,open){
  const secs=(L.sections||[]).map(x=>`<div class="lsec"><b>${esc(x.h||"")}</b><p>${esc(x.p||"")}</p></div>`).join("");
  const tk=(L.takeaways||[]).map(t=>`<li>${esc(t)}</li>`).join("");
  return`<div class="lessonbody" ${open?"":"hidden"}>${secs}${tk?`<div class="lsec"><b>Remember</b><ul>${tk}</ul></div>`:""}</div>`;
}
function checklist(){
  const d=S.days[todayKey()]||{};const items=[[!!d.daily,"Finish today's set"],[(d.labs||0)>0||(S.lessonsRead||[]).some(x=>String(x).endsWith(todayKey())),"Open a lab or read a lesson"],[(d.g||0)>0,"Play one game"]];
  const n=items.filter(x=>x[0]).length;
  return`<div class="check"><span class="tag">Today's goal · ${n} / 3</span><ul>${items.map(([ok,t])=>`<li class="${ok?"ok":""}"><span class="tick" aria-hidden="true">${ok?"✓":""}</span>${esc(t)}<span class="sr">${ok?" (done)":" (to do)"}</span></li>`).join("")}</ul></div>`;
}
function renderDaily(){
  const host=$("#v-daily");const done=S.days[todayKey()]?.daily;
  const read=PLAN&&(S.lessonsRead||[]).includes(PLAN.id);
  const nq=PLAN&&Array.isArray(PLAN.questions)&&S.planDone!==PLAN.id?Math.min(6,PLAN.questions.length):0;
  const visitor=PUBLISHED&&!Object.keys(S.days).length;
  host.innerHTML=`${visitor?visitorCard():""}${PLAN&&PLAN.lesson?`<div class="card lesson">
      <div class="row between"><h3>${PLAN.fromUnit?"Next lesson":"Today's lesson"}</h3>${read?`<span class="pill ok">read</span>`:""}</div>
      <h2>${esc(PLAN.lesson.title||"Lesson")}</h2>${PLAN.message?`<p class="muted measure">${esc(PLAN.message)}</p>`:""}
      ${lessonHTML(PLAN.lesson,!read)}
      <div class="row">${read?`<button class="btn ghost" id="ltoggle">Show lesson</button>`:`<button class="btn" id="lread">Got it</button>`}${nq?`<span class="muted small">${nq} questions on this are in today's set.</span>`:""}</div></div>`:""}
    <div class="card stack">
      <h3>${new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</h3>
      <h2>${done&&S.planDone===PLAN?.id?"Today's set is done. Run another for more reps.":"Today's set · about 10 minutes"}</h2>
      ${etaBlock()}
      ${checklist()}
      <p class="muted measure">More of what you miss, up to three recent mistakes to retry, the current lesson's questions and one market to make.</p>
      <div class="row"><button class="btn accent" id="startDaily">${done?"Start another set":"Start today's set"}</button><span class="muted small">Or drill one topic:</span></div>
      <div class="row">${SKILL_ORDER.map(k=>`<button class="btn ghost chip" data-drill="${k}">${esc(SKILL_NAME[k])}</button>`).join("")}</div>
    </div><div id="runhost"></div>`;
  const lr=host.querySelector("#lread");if(lr)lr.onclick=()=>{S.lessonsRead=[...(S.lessonsRead||[]),PLAN.id].slice(-200);queueSave();renderDaily()};
  const lt=host.querySelector("#ltoggle");if(lt)lt.onclick=()=>{const b=host.querySelector(".lessonbody");b.hidden=!b.hidden;lt.textContent=b.hidden?"Show lesson":"Hide lesson"};
  host.querySelector("#startDaily").onclick=()=>{
    const qs=buildDaily();let right=0;const rh=host.querySelector("#runhost");
    runner(rh,{questions:qs,title:"Daily set",onAnswer:(q,ok)=>{if(ok)right++},onDone:()=>{
      const day=S.days[todayKey()]||(S.days[todayKey()]={n:0,c:0});day.daily=true;if(PLAN)S.planDone=PLAN.id;lsSave();renderStrip();
      rh.innerHTML=`<div class="card stack qin"><h3>Set complete</h3><div class="big tabular" data-count="${right}">0</div><p class="muted">out of ${qs.length}. Misses come back in tomorrow's review.</p><div class="row"><button class="btn accent" id="pubday">Publish today to my log</button><button class="btn" id="again">Back to Daily</button><button class="btn ghost" id="toprof">See progress</button></div></div>`;
      countUp(rh.querySelector("[data-count]"),"/"+qs.length);
      rh.querySelector("#pubday").onclick=()=>publishFlow(rh.querySelector(".card"));
      rh.querySelector("#again").onclick=()=>{choosePlan();renderDaily()};rh.querySelector("#toprof").onclick=()=>go("profile");}});
    rh.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
  };
  host.querySelectorAll("[data-drill]").forEach(b=>b.onclick=()=>{const k=b.dataset.drill;const rh=host.querySelector("#runhost");runner(rh,{next:()=>makeQ(k),title:`${SKILL_NAME[k]} drill`});rh.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"})});
}
function renderLearn(){
  const host=$("#v-learn");const nu=nextUnit();
  host.innerHTML=`<div class="card stack"><h3>Market-making track</h3><h2>From zero to interview market-making games</h2>
    <p class="muted measure">Read a unit, then practise it. A unit is complete once you get 80% of its questions right. Do them in order: each one builds on the last.</p></div>
    <ol class="units">${UNITS.map(U=>{const u=(S.units||{})[U.n];const d=unitDone(U.n);const cur=nu&&nu.n===U.n;
      return`<li class="card unit ${d?"done":""} ${cur?"current":""}"><button class="unithead" data-u="${U.n}" aria-expanded="false">
        <span class="unum tabular">${U.n}</span><span class="utitle">${esc(U.title)}</span>
        <span class="pill ${d?"ok":cur?"mid":"todo"}">${d?"done":cur?"up next":u?Math.round(u.c/u.a*100)+"%":"not started"}</span></button>
        <div class="unitbody" hidden>${lessonHTML(U,true)}<div class="row"><button class="btn accent" data-prac="${U.n}">Practise this unit</button><span class="muted small">${U.questions.length} questions</span></div><div class="uhost"></div></div></li>`}).join("")}</ol>
    <p class="muted small center">More units on position sizing and full mock interview rounds arrive through the daily lessons.</p>`;
  host.querySelectorAll(".unithead").forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;const open=body.hidden;body.hidden=!open;b.setAttribute("aria-expanded",String(open));if(open)body.classList.add("qin")});
  host.querySelectorAll("[data-prac]").forEach(b=>b.onclick=()=>{const U=UNITS.find(x=>x.n===Number(b.dataset.prac));const uh=b.closest(".unitbody").querySelector(".uhost");
    const qs=U.questions.map(pq=>planQ({...pq,unit:U.n})).filter(Boolean);let right=0;
    runner(uh,{questions:qs,title:`Unit ${U.n}`,onAnswer:(q,ok)=>{if(ok)right++},onDone:()=>{const d=unitDone(U.n);
      uh.innerHTML=`<div class="card stack qin"><h3>Unit ${U.n} practice</h3><div class="big tabular">${right}/${qs.length}</div><p class="muted">${d?"Unit complete. On to the next one.":"Aim for 80% to complete the unit. Read the lesson again and retry."}</p><div class="row"><button class="btn" id="ub">Back to units</button></div></div>`;
      choosePlan();uh.querySelector("#ub").onclick=renderLearn;}});});
}
function renderProfile(){
  renderProgress();const host=$("#tab-progress");
  host.insertAdjacentHTML("beforeend",`<div class="card stack" id="pubcard"></div>
    <div class="card stack"><h3>Your data</h3>
    <p class="muted measure">Progress is saved in this browser only. Copy it to move to another device, or paste it into Claude and ask for a review of where you're going wrong.</p>
    <div class="row"><button class="btn" id="copyp">Copy progress</button><button class="btn ghost" id="impp">Import progress</button><button class="btn ghost" id="resetp">Reset</button></div>
    <div id="pmsg" class="small"></div>
    <div id="impbox" hidden class="stack"><label for="imptext" class="small">Paste copied progress</label><textarea id="imptext" rows="4"></textarea><div class="row"><button class="btn" id="impgo">Load it</button></div></div>
    <div id="resetbox" hidden class="row"><span class="small">This deletes every rating, mistake and score in this browser.</span><button class="btn danger" id="resetgo">Delete my progress</button></div></div>`);
  const msg=t=>{host.querySelector("#pmsg").textContent=t};
  renderPubCard(host.querySelector("#pubcard"));progressCharts(host.querySelector("#progcharts"),S.days);
  host.querySelector("#copyp").onclick=async()=>{const txt=JSON.stringify({quantDesk:1,state:S,summary:JSON.parse(statsSummary())});
    try{await navigator.clipboard.writeText(txt);msg("Copied. Paste it into Claude with \"review my Quant Desk progress\".")}catch(e){const b=host.querySelector("#impbox");b.hidden=false;host.querySelector("#imptext").value=txt;host.querySelector("#imptext").select();msg("Couldn't copy automatically. The text is selected below: copy it from there.")}};
  host.querySelector("#impp").onclick=()=>{host.querySelector("#impbox").hidden=false;host.querySelector("#imptext").value="";host.querySelector("#imptext").focus()};
  host.querySelector("#impgo").onclick=()=>{try{const j=JSON.parse(host.querySelector("#imptext").value);if(!j.state)throw 0;mergeState(j.state);lsSave();renderAll();go("profile");$("#pmsg").textContent="Progress loaded."}catch(e){msg("That doesn't look like copied Quant Desk progress.")}};
  host.querySelector("#resetp").onclick=()=>{host.querySelector("#resetbox").hidden=false};
  host.querySelector("#resetgo").onclick=()=>{S=blankState();DAY={date:todayKey(),attempts:[]};lsSave();choosePlan();renderAll();go("profile");$("#pmsg").textContent="Progress reset."};
}
function toast(msg){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.setAttribute("role","status");document.body.appendChild(t)}
  t.textContent=msg;t.classList.remove("show");void t.offsetWidth;t.classList.add("show");clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove("show"),3800)}
function countUp(el,suffix){const to=Number(el.dataset.count)||0;if(reduced()){el.textContent=to+(suffix||"");return}const t0=performance.now();
  const f=t=>{const p=Math.min(1,(t-t0)/700);el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+(suffix||"");if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
const reduced=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function moveIndicator(){const sel=document.querySelector('nav button[aria-selected="true"]');const ind=$("#navind");if(!sel||!ind)return;ind.style.width=sel.offsetWidth+"px";ind.style.transform=`translateX(${sel.offsetLeft-4}px)`}
function go(v,push=true,rerender=true){
  if(!VIEWS.includes(v))v="daily";
  document.querySelectorAll("nav button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.v===v)));
  VIEWS.forEach(k=>{const el=$("#v-"+k);const show=k===v;if(show&&el.hidden){el.hidden=false;el.classList.remove("vin");void el.offsetWidth;el.classList.add("vin")}else if(!show)el.hidden=true});
  if(v==="daily"&&rerender&&!$("#runhost")?.innerHTML.trim())renderDaily();if(v==="profile")renderProfile();if(v==="learn")renderLearn();if(v==="labs"&&rerender&&!$("#v-labs").innerHTML)renderLabs();if(v==="log"&&rerender)renderLog();if(v==="desk"&&!$("#v-desk").innerHTML)renderDesk();if(v==="backtest"&&!$("#v-backtest").innerHTML)renderBacktest();
  moveIndicator();if(push)try{history.replaceState(null,"","#"+v)}catch(e){}
}
function renderAll(){renderStrip();renderDaily();renderLearn();renderLabs();renderGames();renderProfile()}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>go(b.dataset.v));
window.addEventListener("resize",moveIndicator);
window.addEventListener("hashchange",()=>go(location.hash.slice(1),false));
(async()=>{await Promise.all([loadState(),loadPublished()]);renderAll();go((location.hash||"#daily").slice(1),false);document.body.classList.add("ready")})();

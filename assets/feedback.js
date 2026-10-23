"use strict";
/* Quant Desk: feedback in both directions.
   1. Performance reviews: reviewHTML() turns a list of answered questions into a coach's summary.
   2. Your feedback on the site: a dialog that saves a private note or opens a pre-filled GitHub issue. */

const FB_REPO="chak720/quant-desk";
const FB_KINDS=[["wrong","Something's wrong"],["confusing","Confusing"],["level","Too easy or too hard"],["idea","Idea"],["good","This was useful"]];
function reportLink(ctx){return`<button class="btn ghost chip" type="button" data-report="${esc(ctx)}">Report a problem</button>`}
function feedbackDialog(){
  let d=$("#fbdlg");if(d)return d;
  d=document.createElement("dialog");d.id="fbdlg";d.setAttribute("aria-labelledby","fbtitle");
  d.innerHTML=`<form method="dialog" class="stack">
    <h2 id="fbtitle">Feedback</h2><p class="muted small" id="fbctx"></p>
    <fieldset class="fbkinds"><legend class="small">What kind?</legend>${FB_KINDS.map(([k,l],i)=>`<label><input type="radio" name="fbk" value="${k}" ${i===0?"checked":""}> ${esc(l)}</label>`).join("")}</fieldset>
    <label class="form" for="fbtext">Details<textarea id="fbtext" rows="4" placeholder="What happened, what you expected, or what you'd like to see"></textarea></label>
    <p class="small" id="fbmsg" role="status"></p>
    <div class="row"><button class="btn accent" type="button" id="fbgh">Open as a GitHub issue</button><button class="btn" type="button" id="fbsave">Save as a private note</button><button class="btn ghost" value="cancel">Close</button></div>
    <p class="muted small">GitHub issues are public on the repo and need you to be signed in. Private notes stay in this browser and appear in Profile.</p></form>`;
  document.body.appendChild(d);
  const get=()=>({kind:d.querySelector("input[name=fbk]:checked").value,text:d.querySelector("#fbtext").value.trim(),ctx:d.dataset.ctx});
  d.querySelector("#fbsave").onclick=()=>{const f=get();if(!f.text&&f.kind!=="good"){d.querySelector("#fbmsg").textContent="Add a sentence or two first.";d.querySelector("#fbtext").focus();return}
    (S.notes=S.notes||[]).unshift({t:new Date().toISOString(),...f});S.notes=S.notes.slice(0,100);queueSave();d.close();toast("Saved to your notes in Profile")};
  d.querySelector("#fbgh").onclick=()=>{const f=get(),label=FB_KINDS.find(k=>k[0]===f.kind)[1];
    const body=`**Where:** ${f.ctx}\n**Kind:** ${label}\n\n${f.text||"(no details)"}\n\n---\nSent from Quant Desk on ${new Date().toLocaleString("en-GB")}`;
    window.open(`https://github.com/${FB_REPO}/issues/new?title=${encodeURIComponent(`[${label}] ${f.ctx}`.slice(0,120))}&body=${encodeURIComponent(body)}`,"_blank","noopener");d.close()};
  return d;
}
function openFeedback(ctx){const d=feedbackDialog();d.dataset.ctx=ctx;d.querySelector("#fbctx").textContent="About: "+ctx;d.querySelector("#fbtext").value="";d.querySelector("#fbmsg").textContent="";d.showModal();d.querySelector("#fbtext").focus()}
document.addEventListener("click",e=>{
  const r=e.target.closest("[data-report]");if(r){const d=feedbackDialog();openFeedback(r.dataset.report);return}
  const f=e.target.closest("[data-feedback]");if(f){const v=document.querySelector('nav button[aria-selected="true"]');openFeedback((v?v.textContent.trim():"Quant Desk")+" page")}
});

/* ---------- performance review ----------
   items: [{q, ok, ms, given}] from a runner session */
function reviewHTML(items,{title="Review",drill=true}={}){
  if(!items.length)return"";
  const n=items.length,right=items.filter(x=>x.ok).length,onPace=items.filter(x=>x.ok&&x.ms<=targetSecs(x.q)*1000).length;
  const by={};for(const x of items){const k=x.q.skill;(by[k]=by[k]||{n:0,c:0,ms:0,tg:0});by[k].n++;if(x.ok)by[k].c++;by[k].ms+=x.ms;by[k].tg+=targetSecs(x.q)*1000}
  const rows=Object.entries(by).sort((a,b)=>a[1].c/a[1].n-b[1].c/b[1].n);
  const weak=rows.find(([k,v])=>v.n>=1&&v.c/v.n<0.7),slow=rows.filter(([k,v])=>v.ms>v.tg*1.2).sort((a,b)=>b[1].ms/b[1].tg-a[1].ms/a[1].tg)[0];
  const notes=[];
  if(right/n>=0.9&&onPace/n>=0.7)notes.push("Accurate and quick. The difficulty will keep stepping up; keep the daily habit.");
  if(weak)notes.push(`${SKILL_NAME[weak[0]]} is your weak spot this session (${weak[1].c} of ${weak[1].n}). A focused drill will fix it fastest.`);
  if(slow)notes.push(`${SKILL_NAME[slow[0]]} is slow: ${(slow[1].ms/slow[1].n/1000).toFixed(0)}s per question against a ${(slow[1].tg/slow[1].n/1000).toFixed(0)}s target. Interviews reward speed here.`);
  if(right/n<0.6)notes.push("Lots of misses. Read each worked solution carefully: misses come back in your Daily review until you get them right twice.");
  const skipped=items.filter(x=>x.given==="skip").length;if(skipped>=2)notes.push(`You skipped ${skipped}. Guessing a rough answer and checking it is better practice than skipping.`);
  if(!notes.length)notes.push("Solid. Watch the topics below and aim for more answers inside the target time.");
  const miss=items.filter(x=>!x.ok);
  return`<div class="review stack"><h3>${esc(title)}</h3>
    <div class="stats">${stat("Correct",`${right} / ${n}`)}${stat("Inside target time",`${onPace} / ${n}`)}${stat("Average time",(mean(items.map(x=>x.ms))/1000).toFixed(1)+"s")}</div>
    <ul class="tips">${notes.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>
    ${rows.length>1?`<div class="tablewrap"><table class="kv"><thead><tr><th>Topic</th><th>Right</th><th>Avg time</th><th>Target</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><th>${esc(SKILL_NAME[k])}</th><td>${v.c}/${v.n}</td><td>${(v.ms/v.n/1000).toFixed(1)}s</td><td>${(v.tg/v.n/1000).toFixed(0)}s</td></tr>`).join("")}</tbody></table></div>`:""}
    ${miss.length?`<details><summary>Review your ${miss.length} miss${miss.length>1?"es":""}</summary><div class="list">${miss.map(x=>`<div style="flex-direction:column;align-items:stretch;gap:4px"><span>${esc(x.q.q)}</span><span class="muted small tabular">you: ${esc(String(x.given))} · answer: ${esc(fmt(x.q.ans))}</span><span class="sol">${esc(x.q.sol||"")}</span></div>`).join("")}</div></details>`:""}
    ${drill&&weak?`<div class="row"><button class="btn ghost chip" data-drillnow="${weak[0]}">Drill ${esc(SKILL_NAME[weak[0]])}</button></div>`:""}</div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-drillnow]");if(!b)return;go("daily");setTimeout(()=>document.querySelector(`[data-drill="${b.dataset.drillnow}"]`)?.click(),50)});

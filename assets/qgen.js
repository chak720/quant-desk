"use strict";
/* Quant Desk question generators. Every question is built from a template with random parameters, so the bank
   doesn't run out. Market-making questions are trading problems on contracts with a computable fair value and
   spread, never general-knowledge trivia. Loaded after engine.js; adds to and replaces entries in SKILLS. */

const Hn=n=>{let s=0;for(let i=1;i<=n;i++)s+=1/i;return s};
const RANKS=["","Ace","2","3","4","5","6","7","8","9","10","Jack","Queen","King"];
const half=x=>Math.round(x*2)/2;
const qtr=x=>Math.round(x*4)/4;
const sgnf=x=>(x>=0?"+":"−")+fmt(Math.abs(r4(x)));
const binom=(n,k,p)=>comb(n,k)*p**k*(1-p)**(n-k);
function distStats(pairs){let m=0,m2=0;for(const [v,p] of pairs){m+=v*p;m2+=v*v*p}return{fv:m,sd:Math.sqrt(Math.max(0,m2-m*m))}}
const dice2=f=>{const out=[];for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)out.push([f(a,b),1/36]);return out};
const plural=(n,w,ws)=>`${n} ${n===1?w:(ws||w+"s")}`;
function pickBy(list,L){return pick(list.filter(t=>(t.min||1)<=L))}

/* ---------- contracts: things to make markets on ---------- */
const CONTRACTS=[
 {min:1,make(){const n=ri(1,4);return{name:`the sum of ${n===1?"one die":n+" dice"}`,fv:3.5*n,sd:Math.sqrt(35*n/12),how:`${n} × 3.5; variance ${n} × 35/12`}}},
 {min:1,make(){const n=ri(4,20),k=pick([1,2,5,10]);return{name:`£${k} for every head in ${n} coin flips`,fv:k*n/2,sd:k*Math.sqrt(n)/2,how:`${n} × ½ × ${k}; SD = ${k} × √${n} / 2`}}},
 {min:1,make(){const n=ri(6,36);return{name:`the number of sixes in ${n} die rolls`,fv:n/6,sd:Math.sqrt(n*5/36),how:`${n} × 1/6; variance ${n} × 1/6 × 5/6`}}},
 {min:2,make(){const n=ri(2,5);return{name:`the sum of ${n} cards from a deck (Ace = 1 … King = 13)`,fv:7*n,sd:Math.sqrt(14*n*(52-n)/51),how:`${n} × 7; variance ${n} × 14 × (52 − ${n})/51 because there's no replacement`}}},
 {min:2,make(){const k=ri(2,4);return{name:`the highest of ${k} dice`,...distStats([1,2,3,4,5,6].map(m=>[m,(m**k-(m-1)**k)/6**k])),how:`P(max = m) = (m^${k} − (m − 1)^${k}) / 6^${k}`}}},
 {min:2,make(){const k=ri(2,3);return{name:`the lowest of ${k} dice`,...distStats([1,2,3,4,5,6].map(m=>[m,((7-m)**k-(6-m)**k)/6**k])),how:`P(min ≥ m) = ((7 − m)/6)^${k}`}}},
 {min:2,make(){return{name:"the square of one die roll",...distStats([1,2,3,4,5,6].map(x=>[x*x,1/6])),how:"(1 + 4 + 9 + 16 + 25 + 36) / 6 = 91/6"}}},
 {min:3,make(){return{name:"the product of two dice",...distStats(dice2((a,b)=>a*b)),how:"independent dice, so 3.5 × 3.5"}}},
 {min:3,make(){return{name:"the absolute difference of two dice",...distStats(dice2((a,b)=>Math.abs(a-b))),how:"Σ|a − b| / 36 = 70/36"}}},
 {min:3,make(){const K=ri(1,4);return{name:`a call on one die roll, strike ${K} (pays max(roll − ${K}, 0))`,...distStats([1,2,3,4,5,6].map(x=>[Math.max(x-K,0),1/6])),how:`average of the payoffs ${[1,2,3,4,5,6].map(x=>Math.max(x-K,0)).join(", ")}`}}},
 {min:3,make(){const K=ri(5,9);return{name:`a call on the sum of two dice, strike ${K}`,...distStats(dice2((a,b)=>Math.max(a+b-K,0))),how:`Σ max(sum − ${K}, 0) × P(sum) over the 36 outcomes`}}},
 {min:3,make(){const n=ri(3,6),k=ri(1,n-1),shown=Array.from({length:k},()=>ri(1,6)),s=shown.reduce((a,b)=>a+b,0),left=n-k;
   return{name:`the sum of ${n} dice, where ${k===1?"one is":k+" are"} already showing ${shown.join(", ")}`,fv:s+3.5*left,sd:Math.sqrt(35*left/12),how:`${s} showing + ${left} × 3.5 still to come`}}},
 {min:4,make(){const r=ri(1,13),n=ri(2,4),m=n-1,mu=(364-r)/51,vp=(3276-r*r)/51-mu*mu;
   return{name:`the sum of ${n} cards, where the first card dealt is a ${RANKS[r]}`,fv:r+m*mu,sd:Math.sqrt(m*vp*(51-m)/50),how:`${r} + ${m} × (364 − ${r})/51; the deck's average shifts once a card is gone`}}},
 {min:4,make(){const n=ri(8,20),m=ri(2,n-3),h=ri(0,m);return{name:`£1 for every head in ${n} coin flips, after ${m} flips with ${h} heads`,fv:h+(n-m)/2,sd:Math.sqrt(n-m)/2,how:`${h} banked + ${n-m} flips × ½`}}},
];
function contract(L){return pickBy(CONTRACTS,L).make()}
/* Grade a quoted market: fair value must be inside it; credit falls with width beyond one SD and with distance of the mid from fair value. */
function quoteScore(b,a,fv,sd){
  if(!(a>b)||fv<b||fv>a)return 0;const s=Math.max(sd,0.25),w=a-b,off=Math.abs((a+b)/2-fv)/(w/2);
  return clamp(Math.round(100-Math.min(60,Math.max(0,30*(w/s-1)))-25*off),10,100);
}
const n2=x=>{const v=r4(x);return Number.isInteger(v)?String(v):v.toFixed(2).replace(/0$/,"")};

/* ---------- market making ---------- */
SKILLS.mm={name:"Market making",subs:{
 quote:{label:"Make a market",min:1,gen(L){const c=contract(L),hw=Math.max(0.25,qtr(c.sd/2));
   return{q:`Make a market on ${c.name}.`,ans:c.fv,fv:c.fv,sd:c.sd,mm:true,quote:true,
     sol:`Fair value ${n2(c.fv)} (${c.how}). Standard deviation about ${n2(c.sd)}. A good market is centred on fair value and roughly one SD wide, for example ${n2(c.fv-hw)} at ${n2(c.fv+hw)}.`}}},
 fair:{label:"Fair value",min:1,gen(L){const c=contract(L);return{q:`What's the fair value of ${c.name}?`,ans:c.fv,tol:{abs:0.01,rel:0.002},sol:`${n2(c.fv)}: ${c.how}.`}}},
 edge:{label:"Edge on a fill",min:1,gen(L){const c=contract(Math.min(L,2)),fv=c.fv,b=half(fv-ri(1,4)/2),a=half(fv+ri(1,4)/2),k=ri(1,L+3),t=ri(0,3);
   const mk=`Your market on ${c.name} (fair value ${n2(fv)}) is ${n2(b)} at ${n2(a)}.`;
   if(t===0)return{q:`${mk} What's your spread?`,ans:a-b,tol:{abs:0.001},sol:`ask − bid = ${n2(a)} − ${n2(b)} = ${n2(a-b)}`};
   if(t===1)return{q:`${mk} Someone buys ${plural(k,"lot")} from you. Your expected profit?`,ans:k*(a-fv),tol:{abs:0.01},sol:`They buy at your ask: ${k} × (${n2(a)} − ${n2(fv)}) = ${n2(k*(a-fv))}`};
   if(t===2)return{q:`${mk} Someone sells you ${plural(k,"lot")}. Your expected profit?`,ans:k*(fv-b),tol:{abs:0.01},sol:`They sell at your bid: ${k} × (${n2(fv)} − ${n2(b)}) = ${n2(k*(fv-b))}`};
   return{q:`${mk} One trader buys ${k} from you and another sells you ${k}. What have you locked in?`,ans:k*(a-b),tol:{abs:0.01},sol:`You're flat and earned the full spread on ${k} lots: ${k} × ${n2(a-b)} = ${n2(k*(a-b))}, whatever the contract settles at.`}}},
 implied:{label:"Prices and probabilities",min:1,gen(L){const x=ri(5,95),p=ri(5,95),t=ri(0,3);
   if(t===0)return{q:`A contract pays £100 if an event happens and nothing otherwise. It trades at £${x}. What probability does the market imply? (decimal)`,ans:x/100,tol:{abs:0.002},sol:`${x}/100 = ${x/100}`};
   if(t===1)return{q:`You think an event has a ${p}% chance. A £100 contract on it is offered at £${x}. Expected profit from buying one?`,ans:p-x,tol:{abs:0.01},sol:`${p}% × 100 − ${x} = ${p-x}${p<x?". Negative: you'd sell instead.":""}`};
   if(t===2)return{q:`A "yes" contract on an event trades at ${x} (pays 100). Where should the matching "no" contract trade, ignoring spreads?`,ans:100-x,tol:{abs:0.01},sol:`Yes + no always pays 100: 100 − ${x} = ${100-x}`};
   const q=ri(2,9)*10;return{q:`A contract pays £${q} with probability ${p}% and nothing otherwise. Fair value?`,ans:q*p/100,tol:{abs:0.01},sol:`${q} × ${p/100} = ${n2(q*p/100)}`}}},
 update:{label:"Update on new information",min:2,gen(L){const t=ri(0,L>=4?4:2);
   if(t===0){const n=ri(2,5),k=ri(1,n-1),sh=Array.from({length:k},()=>ri(1,6)),s=sh.reduce((a,b)=>a+b,0);return{q:`You're making a market on the sum of ${n} dice. ${k===1?"One die is":k+" dice are"} revealed: ${sh.join(", ")}. New fair value?`,ans:s+3.5*(n-k),tol:{abs:0.01},sol:`${s} + ${n-k} × 3.5 = ${n2(s+3.5*(n-k))}`}}
   if(t===1){const n=ri(8,20),m=ri(2,n-2),h=ri(0,m),k=pick([1,2,5]);return{q:`A contract pays £${k} per head in ${n} coin flips. After ${m} flips there are ${h} heads. New fair value?`,ans:k*(h+(n-m)/2),tol:{abs:0.01},sol:`${k} × (${h} + ${n-m}/2) = ${n2(k*(h+(n-m)/2))}`}}
   if(t===2){const x=ri(1,6);return{q:`A contract pays the higher of two dice. The first shows ${x}. New fair value?`,ans:(x*x+(x+1+6)*(6-x)/2)/6,tol:{abs:0.01},sol:`With prob ${x}/6 the second die is ≤ ${x} and you get ${x}; otherwise you get the second die: (${x}×${x} + ${Array.from({length:6-x},(_,i)=>x+1+i).join(" + ")||0}) / 6 = ${n2((x*x+(x+1+6)*(6-x)/2)/6)}`}}
   if(t===3){const r=ri(1,13),n=ri(2,4);return{q:`Market on the sum of ${n} cards from a deck (Ace = 1 … King = 13). The first card is a ${RANKS[r]}. New fair value of the sum?`,ans:r+(n-1)*(364-r)/51,tol:{abs:0.02},sol:`${r} + ${n-1} × (364 − ${r})/51 = ${n2(r+(n-1)*(364-r)/51)}`}}
   const r1=ri(1,13),r2=ri(1,13);return{q:`Two cards (a ${RANKS[r1]} and a ${RANKS[r2]}) have been dealt face up from a deck. What's the expected rank of the next card? (Ace = 1 … King = 13)`,ans:(364-r1-r2)/50,tol:{abs:0.01},sol:`(364 − ${r1} − ${r2}) / 50 = ${n2((364-r1-r2)/50)}`}}},
 position:{label:"Position and P&L",min:2,gen(L){const c=contract(1),fv=c.fv,b=half(fv-ri(1,3)/2),a=half(fv+ri(1,3)/2);let pos=0,cash=0;const ev=[];
   for(let i=0;i<ri(3,5);i++){const k=ri(1,5);if(Math.random()<.5){pos-=k;cash+=k*a;ev.push(`lifted for ${k}`)}else{pos+=k;cash-=k*b;ev.push(`hit for ${k}`)}}
   const intro=`You quote ${n2(b)} at ${n2(a)} on ${c.name} and start flat. You get ${ev.join(", then ")}.`,gloss=" (Lifted = someone buys at your ask; hit = someone sells at your bid.)";
   if(L<=2||Math.random()<.4)return{q:`${intro}${L<=2?gloss:""} What's your position? (long positive, short negative)`,ans:pos,tol:{abs:0.001},sol:`Lifts make you shorter, hits make you longer: ${pos>0?"+":""}${pos}.`};
   return{q:`${intro} Fair value is ${n2(fv)}. What's your P&L marked to fair value?`,ans:cash+pos*fv,tol:{abs:0.01},sol:`Cash ${n2(cash)} + position ${pos} × ${n2(fv)} = ${n2(cash+pos*fv)}. Each lift earns ask − FV, each hit FV − bid.`}}},
 skew:{label:"Skew for inventory",min:2,gen(L){const m=ri(20,120),w=pick([1,2,4]),b=m-w/2,a=m+w/2,N=ri(5,50),long=Math.random()<.5,s=pick([0.25,0.5,1]),side=Math.random()<.5;
   const nm=long?m-s:m+s;return{q:`Your market is ${n2(b)} at ${n2(a)} and you're ${long?"long":"short"} ${N} lots. You shift your mid ${s} ${long?"down":"up"} to work out of the position, keeping the width. New ${side?"bid":"ask"}?`,ans:side?nm-w/2:nm+w/2,tol:{abs:0.001},
     sol:`New mid ${n2(nm)}, width ${w}: ${n2(nm-w/2)} at ${n2(nm+w/2)}. ${long?"Long, so you lean lower to make selling more likely.":"Short, so you lean higher to make buying more likely."}`}}},
 sd:{label:"How uncertain is it?",min:3,gen(L){const c=contract(L);return{q:`What's the standard deviation of ${c.name}?`,ans:c.sd,tol:{rel:0.03,abs:0.02},sol:`${n2(c.sd)}. (${c.how}.) That's roughly how wide your market should be.`}}},
 adverse:{label:"Adverse selection",min:3,gen(L){const V=pick([10,20,50,100]),p=L>=4?pick([0.3,0.4,0.5,0.6]):0.5,al=pick([0.1,0.2,0.25,0.4,0.5]),buy=Math.random()<.6,t=L>=4?ri(0,2):ri(0,1);
   const pb=al+(1-al)/2,pl=(1-al)/2,ph=buy?p*pb/(p*pb+(1-p)*pl):p*pl/(p*pl+(1-p)*pb),E=V*ph;
   const set=`A contract settles at 0 or ${V}; you think ${p===0.5?"each is equally likely":`it's ${V} with probability ${p}`}. ${pctf(al,0)} of traders know the outcome and trade the right way; the rest buy or sell at random.`;
   if(t===0)return{q:`${set} Someone ${buy?"buys from":"sells to"} you. What's the contract worth now?`,ans:E,tol:{abs:0.05},sol:`P(${buy?"buy":"sell"} | ${V}) = ${n2(buy?pb:pl)}, P(${buy?"buy":"sell"} | 0) = ${n2(buy?pl:pb)}. Bayes: P(${V} | ${buy?"buy":"sell"}) = ${n2(ph)}, so the value is ${n2(E)}.`};
   if(t===1){const Eb=V*p*pb/(p*pb+(1-p)*pl);return{q:`${set} What's the lowest ask you can quote without losing money on average to the next buyer?`,ans:Eb,tol:{abs:0.05},sol:`A buyer is more likely to be informed about the high outcome: E[value | buy] = ${n2(Eb)}. Any ask below that loses on average.`}}
   const ph1=p*pb/(p*pb+(1-p)*pl),ph2=ph1*pb/(ph1*pb+(1-ph1)*pl);return{q:`${set} Two traders in a row buy from you. What's the contract worth now?`,ans:V*ph2,tol:{abs:0.05},sol:`Update twice: after one buy P(${V}) = ${n2(ph1)}, after two ${n2(ph2)}. Value ${n2(V*ph2)}. Persistent one-way flow is information.`}}},
 arb:{label:"Spot the arbitrage",min:3,gen(L){const t=ri(0,2),none=L>=4&&Math.random()<.25;
   if(t===0){const a1=half(3.5-ri(0,2)/2),a2=a1+pick([0.5,1]),b1=half(3.5-ri(0,2)/2),b2=b1+pick([0.5,1]);let s1,s2;
     if(none){s1=a1+b1;s2=a2+b2}else if(Math.random()<.5){s1=a2+b2+pick([0.5,1]);s2=s1+1}else{s2=a1+b1-pick([0.5,1]);s1=s2-1}
     const prof=Math.max(0,s1-(a2+b2),(a1+b1)-s2);
     return{q:`Markets: die A ${n2(a1)} at ${n2(a2)}, die B ${n2(b1)} at ${n2(b2)}, and the sum of A and B ${n2(s1)} at ${n2(s2)}. What's the riskless profit per set? (0 if there's none)`,ans:prof,tol:{abs:0.01},
       sol:prof===0?"No arbitrage: you can't buy the parts below the sum's bid or sell them above its ask.":s1>a2+b2?`Sell the sum at ${n2(s1)}, buy A and B at ${n2(a2)} + ${n2(b2)}: ${n2(prof)} locked in.`:`Buy the sum at ${n2(s2)}, sell A and B at ${n2(a1)} + ${n2(b1)}: ${n2(prof)} locked in.`}}
   if(t===1){const x=ri(30,60);
     if(Math.random()<.5){const ay=none?100-x+ri(1,4):100-x-ri(1,6),prof=Math.max(0,100-x-ay);
       return{q:`A match has exactly two possible outcomes. "Team X wins" (pays 100) is offered at ${x}; "Team Y wins" is offered at ${ay}. Riskless profit from buying one of each? (0 if none)`,ans:prof,tol:{abs:0.01},sol:prof>0?`Exactly one pays 100 and they cost ${x+ay}: ${prof} locked in.`:`They cost ${x+ay}, at least 100: no arbitrage.`}}
     const y=none?100-x-ri(1,4):100-x+ri(1,6),prof=Math.max(0,x+y-100);
     return{q:`A match has exactly two possible outcomes. You can sell "Team X wins" (pays 100) at ${x} and "Team Y wins" at ${y}. Riskless profit from selling one of each? (0 if none)`,ans:prof,tol:{abs:0.01},sol:prof>0?`You collect ${x+y} and pay out exactly 100: ${prof}.`:`You'd collect ${x+y}, at most 100: no arbitrage.`}}
   const S=ri(90,110),K=pick([90,95,100,105,110]),P=ri(3,12),fair=P+S-K,C=none?fair:fair+pick([-3,-2,2,3]);
   return{q:`Zero rates. Stock ${S}. The ${K}-strike call trades at ${C} and the ${K}-strike put at ${P}. Riskless profit per unit from put–call parity? (0 if none)`,ans:Math.abs(C-fair),tol:{abs:0.01},sol:`Parity says C − P = S − K = ${S-K}, so the call should be ${fair}. ${C>fair?`Sell the call, buy the put and the stock: ${C-fair}.`:C<fair?`Buy the call, sell the put and short the stock: ${fair-C}.`:"No arbitrage."}`}}},
 pnl:{label:"P&L after the reveal",min:3,gen(L){const n=ri(2,4),k=ri(1,10),fv=3.5*n,P=half(fv+pick([-1,-0.5,0.5,1])),long=Math.random()<.5,t=ri(0,1),dice=Array.from({length:n},()=>ri(1,6)),V=dice.reduce((a,b)=>a+b,0);
   if(t===0)return{q:`You ${long?"bought":"sold"} ${k} lots of the sum of ${n} dice at ${n2(P)}. The dice land ${dice.join(", ")}. Your P&L?`,ans:(long?1:-1)*k*(V-P),tol:{abs:0.01},sol:`Settles at ${V}. ${long?`(${V} − ${n2(P)})`:`(${n2(P)} − ${V})`} × ${k} = ${n2((long?1:-1)*k*(V-P))}`};
   const m=ri(1,n-1),nf=dice.slice(0,m).reduce((a,b)=>a+b,0)+3.5*(n-m);
   return{q:`You ${long?"bought":"sold"} ${k} lots of the sum of ${n} dice at ${n2(P)}. ${m===1?"One die is":m+" dice are"} revealed: ${dice.slice(0,m).join(", ")}. Your P&L marked to the new fair value?`,ans:(long?1:-1)*k*(nf-P),tol:{abs:0.01},sol:`New fair value ${n2(nf)}. ${long?`(${n2(nf)} − ${n2(P)})`:`(${n2(P)} − ${n2(nf)})`} × ${k} = ${n2((long?1:-1)*k*(nf-P))}`}}},
 risk:{label:"Inventory risk",min:4,gen(L){const c=contract(3),k=ri(2,20),t=ri(0,1);
   if(t===0)return{q:`You're long ${k} lots of ${c.name}. What's the standard deviation of your P&L at settlement?`,ans:k*c.sd,tol:{rel:0.03,abs:0.05},sol:`One lot has SD ${n2(c.sd)}; ${k} lots of the same contract: ${k} × ${n2(c.sd)} = ${n2(k*c.sd)}.`};
   const lim=ri(10,60);return{q:`Each lot of ${c.name} has a P&L standard deviation of ${n2(c.sd)}. Your risk limit is a P&L SD of ${lim}. What's the most lots you can hold? (whole lots)`,ans:Math.floor(lim/c.sd),tol:{abs:0.001},sol:`${lim} / ${n2(c.sd)} = ${n2(lim/c.sd)}, so ${Math.floor(lim/c.sd)} lots.`}}},
 calc:{label:"Quote a calculation",min:2,gen(L){const t=ri(0,8);let q,v,how;
   if(t===0){const a=ri(11,99),b=ri(11,99),c=ri(3,29);q=`${a} × ${b} × ${c}`;v=a*b*c;how=`${a} × ${b} = ${a*b}, then × ${c}`}
   else if(t===1){const a=ri(3,19),e=a<6?ri(5,8):a<10?ri(4,6):ri(3,5);q=`${a}^${e}`;v=a**e;how=`square and multiply: ${a}² = ${a*a}…`}
   else if(t===2){const n=ri(200,9999);q=`√${n}`;v=Math.sqrt(n);const s=Math.round(Math.sqrt(n));how=`${s}² = ${s*s}, then adjust by (${n} − ${s*s}) / (2 × ${s})`}
   else if(t===3){const n=ri(8,14);q=`${n}!`;v=fact(n);how=`${n-1}! × ${n}`}
   else if(t===4){const n=ri(16,40);q=`2^${n}`;v=2**n;how=`2^10 ≈ 1,024 ≈ 10³, so 2^${n} ≈ 2^${n%10} × 10^${3*Math.floor(n/10)}`}
   else if(t===5){const x=ri(20,80)/10;q=`e^${x}`;v=Math.exp(x);how=`e ≈ 2.718, e² ≈ 7.39, e³ ≈ 20.1`}
   else if(t===6){const x=ri(50,5000);q=`ln ${x}`;v=Math.log(x);how=`ln 10 ≈ 2.303, ln 2 ≈ 0.693`}
   else if(t===7){const n=ri(10,30),k=ri(3,6);q=`C(${n}, ${k})`;v=comb(n,k);how=`${Array.from({length:k},(_,i)=>n-i).join(" × ")} / ${k}!`}
   else{const r=ri(2,12),n=ri(5,30);q=`1.${String(r).padStart(2,"0")}^${n}`;v=(1+r/100)**n;how=`e^(${n} × ln 1.${String(r).padStart(2,"0")}) ≈ e^${r4(n*Math.log(1+r/100))}`}
   return{q:`Make a market on ${q}. No calculator: quote a range you're confident contains the exact value.`,ans:v,mm:true,sol:`Exact: ${fmt(r4(v))}. Route: ${how}. Calculable quantities deserve tight markets.`}}},
}};

/* ---------- probability (replacing the short fixed lists) ---------- */
Object.assign(SKILLS.prob.subs,{
 coins:{label:"Coins & at-least-one",min:1,gen(L){const t=ri(0,L>=3?5:3);
   if(t===0){const n=ri(2,6);return{q:`Flip ${n} fair coins. P(at least one head)?`,ans:1-1/2**n,tol:PROB_TOL,sol:`1 − P(all tails) = 1 − (1/2)^${n} = ${fr(2**n-1,2**n)}`}}
   if(t===1){const n=ri(2,6),f=pick([6,4,8,10,20]);return{q:`Roll a fair ${f}-sided die ${n} times. P(at least one ${f})?`,ans:1-((f-1)/f)**n,tol:PROB_TOL,sol:`1 − (${f-1}/${f})^${n} = ${r4(1-((f-1)/f)**n)}`}}
   if(t===2){const n=ri(3,10),k=ri(0,n);return{q:`Flip ${n} fair coins. P(exactly ${k} heads)?`,ans:comb(n,k)/2**n,tol:PROB_TOL,sol:`C(${n},${k}) / 2^${n} = ${comb(n,k)}/${2**n} = ${r4(comb(n,k)/2**n)}`}}
   if(t===3){const n=ri(2,5);return{q:`Flip ${n} fair coins. P(they all land the same way)?`,ans:2/2**n,tol:PROB_TOL,sol:`All heads or all tails: 2 / 2^${n} = ${fr(2,2**n)}`}}
   if(t===4){const n=pick([3,5,7,9]);let s=0;for(let k=Math.ceil(n/2);k<=n;k++)s+=comb(n,k);return{q:`Flip ${n} fair coins. P(more heads than tails)?`,ans:s/2**n,tol:PROB_TOL,sol:`By symmetry with ${n} odd flips, exactly 1/2.`}}
   const p=pick([0.6,0.7,0.8,0.3]),n=ri(3,6),k=ri(1,n-1);return{q:`A biased coin lands heads with probability ${p}. Flip it ${n} times. P(exactly ${k} heads)?`,ans:binom(n,k,p),tol:PROB_TOL,sol:`C(${n},${k}) × ${p}^${k} × ${r4(1-p)}^${n-k} = ${r4(binom(n,k,p))}`}}},
 dice:{label:"Dice",min:1,gen(L){const t=ri(0,L>=3?11:6);
   if(t===0){const s=ri(2,12),c=6-Math.abs(7-s);return{q:`Roll two fair dice. P(sum = ${s})?`,ans:c/36,tol:PROB_TOL,sol:`${c} ways out of 36 → ${fr(c,36)}`}}
   if(t===1){const t2=ri(4,11);let k=0;for(let x=t2;x<=12;x++)k+=6-Math.abs(7-x);return{q:`Roll two fair dice. P(sum ≥ ${t2})?`,ans:k/36,tol:PROB_TOL,sol:`Count sums ${t2}..12: ${k} of 36 → ${fr(k,36)}`}}
   if(t===2){const d=pick([4,6,8,10,12,20]);return{q:`Roll two fair ${d}-sided dice. P(doubles)?`,ans:1/d,tol:PROB_TOL,sol:`Whatever the first shows, the second matches with probability 1/${d}.`}}
   if(t===3){const k=ri(2,5),n=ri(2,4);return{q:`Roll ${n} fair dice. P(the highest is at most ${k})?`,ans:(k/6)**n,tol:PROB_TOL,sol:`Every die ≤ ${k}: (${k}/6)^${n} = ${r4((k/6)**n)}`}}
   if(t===4){const n=ri(2,4);return{q:`Roll ${n} fair dice. P(the product is even)?`,ans:1-1/2**n,tol:PROB_TOL,sol:`Odd only if every die is odd: 1 − (1/2)^${n} = ${fr(2**n-1,2**n)}`}}
   if(t===5){const k=ri(2,5),n=ri(2,4);return{q:`Roll ${n} fair dice. P(the highest is exactly ${k})?`,ans:(k**n-(k-1)**n)/6**n,tol:PROB_TOL,sol:`P(max ≤ ${k}) − P(max ≤ ${k-1}) = (${k}^${n} − ${k-1}^${n})/6^${n} = ${r4((k**n-(k-1)**n)/6**n)}`}}
   if(t===6){const n=ri(2,4),k=ri(2,5);return{q:`Roll ${n} fair dice. P(the lowest is at least ${k})?`,ans:((7-k)/6)**n,tol:PROB_TOL,sol:`Every die ≥ ${k}: (${7-k}/6)^${n} = ${r4(((7-k)/6)**n)}`}}
   if(t===7){const n=ri(3,4),c=[1,2,3,4,5,6].slice(0,n).reduce((a,_,i)=>a*(6-i),1);return{q:`Roll ${n} fair dice. P(all show different numbers)?`,ans:c/6**n,tol:PROB_TOL,sol:`${Array.from({length:n},(_,i)=>6-i).join(" × ")} / 6^${n} = ${r4(c/6**n)}`}}
   if(t===8){const s=ri(5,16);let c=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let d=1;d<=6;d++)if(a+b+d===s)c++;return{q:`Roll three fair dice. P(sum = ${s})?`,ans:c/216,tol:PROB_TOL,sol:`${c} of 216 outcomes sum to ${s} → ${fr(c,216)}`}}
   if(t===9){const x=ri(4,10);let n=0,m=0;const v=ri(1,6);for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(a+b===x){n++;if(a===v||b===v)m++}return{q:`Roll two dice. Given the sum is ${x}, P(at least one die shows ${v})?`,ans:m/n,tol:PROB_TOL,sol:`${n} pairs sum to ${x}; ${m} contain a ${v}: ${fr(m,n)}`}}
   if(t===10)return{q:"Roll two dice. P(the sum is prime)?",ans:15/36,tol:PROB_TOL,sol:"Sums 2, 3, 5, 7, 11: 1 + 2 + 4 + 6 + 2 = 15 ways → 15/36"};
   const n=ri(2,3),k=ri(n,6*n-1);let c=0,tot=6**n;const f=(r,s)=>{if(r===0){if(s>k)c++;return}for(let x=1;x<=6;x++)f(r-1,s+x)};f(n,0);return{q:`Roll ${n} fair dice. P(sum > ${k})?`,ans:c/tot,tol:PROB_TOL,sol:`${c} of ${tot} outcomes → ${r4(c/tot)}${n===2||k===Math.round(3.5*n)-1?"":""}`}}},
 cards:{label:"Cards",min:2,gen(L){const k=ri(2,Math.min(5,L+1)),t=ri(0,11),D=comb(52,k);
   const T=[
     ()=>({q:`Draw ${k} cards from a deck. P(all the same suit)?`,ans:4*comb(13,k)/D,s:`4 × C(13,${k}) / C(52,${k})`}),
     ()=>({q:`Draw ${k} cards. P(all red)?`,ans:comb(26,k)/D,s:`C(26,${k}) / C(52,${k})`}),
     ()=>({q:`Draw ${k} cards. P(at least one ace)?`,ans:1-comb(48,k)/D,s:`1 − C(48,${k}) / C(52,${k})`}),
     ()=>({q:`Draw ${k} cards. P(exactly one heart)?`,ans:13*comb(39,k-1)/D,s:`13 × C(39,${k-1}) / C(52,${k})`}),
     ()=>({q:`Draw ${k} cards. P(no face cards: no Jacks, Queens or Kings)?`,ans:comb(40,k)/D,s:`C(40,${k}) / C(52,${k})`}),
     ()=>({q:`Draw ${k} cards. P(all different ranks)?`,ans:comb(13,k)*4**k/D,s:`C(13,${k}) × 4^${k} / C(52,${k})`}),
     ()=>({q:"Draw 2 cards. P(the second is higher in rank than the first)? (Ace low; ties possible)",ans:(1-3/51)/2,s:"P(same rank) = 3/51; otherwise higher or lower equally: (1 − 3/51)/2"}),
     ()=>{const j=ri(2,40);return{q:`Shuffle a deck. P(the ${ord(j)} card is an ace)?`,ans:1/13,s:"Every position is equally likely to hold any card: 4/52"}},
     ()=>({q:"Shuffle a deck. P(the first ace appears before the first king)?",ans:0.5,s:"Look only at the 8 aces and kings: by symmetry an ace is first half the time"}),
     ()=>{const kk=Math.max(k,3);return{q:`Draw ${kk} cards. P(exactly two aces)?`,ans:comb(4,2)*comb(48,kk-2)/comb(52,kk),s:`C(4,2) × C(48,${kk-2}) / C(52,${kk})`}},
     ()=>({q:"Draw 2 cards. P(they're the same colour)?",ans:25/51,s:"Second card matches the first's colour: 25/51"}),
     ()=>{const [s1,s2]=pick([["hearts","spades"],["clubs","diamonds"],["hearts","clubs"],["spades","diamonds"]]);return{q:`Draw ${k} cards. P(at least one ${s1.slice(0,-1)} and at least one ${s2.slice(0,-1)})?`,ans:1-2*comb(39,k)/D+comb(26,k)/D,s:`1 − 2·C(39,${k})/C(52,${k}) + C(26,${k})/C(52,${k}) (inclusion–exclusion)`}},
   ];const o=T[t]();return{q:o.q,ans:o.ans,tol:{abs:0.0015,rel:0.01},sol:`${o.s} = ${r4(o.ans)}`}}},
 urn:{label:"Urns",min:2,gen(L){const r=ri(2,8),b=ri(2,8),k=ri(2,Math.min(4,r+b-1)),t=ri(0,2),N=r+b;
   if(t===0){const j=ri(0,Math.min(k,r));return{q:`An urn has ${r} red and ${b} blue balls. Draw ${k} without replacement. P(exactly ${j} red)?`,ans:comb(r,j)*comb(b,k-j)/comb(N,k),tol:PROB_TOL,sol:`C(${r},${j}) × C(${b},${k-j}) / C(${N},${k}) = ${r4(comb(r,j)*comb(b,k-j)/comb(N,k))}`}}
   if(t===1)return{q:`An urn has ${r} red and ${b} blue balls. You draw until you get a red, without replacement. Expected number of draws?`,ans:(N+1)/(r+1),tol:{abs:0.01},sol:`(${N} + 1) / (${r} + 1) = ${r4((N+1)/(r+1))}: the ${r} reds split the blues into ${r+1} equal gaps on average.`};
   return{q:`An urn has ${r} red and ${b} blue balls. Draw them all one by one. P(the last ball is red)?`,ans:r/N,tol:PROB_TOL,sol:`Every ball is equally likely to be last: ${r}/${N}.`}}},
 compare:{label:"Comparing rolls",min:1,gen(L){const d=pick([4,6,8,10,12,20]),e=pick([4,6,8,10,12].filter(x=>x!==d)),t=ri(0,4);
   const beat=(a,b)=>{let w=0;for(let x=1;x<=a;x++)for(let y=1;y<=b;y++)if(x>y)w++;return w/(a*b)};
   if(t===0)return{q:`Two people each roll a fair ${d}-sided die. P(the first rolls strictly higher)?`,ans:(d-1)/(2*d),tol:PROB_TOL,sol:`Ties have probability 1/${d}; the rest splits evenly: (1 − 1/${d})/2 = ${fr(d-1,2*d)}`};
   if(t===1)return{q:`Two people each roll a fair ${d}-sided die. P(they tie)?`,ans:1/d,tol:PROB_TOL,sol:`The second must match the first: 1/${d}`};
   if(t===2)return{q:`You roll a fair ${d}-sided die; I roll a fair ${e}-sided die. P(you roll strictly higher)?`,ans:beat(d,e),tol:PROB_TOL,sol:`Count winning pairs over all ${d*e}: ${r4(beat(d,e))}`};
   if(t===3)return{q:`You roll two dice and take the higher; I roll one die. P(you beat me strictly)?`,ans:(()=>{let w=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)if(Math.max(a,b)>c)w++;return w/216})(),tol:PROB_TOL,sol:"Σ over my roll c of P(max of yours > c) / 6 = 125/216"};
   return{q:`Three people each roll a fair ${d}-sided die. P(all three different)?`,ans:(d-1)*(d-2)/(d*d),tol:PROB_TOL,sol:`(${d-1}/${d}) × (${d-2}/${d}) = ${r4((d-1)*(d-2)/(d*d))}`}}},
 counting:{label:"Counting",min:2,gen(L){const t=ri(0,8);
   if(t===0){const w=pick(["LEVEL","BANANA","STATS","COFFEE","PEPPER","LETTER","ALGEBRA","MISSISSIPPI","TRADER","MARKET","OPTION","HEDGE","BUTTER","PUZZLE","SUCCESS","ARRAY","LLAMA","COMMITTEE","BALLOON","TOMORROW"]);
     const cnt={};for(const ch of w)cnt[ch]=(cnt[ch]||0)+1;let d=1;const parts=[];for(const k in cnt){d*=fact(cnt[k]);if(cnt[k]>1)parts.push(cnt[k]+"!")}
     return{q:`How many distinct arrangements of the letters in ${w}?`,ans:fact(w.length)/d,sol:`${w.length}! / (${parts.join(" · ")||"1"}) = ${fact(w.length)/d}`}}
   if(t===1){const n=ri(6,L+12),k=ri(2,Math.min(6,n-2));return{q:`How many ways to choose a team of ${k} from ${n} people?`,ans:comb(n,k),sol:`C(${n},${k}) = ${comb(n,k)}`}}
   if(t===2){const n=ri(4,8);return{q:`How many ways can ${n} people sit around a round table (rotations count as the same)?`,ans:fact(n-1),sol:`Fix one person, arrange the rest: (${n} − 1)! = ${fact(n-1)}`}}
   if(t===3){const a=ri(2,6),b=ri(2,6);return{q:`On a grid, how many shortest paths go from (0,0) to (${a},${b}) moving only right or up?`,ans:comb(a+b,a),sol:`Choose which ${a} of the ${a+b} steps go right: C(${a+b},${a}) = ${comb(a+b,a)}`}}
   if(t===4){const n=ri(5,30);return{q:`${n} people all shake hands with each other once. How many handshakes?`,ans:n*(n-1)/2,sol:`C(${n},2) = ${n*(n-1)/2}`}}
   if(t===5){const n=ri(5,12),k=ri(2,5);return{q:`How many ways to split ${n} identical sweets among ${k} children (some may get none)?`,ans:comb(n+k-1,k-1),sol:`Stars and bars: C(${n} + ${k} − 1, ${k} − 1) = ${comb(n+k-1,k-1)}`}}
   if(t===6){const n=ri(6,12),k=ri(2,5);return{q:`From ${n} people, choose a committee of ${k} with one of them as chair. How many ways?`,ans:k*comb(n,k),sol:`C(${n},${k}) committees × ${k} choices of chair = ${k*comb(n,k)}`}}
   if(t===7){const n=ri(3,10);return{q:`How many subsets does a set of ${n} elements have (including the empty set)?`,ans:2**n,sol:`Each element is in or out: 2^${n} = ${2**n}`}}
   const n=ri(3,6),d=pick([2,10,26]);return{q:`How many ${n}-character codes can you make from ${d} symbols if repeats are allowed?`,ans:d**n,sol:`${d}^${n} = ${d**n}`}}},
 waiting:{label:"Waiting times",min:3,gen(L){const t=ri(0,8);
   if(t===0){const d=pick([4,6,8,10,12,20]),m=ri(2,d);return{q:`Expected number of rolls of a fair ${d}-sided die until you roll ${m===d?`a ${d}`:`${m} or higher`}?`,ans:d/(d-m+1),tol:{abs:0.01},sol:`Geometric with p = ${d-m+1}/${d}: E = ${r4(d/(d-m+1))}`}}
   if(t===1){const p=pick([0.05,0.1,0.2,0.25,0.4,0.6]);return{q:`A coin lands heads with probability ${p}. Expected flips until the first head?`,ans:1/p,tol:{abs:0.01},sol:`1/p = ${r4(1/p)}`}}
   if(t===2){const n=ri(3,10);return{q:`A ${n}-sided fair die is rolled until every face has appeared. Expected number of rolls?`,ans:n*Hn(n),tol:{abs:0.05},sol:`Coupon collector: ${n}(1 + 1/2 + … + 1/${n}) = ${r4(n*Hn(n))}`}}
   if(t===3){const n=ri(2,6);return{q:`Expected number of fair coin flips until ${n} heads in a row?`,ans:2**(n+1)-2,tol:{abs:0.01},sol:`2^(n+1) − 2 = ${2**(n+1)-2}`}}
   if(t===4){const pat=pick(["HT","TH","HH","HTH","HHT","HHH","THT","HTT","HTHT","HHTT","HHHH"]);let e=0;for(let k=1;k<=pat.length;k++)if(pat.slice(0,k)===pat.slice(pat.length-k))e+=2**k;
     return{q:`Expected number of fair coin flips until the pattern ${pat} first appears?`,ans:e,tol:{abs:0.01},sol:`Add 2^k for every k where the first k letters equal the last k: ${e}.`}}
   if(t===5){const d=pick([4,6,8,10]);return{q:`Roll a fair ${d}-sided die until you've seen both a 1 and a ${d}. Expected number of rolls?`,ans:d/2+d,tol:{abs:0.01},sol:`Wait for either (p = 2/${d}): ${d/2} rolls; then the other (p = 1/${d}): ${d}. Total ${d/2+d}.`}}
   if(t===6){const d=pick([4,6,8,10]);return{q:`Roll a fair ${d}-sided die until two consecutive rolls are equal. Expected number of rolls?`,ans:d+1,tol:{abs:0.01},sol:`After the first roll, each new roll matches the previous with p = 1/${d}: 1 + ${d} = ${d+1}.`}}
   if(t===7){const n=ri(3,8),k=ri(2,n-1);let e=0;for(let i=0;i<k;i++)e+=n/(n-i);return{q:`Roll a fair ${n}-sided die until you've seen ${k} different faces. Expected number of rolls?`,ans:e,tol:{abs:0.02},sol:`Σ ${n}/(${n} − i) for i = 0…${k-1} = ${r4(e)}`}}
   const p=pick([0.3,0.4,0.6]),q=r4(1-p);return{q:`A coin lands heads with probability ${p}. Expected flips until you've seen at least one head and one tail?`,ans:1+p/q+q/p,tol:{abs:0.01},sol:`After the first flip, wait for the other side: 1 + p·(1/q) + q·(1/p) = ${r4(1+p/q+q/p)}`}}},
});

SKILLS.prob.subs.bayes={label:"Bayes",min:3,gen(L){const t=ri(0,3);
  if(t===0){const p=pick([0.1,0.5,1,2,5,10,20]),se=pick([80,90,95,99]),fp=pick([1,2,5,10,20]),num=p*se,den=p*se+(100-p)*fp;
    return{q:`A condition affects ${p}% of people. A test catches ${se}% of cases and gives false positives ${fp}% of the time. You test positive. P(you have it)?`,ans:num/den,tol:PROB_TOL,sol:`P(+|D)P(D) / P(+) = ${se/100}·${p/100} / (${se/100}·${p/100} + ${fp/100}·${r4(1-p/100)}) = ${r4(num/den)}`}}
  if(t===1){const k=ri(1,6),n=pick([2,3,5,10]);return{q:`A bag has ${n} coins: one is double-headed, the rest are fair. You pick one at random and flip it ${k} times: all heads. P(it's the double-headed coin)?`,ans:2**k/(2**k+n-1),tol:PROB_TOL,sol:`Prior 1/${n}. Likelihood 1 vs (1/2)^${k}: 2^${k} / (2^${k} + ${n-1}) = ${r4(2**k/(2**k+n-1))}`}}
  if(t===2){const a=ri(1,5),b=ri(1,5),c=ri(1,5),d=ri(1,5);return{q:`Urn A has ${a} red and ${b} blue balls; urn B has ${c} red and ${d} blue. Pick an urn at random and draw a red ball. P(it came from urn A)?`,ans:(a/(a+b))/(a/(a+b)+c/(c+d)),tol:PROB_TOL,sol:`(${a}/${a+b}) / (${a}/${a+b} + ${c}/${c+d}) = ${r4((a/(a+b))/(a/(a+b)+c/(c+d)))}`}}
  const p=pick([0.2,0.3,0.5]),r1=pick([0.6,0.7,0.8]),r0=pick([0.1,0.2,0.3]);return{q:`It rains on ${p*100}% of days. The forecast says rain on ${r1*100}% of rainy days and on ${r0*100}% of dry days. The forecast says rain. P(it rains)?`,ans:p*r1/(p*r1+(1-p)*r0),tol:PROB_TOL,sol:`${p}·${r1} / (${p}·${r1} + ${r4(1-p)}·${r0}) = ${r4(p*r1/(p*r1+(1-p)*r0))}`}}};

/* ---------- expected value ---------- */
function keepValue(d,r){let v=(d+1)/2;for(let i=0;i<r;i++){let s=0;for(let x=1;x<=d;x++)s+=Math.max(x,v);v=s/d}return v}
Object.assign(SKILLS.ev.subs,{
 dicegames:{label:"Dice games",min:2,gen(L){const d=pick(L>=4?[4,6,8,10,12,20]:[6,6,4,8]),t=ri(0,L>=4?8:5),D=d===6?"die":`${d}-sided die`;
   if(t===0)return{q:`Roll a fair ${D}; you're paid the face value. Fair price?`,ans:(d+1)/2,tol:{abs:0.01},sol:`(1 + … + ${d}) / ${d} = ${(d+1)/2}`};
   if(t===1)return{q:`Roll a fair ${D}; you're paid the square of the face. Fair price?`,ans:(d+1)*(2*d+1)/6,tol:{abs:0.01},sol:`(1² + … + ${d}²) / ${d} = (${d}+1)(2·${d}+1)/6 = ${r4((d+1)*(2*d+1)/6)}`};
   if(t===2){const k=ri(2,3);let s=0;for(let m=1;m<=d;m++)s+=m*(m**k-(m-1)**k)/d**k;return{q:`Roll ${k} fair ${d===6?"dice":`${d}-sided dice`}; you're paid the highest. Expected payout?`,ans:s,tol:{abs:0.01},sol:`P(max = m) = (m^${k} − (m−1)^${k}) / ${d}^${k}; Σ m·P = ${r4(s)}`}}
   if(t===3){const r=ri(1,L>=4?3:1);return{q:`Roll a fair ${D}, paid the face value. You may reroll up to ${plural(r,"time")}, but must keep the last roll. Optimal fair value?`,ans:keepValue(d,r),tol:{abs:0.01},sol:`Work backwards: with no rerolls the game is worth ${(d+1)/2}; with one more, keep any roll above the value of continuing. Result ${r4(keepValue(d,r))}.`}}
   if(t===4)return{q:`Roll two fair ${d===6?"dice":`${d}-sided dice`}; you're paid the product. Expected payout?`,ans:((d+1)/2)**2,tol:{abs:0.01},sol:`Independent: E[X]E[Y] = ${(d+1)/2}² = ${r4(((d+1)/2)**2)}`};
   if(t===5){const K=ri(1,d-1);let s=0;for(let x=K+1;x<=d;x++)s+=x-K;return{q:`A contract pays max(roll − ${K}, 0) on one fair ${D}. Fair value?`,ans:s/d,tol:{abs:0.01},sol:`(${Array.from({length:d-K},(_,i)=>i+1).join(" + ")}) / ${d} = ${r4(s/d)}`}}
   if(t===6)return{q:`Roll two fair ${d===6?"dice":`${d}-sided dice`}; you're paid the absolute difference. Expected payout?`,ans:(d*d-1)/(3*d),tol:{abs:0.01},sol:`(d² − 1)/(3d) = ${r4((d*d-1)/(3*d))}`};
   if(t===7)return{q:`Roll two fair ${d===6?"dice":`${d}-sided dice`}. If they match you're paid their sum, otherwise nothing. Fair value?`,ans:(d+1)/d,tol:{abs:0.01},sol:`P(match) = 1/${d}; given a match the sum averages ${d+1}: ${r4((d+1)/d)}`};
   return{q:"Flip a fair coin until tails. You're paid £1 for every head before it. Fair value?",ans:1,tol:{abs:0.01},sol:"The number of heads is geometric on {0, 1, 2, …} with mean 1."}}},
 linearity:{label:"Linearity of expectation",min:3,gen(L){const n=ri(3,12),t=ri(0,7);
   if(t===0)return{q:`Shuffle ${n} letters into ${n} addressed envelopes at random. Expected number in the right envelope?`,ans:1,tol:{abs:0.01},sol:"Each has a 1/n chance; n × 1/n = 1."};
   if(t===1){const d=pick([4,6,8]);return{q:`Roll a fair ${d}-sided die ${n} times. Expected number of distinct faces seen?`,ans:d*(1-((d-1)/d)**n),tol:{abs:0.01},sol:`Each face appears with prob 1 − (${d-1}/${d})^${n}: ${d} × that = ${r4(d*(1-((d-1)/d)**n))}`}}
   if(t===2)return{q:`Flip ${n} coins in a row. Expected number of adjacent HH pairs?`,ans:(n-1)/4,tol:{abs:0.01},sol:`${n-1} adjacent pairs × 1/4 = ${r4((n-1)/4)}`};
   if(t===3){const m=ri(3,10);return{q:`Throw ${n} balls into ${m} boxes at random. Expected number of empty boxes?`,ans:m*((m-1)/m)**n,tol:{abs:0.01},sol:`Each box is empty with prob (${m-1}/${m})^${n}: ${m} × that = ${r4(m*((m-1)/m)**n)}`}}
   if(t===4){const k=ri(10,60);return{q:`${k} people in a room. Expected number of pairs sharing a birthday (365 equally likely days)?`,ans:comb(k,2)/365,tol:{abs:0.01},sol:`C(${k},2) pairs × 1/365 = ${r4(comb(k,2)/365)}`}}
   if(t===5)return{q:`Flip ${n} coins. Expected number of runs (maximal blocks of the same side, e.g. HHTH has 3)?`,ans:1+(n-1)/2,tol:{abs:0.01},sol:`1 + each of the ${n-1} boundaries starts a new run with prob ½: ${r4(1+(n-1)/2)}`};
   if(t===6)return{q:`Shuffle the numbers 1 to ${n}. Expected number of "records" (values bigger than everything before them)?`,ans:Hn(n),tol:{abs:0.01},sol:`Position k is a record with prob 1/k: 1 + 1/2 + … + 1/${n} = ${r4(Hn(n))}`};
   const k=ri(2,5);return{q:`Draw ${k} cards from a deck. Expected number of aces?`,ans:k*4/52,tol:{abs:0.005},sol:`${k} × 4/52 = ${r4(k*4/52)}`}}},
});

/* ---------- statistics ---------- */
Object.assign(SKILLS.stats.subs,{
 dicevar:{label:"Variance of dice",min:2,gen(L){const d=pick([4,6,8,10,12,20]),n=ri(1,L+3),v=(d*d-1)/12,t=ri(0,2),D=d===6?"":`${d}-sided `;
   if(t===0)return{q:`Roll ${n} fair ${D}${n>1?"dice":"die"}. Variance of the total?`,ans:n*v,tol:{abs:0.01},sol:`Var(one) = (${d}² − 1)/12 = ${r4(v)}; × ${n} = ${r4(n*v)}`};
   if(t===1)return{q:`Roll ${n} fair ${D}${n>1?"dice":"die"}. Standard deviation of the total?`,ans:Math.sqrt(n*v),tol:{abs:0.01},sol:`√(${n} × ${r4(v)}) = ${r4(Math.sqrt(n*v))}`};
   const m=ri(4,100);return{q:`Roll a fair ${D}die ${m} times. Variance of the average roll?`,ans:v/m,tol:{abs:0.002},sol:`Var(one)/n = ${r4(v)}/${m} = ${r4(v/m)}`}}},
 uniform:{label:"Uniform & order statistics",min:3,gen(L){const t=ri(0,8);
   if(t===0){const a=ri(-5,5),b=a+ri(2,16);return{q:`X ~ U(${a}, ${b}). Var(X)?`,ans:(b-a)**2/12,tol:{abs:0.005},sol:`(b − a)²/12 = ${r4((b-a)**2/12)}`}}
   if(t===1){const n=ri(2,12),a=pick([1,1,2,10]);return{q:`${n} independent U(0, ${a}) draws. E[maximum]?`,ans:a*n/(n+1),tol:{abs:0.005*a},sol:`${a} × n/(n+1) = ${r4(a*n/(n+1))}`}}
   if(t===2){const n=ri(2,12),a=pick([1,1,2,10]);return{q:`${n} independent U(0, ${a}) draws. E[minimum]?`,ans:a/(n+1),tol:{abs:0.005*a},sol:`${a}/(n+1) = ${r4(a/(n+1))}`}}
   if(t===3){const c=pick([0.2,0.3,0.4,0.5,0.6,0.8,1,1.2,1.4,1.5,1.7]);const a=c<=1?c*c/2:1-(2-c)**2/2;return{q:`X, Y ~ U(0,1) independent. P(X + Y < ${c})?`,ans:a,tol:{abs:0.005},sol:c<=1?`Triangle area: ${c}²/2 = ${r4(a)}`:`1 − (2 − ${c})²/2 = ${r4(a)}`}}
   if(t===4){const c=pick([0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]);return{q:`X ~ U(0,1). E[X | X > ${c}]?`,ans:(1+c)/2,tol:{abs:0.005},sol:`Uniform on (${c}, 1): midpoint ${r4((1+c)/2)}`}}
   if(t===5){const k=ri(2,6);return{q:`X, Y ~ U(0,1) independent. P(X > ${k}Y)?`,ans:1/(2*k),tol:{abs:0.005},sol:`Triangle under y = x/${k}: area 1/(2·${k}) = ${r4(1/(2*k))}`}}
   if(t===6){const n=ri(2,6),c=pick([0.5,0.8,0.9]);return{q:`${n} independent U(0,1) draws. P(the maximum is below ${c})?`,ans:c**n,tol:{abs:0.005},sol:`All ${n} below ${c}: ${c}^${n} = ${r4(c**n)}`}}
   if(t===7){const c=pick([0.1,0.25,0.5]);return{q:`X, Y ~ U(0,1) independent. P(|X − Y| < ${c})?`,ans:1-(1-c)**2,tol:{abs:0.005},sol:`1 − (1 − ${c})² = ${r4(1-(1-c)**2)}`}}
   return{q:"X, Y ~ U(0,1) independent. E|X − Y|?",ans:1/3,tol:{abs:0.005},sol:"Two random points split [0,1] into three pieces of mean length 1/3."}}},
 normal:{label:"Normal distribution",min:3,gen(L){const Z=[[1,0.8413],[1.28,0.8997],[1.645,0.95],[1.96,0.975],[2,0.9772],[2.33,0.9901],[2.58,0.9951],[0.5,0.6915],[3,0.99865]],t=ri(0,4),mu=ri(20,200),sg=ri(2,25);
   if(t===0){const [z,p]=pick(Z),neg=Math.random()<.4;return{q:`X ~ N(${mu}, ${sg}²). P(X < ${r4(mu+(neg?-z:z)*sg)})?`,ans:neg?1-p:p,tol:{abs:0.005},sol:`z = ${neg?"−":""}${z} → Φ = ${r4(neg?1-p:p)}`}}
   if(t===1){const k=ri(1,3),p=[0,0.6827,0.9545,0.9973][k];return{q:`X ~ N(${mu}, ${sg}²). P(${mu-k*sg} < X < ${mu+k*sg})?`,ans:p,tol:{abs:0.005},sol:`Within ${k} SD: ${p}`}}
   if(t===2){const [z,p]=pick(Z.filter(x=>x[0]>=1.28));return{q:`X ~ N(${mu}, ${sg}²). Find x with P(X < x) = ${p}.`,ans:mu+z*sg,tol:{abs:0.05*sg},sol:`μ + ${z}σ = ${r4(mu+z*sg)}`}}
   if(t===3){const s1=ri(3,12),s2=ri(3,12);return{q:`X ~ N(0, ${s1}²) and Y ~ N(0, ${s2}²) are independent. Standard deviation of X + Y?`,ans:Math.sqrt(s1*s1+s2*s2),tol:{abs:0.01},sol:`Variances add: √(${s1*s1} + ${s2*s2}) = ${r4(Math.sqrt(s1*s1+s2*s2))}`}}
   const n=pick([4,16,25,100]);return{q:`Sample mean of ${n} independent draws from N(${mu}, ${sg}²). Its standard deviation?`,ans:sg/Math.sqrt(n),tol:{abs:0.01},sol:`σ/√n = ${sg}/${Math.sqrt(n)} = ${r4(sg/Math.sqrt(n))}`}}},
 covar:{label:"Covariance & correlation",min:3,gen(L){const t=ri(0,3),sx=ri(1,6),sy=ri(1,6),rho=pick([-0.5,-0.2,0,0.3,0.5,0.8]);
   if(t===0){const a=ri(1,3),b=pick([-2,-1,1,2]);return{q:`SD(X) = ${sx}, SD(Y) = ${sy}, corr(X,Y) = ${rho}. Var(${a}X ${b<0?"−":"+"} ${Math.abs(b)}Y)?`,ans:a*a*sx*sx+b*b*sy*sy+2*a*b*rho*sx*sy,tol:{abs:0.01},sol:`a²σx² + b²σy² + 2abρσxσy = ${r4(a*a*sx*sx+b*b*sy*sy+2*a*b*rho*sx*sy)}`}}
   if(t===1)return{q:`SD(X) = ${sx}, SD(Y) = ${sy}, corr(X,Y) = ${rho}. Cov(X,Y)?`,ans:rho*sx*sy,tol:{abs:0.01},sol:`ρσxσy = ${r4(rho*sx*sy)}`};
   if(t===2)return{q:`Regress Y on X. SD(X) = ${sx}, SD(Y) = ${sy}, corr = ${rho}. Slope?`,ans:rho*sy/sx,tol:{abs:0.01},sol:`β = ρ·σy/σx = ${r4(rho*sy/sx)}`};
   const k=ri(2,5);return{q:`X₁…X${"₀₁₂₃₄₅₆₇₈₉"[k]} are independent with equal variance. Correlation between X₁ and X₁ + … + X${"₀₁₂₃₄₅₆₇₈₉"[k]}?`,ans:1/Math.sqrt(k),tol:{abs:0.005},sol:`Cov = σ², SDs σ and σ√${k}: 1/√${k} = ${r4(1/Math.sqrt(k))}`}}},
});

/* ---------- quant finance ---------- */
Object.assign(SKILLS.fin.subs,{
 kelly:{label:"Kelly sizing",min:3,gen(L){const p=pick([0.52,0.55,0.58,0.6,0.62,0.65,0.7]),b=pick(L>=4?[1,1.5,2,3]:[1,2]),t=ri(0,2),f=p-(1-p)/b;
   if(t===0||f<=0)return{q:`A bet wins with probability ${p} and pays ${b}:1. Kelly fraction of your bankroll (decimal)?`,ans:f,tol:{abs:0.005},sol:`f* = p − q/b = ${p} − ${r4(1-p)}/${b} = ${r4(f)}${f<=0?". Zero or negative: don't bet.":""}`};
   if(t===1)return{q:`A bet wins with probability ${p} and pays ${b}:1. You bet half Kelly. What fraction of your bankroll is that? (decimal)`,ans:f/2,tol:{abs:0.005},sol:`Kelly ${r4(f)}, half is ${r4(f/2)}. Half Kelly gives about 3/4 of the growth with much smaller swings.`};
   return{q:`A bet wins with probability ${p} at ${b}:1. Expected profit per £1 bet?`,ans:p*b-(1-p),tol:{abs:0.005},sol:`p·b − q = ${p}×${b} − ${r4(1-p)} = ${r4(p*b-(1-p))}`}}},
 pricing:{label:"Discounting & forwards",min:1,gen(L){const t=ri(0,L>=3?4:2),r=pick([2,3,4,5,6,8]),n=ri(1,10),X=pick([100,1000,500]);
   if(t===0)return{q:`What's £${X} received in ${n} years worth today at ${r}% a year, compounded annually?`,ans:X/(1+r/100)**n,tol:{abs:0.05,rel:0.001},sol:`${X} / 1.${String(r).padStart(2,"0")}^${n} = ${r4(X/(1+r/100)**n)}`};
   if(t===1){const S=ri(50,200);return{q:`A stock pays no dividends and trades at ${S}. Interest rates are ${r}% (annual compounding). One-year forward price?`,ans:S*(1+r/100),tol:{abs:0.01},sol:`S × (1 + r) = ${r4(S*(1+r/100))}. Any other price is an arbitrage.`}}
   if(t===2){const C=ri(2,8);return{q:`A ${n}-year bond pays a ${C}% annual coupon and yields ${C}%. What does it trade at per 100 face?`,ans:100,tol:{abs:0.01},sol:"When the coupon equals the yield, the bond trades at par: 100."}}
   if(t===3){const D=ri(2,12),dy=pick([0.25,0.5,1]);return{q:`A bond has modified duration ${D}. Yields rise by ${dy}%. Approximate % change in its price?`,ans:-D*dy,tol:{abs:0.01},sol:`ΔP/P ≈ −D × Δy = −${D} × ${dy}% = ${-D*dy}%`}}
   const S=ri(50,200),T=ri(1,3);return{q:`Stock ${S}, continuously compounded rate ${r}%, ${T} years. Forward price?`,ans:S*Math.exp(r/100*T),tol:{abs:0.05},sol:`S·e^(rT) = ${S} × e^${r4(r/100*T)} = ${r4(S*Math.exp(r/100*T))}`}}},
 hedge:{label:"Hedging",min:2,gen(L){const t=ri(0,2),N=ri(2,50),d=pick([0.2,0.3,0.4,0.5,0.6,0.75]);
   if(t===0){const sold=Math.random()<.5;return{q:`You ${sold?"sold":"bought"} ${N} calls (one share each) with delta ${d}. How many shares do you ${sold?"buy":"sell"} to be delta-neutral?`,ans:N*d,tol:{abs:0.01},sol:`${N} × ${d} = ${r4(N*d)} shares. ${sold?"Short calls are short delta, so buy stock.":"Long calls are long delta, so sell stock."}`}}
   if(t===1){const g=pick([0.02,0.05,0.1]),dS=ri(1,5);return{q:`Your option position has delta ${N} and gamma ${g*N}. The stock rises ${dS}. Approximate new delta?`,ans:N+g*N*dS,tol:{abs:0.01},sol:`Δ_new ≈ Δ + Γ·ΔS = ${N} + ${r4(g*N)} × ${dS} = ${r4(N+g*N*dS)}`}}
   const beta=pick([0.8,1.2,1.5]),V=pick([100000,250000,1000000]);return{q:`You hold £${V.toLocaleString("en-GB")} of a stock with beta ${beta} to the index. How much index do you short to hedge market risk? (£)`,ans:V*beta,tol:{abs:1},sol:`β × value = ${beta} × ${V.toLocaleString("en-GB")} = £${(V*beta).toLocaleString("en-GB")}`}}},
});
SKILLS.fin.subs.compound={label:"Compounding",min:1,gen(L){const t=ri(0,4),r=pick([2,3,4,5,6,7,8,9,10,12,15]),n=ri(2,L+4),P=pick([100,500,1000,2500]);
  if(t===0)return{q:`At ${r}% a year compounded, roughly how many years to double your money?`,ans:Math.log(2)/Math.log(1+r/100),tol:{abs:0.6},sol:`Rule of 72: 72 / ${r} ≈ ${r4(72/r)}. Exact: ln 2 / ln(1 + ${r/100}) = ${r4(Math.log(2)/Math.log(1+r/100))}`};
  if(t===1)return{q:`£${P} grows at ${r}% a year for ${n} years, compounded annually. Final value (£)?`,ans:P*(1+r/100)**n,tol:{abs:0.5,rel:0.002},sol:`${P} × ${1+r/100}^${n} = ${r4(P*(1+r/100)**n)}`};
  if(t===2)return{q:`£${P} at ${r}% a year compounded monthly for ${n} years. Final value (£)?`,ans:P*(1+r/1200)**(12*n),tol:{abs:0.5,rel:0.002},sol:`${P} × (1 + ${r}/1200)^${12*n} = ${r4(P*(1+r/1200)**(12*n))}`};
  if(t===3)return{q:`£${P} at ${r}% a year compounded continuously for ${n} years. Final value (£)?`,ans:P*Math.exp(r/100*n),tol:{abs:0.5,rel:0.002},sol:`${P} × e^${r4(r/100*n)} = ${r4(P*Math.exp(r/100*n))}`};
  const i=pick([1,2,3,4]);return{q:`Your investment earns ${r}% a year and inflation is ${i}%. Real return in % (exact, not the approximation)?`,ans:((1+r/100)/(1+i/100)-1)*100,pct:true,tol:{abs:0.02},sol:`(1.${String(r).padStart(2,"0")} / 1.0${i}) − 1 = ${r4(((1+r/100)/(1+i/100)-1)*100)}% (≈ ${r-i}% by subtraction)`}}};
SKILLS.fin.subs.portfolio={label:"Diversification",min:3,gen(L){const t=ri(0,3),s1=pick([10,15,20,25,30,40]),s2=pick([10,15,20,25,30,40]),rho=pick([-0.5,-0.2,0,0.2,0.5,0.8]),w=pick([0.2,0.25,0.4,0.5,0.6,0.75]);
  if(t===0){const v=Math.sqrt(w*w*s1*s1+(1-w)**2*s2*s2+2*w*(1-w)*rho*s1*s2);return{q:`Asset A has ${s1}% volatility, asset B ${s2}%, correlation ${rho}. A portfolio is ${w*100}% A and ${100-w*100}% B. Volatility in %?`,ans:v,pct:true,tol:{abs:0.1},sol:`√(w²σA² + (1−w)²σB² + 2w(1−w)ρσAσB) = ${r4(v)}%`}}
  if(t===1){const n=pick([4,9,16,25,100]);return{q:`${n} uncorrelated assets, each ${s1}% volatility, equally weighted. Portfolio volatility in %?`,ans:s1/Math.sqrt(n),pct:true,tol:{abs:0.1},sol:`σ/√n = ${s1}/√${n} = ${r4(s1/Math.sqrt(n))}%`}}
  if(t===2){const r=pick([0.1,0.2,0.3,0.5]),n=pick([5,10,20,50]);return{q:`${n} assets, each ${s1}% volatility, every pair correlated ${r}, equally weighted. Portfolio volatility in %?`,ans:s1*Math.sqrt(r+(1-r)/n),pct:true,tol:{abs:0.1},sol:`σ√(ρ + (1 − ρ)/n) = ${r4(s1*Math.sqrt(r+(1-r)/n))}%`}}
  const ww=s2*s2/(s1*s1+s2*s2);return{q:`Two uncorrelated assets with volatilities ${s1}% and ${s2}%. What weight in the first minimises portfolio volatility? (decimal)`,ans:ww,tol:{abs:0.005},sol:`w = σB² / (σA² + σB²) = ${r4(ww)}`}}};
/* percentages and fractions get wider ranges */
SKILLS.arith.subs.frac={label:"Fractions & decimals",min:1,gen(L){let d=ri(2,[8,16,20,32,40][L-1]),n=ri(1,d-1);while(gcd(n,d)!==1){d=ri(3,20);n=ri(1,d-1)}
  if(Math.random()<.5)return{q:`Write ${n}/${d} as a decimal (3 d.p. is fine)`,ans:n/d,tol:{abs:0.0006},sol:`${n}/${d} = ${r4(n/d)}`};
  return{q:`Write ${n}/${d} as a percentage`,ans:n/d*100,pct:true,tol:{abs:0.06},sol:`${n}/${d} = ${r4(n/d*100)}%`}}};

/* ---------- learning-track questions, regenerated every time ---------- */
/* g(skill, sub, generator level, displayed level, target seconds): one generated question for a unit */
const g=(skill,sub,gL,L,secs)=>({skill,sub,label:SKILLS[skill].subs[sub].label,...SKILLS[skill].subs[sub].gen(gL),L,...(secs?{secs}:{})});
const UQ={
 1:()=>{const c=contract(1),b=half(c.fv-ri(1,4)/2),a=half(c.fv+ri(1,4)/2),k=ri(1,4);return[
   {skill:"mm",sub:"edge",label:"Spread",q:`You quote ${n2(b)} at ${n2(a)}. What's your spread?`,ans:a-b,tol:{abs:0.01},sol:`ask − bid = ${n2(a-b)}`,L:1,secs:8},
   {skill:"mm",sub:"fair",label:"Fair value",q:`What's the fair value of ${c.name}?`,ans:c.fv,tol:{abs:0.01},sol:`${n2(c.fv)}: ${c.how}`,L:1,secs:20},
   {skill:"mm",sub:"edge",label:"Edge per trade",q:`You quote ${n2(b)} at ${n2(a)} on ${c.name}. Someone buys ${k} from you. Expected profit?`,ans:k*(a-c.fv),tol:{abs:0.01},sol:`${k} × (${n2(a)} − ${n2(c.fv)}) = ${n2(k*(a-c.fv))}`,L:1,secs:20},
   {skill:"mm",sub:"edge",label:"Edge per trade",q:`Same market, but someone sells you ${k}. Expected profit?`,ans:k*(c.fv-b),tol:{abs:0.01},sol:`${k} × (${n2(c.fv)} − ${n2(b)}) = ${n2(k*(c.fv-b))}`,L:2,secs:20},
   g("mm","quote",1,1)]},
 2:()=>[g("ev","dicegames",2,2,45),g("ev","dicegames",3,2,45),g("ev","linearity",3,3,60),g("mm","fair",2,2,40),g("mm","fair",3,2,40),g("mm","quote",2,2)],
 3:()=>[g("mm","edge",3,2,30),g("mm","edge",3,2,30),g("mm","edge",4,2,30),g("mm","implied",2,2,30),g("mm","implied",2,2,30),g("mm","quote",2,2)],
 4:()=>[g("mm","skew",2,2,30),g("mm","skew",2,2,30),g("mm","skew",3,2,30),g("mm","position",2,2,45),g("mm","position",3,3,60)],
 5:()=>[g("mm","update",2,2,30),g("mm","update",2,2,30),g("mm","update",3,3,45),g("mm","update",4,3,45),g("mm","update",4,3,45),g("mm","quote",3,3)],
 6:()=>[g("mm","adverse",3,3,90),g("mm","adverse",3,3,90),g("mm","adverse",4,4,90),g("mm","adverse",4,4,90)],
 7:()=>[g("mm","fair",1,2,30),g("mm","update",3,3,45),g("mm","update",3,3,45),g("mm","sd",3,3,60),g("mm","pnl",3,3,60),g("mm","pnl",4,3,60),g("mm","arb",3,4,90)],
 8:()=>[g("mm","calc",3,3),g("mm","calc",3,3),g("mm","calc",3,3),g("mm","quote",3,3),g("mm","quote",4,3)],
};

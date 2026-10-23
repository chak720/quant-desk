/* Market-making curriculum. Each unit: short lesson + practice questions with exact answers.
   Question shape matches daily.json: {skill,label,q,ans,tol,sol,L,secs,mm?} */
"use strict";
const UNITS=[
{n:1,title:"Bid, ask, spread and fair value",
 sections:[
  {h:"Bid and ask",p:"A market maker quotes two prices at once. The bid is the price you'll buy at; the ask (or offer) is the price you'll sell at. \"48 at 52\" means: I'll buy from you at 48, or sell to you at 52. The other trader chooses which side to hit."},
  {h:"Fair value",p:"Fair value is your best estimate of what something is worth on average: its expected value. A contract paying one die roll is worth 3.5. You centre your quote on fair value, for example 3 at 4."},
  {h:"The spread pays you",p:"The spread is ask minus bid. Every trade earns you the gap between the traded price and fair value. Quote 3 at 4 on the die and someone buys at 4: you sold something worth 3.5 for 4, an expected profit of 0.5."},
  {h:"Width reflects uncertainty",p:"The less sure you are, the wider you quote. In interviews it's normal to start wide and tighten as you think. Quoting tight around a wrong number is what loses money."}],
 takeaways:["Bid = you buy, ask = you sell. The other side picks.","Centre the quote on expected value.","Profit per trade = distance from traded price to fair value.","More uncertainty, wider market."],
 questions:[
  {skill:"mm",label:"Spread",q:"You quote 46 at 54 on a contract. What is your spread?",ans:8,tol:{abs:0.01},sol:"ask − bid = 54 − 46 = 8",L:1,secs:5},
  {skill:"ev",label:"Fair value",q:"A contract pays out one fair die roll. Fair value?",ans:3.5,tol:{abs:0.01},sol:"(1+2+…+6)/6 = 3.5",L:1,secs:10},
  {skill:"ev",label:"Edge per trade",q:"You quote 3 at 4 on that die contract. Someone buys one from you. Your expected profit?",ans:0.5,tol:{abs:0.01},sol:"You sell at 4 something worth 3.5 → +0.5",L:1,secs:15},
  {skill:"ev",label:"Fair value",q:"A contract pays the sum of two fair dice. Fair value?",ans:7,tol:{abs:0.01},sol:"3.5 + 3.5 = 7",L:1,secs:10},
  {skill:"ev",label:"Edge per trade",q:"You quote 6.5 at 7.5 on the two-dice sum. Someone sells one to you. Your expected profit?",ans:0.5,tol:{abs:0.01},sol:"You buy at 6.5 something worth 7 → +0.5",L:2,secs:15},
  {skill:"mm",mm:true,label:"Make a market",q:"Number of minutes in a week",ans:10080,sol:"60 × 24 × 7 = 10,080. Calculable, so quote tight."}]},
{n:2,title:"Expected value of simple contracts",
 sections:[
  {h:"Average over outcomes",p:"Expected value is each outcome times its probability, added up. A contract paying £10 if a die shows 6 is worth 10 × 1/6 ≈ £1.67. Write the outcomes down, attach probabilities, multiply and sum."},
  {h:"Linearity saves time",p:"The expected value of a sum is the sum of expected values, even when the parts are dependent. Ten coin flips, paid £1 per head: 10 × ½ = £5. No need to list all 1,024 outcomes."},
  {h:"Cards",p:"With Ace = 1 up to King = 13, one card's expected rank is (1+…+13)/13 = 7. A whole deck sums to 4 × 91 = 364. These two numbers come up constantly in card market-making games."},
  {h:"Non-linear payoffs",p:"If the payout is a function of the outcome, average the function, not the input. Paid the square of a die roll: (1+4+9+16+25+36)/6 = 91/6 ≈ 15.17, not 3.5² = 12.25."}],
 takeaways:["EV = Σ outcome × probability.","E[X+Y] = E[X] + E[Y], always.","Card rank averages 7; a deck sums to 364.","Average the payoff, not the input."],
 questions:[
  {skill:"ev",label:"Indicator payoff",q:"A contract pays £10 if a fair die shows 6, else nothing. Fair value (£)?",ans:10/6,tol:{abs:0.01},sol:"10 × 1/6 ≈ 1.667",L:1,secs:10},
  {skill:"ev",label:"Linearity",q:"Flip 10 fair coins. You're paid £1 per head. Fair value?",ans:5,tol:{abs:0.01},sol:"10 × 0.5 = 5",L:1,secs:8},
  {skill:"ev",label:"Cards",q:"Draw one card, Ace = 1 … King = 13. Expected rank?",ans:7,tol:{abs:0.01},sol:"(1+…+13)/13 = 91/13 = 7",L:1,secs:15},
  {skill:"ev",label:"Non-linear payoff",q:"You're paid the square of one die roll. Fair value?",ans:91/6,tol:{abs:0.01},sol:"(1+4+9+16+25+36)/6 = 91/6 ≈ 15.17",L:2,secs:25},
  {skill:"ev",label:"Max of two",q:"Roll two dice and get paid the higher one. Fair value?",ans:161/36,tol:{abs:0.01},sol:"P(max=k) = (2k−1)/36 → Σk(2k−1)/36 = 161/36 ≈ 4.47",L:3,secs:60},
  {skill:"ev",label:"Linearity",q:"Draw 5 cards (Ace = 1 … King = 13). Expected total rank?",ans:35,tol:{abs:0.01},sol:"5 × 7 = 35, by linearity",L:2,secs:15}]},
{n:3,title:"Edge and profit across many trades",
 sections:[
  {h:"Edge",p:"Edge is how much you expect to make per unit traded. Buying: fair value minus price. Selling: price minus fair value. Multiply by size for the total."},
  {h:"Both sides filled",p:"If one trader buys from you and another sells to you in the same size, your position is flat and you've locked in the full spread on that size, whatever the true value turns out to be."},
  {h:"Break-even probabilities",p:"A contract paying £100 with probability p is worth 100p. If you can buy it at £30, you have edge only when 100p > 30, so p > 0.3. Interviewers love turning prices into implied probabilities."}],
 takeaways:["Buy edge = FV − price; sell edge = price − FV.","Matched buys and sells lock in the spread.","Price ÷ payout = implied probability."],
 questions:[
  {skill:"ev",label:"Edge × size",q:"You buy 10 die contracts (FV 3.5) at 3.2 each. Total expected profit?",ans:3,tol:{abs:0.01},sol:"(3.5 − 3.2) × 10 = 3",L:1,secs:10},
  {skill:"ev",label:"Edge × size",q:"You sell 5 two-dice-sum contracts (FV 7) at 7.4. Total expected profit?",ans:2,tol:{abs:0.01},sol:"(7.4 − 7) × 5 = 2",L:1,secs:10},
  {skill:"ev",label:"Spread capture",q:"You quote 6.8 at 7.2. One trader buys 3 from you and another sells you 3. Locked-in profit?",ans:1.2,tol:{abs:0.01},sol:"Flat position, earned 0.4 × 3 = 1.2",L:2,secs:20},
  {skill:"prob",label:"Implied probability",q:"A contract pays £100 if an event happens. It trades at £30. Implied probability?",ans:0.3,tol:{abs:0.002},sol:"30 / 100 = 0.3",L:1,secs:8},
  {skill:"ev",label:"Edge from probability",q:"You think an event has a 40% chance. A £100 contract on it is offered at £32. Expected profit from buying one?",ans:8,tol:{abs:0.01},sol:"0.4 × 100 − 32 = 8",L:2,secs:15},
  {skill:"mm",mm:true,label:"Make a market",q:"Seconds in a year (365 days)",ans:31536000,sol:"86,400 × 365 = 31,536,000"}]},
{n:4,title:"Skewing your quote after a fill",
 sections:[
  {h:"Inventory",p:"Every fill changes your position. If people keep buying from you, you get short. Being very long or short is risky, so market makers shift their quotes to attract trades that bring them back towards flat."},
  {h:"How to skew",p:"Short and want to buy back? Move both prices up: a higher bid attracts sellers, a higher ask discourages more buyers. Long? Move both down. You keep the same width and move the mid."},
  {h:"Fills are information",p:"Repeated buying can also mean the buyer knows something. That's another reason to lift your prices after getting lifted. Unit 6 covers this properly."}],
 takeaways:["Getting lifted makes you short; getting hit makes you long.","Short → skew up. Long → skew down.","Keep the width, move the mid."],
 questions:[
  {skill:"mm",label:"Skew",q:"Your market is 48 at 52. You get lifted three times and move your mid up by 1 each time, keeping the width. What is your new bid?",ans:51,tol:{abs:0.01},sol:"Mid 50 → 53, width 4 → 51 at 55",L:1,secs:15},
  {skill:"mm",label:"Skew",q:"You quote 6.5 at 7.5 on the two-dice sum and you're short 10. You skew up by 0.3. New bid?",ans:6.8,tol:{abs:0.01},sol:"6.5 + 0.3 = 6.8 (ask becomes 7.8)",L:1,secs:10},
  {skill:"mm",label:"Position",q:"You start flat. You get lifted for 5, hit for 2, then lifted for 4. Your position (long positive, short negative)?",ans:-7,tol:{abs:0.01},sol:"Lifted = you sell: −5 + 2 − 4 = −7",L:2,secs:15},
  {skill:"ev",label:"Mark to fair",q:"You sold 4 die contracts at 4 and bought 1 back at 3. Fair value is 3.5. Expected P&L?",ans:2.5,tol:{abs:0.01},sol:"Sells: 4 × 0.5 = 2. Buy: 3.5 − 3 = 0.5. Total 2.5",L:2,secs:30},
  {skill:"mm",label:"Skew",q:"Your market is 99 at 101 and you're long 50. You want to sell, so you shift your mid down by 0.6. New ask?",ans:100.4,tol:{abs:0.01},sol:"Mid 100 → 99.4, width 2 → 98.4 at 100.4",L:2,secs:15}]},
{n:5,title:"Updating fair value on new information",
 sections:[
  {h:"Condition on what you know",p:"When information arrives, fair value becomes the expected value given that information. Two dice, and the first shows 4: fair value is 4 + 3.5 = 7.5. Keep what's known and average only what's still random."},
  {h:"Removing cards",p:"Cards change the remaining deck. A full deck's ranks sum to 364. If a King (13) is shown, the other 51 cards sum to 351, so the next card's expected rank is 351/51 ≈ 6.88."},
  {h:"Symmetric news",p:"Sometimes information doesn't move fair value. Two dice, and you learn the sum is even: by symmetry the expected sum is still 7. Check before reacting."}],
 takeaways:["New FV = known part + expected unknown part.","Track what's left in the deck.","Some news leaves FV unchanged."],
 questions:[
  {skill:"ev",label:"Partial reveal",q:"Two dice are rolled. The first shows 6. Fair value of the sum?",ans:9.5,tol:{abs:0.01},sol:"6 + 3.5 = 9.5",L:1,secs:8},
  {skill:"ev",label:"Partial reveal",q:"Three dice are rolled. Two show 2 and 5. Fair value of the sum?",ans:10.5,tol:{abs:0.01},sol:"2 + 5 + 3.5 = 10.5",L:1,secs:10},
  {skill:"ev",label:"Cards removed",q:"From a full deck (Ace = 1 … King = 13), a King is shown and set aside. Expected rank of the next card?",ans:351/51,tol:{abs:0.01},sol:"(364 − 13)/51 = 351/51 ≈ 6.88",L:2,secs:30},
  {skill:"ev",label:"Cards removed",q:"Ten cards numbered 1 to 10. One is drawn and shown: it's the 10. Expected value of the next card drawn?",ans:5,tol:{abs:0.01},sol:"(55 − 10)/9 = 5",L:2,secs:20},
  {skill:"ev",label:"Symmetric news",q:"Two dice are rolled. You learn the sum is even. Expected sum?",ans:7,tol:{abs:0.01},sol:"Even sums 2…12 weighted 1,3,5,5,3,1 out of 18 → 126/18 = 7",L:3,secs:45},
  {skill:"mm",mm:true,label:"Make a market",q:"Sum of the ranks of all 52 cards (Ace = 1 … King = 13)",ans:364,sol:"4 × 91 = 364"}]},
{n:6,title:"Adverse selection",
 sections:[
  {h:"Who trades with you",p:"Some counterparties are informed: they only buy when the price is too low and sell when it's too high. If you ignore that, you lose to them on average even with a sensible quote."},
  {h:"Condition on the trade",p:"Ask: given someone just bought, what's the value likely to be? A contract is worth 0 or 100 with equal chance. Half the traders know the value; the rest buy or sell at random. Informed traders only buy when it's 100, so P(buy | 100) = ½ + ½ × ½ = ¾ and P(buy | 0) = ¼. Given a buy, P(100) = ¾, so the value given a buy is 75."},
  {h:"What it means for your quote",p:"Your ask must be at least the expected value given a buy, and your bid at most the expected value given a sell. The more informed traders there are, the wider you have to quote."}],
 takeaways:["A trade is a signal about value.","Ask ≥ E[value | they buy]; bid ≤ E[value | they sell].","More informed flow, wider spread."],
 questions:[
  {skill:"prob",label:"Value given a buy",q:"A contract is worth 0 or 100, equally likely. Half of traders know the value and trade the right way; the rest buy or sell at random. Someone buys. Expected value of the contract now?",ans:75,tol:{abs:0.05},sol:"P(buy|100) = 3/4, P(buy|0) = 1/4 → P(100|buy) = 3/4 → 75",L:3,secs:60},
  {skill:"prob",label:"Value given a buy",q:"Same contract (0 or 100, equally likely), but only 20% of traders are informed. Someone buys. Expected value now?",ans:60,tol:{abs:0.05},sol:"P(buy|100) = 0.2 + 0.8 × 0.5 = 0.6, P(buy|0) = 0.4 → P(100|buy) = 0.6 → 60",L:3,secs:60},
  {skill:"prob",label:"Value given a sell",q:"Back to 50% informed. Someone sells to you. Expected value of the contract?",ans:25,tol:{abs:0.05},sol:"By symmetry P(100|sell) = 1/4 → 25",L:3,secs:30},
  {skill:"mm",label:"Break-even spread",q:"With 50% informed traders, what's the narrowest market (as a width) you can quote without losing on average?",ans:50,tol:{abs:0.05},sol:"Bid ≤ 25 and ask ≥ 75 → width 50",L:4,secs:45}]},
{n:7,title:"Sequential games",
 sections:[
  {h:"Markets that move",p:"Interview games often reveal information step by step: dice one at a time, cards turned over. You re-quote after each reveal. Fair value is always the known part plus the expected unknown part."},
  {h:"Width shrinks as uncertainty falls",p:"The variance of what's left falls as items are revealed, so your market should tighten. Three dice still unknown: variance 3 × 35/12 = 8.75, SD about 2.96. One die left: SD about 1.71."},
  {h:"Keep a running total",p:"Say fair value out loud after every reveal and write down your position. Interviewers watch whether you stay consistent under pressure more than whether every number is perfect."}],
 takeaways:["Re-quote after every reveal.","Width should shrink as uncertainty falls.","Track FV and position out loud."],
 questions:[
  {skill:"ev",label:"Start of game",q:"Market on the sum of three dice, none rolled yet. Fair value?",ans:10.5,tol:{abs:0.01},sol:"3 × 3.5 = 10.5",L:1,secs:8},
  {skill:"ev",label:"After a reveal",q:"First die shows 5. New fair value of the three-dice sum?",ans:12,tol:{abs:0.01},sol:"5 + 2 × 3.5 = 12",L:1,secs:8},
  {skill:"ev",label:"After a reveal",q:"Second die shows 1. New fair value?",ans:9.5,tol:{abs:0.01},sol:"5 + 1 + 3.5 = 9.5",L:1,secs:8},
  {skill:"stats",label:"Uncertainty left",q:"With two dice still unknown, what's the SD of their sum?",ans:Math.sqrt(70/12),tol:{abs:0.01},sol:"√(2 × 35/12) = √5.833 ≈ 2.415",L:3,secs:40},
  {skill:"ev",label:"P&L at the end",q:"You bought 2 lots at 11 before any rolls. Final dice: 5, 1, 6. Your P&L?",ans:2,tol:{abs:0.01},sol:"Sum 12 → (12 − 11) × 2 = 2",L:2,secs:15}]},
{n:8,title:"Estimation markets",
 sections:[
  {h:"Quote a range you'd bet on",p:"For questions like \"how tall is the Shard\", your market is a confidence interval. Too wide and nobody trades; too tight and you get picked off. Aim for a range you'd honestly bet contains the truth about 80–90% of the time."},
  {h:"Anchor, then build",p:"Start from something you know (a storey is about 3–4 m; the Shard has around 95 storeys) and multiply. Breaking an estimate into parts beats guessing the whole thing."},
  {h:"Think in ratios",p:"For big numbers, uncertainty is multiplicative: \"between 200 and 400\" is a factor of 2. Edge Desk scores width as ask ÷ bid for that reason. Calculable questions deserve near-zero width."}],
 takeaways:["Your market is a confidence interval.","Anchor on known facts and multiply.","Judge width as a ratio, not a difference."],
 questions:[
  {skill:"mm",mm:true,label:"Make a market",q:"Height of the Shard (m)",ans:310,sol:"310 m"},
  {skill:"mm",mm:true,label:"Make a market",q:"London Underground stations",ans:272,sol:"272"},
  {skill:"mm",mm:true,label:"Make a market",q:"Speed of sound in air at 20°C (m/s)",ans:343,sol:"343 m/s"},
  {skill:"mm",mm:true,label:"Make a market",q:"Squares of all sizes on a chessboard",ans:204,sol:"1² + 2² + … + 8² = 204"}]},
];

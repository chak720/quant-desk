/* Market-making curriculum. Each unit: a short lesson, then practice questions that qgen.js regenerates
   with new numbers every time (shape matches daily.json: {skill,label,q,ans,tol,sol,L,secs,mm?}). */
"use strict";
const UNITS=[
{n:1,title:"Bid, ask, spread and fair value",
 sections:[
  {h:"Bid and ask",p:"A market maker quotes two prices at once. The bid is the price you'll buy at; the ask (or offer) is the price you'll sell at. \"48 at 52\" means: I'll buy from you at 48, or sell to you at 52. The other trader chooses which side to hit."},
  {h:"Fair value",p:"Fair value is your best estimate of what something is worth on average: its expected value. A contract paying one die roll is worth 3.5. You centre your quote on fair value, for example 3 at 4."},
  {h:"The spread pays you",p:"The spread is ask minus bid. Every trade earns you the gap between the traded price and fair value. Quote 3 at 4 on the die and someone buys at 4: you sold something worth 3.5 for 4, an expected profit of 0.5."},
  {h:"Width reflects uncertainty",p:"The less sure you are, the wider you quote. In interviews it's normal to start wide and tighten as you think. Quoting tight around a wrong number is what loses money."}],
 takeaways:["Bid = you buy, ask = you sell. The other side picks.","Centre the quote on expected value.","Profit per trade = distance from traded price to fair value.","More uncertainty, wider market."],
 get questions(){return UQ[1]()}},
{n:2,title:"Expected value of simple contracts",
 sections:[
  {h:"Average over outcomes",p:"Expected value is each outcome times its probability, added up. A contract paying £10 if a die shows 6 is worth 10 × 1/6 ≈ £1.67. Write the outcomes down, attach probabilities, multiply and sum."},
  {h:"Linearity saves time",p:"The expected value of a sum is the sum of expected values, even when the parts are dependent. Ten coin flips, paid £1 per head: 10 × ½ = £5. No need to list all 1,024 outcomes."},
  {h:"Cards",p:"With Ace = 1 up to King = 13, one card's expected rank is (1+…+13)/13 = 7. A whole deck sums to 4 × 91 = 364. These two numbers come up constantly in card market-making games."},
  {h:"Non-linear payoffs",p:"If the payout is a function of the outcome, average the function, not the input. Paid the square of a die roll: (1+4+9+16+25+36)/6 = 91/6 ≈ 15.17, not 3.5² = 12.25."}],
 takeaways:["EV = Σ outcome × probability.","E[X+Y] = E[X] + E[Y], always.","Card rank averages 7; a deck sums to 364.","Average the payoff, not the input."],
 get questions(){return UQ[2]()}},
{n:3,title:"Edge and profit across many trades",
 sections:[
  {h:"Edge",p:"Edge is how much you expect to make per unit traded. Buying: fair value minus price. Selling: price minus fair value. Multiply by size for the total."},
  {h:"Both sides filled",p:"If one trader buys from you and another sells to you in the same size, your position is flat and you've locked in the full spread on that size, whatever the true value turns out to be."},
  {h:"Break-even probabilities",p:"A contract paying £100 with probability p is worth 100p. If you can buy it at £30, you have edge only when 100p > 30, so p > 0.3. Interviewers love turning prices into implied probabilities."}],
 takeaways:["Buy edge = FV − price; sell edge = price − FV.","Matched buys and sells lock in the spread.","Price ÷ payout = implied probability."],
 get questions(){return UQ[3]()}},
{n:4,title:"Skewing your quote after a fill",
 sections:[
  {h:"Inventory",p:"Every fill changes your position. If people keep buying from you, you get short. Being very long or short is risky, so market makers shift their quotes to attract trades that bring them back towards flat."},
  {h:"How to skew",p:"Short and want to buy back? Move both prices up: a higher bid attracts sellers, a higher ask discourages more buyers. Long? Move both down. You keep the same width and move the mid."},
  {h:"Fills are information",p:"Repeated buying can also mean the buyer knows something. That's another reason to lift your prices after getting lifted. Unit 6 covers this properly."}],
 takeaways:["Getting lifted makes you short; getting hit makes you long.","Short → skew up. Long → skew down.","Keep the width, move the mid."],
 get questions(){return UQ[4]()}},
{n:5,title:"Updating fair value on new information",
 sections:[
  {h:"Condition on what you know",p:"When information arrives, fair value becomes the expected value given that information. Two dice, and the first shows 4: fair value is 4 + 3.5 = 7.5. Keep what's known and average only what's still random."},
  {h:"Removing cards",p:"Cards change the remaining deck. A full deck's ranks sum to 364. If a King (13) is shown, the other 51 cards sum to 351, so the next card's expected rank is 351/51 ≈ 6.88."},
  {h:"Symmetric news",p:"Sometimes information doesn't move fair value. Two dice, and you learn the sum is even: by symmetry the expected sum is still 7. Check before reacting."}],
 takeaways:["New FV = known part + expected unknown part.","Track what's left in the deck.","Some news leaves FV unchanged."],
 get questions(){return UQ[5]()}},
{n:6,title:"Adverse selection",
 sections:[
  {h:"Who trades with you",p:"Some counterparties are informed: they only buy when the price is too low and sell when it's too high. If you ignore that, you lose to them on average even with a sensible quote."},
  {h:"Condition on the trade",p:"Ask: given someone just bought, what's the value likely to be? A contract is worth 0 or 100 with equal chance. Half the traders know the value; the rest buy or sell at random. Informed traders only buy when it's 100, so P(buy | 100) = ½ + ½ × ½ = ¾ and P(buy | 0) = ¼. Given a buy, P(100) = ¾, so the value given a buy is 75."},
  {h:"What it means for your quote",p:"Your ask must be at least the expected value given a buy, and your bid at most the expected value given a sell. The more informed traders there are, the wider you have to quote."}],
 takeaways:["A trade is a signal about value.","Ask ≥ E[value | they buy]; bid ≤ E[value | they sell].","More informed flow, wider spread."],
 get questions(){return UQ[6]()}},
{n:7,title:"Sequential games",
 sections:[
  {h:"Markets that move",p:"Interview games often reveal information step by step: dice one at a time, cards turned over. You re-quote after each reveal. Fair value is always the known part plus the expected unknown part."},
  {h:"Width shrinks as uncertainty falls",p:"The variance of what's left falls as items are revealed, so your market should tighten. Three dice still unknown: variance 3 × 35/12 = 8.75, SD about 2.96. One die left: SD about 1.71."},
  {h:"Keep a running total",p:"Say fair value out loud after every reveal and write down your position. Interviewers watch whether you stay consistent under pressure more than whether every number is perfect."}],
 takeaways:["Re-quote after every reveal.","Width should shrink as uncertainty falls.","Track FV and position out loud."],
 get questions(){return UQ[7]()}},
{n:8,title:"Quoting calculations and full contracts",
 sections:[
  {h:"Markets on numbers you can work out",p:"Interviewers often ask for a market on something calculable without a calculator: 37 × 48 × 13, √2026, 2^35, 12!, e^4. You know the answer exists exactly, so your market should be tight. The skill is fast, honest approximation."},
  {h:"Anchor, then adjust",p:"Find a nearby value you know exactly and correct for the difference. √2026: 45² = 2025, so the answer is just above 45. 2^35: 2^10 ≈ 1,000, so about 32 × 10⁹ = 3.2 × 10¹⁰ (a bit more, since 1,024 > 1,000). ln 500: ln 1000 − ln 2 ≈ 6.91 − 0.69 = 6.21."},
  {h:"Width is a ratio",p:"For big numbers the error is multiplicative, so Quant Desk scores these markets by ask ÷ bid. A market of 40,000 at 44,000 is 10% wide; for a product of three two-digit numbers you can do better than that."},
  {h:"Contracts: centre and one SD",p:"For a contract like the sum of three dice, quote around fair value with a width close to one standard deviation. Fair value has to be inside your market; then tighter and better centred scores more."}],
 takeaways:["Calculable means tight.","Anchor on a value you know exactly, then correct.","Judge width on calculations as a ratio.","On contracts: centre on fair value, about one SD wide."],
 get questions(){return UQ[8]()}},
];

"use strict";
/* Quant Desk: interview room. Timed quant interview questions with interviewer-style nudges, hints,
   follow-ups and a scored feedback report. Answers are numeric and checked like the rest of the site. */

const IV_CATS={prob:"Probability",ev:"Expected value",brain:"Brainteasers",mental:"Mental maths",stats:"Statistics",fin:"Finance and options",mm:"Market making"};
const IV_NUDGE={
 prob:"Talk me through the sample space. What exactly are you counting?",
 ev:"What are the possible outcomes, and how likely is each one?",
 brain:"Try a smaller version of the problem first, then look for the pattern.",
 mental:"Break the numbers into friendlier pieces and recombine.",
 stats:"What do you know about the mean and variance here?",
 fin:"Which relationship or rule of thumb pins this down?",
 mm:"Start from fair value. Then think about what new information changes it.",
};
const IV_LINK={prob:["labs","Probability simulators"],ev:["daily","Expected value drill"],brain:["labs","Probability simulators"],mental:["daily","Mental maths drill"],stats:["daily","Statistics drill"],fin:["labs","Options visualiser"],mm:["desk","Market-making simulator"]};
/* d: difficulty 1–3. t: time limit in seconds. tol: answer tolerance. */
const IVQ=[
 {id:"aces",cat:"prob",d:1,t:120,q:"I deal you two cards from a shuffled deck. What's the probability both are aces?",ans:1/221,tol:{abs:0.0003},
  hints:["What's the chance the first card is an ace?","Given the first card was an ace, how many aces and how many cards are left?"],
  follow:{q:"Same question, but I put the first card back and reshuffle before the second draw.",ans:1/169,tol:{abs:0.0003},sol:"(4/52)² = 1/169"},
  sol:"(4/52) × (3/51) = 12/2652 = 1/221 ≈ 0.0045.",look:"Clean conditioning: multiply the first probability by the conditional second one, and simplify the fraction."},
 {id:"onesix",cat:"prob",d:2,t:180,q:"I roll two dice and tell you at least one of them is a six. What's the probability both are sixes?",ans:1/11,tol:{abs:0.002},
  hints:["How many of the 36 outcomes contain at least one six?","Of those, how many are double six?"],
  follow:{q:"Now I tell you the first die is a six. Probability both are sixes?",ans:1/6,tol:{abs:0.002},sol:"The second die is independent: 1/6."},
  sol:"Outcomes with at least one six: 6 + 6 − 1 = 11. Only one of them is (6,6). Answer 1/11.",look:"Not falling for 1/6. Listing the conditioning set carefully."},
 {id:"boys",cat:"prob",d:2,t:150,q:"A family has two children. At least one is a boy. What's the probability both are boys?",ans:1/3,tol:{abs:0.003},
  hints:["List the equally likely families: BB, BG, GB, GG.","Which of those are still possible?"],
  follow:{q:"Instead you learn the older child is a boy. Probability both are boys?",ans:0.5,tol:{abs:0.003},sol:"Only BB and BG remain: 1/2."},
  sol:"BB, BG, GB remain equally likely; one is BB. Answer 1/3.",look:"Spotting that 'at least one' and 'the older one' are different conditions."},
 {id:"bayes",cat:"prob",d:2,t:180,q:"1% of people have a disease. A test catches 99% of cases and gives a false positive 1% of the time. You test positive. What's the probability you have it?",ans:0.5,tol:{abs:0.01},
  hints:["Imagine 10,000 people. How many have the disease and test positive?","How many healthy people test positive?"],
  follow:{q:"You take a second, independent test and it's also positive. Probability now?",ans:0.99,tol:{abs:0.005},sol:"Prior is now 0.5: 0.5·0.99 / (0.5·0.99 + 0.5·0.01) = 0.99."},
  sol:"Of 10,000 people, 100 are ill and 99 test positive. Of 9,900 healthy people, 99 test positive. 99/(99+99) = 0.5.",look:"Using natural frequencies or Bayes' rule, and not quoting 99%."},
 {id:"socks",cat:"brain",d:1,t:60,q:"A drawer has 10 black socks and 10 white socks. In the dark, how many do you have to take to guarantee a matching pair?",ans:3,tol:{abs:0},
  hints:["What's the worst case for the first two socks?"],follow:{q:"How many to guarantee a black pair?",ans:12,tol:{abs:0},sol:"Worst case: all 10 white first, then 2 black → 12."},
  sol:"Two socks could be one of each colour. The third must match one of them. Answer 3.",look:"Pigeonhole reasoning, quickly."},
 {id:"hh",cat:"prob",d:2,t:240,q:"I flip a fair coin repeatedly. What's the expected number of flips until I see two heads in a row?",ans:6,tol:{abs:0.01},
  hints:["Set up states: no progress, and 'just saw one head'.","Write E₀ = 1 + ½E₁ + ½E₀ and E₁ = 1 + ½·0 + ½E₀."],
  follow:{q:"What about the pattern head then tail (HT)?",ans:4,tol:{abs:0.01},sol:"Wait for an H (2 flips), then wait for a T (2 flips): 4."},
  sol:"From the equations: E₁ = 1 + ½E₀ and E₀ = 2 + E₁ → E₀ = 6.",look:"Setting up a Markov chain / first-step analysis cleanly."},
 {id:"six",cat:"ev",d:1,t:90,q:"How many rolls of a fair die do you expect to need to get your first six?",ans:6,tol:{abs:0.01},
  hints:["Each roll succeeds with probability 1/6. What distribution is the waiting time?"],
  follow:{q:"Expected number of rolls until you've seen all six faces?",ans:14.7,tol:{abs:0.05},sol:"6(1 + 1/2 + … + 1/6) = 14.7."},
  sol:"Geometric with p = 1/6, mean 1/p = 6.",look:"Recognising the geometric distribution instantly."},
 {id:"ruin",cat:"prob",d:2,t:180,q:"You have £3. You bet £1 on fair coin flips until you have £10 or nothing. Probability you reach £10?",ans:0.3,tol:{abs:0.005},
  hints:["Your wealth is a fair game: its expected value never changes.","If p is the chance of reaching 10, what's your expected final wealth?"],
  follow:{q:"Expected number of flips until the game ends?",ans:21,tol:{abs:0.01},sol:"For a fair walk the expected duration is i(N − i) = 3 × 7 = 21."},
  sol:"Optional stopping: 3 = p·10 + (1 − p)·0 → p = 0.3.",look:"Using the martingale shortcut rather than solving a recursion."},
 {id:"reroll",cat:"ev",d:2,t:180,q:"You roll a die and I pay you the face value in pounds. You may reroll once, but then you must take the second roll. What's the game worth?",ans:4.25,tol:{abs:0.01},
  hints:["A reroll is worth 3.5 on average. Which first rolls would you keep?","Keep 4, 5 and 6. What's the average of those, and how often do you reroll?"],
  follow:{q:"Now you can reroll up to twice. Fair value?",ans:14/3,tol:{abs:0.01},sol:"With one reroll left the game is worth 4.25, so keep 5 and 6: (2/6)·5.5 + (4/6)·4.25 = 14/3 ≈ 4.67."},
  sol:"Keep 4–6 (average 5) half the time, otherwise reroll for 3.5: ½·5 + ½·3.5 = 4.25.",look:"Backward induction: compare each outcome with the value of continuing."},
 {id:"firstace",cat:"ev",d:3,t:300,q:"I turn over cards from a shuffled deck one at a time. What's the expected position of the first ace?",ans:10.6,tol:{abs:0.01},
  hints:["The 4 aces split the 48 other cards into 5 gaps.","By symmetry, how many non-aces sit before the first ace on average?"],
  follow:{q:"Expected position of the second ace?",ans:21.2,tol:{abs:0.01},sol:"Two gaps plus two aces: 2 × 9.6 + 2 = 21.2."},
  sol:"Each of the 5 gaps holds 48/5 = 9.6 non-aces on average. The first ace is at 9.6 + 1 = 10.6.",look:"A symmetry argument instead of brute-force summation."},
 {id:"maxdice",cat:"ev",d:2,t:180,q:"Roll two dice. What's the expected value of the larger one?",ans:161/36,tol:{abs:0.01},
  hints:["P(max ≤ k) = (k/6)². What's P(max = k)?","P(max = k) = (2k − 1)/36. Now sum k·P(max = k)."],
  follow:{q:"And the expected value of the smaller one?",ans:91/36,tol:{abs:0.01},sol:"max + min = sum of both dice, so E[min] = 7 − 161/36 = 91/36 ≈ 2.53."},
  sol:"Σ k(2k − 1)/36 for k = 1…6 = 161/36 ≈ 4.47.",look:"Using the CDF trick for maxima, and spotting the max + min shortcut in the follow-up."},
 {id:"fixed",cat:"ev",d:2,t:120,q:"I shuffle a deck of 52 cards. What's the expected number of cards that end up in their original position?",ans:1,tol:{abs:0.001},
  hints:["Let Iₖ be 1 if card k stays in place. What's E[Iₖ]?","Now use linearity of expectation."],
  follow:{q:"Roughly, what's the probability that no card ends up in its original position?",ans:1/Math.E,tol:{abs:0.01},sol:"Derangements: ≈ 1/e ≈ 0.368."},
  sol:"Each card stays put with probability 1/52; 52 × 1/52 = 1.",look:"Indicator variables and linearity, even though the events are dependent."},
 {id:"plane",cat:"brain",d:3,t:300,q:"100 passengers board a plane with 100 seats. The first loses their ticket and sits randomly. Each later passenger takes their own seat if free, otherwise a random free seat. Probability the last passenger gets their own seat?",ans:0.5,tol:{abs:0.001},
  hints:["Try it with 2 passengers, then 3.","The process ends the moment someone sits in seat 1 or seat 100. Which is more likely to be taken first?"],
  follow:{q:"Probability the second-to-last passenger (99th) gets their own seat?",ans:2/3,tol:{abs:0.005},sol:"Now three seats matter (1, 99, 100); by symmetry the 99th seat is taken before seats 1 or 100 with probability 1/3, so 2/3."},
  sol:"At every random choice, seat 1 and seat 100 are equally likely. Whichever is taken first decides it: 1/2.",look:"Small cases, then a symmetry argument."},
 {id:"alt",cat:"prob",d:1,t:120,q:"We take turns flipping a fair coin and the first to flip heads wins. You go first. Probability you win?",ans:2/3,tol:{abs:0.003},
  hints:["You win on flip 1, 3, 5, … What's the chance you win on your first flip?","If both miss, the game resets. Write P = ½ + ¼P."],
  follow:{q:"Same game with a die: first to roll a six wins, you go first. Probability you win?",ans:6/11,tol:{abs:0.003},sol:"P = 1/6 + (25/36)P → P = 6/11."},
  sol:"P = ½ + ¼P → P = 2/3.",look:"A self-similar equation rather than an infinite sum."},
 {id:"ants",cat:"prob",d:1,t:120,q:"Three ants sit on the corners of a triangle. Each picks a direction at random and walks along an edge. Probability none collide?",ans:0.25,tol:{abs:0.003},
  hints:["How many direction combinations are there?","Which combinations avoid any collision?"],
  follow:{q:"Same with four ants on a square.",ans:0.125,tol:{abs:0.003},sol:"Only all-clockwise or all-anticlockwise: 2/16 = 1/8."},
  sol:"8 combinations; only all clockwise or all anticlockwise work: 2/8 = 1/4.",look:"Counting the favourable cases quickly."},
 {id:"stick",cat:"prob",d:3,t:300,q:"Break a stick at two uniformly random points. Probability the three pieces form a triangle?",ans:0.25,tol:{abs:0.003},
  hints:["The pieces form a triangle when every piece is shorter than half the stick.","Draw the unit square of break points x and y. Shade where one piece is longer than ½."],
  follow:{q:"Break the stick at one random point, then break the longer piece at a random point. Probability of a triangle?",ans:2*Math.log(2)-1,tol:{abs:0.01},sol:"Integrating over the first break gives 2 ln 2 − 1 ≈ 0.386."},
  sol:"The three 'too long' regions cover 3/4 of the square, leaving 1/4.",look:"Turning a word problem into geometry."},
 {id:"circle",cat:"prob",d:3,t:300,q:"Pick three uniformly random points on a circle. Probability the triangle they form contains the centre?",ans:0.25,tol:{abs:0.003},
  hints:["The triangle misses the centre exactly when all three points lie in some semicircle.","Fix one point as the 'first' going clockwise. Probability the other two lie in the semicircle after it?"],
  follow:{q:"Four random points: probability they all lie in some semicircle?",ans:0.5,tol:{abs:0.003},sol:"n/2^(n−1) = 4/8 = 1/2."},
  sol:"P(all in a semicircle) = 3 × (½)² = 3/4, so the centre is inside with probability 1/4.",look:"Reframing as 'all points in a semicircle'."},
 {id:"unifsum",cat:"ev",d:3,t:360,q:"Draw uniform random numbers from [0, 1] until their sum exceeds 1. Expected number of draws?",ans:Math.E,tol:{abs:0.01},
  hints:["P(you need more than n draws) = P(the first n sum to less than 1).","The volume of {x₁ + … + xₙ < 1} is 1/n!. Now use E[N] = Σ P(N > n)."],
  follow:{q:"Expected value of the minimum of two independent uniform [0, 1] draws?",ans:1/3,tol:{abs:0.003},sol:"n/(n+1) for the max and 1/(n+1) for the min: 1/3."},
  sol:"E[N] = Σₙ≥₀ P(N > n) = Σ 1/n! = e ≈ 2.718.",look:"The tail-sum formula for expectations and the simplex volume."},
 {id:"dist",cat:"stats",d:2,t:180,q:"X and Y are independent uniforms on [0, 1]. What's E|X − Y|?",ans:1/3,tol:{abs:0.003},
  hints:["By symmetry it's 2 × E[(X − Y) when X > Y].","Or: the expected gap between two random points on a line of length 1."],
  follow:{q:"E[(X − Y)²]?",ans:1/6,tol:{abs:0.003},sol:"Var(X − Y) = 1/12 + 1/12 = 1/6 (mean zero)."},
  sol:"Two random points split [0,1] into three pieces of expected length 1/3 each; the middle one is |X − Y|.",look:"A symmetry argument rather than a double integral."},
 {id:"corr",cat:"stats",d:2,t:150,q:"X and Y are independent standard normals. What's the correlation between X and X + Y?",ans:Math.SQRT1_2,tol:{abs:0.005},
  hints:["Cov(X, X + Y) = Var(X) + Cov(X, Y).","Var(X + Y) = 2. Divide the covariance by the product of the standard deviations."],
  follow:{q:"Correlation between X + Y and X − Y?",ans:0,tol:{abs:0.005},sol:"Cov = Var X − Var Y = 0."},
  sol:"Cov = 1, SDs are 1 and √2: 1/√2 ≈ 0.707.",look:"Bilinearity of covariance."},
 {id:"sd",cat:"stats",d:1,t:120,q:"Population standard deviation of 2, 4, 4, 4, 5, 5, 7, 9?",ans:2,tol:{abs:0.005},
  hints:["The mean is 5.","Squared deviations: 9, 1, 1, 1, 0, 0, 4, 16."],
  follow:{q:"Sample standard deviation (divide by n − 1)?",ans:Math.sqrt(32/7),tol:{abs:0.01},sol:"√(32/7) ≈ 2.14."},
  sol:"Sum of squared deviations is 32; 32/8 = 4; √4 = 2.",look:"Quick, accurate arithmetic."},
 {id:"x4",cat:"stats",d:2,t:120,q:"X is standard normal. What's E[X⁴]?",ans:3,tol:{abs:0.01},
  hints:["The kurtosis of a normal distribution is a number worth memorising.","E[X^(2n)] = (2n − 1)!! for a standard normal."],
  follow:{q:"E[X⁶]?",ans:15,tol:{abs:0.01},sol:"5!! = 5 × 3 × 1 = 15."},
  sol:"3!! = 3 × 1 = 3. (The normal's kurtosis is 3.)",look:"Knowing normal moments."},
 {id:"var100",cat:"stats",d:1,t:120,q:"I roll a fair die 100 times. What's the variance of the total?",ans:3500/12,tol:{abs:0.05},
  hints:["The variance of one die roll is 35/12.","Variances of independent rolls add."],
  follow:{q:"About what's the standard deviation of the total?",ans:Math.sqrt(3500/12),tol:{abs:0.1},sol:"√291.7 ≈ 17.1."},
  sol:"100 × 35/12 ≈ 291.67.",look:"Remembering 35/12, and that variance adds."},
 {id:"clock",cat:"brain",d:1,t:90,q:"What's the angle between the hour and minute hands at 3:15?",ans:7.5,tol:{abs:0.01},
  hints:["The hour hand moves 0.5° per minute.","At 3:15 the hour hand is at 90° + 7.5°."],
  follow:{q:"How many times a day do the hands overlap?",ans:22,tol:{abs:0},sol:"11 times every 12 hours: 22."},
  sol:"Minute hand at 90°, hour hand at 97.5°: 7.5°.",look:"Not answering zero."},
 {id:"zeros",cat:"brain",d:1,t:90,q:"How many trailing zeros does 100! have?",ans:24,tol:{abs:0},
  hints:["Each zero needs a factor 2 × 5. Which factor is scarcer?","Count multiples of 5, then of 25."],
  follow:{q:"Trailing zeros of 1000!?",ans:249,tol:{abs:0},sol:"200 + 40 + 8 + 1 = 249."},
  sol:"⌊100/5⌋ + ⌊100/25⌋ = 20 + 4 = 24.",look:"Counting factors of 5."},
 {id:"horses",cat:"brain",d:2,t:240,q:"25 horses, a track that races 5 at a time, no stopwatch. Minimum number of races to find the 3 fastest?",ans:7,tol:{abs:0},
  hints:["Race all 25 in five heats. Then race the five winners.","After race 6, which horses could still be in the top 3?"],
  follow:{q:"Minimum races to find just the fastest horse?",ans:6,tol:{abs:0},sol:"Five heats plus a race of winners: 6."},
  sol:"Five heats, a winners' race, then one race of the 5 remaining candidates: 7.",look:"Eliminating candidates systematically."},
 {id:"eggs",cat:"brain",d:3,t:300,q:"You have two eggs and a 100-floor building. Minimum number of drops that guarantees finding the highest safe floor?",ans:14,tol:{abs:0},
  hints:["If the first egg breaks, the second must check floors one by one.","Drop the first egg at floor n, then n + (n − 1), … You need n(n + 1)/2 ≥ 100."],
  follow:{q:"Same with a 36-floor building?",ans:8,tol:{abs:0},sol:"n(n+1)/2 ≥ 36 → n = 8."},
  sol:"Smallest n with n(n + 1)/2 ≥ 100 is 14.",look:"Balancing the worst case across both eggs."},
 {id:"lockers",cat:"brain",d:2,t:180,q:"100 closed lockers. Student k toggles every k-th locker, for k = 1 to 100. How many lockers are open at the end?",ans:10,tol:{abs:0},
  hints:["A locker's final state depends on how many divisors its number has.","Which numbers have an odd number of divisors?"],
  follow:{q:"Same with 1000 lockers?",ans:31,tol:{abs:0},sol:"Perfect squares up to 1000: 31."},
  sol:"Only perfect squares have an odd number of divisors: 1, 4, …, 100 → 10.",look:"Turning the process into a divisor-counting fact."},
 {id:"m1",cat:"mental",d:1,t:20,q:"17 × 24?",ans:408,tol:{abs:0},hints:["17 × 24 = 17 × 25 − 17."],follow:{q:"36 × 45?",ans:1620,tol:{abs:0},sol:"36 × 45 = 18 × 90 = 1620."},sol:"425 − 17 = 408.",look:"Speed and a clean shortcut."},
 {id:"m2",cat:"mental",d:1,t:25,q:"What's 7% of 340?",ans:23.8,tol:{abs:0.01},hints:["10% is 34; 1% is 3.4."],follow:{q:"What's 340% of 7?",ans:23.8,tol:{abs:0.01},sol:"Same thing: x% of y = y% of x."},sol:"7 × 3.4 = 23.8.",look:"Speed."},
 {id:"m3",cat:"mental",d:2,t:45,q:"Estimate √50 to two decimal places.",ans:Math.sqrt(50),tol:{abs:0.01},hints:["√49 = 7. Use √(a² + b) ≈ a + b/(2a)."],follow:{q:"Estimate √120 to one decimal place.",ans:Math.sqrt(120),tol:{abs:0.05},sol:"11 − 1/22 ≈ 10.95."},sol:"7 + 1/14 ≈ 7.07.",look:"The linear approximation."},
 {id:"m4",cat:"mental",d:2,t:60,q:"Estimate 1.05¹⁰ to two decimal places.",ans:1.05**10,tol:{abs:0.01},hints:["ln(1.05) ≈ 0.0488. Multiply by 10 and exponentiate.","e^0.488 ≈ 1.63."],follow:{q:"Roughly how many years to double at 5% a year?",ans:Math.log(2)/Math.log(1.05),tol:{abs:0.6},sol:"Rule of 72: 72/5 ≈ 14.4 (exact 14.2)."},sol:"≈ e^0.488 ≈ 1.63.",look:"Using logs for compounding."},
 {id:"m5",cat:"mental",d:1,t:20,q:"Sum of the integers from 1 to 100?",ans:5050,tol:{abs:0},hints:["Pair 1 with 100, 2 with 99…"],follow:{q:"Sum of the odd numbers from 1 to 99?",ans:2500,tol:{abs:0},sol:"Sum of the first n odd numbers is n²: 50² = 2500."},sol:"50 pairs of 101: 5050.",look:"Gauss's trick."},
 {id:"coins10",cat:"prob",d:1,t:90,q:"Flip a fair coin 10 times. Probability of exactly 5 heads?",ans:252/1024,tol:{abs:0.002},hints:["How many sequences have exactly 5 heads?","C(10, 5) = 252 of 1,024 sequences."],follow:{q:"Probability of at least one head?",ans:1023/1024,tol:{abs:0.0005},sol:"1 − (1/2)¹⁰."},sol:"252/1024 ≈ 0.246.",look:"Knowing C(10,5) = 252."},
 {id:"parity",cat:"fin",d:1,t:90,q:"Zero interest rates. A stock is at 100, and the 100-strike call costs 10. What does the 100-strike put cost?",ans:10,tol:{abs:0.01},
  hints:["Put–call parity: C − P = S − K (with zero rates)."],follow:{q:"Same, but the stock is at 105. The call costs 12. Put price?",ans:7,tol:{abs:0.01},sol:"P = C − S + K = 12 − 105 + 100 = 7."},
  sol:"C − P = S − K = 0, so P = 10.",look:"Instant recall of put–call parity."},
 {id:"parity2",cat:"fin",d:2,t:150,q:"Stock 100, strike 100, one year, continuously compounded rate 5%. The call is 10.45. What's the put worth?",ans:10.45-100+100*Math.exp(-0.05),tol:{abs:0.02},
  hints:["C − P = S − K·e^(−rT).","100·e^(−0.05) ≈ 95.12."],follow:{q:"Which is worth more here, the call or the put, and by how much?",ans:100-100*Math.exp(-0.05),tol:{abs:0.02},sol:"C − P = S − Ke^(−rT) ≈ 4.88."},
  sol:"P = 10.45 − 100 + 95.12 ≈ 5.57.",look:"Discounting the strike."},
 {id:"atm",cat:"fin",d:2,t:120,q:"Roughly what's an at-the-money one-year call worth if the stock is 100 and volatility is 20%? (zero rates)",ans:8,tol:{abs:0.3},
  hints:["There's a rule of thumb: about 0.4 × S × σ × √T."],follow:{q:"Same option with 3 months to expiry?",ans:4,tol:{abs:0.2},sol:"√(1/4) halves it: about 4."},
  sol:"0.4 × 100 × 0.2 × 1 = 8 (Black–Scholes gives 7.97).",look:"The ATM approximation and the √T scaling."},
 {id:"vol",cat:"fin",d:1,t:60,q:"Daily volatility is 1%. What's the annualised volatility, in percent? (252 trading days)",ans:Math.sqrt(252),tol:{abs:0.15},
  hints:["Volatility scales with the square root of time."],follow:{q:"Annual vol is 32%. Roughly what's the daily vol in percent?",ans:32/Math.sqrt(252),tol:{abs:0.05},sol:"32/15.87 ≈ 2%."},
  sol:"1% × √252 ≈ 15.9%.",look:"√t scaling, and knowing √252 ≈ 16."},
 {id:"kelly",cat:"fin",d:2,t:120,q:"A bet wins 60% of the time at even money. What fraction of your bankroll should you bet to maximise long-run growth? (decimal)",ans:0.2,tol:{abs:0.003},
  hints:["That's the Kelly criterion: f = p − q/b."],follow:{q:"Same 60% win rate, but the bet pays 2:1. Kelly fraction?",ans:0.4,tol:{abs:0.003},sol:"0.6 − 0.4/2 = 0.4."},
  sol:"f = 2p − 1 = 0.2.",look:"Kelly, and knowing people usually bet a fraction of it."},
 {id:"sharpe",cat:"fin",d:3,t:180,q:"A strategy has an annual Sharpe ratio of 1. Assuming normal returns and zero rates, roughly what's the probability of a losing year? (decimal)",ans:Ncdf(-1),tol:{abs:0.01},
  hints:["The annual return is normal with mean equal to one standard deviation.","P(Z < −1)?"],follow:{q:"And with a Sharpe of 2?",ans:Ncdf(-2),tol:{abs:0.005},sol:"P(Z < −2) ≈ 0.023."},
  sol:"P(Z < −1) ≈ 0.159.",look:"Translating Sharpe into a probability."},
 {id:"straddle",cat:"fin",d:1,t:90,q:"You buy a 100-strike straddle for 8. The stock finishes at 93. Your P&L?",ans:-1,tol:{abs:0.01},
  hints:["A straddle pays |S − K| at expiry."],follow:{q:"Between which stock prices does this straddle lose money? Give the upper one.",ans:108,tol:{abs:0.01},sol:"Breakevens 92 and 108."},
  sol:"|93 − 100| − 8 = −1.",look:"Payoff minus premium."},
 {id:"mm2d",cat:"mm",d:1,t:90,q:"Make me a market on the sum of two dice. First, what's your fair value?",ans:7,tol:{abs:0.01},
  hints:["Each die averages 3.5."],follow:{q:"I show you one die: it's a 6. What's your new fair value?",ans:9.5,tol:{abs:0.01},sol:"6 + 3.5 = 9.5."},
  sol:"3.5 + 3.5 = 7. A sensible first market: 6 at 8.",look:"Quoting around fair value and updating instantly on new information."},
 {id:"mmcards",cat:"mm",d:2,t:150,q:"Fair value of the sum of three cards drawn from a deck, Ace = 1 up to King = 13?",ans:21,tol:{abs:0.01},
  hints:["The average card is 7.","Linearity works even without replacement."],follow:{q:"The first card turned over is a King. New fair value for the sum of all three?",ans:13+2*(364-13)/51,tol:{abs:0.02},sol:"13 + 2 × (351/51) ≈ 26.76."},
  sol:"3 × 7 = 21.",look:"Linearity, then conditioning on what's left in the deck."},
 {id:"mmsq",cat:"mm",d:3,t:240,q:"A contract pays the square of the number of heads in 10 fair coin flips. Fair value?",ans:27.5,tol:{abs:0.01},
  hints:["E[X²] = Var(X) + E[X]².","X ~ Binomial(10, ½): mean 5, variance 2.5."],follow:{q:"You're long one contract at 27 and the first 5 flips are all heads. Fair value now?",ans:57.5,tol:{abs:0.01},sol:"X = 5 + Y with Y ~ Bin(5, ½): E[(5 + Y)²] = 25 + 10·2.5 + (1.25 + 6.25) = 57.5. You are well in the money."},
  sol:"2.5 + 25 = 27.5.",look:"E[X²] = Var + mean², and fast updating."},
 {id:"mmadv",cat:"mm",d:2,t:180,q:"You quote 48 at 52 on a contract you think is worth 50. Half your counterparties are informed and know it's worth 55; the rest trade randomly. Who trades with you, and what's your expected P&L per trade with an informed trader?",ans:-3,tol:{abs:0.01},
  hints:["An informed trader who knows the value is 55: do they buy at your ask or sell at your bid?","They buy at 52 something worth 55."],follow:{q:"A random trader hits either side with equal chance. Your expected P&L per random trade, if the true value is 55?",ans:2,tol:{abs:0.01},sol:"Selling at 52 loses 3; buying at 48 makes 7. Average (−3 + 7)/2 = +2. Random flow still pays, but less than you thought."},
  sol:"Informed traders buy from you at 52 something worth 55: −3 per trade. That's adverse selection.",look:"Understanding who trades with you and why your fills carry information."},
];

const IV={mode:null,diff:"standard",cat:"all"};
function ivState(){return S.iv||(S.iv={hist:[],seen:{}})}
function renderInterview(){
  const host=$("#v-interview"),st=ivState();const recent=st.hist.slice(-5).reverse();
  host.innerHTML=`<div class="card stack"><h3>Interview room</h3><h2>Timed questions with an interviewer who nudges, hints and follows up</h2>
    <p class="muted measure">Work like it's the real thing: think out loud in the scratchpad, answer within the time limit, and ask for a hint if you're stuck. Hints cost points, as they would in an interview. Get it right and the interviewer pushes with a follow-up. Every question ends with the full solution and what the interviewer was looking for, and every session ends with a feedback report.</p>
    <div class="cols2">
      <div class="stack"><h3>Mock interview</h3><p class="small muted">Five questions across topics, back to back, scored out of 50.</p>
        <div class="row" role="group" aria-label="Level">${[["junior","Junior"],["standard","Standard"],["hard","Hard"]].map(([k,l])=>`<button class="btn ghost chip" data-ivd="${k}" aria-pressed="${k===IV.diff}">${l}</button>`).join("")}</div>
        <div class="row"><button class="btn accent" id="ivmock">Start mock interview</button></div></div>
      <div class="stack"><h3>Practise one topic</h3><p class="small muted">One question at a time, unseen ones first.</p>
        <label class="sl" for="ivcat"><span>Topic</span><select id="ivcat"><option value="all">Any topic</option>${Object.entries(IV_CATS).map(([k,v])=>`<option value="${k}" ${k===IV.cat?"selected":""}>${esc(v)} (${IVQ.filter(q=>q.cat===k).length})</option>`).join("")}</select></label>
        <div class="row"><button class="btn" id="ivone">Ask me a question</button></div></div></div>
    ${recent.length?`<div class="stack"><h3>Recent sessions</h3><div class="list">${recent.map(h=>`<div><span>${new Date(h.d).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} · ${esc(h.mode)}</span><span class="tabular small">${h.score} / ${h.max} · ${esc(h.grade)}</span></div>`).join("")}</div></div>`:""}
    <p class="muted small" id="ivseen">${Object.keys(st.seen).length} of ${IVQ.length} questions attempted.</p></div>
    <div id="ivhost"></div>`;
  host.querySelectorAll("[data-ivd]").forEach(b=>b.onclick=()=>{IV.diff=b.dataset.ivd;host.querySelectorAll("[data-ivd]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))});
  host.querySelector("#ivcat").onchange=e=>{IV.cat=e.target.value};
  const go=qs=>{const h=host.querySelector("#ivhost");ivSession(h,qs);h.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"})};
  host.querySelector("#ivmock").onclick=()=>go(ivPickMock(IV.diff));
  host.querySelector("#ivone").onclick=()=>go([ivPickOne(IV.cat)]);
}
function ivFresh(pool){const st=ivState();return[...pool].sort((a,b)=>((st.seen[a.id]?.n||0)-(st.seen[b.id]?.n||0))||Math.random()-.5)}
function ivPickOne(cat){return ivFresh(IVQ.filter(q=>cat==="all"||q.cat===cat))[0]}
function ivPickMock(diff){
  const ds={junior:[1,2],standard:[1,2,3],hard:[2,3]}[diff],slots=[["prob"],["ev"],["brain","mental"],["stats","fin"],["mm"]];
  return slots.map(cs=>ivFresh(IVQ.filter(q=>cs.includes(q.cat)&&ds.includes(q.d)))[0]).filter(Boolean);
}
function ivSession(host,qs){
  const results=[];let i=0;
  const next=()=>{if(i>=qs.length)return ivReport(host,qs,results);ivQuestion(host,qs[i],i,qs.length,r=>{results.push(r);i++;next()})};
  next();
}
function ivQuestion(host,Q,idx,total,done){
  let hints=0,att=0,solved=false,over=false,ended=false,nudged=false,fstate=null;const t0=performance.now();
  host.innerHTML=`<div class="card stack ivcard">
    <div class="meta"><span>${total>1?`Question ${idx+1} of ${total} · `:""}${esc(IV_CATS[Q.cat])} · ${"●".repeat(Q.d)}${"○".repeat(3-Q.d)}</span><span class="ivclock tabular" id="ivclk" aria-live="off"></span></div>
    <div class="ivbar"><i id="ivbar"></i></div>
    <div class="chat" id="ivchat" aria-live="polite"></div>
    <label class="form" for="ivscratch">Scratchpad: think out loud here (not graded, shown in your feedback)<textarea id="ivscratch" rows="3" placeholder="Assumptions, cases, quick sums…"></textarea></label>
    <div class="row ivin"><input type="text" id="ivans" inputmode="decimal" autocomplete="off" placeholder="Your answer: 1/3, 0.333 or 33.3%" aria-label="Your answer"><button class="btn accent" id="ivsub">Answer</button></div>
    <div class="row"><button class="btn ghost" id="ivhint">Ask for a hint</button><button class="btn ghost" id="ivgive">I'm stuck, show me</button>${reportLink("Interview question: "+Q.id)}</div></div>`;
  const $h=s=>host.querySelector(s),chat=$h("#ivchat");
  const say=(who,html)=>{chat.insertAdjacentHTML("beforeend",`<div class="msg ${who}"><span class="who">${who==="iv"?"Interviewer":"You"}</span><div>${html}</div></div>`);chat.scrollTop=chat.scrollHeight};
  say("iv",esc(Q.q));
  const tick=setInterval(()=>{if(!$h("#ivclk")){clearInterval(tick);return}const s=(performance.now()-t0)/1000,left=Q.t-s;
    $h("#ivclk").textContent=left>=0?`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,"0")} left`:`${Math.floor(-left/60)}:${String(Math.floor(-left%60)).padStart(2,"0")} over`;
    $h("#ivclk").className="ivclock tabular "+(left<0?"over":left<Q.t*0.25?"warn":"");$h("#ivbar").style.width=clamp(s/Q.t*100,0,100)+"%";$h("#ivbar").className=left<0?"over":left<Q.t*0.25?"warn":"";
    if(!ended&&!solved&&!nudged&&s>Q.t*0.5){nudged=true;say("iv",esc(IV_NUDGE[Q.cat])+(hints<Q.hints.length?" Want a hint?":""))}
    if(!ended&&!solved&&!over&&left<0){over=true;say("iv","We're over time. In a real interview I'd step in here. Take a hint or give me your best answer.")}},500);
  const input=$h("#ivans");input.focus({preventScroll:true});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$h("#ivsub").click()}});
  const secs=()=>Math.round((performance.now()-t0)/1000);
  const finish=(gaveUp)=>{ended=true;clearInterval(tick);
    const time=secs(),overT=time>Q.t,base=solved?Math.max(2,10-2*hints-Math.min(3,att-1)-(overT?2:0)):0;const fb=fstate===true?2:0,pts=base;
    const sc=ivState().seen[Q.id]||(ivState().seen[Q.id]={n:0,best:0});sc.n++;sc.best=Math.max(sc.best,pts);sc.last=todayKey();
    const res={id:Q.id,cat:Q.cat,pts,base,fb,hints,att,time,limit:Q.t,solved,gaveUp,scratch:$h("#ivscratch").value.trim().slice(0,600)};
    record({skill:{prob:"prob",ev:"ev",brain:"prob",mental:"arith",stats:"stats",fin:"fin",mm:"mm"}[Q.cat],sub:"interview",L:Q.d+2,q:Q.q,ans:Q.ans,tol:Q.tol,secs:Q.t,custom:true,mm:false,sol:Q.sol,label:"Interview",fromPlan:true},solved?"✓":"✗",solved,time*1000,0);
    host.querySelectorAll("#ivsub,#ivhint,#ivgive,#ivans").forEach(e=>e.disabled=true);
    say("iv",`<b>Solution.</b> ${esc(Q.sol)}<br><b>What I was looking for:</b> ${esc(Q.look)}`);
    host.querySelector(".ivcard").insertAdjacentHTML("beforeend",`<div class="fb ${solved?"ok":"bad"} stack"><span class="verdict">${pts} / 10${fb?" · +2 follow-up bonus":""}</span>
      <span class="small">${ivLine(res)}</span><div class="row"><button class="btn accent" id="ivnext">${total>1&&idx+1<total?"Next question":"See feedback"}</button></div></div>`);
    $h("#ivnext").focus({preventScroll:true});$h("#ivnext").onclick=()=>done(res);};
  const askFollow=()=>{say("iv",`Good. ${esc(Q.follow.q)}`);fstate="open";input.disabled=false;input.value="";input.placeholder="Follow-up answer";input.focus({preventScroll:true});$h("#ivhint").disabled=true;$h("#ivgive").textContent="Skip the follow-up"};
  $h("#ivsub").onclick=()=>{const raw=input.value.trim();const v=parseNum(raw);if(!raw||!isFinite(v)){say("iv","Give me a number: a fraction like 1/3, a decimal or a percentage.");return}
    say("me",esc(raw));
    if(fstate==="open"){const ok=close(v,Q.follow.ans,Q.follow.tol);fstate=ok;say("iv",ok?"Exactly right.":`Not quite: ${esc(Q.follow.sol)}`);finish(false);return}
    att++;const ok=close(v,Q.ans,Q.tol)||(/%/.test(raw)&&close(v*100,Q.ans,Q.tol));
    if(ok){solved=true;if(Q.follow)askFollow();else finish(false);return}
    if(att>=3){say("iv","That's three tries. Let me walk you through it.");finish(true);return}
    const h=Q.hints[Math.min(hints,Q.hints.length-1)];
    say("iv",att===1?`Hmm, I get something different. Walk me through it again. ${hints<Q.hints.length?"Here's a nudge: "+esc(h):""}`:`Still not it. ${esc(IV_NUDGE[Q.cat])}`);if(att===1&&hints<Q.hints.length)hints++;
    input.select()};
  $h("#ivhint").onclick=()=>{if(hints>=Q.hints.length){say("iv","That's all the hints I've got. Have a go, or I can show you.");return}say("iv","Hint: "+esc(Q.hints[hints]));hints++;input.focus({preventScroll:true})};
  $h("#ivgive").onclick=()=>{if(fstate==="open"){fstate=false;say("iv",`No problem. For the record: ${esc(Q.follow.sol)}`);finish(false);return}finish(true)};
}
function ivLine(r){const parts=[];
  parts.push(r.solved?`Solved in ${r.time}s of a ${r.limit}s limit${r.time>r.limit?" (over time, −2)":""}.`:r.gaveUp?"Not solved.":"Not solved.");
  if(r.hints)parts.push(`${r.hints} hint${r.hints>1?"s":""} used (−${2*r.hints}).`);if(r.att>1&&r.solved)parts.push(`${r.att-1} wrong attempt${r.att>2?"s":""} first (−${Math.min(3,r.att-1)}).`);
  if(r.fb)parts.push("Follow-up answered.");return parts.join(" ")}
function ivReport(host,qs,res){
  const max=10*res.length,score=res.reduce((a,r)=>a+r.pts,0),bonus=res.reduce((a,r)=>a+r.fb,0),pct=score/max;
  const grade=pct>=0.8?"Strong pass":pct>=0.6?"Pass":pct>=0.4?"Borderline":"Not yet";
  const st=ivState();st.hist.push({d:new Date().toISOString(),bonus,mode:res.length>1?`Mock (${IV.diff})`:`${IV_CATS[res[0].cat]} question`,score,max,grade,items:res.map(({scratch,...r})=>r)});st.hist=st.hist.slice(-100);bumpDay("iv");queueSave();
  const byCat={};for(const r of res)(byCat[r.cat]=byCat[r.cat]||[]).push(r);
  const strong=Object.entries(byCat).filter(([c,rs])=>rs.every(r=>r.solved&&r.hints===0)).map(([c])=>IV_CATS[c]);
  const weak=Object.entries(byCat).filter(([c,rs])=>rs.some(r=>!r.solved||r.hints>0)).map(([c])=>c);
  const timeUse=mean(res.map(r=>r.time/r.limit)),hintRate=res.reduce((a,r)=>a+r.hints,0)/res.length,scratchUsed=res.filter(r=>r.scratch).length;
  const notes=[];
  if(timeUse>1)notes.push("You ran over time on average. In interviews, say your approach out loud early so the interviewer can steer you before the clock runs out.");
  else if(timeUse<0.35&&res.some(r=>!r.solved||r.att>1))notes.push("You answered fast but made mistakes. Slow down slightly and sanity-check: is the answer between 0 and 1? Does it match a simple case?");
  if(hintRate>=1)notes.push("You leaned on hints. That's fine for learning, but in a real interview, try stating a plan first: interviewers reward structured thinking even before the answer.");
  if(scratchUsed<res.length/2)notes.push("You rarely used the scratchpad. Real interviews are spoken: practise writing the steps so explaining them becomes automatic.");
  if(res.some(r=>r.solved&&!r.fb&&r.base>0))notes.push("Follow-ups are where interviewers separate candidates. When you get one right, expect the next 'what if' and think about it before they ask.");
  if(!notes.length)notes.push("Clean session: correct, on time and mostly without help. Move up a level.");
  host.innerHTML=`<div class="card stack"><h3>Interview feedback</h3><div class="row between"><h2>${esc(grade)}</h2><span class="big tabular">${score}<span class="muted" style="font-size:20px"> / ${max}</span></span></div>${bonus?`<p class="small muted">Plus ${bonus} follow-up bonus points.</p>`:""}
    <div class="stats">${stat("Solved",`${res.filter(r=>r.solved).length} / ${res.length}`)}${stat("Hints used",String(res.reduce((a,r)=>a+r.hints,0)))}${stat("Time used",pctf(timeUse,0)+" of limit")}${stat("Follow-ups right",String(res.filter(r=>r.fb).length))}</div>
    ${strong.length?`<p><b>Strong:</b> ${esc(strong.join(", "))}.</p>`:""}
    <ul class="tips">${notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul>
    <div class="tablewrap"><table class="kv"><thead><tr><th>Question</th><th>Score</th><th>Time</th><th>Hints</th></tr></thead><tbody>${res.map((r,k)=>`<tr><th>${esc(qs[k].q.slice(0,70))}${qs[k].q.length>70?"…":""}</th><td>${r.pts}${r.fb?" +2":""}</td><td>${r.time}s / ${r.limit}s</td><td>${r.hints}</td></tr>`).join("")}</tbody></table></div>
    ${res.some(r=>r.scratch)?`<details><summary>Your scratchpad notes</summary>${res.map((r,k)=>r.scratch?`<p class="small"><b>Q${k+1}.</b> ${esc(r.scratch)}</p>`:"").join("")}</details>`:""}
    ${weak.length?`<div class="stack"><h3>Practise next</h3><div class="row">${[...new Set(weak)].map(c=>`<button class="btn ghost chip" data-ivgo="${c}">${esc(IV_LINK[c][1])}</button>`).join("")}</div></div>`:""}
    <div class="row"><button class="btn accent" id="ivagain">${res.length>1?"Another mock":"Another question"}</button><button class="btn ghost" id="ivback">Back to the interview room</button></div></div>`;
  const sn=$("#ivseen");if(sn)sn.textContent=`${Object.keys(st.seen).length} of ${IVQ.length} questions attempted.`;
  host.querySelector("#ivagain").onclick=()=>ivSession(host,res.length>1?ivPickMock(IV.diff):[ivPickOne(IV.cat)]);
  host.querySelector("#ivback").onclick=()=>{renderInterview();$("#v-interview").scrollIntoView({block:"start"})};
  host.querySelectorAll("[data-ivgo]").forEach(b=>b.onclick=()=>{const c=b.dataset.ivgo,[v]=IV_LINK[c];
    if(v==="labs"){LABTAB=c==="fin"?"options":"prob";renderLabs();go("labs")}
    else if(v==="daily"){go("daily");const k={ev:"ev",mental:"arith",stats:"stats"}[c];setTimeout(()=>document.querySelector(`[data-drill="${k}"]`)?.click(),50)}
    else go(v)});
}

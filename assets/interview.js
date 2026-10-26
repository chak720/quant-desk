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

/* ---------- question templates ----------
   IVGEN[id] re-rolls the numbers of a bank question each time it's asked; IVNEW adds templated questions.
   A generator returns {q, ans, tol, hints, follow, sol} and overrides the static fields. */
const ord=n=>n+(["th","st","nd","rd"][(n%100-20)%10]||["th","st","nd","rd"][n%100]||"th");
const IVGEN={
 aces:()=>{const r=pick(["aces","kings","queens","sevens"]),k=pick([2,3]),p=[...Array(k)].reduce((a,_,i)=>a*(4-i)/(52-i),1);
   return{q:`I deal you ${k} cards from a shuffled deck. What's the probability they're all ${r}?`,ans:p,tol:{abs:Math.max(0.00002,p*0.02)},
     hints:[`What's the chance the first card is one of the ${r}?`,`Given that, how many ${r} and how many cards are left?`],
     follow:{q:`Same, but each card is put back and the deck reshuffled before the next draw.`,ans:(1/13)**k,tol:{abs:Math.max(0.00002,(1/13)**k*0.02)},sol:`(4/52)^${k} = (1/13)^${k} = ${r4((1/13)**k)}`},
     sol:`${[...Array(k)].map((_,i)=>`${4-i}/${52-i}`).join(" × ")} = ${p<0.001?p.toExponential(3):r4(p)}`}},
 onesix:()=>{const x=ri(1,6);return{q:`I roll two dice and tell you at least one of them is a ${x}. What's the probability both are ${x}s?`,ans:1/11,tol:{abs:0.002},
   hints:[`How many of the 36 outcomes contain at least one ${x}?`,`Of those, how many are a double ${x}?`],follow:{q:`Now I tell you the first die is a ${x}. Probability both are ${x}s?`,ans:1/6,tol:{abs:0.002},sol:"The second die is independent: 1/6."},
   sol:`Outcomes with at least one ${x}: 6 + 6 − 1 = 11, and one of them is the double. 1/11.`}},
 boys:()=>{const n=pick([2,3]),g=Math.random()<.5,w=g?"girl":"boy";return{q:`A family has ${n} children. At least one is a ${w}. What's the probability they're all ${w}s?`,ans:1/(2**n-1),tol:{abs:0.003},
   hints:[`List the ${2**n} equally likely families.`,`Remove the one with no ${w}s. How many are left?`],follow:{q:`Instead you learn the eldest is a ${w}. Probability all ${n} are ${w}s?`,ans:1/2**(n-1),tol:{abs:0.003},sol:`The other ${n-1} are free: (1/2)^${n-1}.`},
   sol:`${2**n} − 1 = ${2**n-1} families remain; one is all ${w}s: 1/${2**n-1}.`}},
 bayes:()=>{const p=pick([0.5,1,2,5]),se=pick([90,95,99]),fp=pick([1,2,5,10]),post=p*se/(p*se+(100-p)*fp);
   const p2=(post*se/100)/(post*se/100+(1-post)*fp/100);
   return{q:`${p}% of people have a disease. A test catches ${se}% of cases and gives a false positive ${fp}% of the time. You test positive. What's the probability you have it?`,ans:post,tol:{abs:0.01},
     hints:["Imagine 10,000 people. How many are ill and test positive?","How many healthy people test positive?"],
     follow:{q:"You take a second, independent test and it's also positive. Probability now?",ans:p2,tol:{abs:0.01},sol:`Use ${r4(post)} as the new prior: ${r4(p2)}.`},
     sol:`Per 10,000 people: ${r4(p*100*se/100)} are ill and test positive; ${r4((100-p)*100*fp/100)} are healthy and test positive. Bayes: ${p/100}·${se/100} / (${p/100}·${se/100} + ${r4(1-p/100)}·${fp/100}) = ${r4(post)}.`}},
 socks:()=>{const a=ri(4,15),b=ri(4,15),c=Math.random()<.5;const cs=c?ri(3,9):0;
   if(c)return{q:`A drawer has ${a} black, ${b} white and ${cs} grey socks. In the dark, how many must you take to guarantee a matching pair?`,ans:4,tol:{abs:0},hints:["With three colours, what's the worst case for the first three socks?"],follow:{q:"How many to guarantee a black pair?",ans:b+cs+2,tol:{abs:0},sol:`Worst case: every white and grey sock first (${b+cs}), then 2 black: ${b+cs+2}.`},sol:"Three socks could all differ; the fourth must match one. Answer 4."};
   return{q:`A drawer has ${a} black socks and ${b} white socks. In the dark, how many must you take to guarantee a matching pair?`,ans:3,tol:{abs:0},hints:["What's the worst case for the first two socks?"],follow:{q:"How many to guarantee a white pair?",ans:a+2,tol:{abs:0},sol:`Worst case: all ${a} black first, then 2 white: ${a+2}.`},sol:"Two socks could be one of each. The third must match. Answer 3."}},
 six:()=>{const d=pick([4,6,8,10,12,20]);return{q:`How many rolls of a fair ${d}-sided die do you expect to need to get your first ${d}?`,ans:d,tol:{abs:0.01},hints:[`Each roll succeeds with probability 1/${d}. What distribution is the waiting time?`],
   follow:{q:`Expected number of rolls until you've seen every face of that ${d}-sided die?`,ans:d*Hn(d),tol:{abs:0.05},sol:`${d}(1 + 1/2 + … + 1/${d}) = ${r4(d*Hn(d))}`},sol:`Geometric with p = 1/${d}: mean ${d}.`}},
 ruin:()=>{const N=ri(6,20),i=ri(1,N-1);return{q:`You have £${i}. You bet £1 on fair coin flips until you have £${N} or nothing. Probability you reach £${N}?`,ans:i/N,tol:{abs:0.005},
   hints:["Your wealth is a fair game: its expected value never changes.",`If p is the chance of reaching ${N}, what's your expected final wealth?`],
   follow:{q:"Expected number of flips until the game ends?",ans:i*(N-i),tol:{abs:0.01},sol:`For a fair walk: i(N − i) = ${i} × ${N-i} = ${i*(N-i)}.`},sol:`${i} = p·${N} → p = ${r4(i/N)}.`}},
 reroll:()=>{const d=pick([4,6,8,10,12]),v1=keepValue(d,1),v2=keepValue(d,2);return{q:`You roll a fair ${d}-sided die and I pay you the face value. You may reroll once, but then you must take the second roll. What's the game worth?`,ans:v1,tol:{abs:0.01},
   hints:[`A reroll is worth ${(d+1)/2} on average. Which first rolls would you keep?`,`Keep anything above ${(d+1)/2}. Average those, weight by how often, and add the reroll case.`],
   follow:{q:"Now you can reroll up to twice. Fair value?",ans:v2,tol:{abs:0.01},sol:`With one reroll left the game is worth ${r4(v1)}; keep anything above that: ${r4(v2)}.`},sol:`Keep rolls above ${(d+1)/2}, reroll the rest: ${r4(v1)}.`}},
 firstace:()=>{const N=pick([52,52,40,30]),k=pick([4,4,2,3]),w=N===52?(k===4?"ace":"red ace"):"special card";const e=(N+1)/(k+1);
   return{q:N===52&&k===4?"I turn over cards from a shuffled deck one at a time. What's the expected position of the first ace?":`A shuffled pile of ${N} cards contains ${k} marked cards. You turn them over one at a time. Expected position of the first marked card?`,ans:e,tol:{abs:0.01},
     hints:[`The ${k} marked cards split the ${N-k} others into ${k+1} gaps.`,"By symmetry, how many unmarked cards sit in front of the first marked one on average?"],
     follow:{q:"Expected position of the second one?",ans:2*e,tol:{abs:0.01},sol:`Two gaps plus two marked cards: 2 × ${r4((N-k)/(k+1))} + 2 = ${r4(2*e)}.`},sol:`(${N} + 1)/(${k} + 1) = ${r4(e)}.`}},
 maxdice:()=>{const k=ri(2,3),d=pick([4,6,8]);let mx=0,mn=0;for(let m=1;m<=d;m++){mx+=m*(m**k-(m-1)**k)/d**k;mn+=m*((d-m+1)**k-(d-m)**k)/d**k}
   return{q:`Roll ${k} fair ${d}-sided dice. What's the expected value of the largest?`,ans:mx,tol:{abs:0.01},hints:[`P(max ≤ m) = (m/${d})^${k}. What's P(max = m)?`,`Sum m × [(m/${d})^${k} − ((m−1)/${d})^${k}].`],
     follow:{q:"And the expected value of the smallest?",ans:mn,tol:{abs:0.01},sol:k===2?`max + min = sum, so ${d+1} − ${r4(mx)} = ${r4(mn)}`:`By symmetry, ${d+1} − E[max] = ${r4(mn)}`},sol:`${r4(mx)}`}},
 fixed:()=>{const n=ri(5,60);return{q:`I shuffle ${n} numbered cards. What's the expected number that end up in their original position?`,ans:1,tol:{abs:0.001},hints:["Let Iₖ be 1 if card k stays in place. What's E[Iₖ]?","Use linearity of expectation."],
   follow:{q:"Roughly what's the probability that none ends up in its original position?",ans:1/Math.E,tol:{abs:0.01},sol:"Derangements: ≈ 1/e ≈ 0.368."},sol:`Each card stays with probability 1/${n}: ${n} × 1/${n} = 1.`}},
 plane:()=>{const n=pick([50,100,150,200]);return{q:`${n} passengers board a plane with ${n} seats. The first loses their ticket and sits randomly. Each later passenger takes their own seat if free, otherwise a random free seat. Probability the last passenger gets their own seat?`,ans:0.5,tol:{abs:0.001},
   hints:["Try it with 2 passengers, then 3.",`The outcome is decided the moment someone sits in seat 1 or seat ${n}. Which is more likely to go first?`],
   follow:{q:`Probability passenger ${n-2} (third from last) gets their own seat?`,ans:3/4,tol:{abs:0.005},sol:"For the kth from last, the chance is k/(k+1): 3/4."},sol:"Seat 1 and the last seat are always equally likely to be taken first: 1/2."}},
 alt:()=>{const d=pick([2,4,6,10]),p=1/d,w=d===2?"heads":`a ${d}`;return{q:`We take turns ${d===2?"flipping a fair coin":`rolling a fair ${d}-sided die`} and the first to get ${w} wins. You go first. Probability you win?`,ans:p/(1-(1-p)**2),tol:{abs:0.003},
   hints:["What's the chance you win on your first go?",`If you both miss, the game resets. Write P = ${fr(1,d)} + (${fr(d-1,d)})²P.`],
   follow:{q:"What if there are three players and you go first?",ans:p/(1-(1-p)**3),tol:{abs:0.003},sol:`P = p/(1 − (1 − p)³) = ${r4(p/(1-(1-p)**3))}`},sol:`P = p / (1 − (1 − p)²) = ${r4(p/(1-(1-p)**2))}`}},
 ants:()=>{const n=ri(3,6);return{q:`${n} ants sit on the corners of a regular ${n}-sided polygon. Each picks a direction at random and walks along an edge. Probability none collide?`,ans:2/2**n,tol:{abs:0.003},
   hints:["How many direction combinations are there?","Which combinations avoid any collision?"],follow:{q:`Same with ${n+1} ants on a ${n+1}-gon.`,ans:2/2**(n+1),tol:{abs:0.003},sol:`2/2^${n+1}`},sol:`Only all clockwise or all anticlockwise: 2/2^${n} = ${fr(2,2**n)}.`}},
 circle:()=>{const n=ri(3,5);return{q:`Pick ${n} uniformly random points on a circle. Probability they all lie in some semicircle?`,ans:n/2**(n-1),tol:{abs:0.003},
   hints:["Fix one point as the start of a clockwise semicircle.",`P(the other ${n-1} all fall in the semicircle clockwise of it) = (1/2)^${n-1}. These events are disjoint across the ${n} points.`],
   follow:n===3?{q:"So what's the probability the triangle contains the centre?",ans:0.25,tol:{abs:0.003},sol:"1 − 3/4 = 1/4."}:{q:`So what's the probability the ${n}-gon contains the centre?`,ans:1-n/2**(n-1),tol:{abs:0.003},sol:`1 − ${n}/2^${n-1} = ${r4(1-n/2**(n-1))}`},sol:`${n} × (1/2)^${n-1} = ${r4(n/2**(n-1))}.`}},
 unifsum:()=>{const t=pick([1,0.5,0.25]);return{q:`Draw uniform random numbers from [0, 1] until their sum exceeds ${t}. Expected number of draws?`,ans:Math.exp(t),tol:{abs:0.01},
   hints:["P(you need more than n draws) = P(the first n sum to less than the target).",`The volume of {x₁ + … + xₙ < ${t}} is ${t}ⁿ/n!. Now use E[N] = Σ P(N > n).`],
   follow:{q:"Expected value of the minimum of three independent uniform [0, 1] draws?",ans:0.25,tol:{abs:0.003},sol:"1/(n + 1) = 1/4."},sol:`Σ ${t}ⁿ/n! = e^${t} ≈ ${r4(Math.exp(t))}.`}},
 dist:()=>{const a=pick([1,2,6,10]);return{q:`X and Y are independent uniforms on [0, ${a}]. What's E|X − Y|?`,ans:a/3,tol:{abs:0.003*a},hints:[`Scale: it's ${a} × the answer for [0, 1].`,"Two random points split [0, 1] into three pieces of equal expected length."],
   follow:{q:"E[(X − Y)²]?",ans:a*a/6,tol:{abs:0.01*a},sol:`Var(X − Y) = 2 × ${a}²/12 = ${r4(a*a/6)}`},sol:`${a}/3 = ${r4(a/3)}.`}},
 corr:()=>{const k=ri(1,4);return{q:`X and Y are independent with Var(X) = 1 and Var(Y) = ${k}. What's the correlation between X and X + Y?`,ans:1/Math.sqrt(1+k),tol:{abs:0.005},
   hints:["Cov(X, X + Y) = Var(X) + Cov(X, Y).",`Var(X + Y) = 1 + ${k}. Divide the covariance by the product of the standard deviations.`],
   follow:{q:"Correlation between X + Y and X − Y?",ans:(1-k)/(1+k),tol:{abs:0.005},sol:`Cov = Var X − Var Y = ${1-k}; both variances ${1+k}: ${r4((1-k)/(1+k))}`},sol:`1/√${1+k} = ${r4(1/Math.sqrt(1+k))}.`}},
 sd:()=>{const m=ri(3,9),d=[...Array(4)].map(()=>ri(0,4));const xs=[...d.map(x=>m+x),...d.map(x=>m-x)].sort((a,b)=>a-b),v=mean(xs.map(x=>(x-m)**2));
   return{q:`Population standard deviation of ${xs.join(", ")}?`,ans:Math.sqrt(v),tol:{abs:0.01},hints:[`The mean is ${m}.`,`Squared deviations: ${xs.map(x=>(x-m)**2).join(", ")}.`],
     follow:{q:"Sample standard deviation (divide by n − 1)?",ans:Math.sqrt(v*8/7),tol:{abs:0.01},sol:`√(${r4(v*8)}/7) = ${r4(Math.sqrt(v*8/7))}`},sol:`Mean ${m}; mean squared deviation ${r4(v)}; √ = ${r4(Math.sqrt(v))}.`}},
 var100:()=>{const n=pick([10,25,50,100,400]),d=pick([4,6,8,20]),v=(d*d-1)/12;return{q:`I roll a fair ${d}-sided die ${n} times. What's the variance of the total?`,ans:n*v,tol:{abs:0.05},
   hints:[`The variance of one roll is (${d}² − 1)/12.`,"Variances of independent rolls add."],follow:{q:"About what's the standard deviation of the total?",ans:Math.sqrt(n*v),tol:{abs:0.1},sol:`√${r4(n*v)} ≈ ${r4(Math.sqrt(n*v))}`},sol:`${n} × ${r4(v)} = ${r4(n*v)}.`}},
 clock:()=>{const h=ri(1,11),m=pick([5,10,15,20,25,35,40,45,50]),a=Math.abs(30*h+0.5*m-6*m),ang=Math.min(a,360-a);return{q:`What's the smaller angle between the hour and minute hands at ${h}:${String(m).padStart(2,"0")}?`,ans:ang,tol:{abs:0.01},
   hints:["The minute hand moves 6° per minute; the hour hand 0.5° per minute.",`At ${h}:${String(m).padStart(2,"0")} the hour hand is at ${30*h}° + ${0.5*m}°.`],follow:{q:"How many times a day do the hands overlap?",ans:22,tol:{abs:0},sol:"11 times every 12 hours: 22."},sol:`Hour hand ${30*h+0.5*m}°, minute hand ${6*m}°: ${ang}°.`}},
 zeros:()=>{const n=ri(30,250),z=Math.floor(n/5)+Math.floor(n/25)+Math.floor(n/125);return{q:`How many trailing zeros does ${n}! have?`,ans:z,tol:{abs:0},hints:["Each zero needs a factor 2 × 5. Which is scarcer?","Count multiples of 5, then 25, then 125."],
   follow:{q:"Trailing zeros of 1000!?",ans:249,tol:{abs:0},sol:"200 + 40 + 8 + 1 = 249."},sol:`⌊${n}/5⌋ + ⌊${n}/25⌋ + ⌊${n}/125⌋ = ${z}.`}},
 eggs:()=>{const F=pick([36,50,78,100,120,200]);let n=1;while(n*(n+1)/2<F)n++;return{q:`You have two eggs and a ${F}-floor building. Minimum number of drops that guarantees finding the highest safe floor?`,ans:n,tol:{abs:0},
   hints:["If the first egg breaks, the second must check floors one by one.",`Drop the first egg at n, then n + (n − 1), … You need n(n + 1)/2 ≥ ${F}.`],follow:{q:"Same with a 10-floor building?",ans:4,tol:{abs:0},sol:"4 × 5/2 = 10, so 4."},sol:`Smallest n with n(n + 1)/2 ≥ ${F}: ${n}.`}},
 lockers:()=>{const n=pick([50,100,200,500,1000]);return{q:`${n} closed lockers. Student k toggles every k-th locker, for k = 1 to ${n}. How many are open at the end?`,ans:Math.floor(Math.sqrt(n)),tol:{abs:0},
   hints:["A locker's final state depends on how many divisors its number has.","Which numbers have an odd number of divisors?"],follow:{q:`Which is the last open locker?`,ans:Math.floor(Math.sqrt(n))**2,tol:{abs:0},sol:`The largest square ≤ ${n}.`},sol:`Perfect squares up to ${n}: ${Math.floor(Math.sqrt(n))}.`}},
 m1:()=>{const a=ri(12,49),b=ri(12,49),c=ri(12,49),d=ri(12,49);return{q:`${a} × ${b}?`,ans:a*b,tol:{abs:0},hints:[`Split: ${a} × ${Math.floor(b/10)*10} + ${a} × ${b%10}.`],follow:{q:`${c} × ${d}?`,ans:c*d,tol:{abs:0},sol:`${c*d}`},sol:`${a*b}.`}},
 m2:()=>{const p=pick([3,6,7,12,15,35]),x=ri(12,96)*5;return{q:`What's ${p}% of ${x}?`,ans:p*x/100,tol:{abs:0.01},hints:[`1% is ${x/100}.`],follow:{q:`What's ${x}% of ${p}?`,ans:p*x/100,tol:{abs:0.01},sol:"Same thing: x% of y = y% of x."},sol:`${p} × ${x/100} = ${r4(p*x/100)}.`}},
 m3:()=>{const a=ri(5,30),b=ri(1,a),n=a*a+b,c=ri(5,30),n2=c*c+ri(1,c);return{q:`Estimate √${n} to two decimal places.`,ans:Math.sqrt(n),tol:{abs:0.01},hints:[`√${a*a} = ${a}. Use √(a² + b) ≈ a + b/(2a).`],
   follow:{q:`Estimate √${n2} to one decimal place.`,ans:Math.sqrt(n2),tol:{abs:0.05},sol:`≈ ${r4(Math.sqrt(n2))}`},sol:`${a} + ${b}/${2*a} ≈ ${r4(a+b/(2*a))}; exact ${r4(Math.sqrt(n))}.`}},
 m4:()=>{const r=pick([3,4,5,6,7,8,10]),n=pick([5,10,15,20]);return{q:`Estimate 1.${String(r).padStart(2,"0")}^${n} to two decimal places.`,ans:(1+r/100)**n,tol:{abs:0.015*(1+r/100)**n},hints:[`ln(1.${String(r).padStart(2,"0")}) ≈ ${r4(Math.log(1+r/100))}. Multiply by ${n} and exponentiate.`],
   follow:{q:`Roughly how many years to double at ${r}% a year?`,ans:Math.log(2)/Math.log(1+r/100),tol:{abs:0.6},sol:`Rule of 72: 72/${r} ≈ ${r4(72/r)}`},sol:`e^${r4(n*Math.log(1+r/100))} ≈ ${r4((1+r/100)**n)}.`}},
 m5:()=>{const n=pick([50,100,200,1000]),k=pick([2,3,5]);return{q:`Sum of the integers from 1 to ${n}?`,ans:n*(n+1)/2,tol:{abs:0},hints:[`Pair 1 with ${n}, 2 with ${n-1}…`],
   follow:{q:`Sum of the multiples of ${k} from ${k} to ${k*n}?`,ans:k*n*(n+1)/2,tol:{abs:0},sol:`${k} × ${n*(n+1)/2}`},sol:`${n}(${n} + 1)/2 = ${n*(n+1)/2}.`}},
 coins10:()=>{const n=ri(4,12),k=ri(0,n);return{q:`Flip a fair coin ${n} times. Probability of exactly ${k} heads?`,ans:comb(n,k)/2**n,tol:{abs:0.002},hints:[`How many sequences have exactly ${k} heads?`,`C(${n}, ${k}) = ${comb(n,k)} of ${2**n}.`],
   follow:{q:"Probability of at least one head?",ans:1-1/2**n,tol:{abs:0.0005},sol:`1 − (1/2)^${n}`},sol:`${comb(n,k)}/${2**n} ≈ ${r4(comb(n,k)/2**n)}.`}},
 parity:()=>{const S=ri(90,110),K=pick([90,95,100,105,110]),C=ri(Math.max(2,S-K+1),S-K+15),P=C-S+K;return{q:`Zero interest rates. A stock is at ${S}, and the ${K}-strike call costs ${C}. What does the ${K}-strike put cost?`,ans:P,tol:{abs:0.01},
   hints:["Put–call parity: C − P = S − K (with zero rates)."],follow:{q:`The put actually trades at ${P+2}. What riskless profit can you lock in per unit?`,ans:2,tol:{abs:0.01},sol:"Sell the put, buy the call, short the stock: 2."},sol:`P = C − S + K = ${P}.`}},
 parity2:()=>{const S=100,K=pick([95,100,105]),r=pick([0.02,0.04,0.05]),T=pick([0.5,1]),C=r4(bs("call",S,K,0.2,T,r).price),P=C-S+K*Math.exp(-r*T);
   return{q:`Stock ${S}, strike ${K}, ${T===1?"one year":"six months"}, continuously compounded rate ${r*100}%. The call is ${C}. What's the put worth?`,ans:P,tol:{abs:0.02},
     hints:["C − P = S − K·e^(−rT).",`${K}·e^(−${r4(r*T)}) ≈ ${r4(K*Math.exp(-r*T))}.`],follow:{q:"By how much does the call exceed the put?",ans:S-K*Math.exp(-r*T),tol:{abs:0.02},sol:`C − P = S − Ke^(−rT) ≈ ${r4(S-K*Math.exp(-r*T))}`},sol:`P ≈ ${r4(P)}.`}},
 atm:()=>{const S=pick([50,100,200,400]),sg=pick([0.15,0.2,0.3,0.4]),T=pick([0.25,1,4]);return{q:`Roughly what's an at-the-money call worth with the stock at ${S}, volatility ${sg*100}% and ${T===1?"one year":T<1?"three months":"four years"} to expiry? (zero rates)`,ans:0.4*S*sg*Math.sqrt(T),tol:{rel:0.05},
   hints:["Rule of thumb: about 0.4 × S × σ × √T."],follow:{q:"Roughly what's the at-the-money straddle worth?",ans:0.8*S*sg*Math.sqrt(T),tol:{rel:0.05},sol:"Twice the call (the put is worth the same at the money with zero rates)."},sol:`0.4 × ${S} × ${sg} × √${T} = ${r4(0.4*S*sg*Math.sqrt(T))}.`}},
 vol:()=>{const d=pick([0.5,1,1.5,2,3]),a=pick([16,24,32,48]);return{q:`Daily volatility is ${d}%. What's the annualised volatility, in percent? (252 trading days)`,ans:d*Math.sqrt(252),tol:{abs:0.2*d},
   hints:["Volatility scales with the square root of time."],follow:{q:`Annual vol is ${a}%. Roughly what's the daily vol in percent?`,ans:a/Math.sqrt(252),tol:{abs:0.05},sol:`${a}/15.87 ≈ ${r4(a/Math.sqrt(252))}%`},sol:`${d}% × √252 ≈ ${r4(d*Math.sqrt(252))}%.`}},
 kelly:()=>{const p=pick([0.55,0.6,0.65,0.7]),b=pick([2,3]);return{q:`A bet wins ${p*100}% of the time at even money. What fraction of your bankroll maximises long-run growth? (decimal)`,ans:2*p-1,tol:{abs:0.003},
   hints:["That's the Kelly criterion: f = p − q/b."],follow:{q:`Same ${p*100}% win rate, but the bet pays ${b}:1. Kelly fraction?`,ans:p-(1-p)/b,tol:{abs:0.003},sol:`${p} − ${r4(1-p)}/${b} = ${r4(p-(1-p)/b)}`},sol:`2p − 1 = ${r4(2*p-1)}.`}},
 sharpe:()=>{const z=pick([0.5,1,1.5,2]),y=pick([1,4]);return{q:`A strategy has an annual Sharpe ratio of ${z}. Assuming normal returns and zero rates, roughly what's the probability of a losing year? (decimal)`,ans:Ncdf(-z),tol:{abs:0.01},
   hints:["The annual return is normal with mean equal to Sharpe × its standard deviation.",`P(Z < −${z})?`],follow:{q:`And the probability of losing money over ${y===1?"two":"four"} years combined?`,ans:Ncdf(-z*Math.sqrt(y===1?2:4)),tol:{abs:0.01},sol:`Sharpe grows with √T: P(Z < −${z}×√${y===1?2:4}) ≈ ${r4(Ncdf(-z*Math.sqrt(y===1?2:4)))}`},sol:`P(Z < −${z}) ≈ ${r4(Ncdf(-z))}.`}},
 straddle:()=>{const K=ri(8,12)*10,prem=ri(4,12),S=K+ri(-20,20);return{q:`You buy a ${K}-strike straddle for ${prem}. The stock finishes at ${S}. Your P&L?`,ans:Math.abs(S-K)-prem,tol:{abs:0.01},
   hints:["A straddle pays |S − K| at expiry."],follow:{q:"Give the upper breakeven stock price.",ans:K+prem,tol:{abs:0.01},sol:`Breakevens ${K-prem} and ${K+prem}.`},sol:`|${S} − ${K}| − ${prem} = ${Math.abs(S-K)-prem}.`}},
 mm2d:()=>{const n=ri(2,5),x=ri(1,6);return{q:`Make me a market on the sum of ${n} dice. First, what's your fair value?`,ans:3.5*n,tol:{abs:0.01},hints:["Each die averages 3.5."],
   follow:{q:`I show you one die: it's a ${x}. What's your new fair value?`,ans:x+3.5*(n-1),tol:{abs:0.01},sol:`${x} + ${n-1} × 3.5 = ${x+3.5*(n-1)}.`},sol:`${n} × 3.5 = ${3.5*n}. A sensible first market: ${3.5*n-1} at ${3.5*n+1}.`}},
 mmcards:()=>{const n=ri(2,5),r=ri(1,13);return{q:`Fair value of the sum of ${n} cards drawn from a deck, Ace = 1 up to King = 13?`,ans:7*n,tol:{abs:0.01},hints:["The average card is 7.","Linearity works even without replacement."],
   follow:{q:`The first card turned over is a ${RANKS[r]}. New fair value for the sum of all ${n}?`,ans:r+(n-1)*(364-r)/51,tol:{abs:0.02},sol:`${r} + ${n-1} × (${364-r}/51) ≈ ${r4(r+(n-1)*(364-r)/51)}.`},sol:`${n} × 7 = ${7*n}.`}},
 mmsq:()=>{const n=pick([4,6,8,10,12]),h=ri(1,Math.floor(n/2)),m=h+ri(0,2);const rest=n-m,ev=n/2,var_=n/4;const ex=(h+rest/2)**2+rest/4;
   return{q:`A contract pays the square of the number of heads in ${n} fair coin flips. Fair value?`,ans:var_+ev*ev,tol:{abs:0.01},hints:["E[X²] = Var(X) + E[X]².",`X ~ Binomial(${n}, ½): mean ${ev}, variance ${var_}.`],
     follow:{q:`After ${m} flips there are ${h} heads. Fair value now?`,ans:ex,tol:{abs:0.01},sol:`X = ${h} + Y with Y ~ Bin(${rest}, ½): (${h} + ${rest/2})² + ${rest/4} = ${r4(ex)}.`},sol:`${var_} + ${ev}² = ${var_+ev*ev}.`}},
 mmadv:()=>{const fv=ri(40,60),w=pick([2,4,6]),inf=fv+pick([3,4,5,6,-3,-4,-5,-6]),b=fv-w/2,a=fv+w/2,up=inf>fv;
   return{q:`You quote ${b} at ${a} on a contract you think is worth ${fv}. Some counterparties are informed and know it's worth ${inf}; the rest trade randomly. What's your expected P&L per trade with an informed trader?`,ans:up?a-inf:inf-b,tol:{abs:0.01},
     hints:[`An informed trader who knows the value is ${inf}: do they buy at your ask or sell at your bid?`,up?`They buy at ${a} something worth ${inf}.`:`They sell at ${b} something worth ${inf}.`],
     follow:{q:`A random trader hits either side with equal chance. Your expected P&L per random trade, if the true value is ${inf}?`,ans:((a-inf)+(inf-b))/2,tol:{abs:0.01},sol:`Selling at ${a}: ${a-inf}. Buying at ${b}: ${inf-b}. Average ${(a-b)/2}: random flow pays half the spread whatever the value.`},
     sol:`Informed traders ${up?`buy at ${a}`:`sell at ${b}`}: ${up?a-inf:inf-b} per trade. That's adverse selection.`}},
};
const IVNEW=[
 {id:"urn1",cat:"prob",d:2,t:150,look:"Seeing the symmetry (gaps) instead of summing a series.",gen:()=>{const r=ri(2,6),b=ri(3,12),N=r+b;return{q:`An urn has ${r} red and ${b} blue balls. You draw without replacement until you get a red. Expected number of draws?`,ans:(N+1)/(r+1),tol:{abs:0.01},
   hints:[`The ${r} reds split the ${b} blues into ${r+1} gaps.`,"How many blues sit before the first red on average?"],follow:{q:"Probability the last ball drawn (if you drew them all) is red?",ans:r/N,tol:{abs:0.003},sol:`Any ball is equally likely to be last: ${r}/${N}.`},sol:`${b}/(${r}+1) blues before the first red, plus the red: (${N}+1)/(${r}+1) = ${r4((N+1)/(r+1))}.`}}},
 {id:"higher",cat:"prob",d:1,t:90,look:"Using symmetry and handling ties.",gen:()=>{const d=pick([6,8,10,12,20]);return{q:`We each roll a fair ${d}-sided die. Probability your roll is strictly higher than mine?`,ans:(d-1)/(2*d),tol:{abs:0.003},
   hints:["What's the probability of a tie?","Without ties, who's higher is symmetric."],follow:{q:`Three of us roll. Probability you're strictly the highest?`,ans:(()=>{let s=0;for(let x=1;x<=d;x++)s+=((x-1)/d)**2/d;return s})(),tol:{abs:0.003},sol:"Σ P(you roll x) × P(both others below x)."},sol:`(1 − 1/${d}) / 2 = ${fr(d-1,2*d)}.`}}},
 {id:"consec",cat:"prob",d:2,t:150,look:"Spotting the geometric wait after the first roll.",gen:()=>{const d=pick([4,6,8,10]);return{q:`Roll a fair ${d}-sided die until two consecutive rolls match. Expected number of rolls?`,ans:d+1,tol:{abs:0.01},
   hints:["After the first roll, what's the chance each new roll matches the one before?"],follow:{q:"Expected rolls until you see two consecutive rolls that are both the top face?",ans:d*d+d,tol:{abs:0.01},sol:`Like HH with p = 1/${d}: (1/p)² + 1/p = ${d*d+d}.`},sol:`1 + ${d} = ${d+1}.`}}},
 {id:"roulette",cat:"prob",d:2,t:180,look:"Conditioning on the blank and comparing with a fresh spin.",gen:()=>{const n=pick([6,6,8]),k=ri(1,3);return{q:`A revolver has ${n} chambers with ${k} adjacent bullet${k>1?"s":""}. The cylinder is spun; I pull the trigger and it's a blank. Now it's your turn. If I pull again without spinning, probability you survive?`,ans:(n-k-1)/(n-k),tol:{abs:0.003},
   hints:[`Given a blank, the chamber was one of the ${n-k} empty ones.`,"Only one empty chamber is followed by a bullet."],follow:{q:"And if I spin first?",ans:(n-k)/n,tol:{abs:0.003},sol:`${n-k}/${n}${(n-k)/n<(n-k-1)/(n-k)?": worse, so don't spin.":""}`},sol:`${n-k-1}/${n-k} = ${r4((n-k-1)/(n-k))}.`}}},
 {id:"records",cat:"ev",d:2,t:150,look:"Indicator variables: position k is a record with probability 1/k.",gen:()=>{const n=ri(4,12);return{q:`Shuffle the numbers 1 to ${n}. Expected number of "records" (values bigger than everything before them)?`,ans:Hn(n),tol:{abs:0.01},
   hints:["When is position k a record?","It's a record if it's the largest of the first k: probability 1/k."],follow:{q:"Probability the last position is a record?",ans:1/n,tol:{abs:0.003},sol:`1/${n}: the largest must come last.`},sol:`1 + 1/2 + … + 1/${n} = ${r4(Hn(n))}.`}}},
 {id:"boxes",cat:"ev",d:2,t:150,look:"Linearity of expectation over boxes.",gen:()=>{const n=ri(5,20),m=ri(3,10);return{q:`Throw ${n} balls into ${m} boxes uniformly at random. Expected number of empty boxes?`,ans:m*((m-1)/m)**n,tol:{abs:0.01},
   hints:["What's the chance a given box stays empty?","Multiply by the number of boxes."],follow:{q:"Expected number of boxes with exactly one ball?",ans:m*n*(1/m)*((m-1)/m)**(n-1),tol:{abs:0.01},sol:`${m} × ${n} × (1/${m}) × (${m-1}/${m})^${n-1} = ${r4(m*n/m*((m-1)/m)**(n-1))}`},sol:`${m} × (${m-1}/${m})^${n} = ${r4(m*((m-1)/m)**n)}.`}}},
 {id:"bday",cat:"ev",d:1,t:120,look:"Counting pairs, not people.",gen:()=>{const k=ri(10,80);return{q:`${k} people in a room. Expected number of pairs who share a birthday? (365 equally likely days)`,ans:comb(k,2)/365,tol:{abs:0.01},
   hints:["How many pairs are there?","Each pair matches with probability 1/365."],follow:{q:"Expected number of triples who all share a birthday?",ans:comb(k,3)/365**2,tol:{abs:0.005},sol:`C(${k},3)/365² = ${r4(comb(k,3)/365**2)}`},sol:`C(${k},2)/365 = ${r4(comb(k,2)/365)}.`}}},
 {id:"diecall",cat:"mm",d:2,t:150,look:"Pricing an option as an average of payoffs, then updating.",gen:()=>{const K=ri(1,4),d=6;let s=0;for(let x=K+1;x<=d;x++)s+=x-K;return{q:`A contract pays max(roll − ${K}, 0) on one die. What's your fair value?`,ans:s/6,tol:{abs:0.01},
   hints:["List the payoff for each face.",`Payoffs: ${[1,2,3,4,5,6].map(x=>Math.max(x-K,0)).join(", ")}.`],follow:{q:`What's the fair value of the matching put, paying max(${K} − roll, 0)?`,ans:[1,2,3,4,5,6].reduce((a,x)=>a+Math.max(K-x,0),0)/6,tol:{abs:0.01},sol:`Call − put = E[roll] − ${K} = ${3.5-K}, so put = ${r4(s/6-(3.5-K))}.`},sol:`(${[1,2,3,4,5,6].map(x=>Math.max(x-K,0)).join(" + ")})/6 = ${r4(s/6)}.`}}},
 {id:"sumcall",cat:"mm",d:3,t:240,look:"Building the distribution of a sum and pricing a payoff on it.",gen:()=>{const K=ri(6,10);let s=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)s+=Math.max(a+b-K,0);return{q:`A contract pays max(sum of two dice − ${K}, 0). Fair value?`,ans:s/36,tol:{abs:0.01},
   hints:["Which sums pay, and how many ways can each happen?",`Sum s occurs in 6 − |7 − s| ways.`],follow:{q:`The first die shows 6. New fair value?`,ans:[1,2,3,4,5,6].reduce((a,x)=>a+Math.max(6+x-K,0),0)/6,tol:{abs:0.01},sol:"Average max(6 + second − K, 0) over the second die."},sol:`Σ max(s − ${K}, 0) × ways / 36 = ${s}/36 = ${r4(s/36)}.`}}},
 {id:"mmskew",cat:"mm",d:1,t:90,look:"Leaning your quote against your inventory.",gen:()=>{const m=ri(20,90),w=pick([1,2]),N=ri(5,30),long=Math.random()<.5,s=pick([0.5,1]);return{q:`Your market is ${m-w/2} at ${m+w/2}. You're ${long?"long":"short"} ${N} lots and want to reduce that. You move your mid by ${s}, keeping the width. What's your new ${long?"ask":"bid"}?`,ans:long?m-s+w/2:m+s-w/2,tol:{abs:0.001},
   hints:[`${long?"Long":"Short"}: do you want people to buy from you or sell to you?`,`So the mid goes ${long?"down":"up"} by ${s}.`],follow:{q:`Two traders then ${long?"buy from you":"sell to you"} ${Math.ceil(N/2)} lots each. Your new position? (long positive)`,ans:long?N-2*Math.ceil(N/2):-N+2*Math.ceil(N/2),tol:{abs:0},sol:"Each fill moves you towards flat."},sol:`New mid ${long?m-s:m+s}: ${long?m-s-w/2:m+s-w/2} at ${long?m-s+w/2:m+s+w/2}.`}}},
 {id:"mmpos",cat:"mm",d:2,t:150,look:"Keeping a clean running position and cash.",gen:()=>{const fv=ri(20,60),b=fv-1,a=fv+1;let pos=0,cash=0;const ev=[];for(let i=0;i<4;i++){const k=ri(1,5);if(Math.random()<.5){pos-=k;cash+=k*a;ev.push(`lifted for ${k}`)}else{pos+=k;cash-=k*b;ev.push(`hit for ${k}`)}}
   return{q:`You quote ${b} at ${a} and start flat. You get ${ev.join(", ")}. What's your position? (long positive)`,ans:pos,tol:{abs:0},hints:["Lifted means someone bought from you at your ask.","Hit means someone sold to you at your bid."],
     follow:{q:`Fair value is ${fv}. Your P&L marked to fair value?`,ans:cash+pos*fv,tol:{abs:0.01},sol:`Every lot traded earns 1 against fair value: ${cash+pos*fv}.`},sol:`${pos}.`}}},
 {id:"mmarb",cat:"mm",d:2,t:150,look:"Seeing that complementary contracts must sum to the payout.",gen:()=>{const x=ri(30,60),y=100-x+ri(2,8);return{q:`A match has two possible outcomes. You can sell "Team A wins" (pays 100) at ${x} and "Team B wins" at ${y}. What riskless profit can you lock in by selling one of each?`,ans:x+y-100,tol:{abs:0.01},
   hints:["Exactly one contract pays 100.","Compare what you collect with what you pay out."],follow:{q:`If a draw were also possible, priced at 15, would selling all three still be riskless profit? Enter the profit, or 0 if not.`,ans:Math.max(0,x+y+15-100),tol:{abs:0.01},sol:`You'd collect ${x+y+15} and pay exactly 100: ${Math.max(0,x+y+15-100)}.`},sol:`Collect ${x+y}, pay 100: ${x+y-100}.`}}},
 {id:"mmbayes",cat:"mm",d:3,t:240,look:"Bayes on order flow: who trades with you tells you something.",gen:()=>{const V=pick([10,20,100]),al=pick([0.2,0.25,0.4,0.5]),pb=al+(1-al)/2,pl=(1-al)/2,E1=V*pb/(pb+pl),ph1=pb/(pb+pl),ph2=ph1*pb/(ph1*pb+(1-ph1)*pl);
   return{q:`A contract settles at 0 or ${V}, equally likely. ${al*100}% of traders know the outcome and trade the right way; the rest buy or sell at random. Someone buys from you. What's it worth now?`,ans:E1,tol:{abs:0.05},
     hints:["P(a buy | high) = informed share + half the random share.","Apply Bayes' rule."],follow:{q:"A second trader also buys. Worth now?",ans:V*ph2,tol:{abs:0.05},sol:`Update again: P(high) = ${r4(ph2)}, value ${r4(V*ph2)}.`},sol:`P(buy | ${V}) = ${r4(pb)}, P(buy | 0) = ${r4(pl)}: value ${r4(E1)}.`}}},
 {id:"mmsd",cat:"mm",d:2,t:120,look:"Knowing the variance of a die (35/12) and that variances add.",gen:()=>{const n=ri(2,8);return{q:`You're asked for a market on the sum of ${n} dice. What's its standard deviation (roughly how wide a sensible market is)?`,ans:Math.sqrt(35*n/12),tol:{abs:0.05},
   hints:["Variance of one die is 35/12.","Independent dice: variances add."],follow:{q:`Two of the dice are now showing. What's the standard deviation of the sum now?`,ans:Math.sqrt(35*(n-2)/12),tol:{abs:0.05},sol:`√(${n-2} × 35/12) = ${r4(Math.sqrt(35*(n-2)/12))}`},sol:`√(${n} × 35/12) = ${r4(Math.sqrt(35*n/12))}.`}}},
 {id:"fwd",cat:"fin",d:1,t:90,look:"Cost of carry: a forward is the spot plus financing.",gen:()=>{const S=ri(50,200),r=pick([2,3,4,5]);return{q:`A stock pays no dividends and trades at ${S}. Rates are ${r}% a year (annual compounding). What's the one-year forward price?`,ans:S*(1+r/100),tol:{abs:0.01},
   hints:["Buy the stock today with borrowed money and hold it for a year. What does it cost you?"],follow:{q:`The forward actually trades at ${r4(S*(1+r/100)+3)}. Riskless profit per share?`,ans:3,tol:{abs:0.01},sol:"Sell the forward, borrow to buy the stock: 3."},sol:`${S} × 1.${String(r).padStart(2,"0")} = ${r4(S*(1+r/100))}.`}}},
 {id:"hedge",cat:"fin",d:1,t:90,look:"Delta as a hedge ratio.",gen:()=>{const N=ri(5,50),d=pick([0.25,0.4,0.5,0.6,0.75]);return{q:`You sold ${N} call options, each on one share, with delta ${d}. How many shares do you buy to be delta-neutral?`,ans:N*d,tol:{abs:0.01},
   hints:["Each short call loses about delta per £1 the stock rises."],follow:{q:`The stock rises and delta becomes ${r4(d+0.1)}. How many more shares do you buy?`,ans:N*0.1,tol:{abs:0.01},sol:`${N} × 0.1 = ${r4(N*0.1)}: short gamma means buying high.`},sol:`${N} × ${d} = ${r4(N*d)}.`}}},
 {id:"dur",cat:"fin",d:2,t:120,look:"Duration as price sensitivity to yield.",gen:()=>{const D=ri(2,15),dy=pick([0.25,0.5,1]),P=pick([95,100,102]);return{q:`A bond priced at ${P} has modified duration ${D}. Yields rise by ${dy}%. Approximate new price?`,ans:P*(1-D*dy/100),tol:{abs:0.05},
   hints:["ΔP/P ≈ −D × Δy."],follow:{q:"Approximately what's the change for a fall in yields of the same size? (enter the price change)",ans:P*D*dy/100,tol:{abs:0.05},sol:`+${r4(P*D*dy/100)} (a little more in reality, because of convexity).`},sol:`${P} × (1 − ${D} × ${dy/100}) = ${r4(P*(1-D*dy/100))}.`}}},
 {id:"pattern",cat:"prob",d:3,t:300,look:"A clean Markov chain or the overlap trick.",gen:()=>{const pat=pick(["HTH","HHT","THH","HHH","HTT"]),e=(()=>{let x=0;for(let k=1;k<=pat.length;k++)if(pat.slice(0,k)===pat.slice(pat.length-k))x+=2**k;return x})();return{q:`Flip a fair coin until you see ${pat}. Expected number of flips?`,ans:e,tol:{abs:0.01},
   hints:["Set up states for how much of the pattern you've matched so far.","Shortcut: add 2^k for every k where the first k letters equal the last k."],follow:{q:"Expected flips until HT?",ans:4,tol:{abs:0.01},sol:"No self-overlap: 2² = 4."},sol:`${e}.`}}},
 {id:"var2",cat:"stats",d:1,t:90,look:"Variance rules: constants square, variances of independent terms add.",gen:()=>{const a=ri(1,4),b=ri(1,4),vx=ri(1,9),vy=ri(1,9);return{q:`X and Y are independent with Var(X) = ${vx} and Var(Y) = ${vy}. What's Var(${a}X − ${b}Y)?`,ans:a*a*vx+b*b*vy,tol:{abs:0.01},
   hints:["Var(cX) = c²Var(X).","For independent variables, the variance of a difference is the sum of the variances."],follow:{q:`What if corr(X, Y) = 0.5 instead?`,ans:a*a*vx+b*b*vy-2*a*b*0.5*Math.sqrt(vx*vy),tol:{abs:0.01},sol:`Subtract 2ab·ρ·σxσy = ${r4(2*a*b*0.5*Math.sqrt(vx*vy))}.`},sol:`${a}²·${vx} + ${b}²·${vy} = ${a*a*vx+b*b*vy}.`}}},
 {id:"maxu",cat:"stats",d:2,t:120,look:"Order statistics of uniforms.",gen:()=>{const n=ri(2,9);return{q:`${n} independent uniform [0, 1] draws. Expected value of the largest?`,ans:n/(n+1),tol:{abs:0.003},
   hints:[`P(max ≤ x) = x^${n}. Differentiate to get the density.`,`E = ∫ x · ${n}x^${n-1} dx.`],follow:{q:"Expected gap between the largest and the smallest?",ans:(n-1)/(n+1),tol:{abs:0.003},sol:`${n}/(${n}+1) − 1/(${n}+1) = ${fr(n-1,n+1)}`},sol:`${n}/(${n}+1) = ${r4(n/(n+1))}.`}}},
 {id:"run",cat:"prob",d:2,t:150,look:"The recursion E_n = 2E_{n−1} + 2.",gen:()=>{const n=ri(2,5);return{q:`Expected number of fair coin flips until ${n} heads in a row?`,ans:2**(n+1)-2,tol:{abs:0.01},
   hints:["Let Eₙ be the answer for n in a row. Once you have n − 1, one more flip either finishes or resets you.",`Eₙ = 2Eₙ₋₁ + 2.`],follow:{q:`With a coin that lands heads 2/3 of the time?`,ans:(()=>{const p=2/3;let e=0;for(let k=1;k<=n;k++)e+=1/p**k;return e})(),tol:{abs:0.05},sol:"Σ (1/p)^k for k = 1…n."},sol:`2^${n+1} − 2 = ${2**(n+1)-2}.`}}},
 {id:"three",cat:"prob",d:1,t:90,look:"Counting ordered outcomes cleanly.",gen:()=>{const n=ri(2,4),d=pick([6,8,10]);let c=1;for(let i=0;i<n;i++)c*=(d-i);return{q:`Roll ${n} fair ${d}-sided dice. Probability they all show different numbers?`,ans:c/d**n,tol:{abs:0.003},
   hints:["The first can be anything. What about the second, given the first?"],follow:{q:"Probability they all show the same number?",ans:1/d**(n-1),tol:{abs:0.003},sol:`(1/${d})^${n-1}`},sol:`${Array.from({length:n},(_,i)=>`${d-i}/${d}`).join(" × ")} = ${r4(c/d**n)}.`}}},
];
IVQ.push(...IVNEW);
function ivInst(Q){const g=Q.gen||IVGEN[Q.id];return g?{...Q,...g()}:Q}

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
  qs=qs.map(ivInst);
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

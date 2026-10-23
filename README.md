# Quant Desk

Learn quantitative trading and quant finance by doing: interactive labs, adaptive daily practice, market-making games and a public practice log.

**Live site:** https://chak720.github.io/quant-desk/

- **Learn**: an eight-unit market-making track, from bid/ask basics to adverse selection and sequential games.
- **Labs**: seven live simulations with sliders, hover charts, a "Show the maths" panel and a three-question check:
  returns and volatility drag, random walks and the √t rule, Sharpe ratios and backtest luck, the Kelly criterion,
  options pricing and Greeks (Black–Scholes), diversification and correlation, and order books and market impact.
- **Daily**: a 10-question set that adapts to you, plus a three-item daily goal (set, lab or lesson, game).
  It serves more of the topics you miss, retries recent mistakes, and includes the current lesson's questions and one market to make.
- **Desk**: a market-making simulator. Quote bids and asks on a sum of dice, a sum of cards or a mystery stock while noise traders pay the spread and informed traders pick you off. Three difficulties, position limits, live P&L and position charts, and a post-trade breakdown of spread earned vs adverse selection with coaching tips.
- **Backtest**: test moving-average crossover, mean reversion, momentum and RSI strategies on real prices (or your own CSV), with trading costs, optional shorting, a train/test split, equity, drawdown and price charts, Sharpe, Sortino, Calmar and drawdown statistics, year-by-year returns, the strategy code, and a parameter-sweep heatmap that shows overfitting.
- **Labs → Options visualiser**: Black–Scholes with rates, value curves today, halfway and at expiry, Greek charts, a strategy builder with 11 presets and custom legs, a single-option breakdown with put–call parity, and an implied-volatility solver.
- **Labs → Probability simulators**: predict, then run Monte Carlo on Monty Hall (also playable), the coupon collector, gambler's ruin, the birthday problem, HH vs HT waiting times, the broken-stick triangle and estimating π.
- **Games**: arithmetic sprint, market-maker estimation, probability ladder and Kelly casino (beat a Kelly bot).
- **Profile**: ratings across seven topics including quant finance, a 26-week activity calendar, weak spots, labs completed and your mistake queue.
- **Log**: a public practice record anyone can see: streaks, activity calendar, ratings, labs and recent sessions.

## Difficulty

Each topic has its own difficulty level from L1 to L5 that moves after every answer. A right answer within the target time steps it up, a slow right answer nudges it up a little, and a miss steps it down about three times as far. It settles where you get roughly 70% right: hard enough to learn from, easy enough to keep going. New topics and runs of fast answers move faster, and questions blend between neighbouring levels so the jump from one level to the next is gradual. Level-ups show a notification.

## Updating the public log

Practice is saved in your browser. The **Log** page shows the last published copy, including the streak, the 26-week calendar and the rating-over-time chart.

1. Press **Publish today to my log** after a daily set (or Profile → **Publish to public log**). Your log is copied and GitHub's editor for `progress.json` opens.
2. Select everything in the editor, paste, and press **Commit changes**. The public page updates within a few minutes.

No GitHub token is stored in the site. Individual answers and mistakes are never published.

## How it's built

Plain HTML, CSS and JavaScript with no build step, so any static host works.

- `assets/engine.js`: question generators, ratings and adaptive selection
- `assets/lessons.js`: market-making curriculum units
- `assets/labs.js`: concept labs, chart drawing, Kelly game, progress charts, public log
- `assets/sims.js`: options visualiser and probability simulators
- `assets/desk.js`: market-making simulator
- `assets/backtest.js`: backtesting engine and playground
- `assets/app.js`: views and the other games
- `data/`: bundled price history. S&P 500, Apple, Microsoft, IBM and Starbucks from plotly/datasets; Google from backtesting.py's test data; Brent oil, VIX, GBP/USD and the monthly S&P 500 since 1871 from the datasets organisation on GitHub (EIA, CBOE, Federal Reserve H.10 and Shiller data)
- `daily.json` (optional): a daily lesson and question set, picked up automatically when present
- `progress.json` (optional): the published practice log. Share https://chak720.github.io/quant-desk/#log

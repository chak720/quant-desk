# Quant Desk

Learn quantitative trading and quant finance by doing: interactive labs, adaptive daily practice, market-making games and a public practice log.

**Live site:** https://chak720.github.io/quant-desk/

- **Learn**: an eight-unit market-making track, from bid/ask basics to adverse selection and sequential games.
- **Labs**: seven live simulations with sliders, hover charts, a "Show the maths" panel and a three-question check:
  returns and volatility drag, random walks and the √t rule, Sharpe ratios and backtest luck, the Kelly criterion,
  options pricing and Greeks (Black–Scholes), diversification and correlation, and order books and market impact.
- **Daily**: a 10-question set that adapts to you, plus a three-item daily goal (set, lab or lesson, game).
  It serves more of the topics you miss, retries recent mistakes, and includes the current lesson's questions and one market to make.
- **Games**: arithmetic sprint, market-maker estimation, probability ladder, Kelly casino (beat a Kelly bot) and an order-flow desk
  (make markets against informed and random traders).
- **Profile**: ratings across seven topics including quant finance, a 26-week activity calendar, weak spots, labs completed and your mistake queue.
- **Log**: a public practice record anyone can see: streaks, activity calendar, ratings, labs and recent sessions.

## Updating the public log

Practice is saved in your browser. To update the public **Log** page:

1. Profile → **Publish to public log**. This downloads `progress.json` (a summary only, no individual answers).
2. On GitHub, open this repo → **Add file → Upload files**, drop in `progress.json` and commit to the branch the site deploys from.

## How it's built

Plain HTML, CSS and JavaScript with no build step, so any static host works.

- `assets/engine.js`: question generators, ratings and adaptive selection
- `assets/lessons.js`: market-making curriculum units
- `assets/labs.js`: interactive labs, chart drawing, Kelly and order-flow games, public log
- `assets/app.js`: views and the other games
- `daily.json` (optional): a daily lesson and question set, picked up automatically when present
- `progress.json` (optional): the published practice log

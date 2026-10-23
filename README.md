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
- `assets/labs.js`: interactive labs, chart drawing, Kelly and order-flow games, public log
- `assets/app.js`: views and the other games
- `daily.json` (optional): a daily lesson and question set, picked up automatically when present
- `progress.json` (optional): the published practice log. Share https://chak720.github.io/quant-desk/#log

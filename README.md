# Quant Desk

Free daily practice for quant trading and market-making interviews.

**Live site:** https://chak720.github.io/quant-desk/

- **Learn**: an eight-unit market-making track, from bid/ask basics to adverse selection and sequential games.
- **Daily**: a 10-question set that adapts to you. It serves more of the topics you miss, retries recent mistakes, and includes the current lesson's questions and one market to make.
- **Games**: a 120-second arithmetic sprint, a market-maker estimation game and a probability ladder.
- **Profile**: ratings per topic, weak spots, a time-to-interview-ready estimate and your mistake queue.

Every question shows an interview-pace target time. Ratings rise faster when you answer within it.

Progress is saved in your browser only. Use **Profile → Copy progress** to move it to another device.

## How it's built

Plain HTML, CSS and JavaScript with no build step, so any static host works.

- `assets/engine.js`: question generators, ratings and adaptive selection
- `assets/lessons.js`: curriculum units
- `assets/app.js`: views and games
- `daily.json` (optional): a daily lesson and question set, picked up automatically when present

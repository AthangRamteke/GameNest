# GameNest

A small collection of eight classic browser games for one or two players. Play against a computer opponent, hand the keyboard to a friend, or chase your own best score. It is plain HTML, CSS and JavaScript, so there is nothing to install or build.

## Games

| Game | Modes | Highlights |
| --- | --- | --- |
| Tic-Tac-Toe | vs computer, 2 players | Minimax with alpha-beta pruning, three difficulty levels |
| Connect Four | vs computer, 2 players | Depth-limited negamax, centre-first move ordering |
| Othello | vs computer, 2 players | Positional weights and mobility evaluation, legal-move hints, pass handling |
| Snake | solo, auto-play AI | Smooth canvas animation, BFS pathfinding AI that avoids trapping itself |
| Trivia | solo | 64 worldwide questions in 8 categories, per-question timer, speed and streak bonuses |
| Minesweeper | solo | Three board sizes, safe first click, chording, long-press flagging |
| Lights Out | solo | Endless levels, every puzzle solvable by construction, hints |
| Echo | solo | Memory sequence game that speeds up each round |

## Features

- Responsive layout that works on phones and desktops
- Light and dark themes that follow the system setting
- Keyboard support in every game and touch controls where they matter
- Sound effects generated with the Web Audio API, with a global mute toggle
- Scores, best times and settings saved in `localStorage`
- Respects the reduced-motion preference

## Run locally

The site is static, so there is nothing to build. With Node.js installed:

```bash
npm run dev
```

This starts a local server at <http://localhost:3000> and opens it in the browser. The first run downloads `http-server` through `npx`, so it needs internet once.

Without Node.js, any static server works, for example `python -m http.server 8000`.

## Project structure

```
index.html            Home page with game tiles and filters
assets/
  shared.css          Design tokens, layout and shared components
  shared.js           Storage, sound and segmented-control helpers
games/
  tic-tac-toe/        index.html, style.css, game.js
  connect-four/       index.html, game.js
  othello/            index.html, game.js
  snake/              index.html, game.js
  trivia/             index.html, game.js, questions.js
  minesweeper/        index.html, game.js
  lights-out/         index.html, game.js
  echo/               index.html, game.js
```

## Tech

- HTML5, CSS3 (custom properties, grid, `color-mix`) and vanilla JavaScript (ES2020)
- Canvas 2D for Snake, inline SVG for Tic-Tac-Toe marks and icons
- Web Audio API for sound, `localStorage` for persistence
- Fraunces and Inter from Google Fonts

## AI techniques

- **Minimax with alpha-beta pruning** powers Tic-Tac-Toe, Connect Four (negamax form) and Othello. Difficulty comes from search depth and a chance of a deliberately weaker move.
- **Breadth-first search** drives the Snake auto-play: go for the apple only if the snake can still reach its own tail afterwards, otherwise chase the tail.

## Origin

The project started as a terminal Tic-Tac-Toe in Python using minimax with alpha-beta pruning. That script (`tic tac toe ai.py`) is kept for reference, and its AI logic was ported to JavaScript for the web version.

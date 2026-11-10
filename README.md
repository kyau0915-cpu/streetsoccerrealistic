# Street Soccer 3D

A browser-based 3D street soccer game with online lobbies powered by Socket.IO.

## Requirements

- Node.js 18 or newer
- npm
- An internet connection when playing (the game loads Three.js and its fonts from CDNs)

## Install and run

```bash
npm install
npm start
```

Open **http://localhost:3000** in your browser. For online multiplayer, deploy this Node.js app to a host that supports persistent WebSocket connections, then share the public HTTPS address with other players. Everyone must open the same server address.

## Run tests

```bash
npm test
```

## Server configuration

- `PORT` — HTTP port (defaults to `3000`).
- `CORS_ORIGIN` — optional comma-separated list of allowed browser origins. If omitted, Socket.IO's CORS setting allows any origin; restrict this when deploying publicly.

The `/health` endpoint returns a small JSON health status. The game is served from `public/index.html`.

## Project layout

```text
.
├── .gitignore
├── package.json
├── README.md
├── server.js
├── public/
│   └── index.html
└── test/
    └── server.test.js
```

## Multiplayer notes

The server creates four-character room codes, tracks room membership, closes a room when its host disconnects, and relays supported game events only to players in the same room. It is intended for casual play, not as a hardened competitive-game backend; clients currently send gameplay state and events, so production deployments should add stronger validation, rate limits, and authoritative server-side simulation.

# Carom

Carom is a neon top-down paddle duel where moving through a return puts spin on
the ball. Curve shots around two swaying, rotating obstacles, build speed through
each rally, and win the first-to-11 match by two points. Play alone against the
reactive circuit opponent or share the keyboard in local Versus mode.

## Run it

```sh
npm ci
npm run dev
```

Open the local address Vite prints. To create the self-contained static site:

```sh
npm run build
```

The production site is emitted to `dist/`. Run `npm run preview` to inspect it.

## Controls

- Player 1: **W / S**
- Player 2: **Up / Down arrows**
- Menus: either player's movement keys, **Enter** or **Space** to confirm
- Pause/resume: **P** or **Escape**
- Mute: **M**

In Solo, both sets of movement keys control the left paddle. Mouse and touch
also operate every menu. The match is first to 11, win by two.

## Quality checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test`.

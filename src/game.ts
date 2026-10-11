import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as K from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;
  readonly simTime: number;
  readonly muted: boolean;
}
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type Snapshot = Omit<CaromState, "ball"> & {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
};
type RState = DeepReadonly<CaromState>;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: RState): CaromState;
  spawnBall(s: RState): CaromState;
  spawnObstacle(s: RState, index: number): CaromState;
  reset(s: RState): CaromState;
  reconcile(s: RState): CaromState;
  setScreen(s: RState, v: Screen): CaromState;
  setMode(s: RState, v: Mode): CaromState;
  setMenuIndex(s: RState, v: number): CaromState;
  setTitleIndex(s: RState, v: number): CaromState;
  setResumeScreen(s: RState, v: "countdown" | "playing"): CaromState;
  setScore(s: RState, p1: number, p2: number): CaromState;
  setWinner(s: RState, v: Side | null): CaromState;
  setReceiver(s: RState, v: Side): CaromState;
  setPaddleCy(s: RState, side: Side, v: number): CaromState;
  setPaddleVy(s: RState, side: Side, v: number): CaromState;
  setPaddleDriven(s: RState, side: Side, v: boolean): CaromState;
  setBallPosition(s: RState, x: number, y: number): CaromState;
  setBallVelocity(s: RState, vx: number, vy: number): CaromState;
  setBallSpin(s: RState, v: number): CaromState;
  setBallHeld(s: RState, v: boolean): CaromState;
  setBallHoldTimer(s: RState, v: number): CaromState;
  setBallServeSign(s: RState, v: 1 | -1): CaromState;
  drawBallServeSign(s: RState): CaromState;
  setAiTracking(s: RState, v: boolean): CaromState;
  setAiMovement(s: RState, v: boolean): CaromState;
  setMuted(s: RState, v: boolean): CaromState;
  setObstacleClock(s: RState, v: number): CaromState;
  setObstacleClockRunning(s: RState, v: boolean): CaromState;
  snapshot(s: RState): Snapshot;
  menuItemRect(s: RState, index: number): Rect | null;
}

export const BACKGROUND = "#07111f";
const CYAN = "#46e5ff",
  PINK = "#ff4fa3",
  GOLD = "#ffd166",
  WHITE = "#e7fbff";
const clamp = (v: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, v));
const drawSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const homeBall = (): BallState => ({
  x: K.FIELD_CX,
  y: K.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: K.HOLD_TIME,
  serveSign: drawSign(),
  trail: [],
});
const pose = (index: number, t: number): ObstacleState => ({
  index,
  cx: K.OBSTACLE_CENTERS[index].x,
  cy:
    K.OBSTACLE_CENTERS[index].y +
    (index ? -1 : 1) *
      K.OBSTACLE_SWAY_AMP *
      Math.sin((2 * Math.PI * t) / K.OBSTACLE_SWAY_PERIOD),
  theta: K.OBSTACLE_SPIN_RATE * t,
});
const clone = (s: RState): CaromState => ({
  ...s,
  score: { ...s.score },
  paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
  ai: { ...s.ai },
  ball: s.ball
    ? { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) }
    : null,
  obstacles: s.obstacles.map((o) => ({ ...o })),
});
const initial = (muted = false, titleIndex = 0, simTime = 0): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: titleIndex,
  titleIndex,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: {
    left: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    right: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
  },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: homeBall(),
  obstacles: [pose(0, 0), pose(1, 0)],
  obstacleClock: 0,
  obstacleClockRunning: true,
  simTime,
  muted,
});
const ball = (s: RState): DeepReadonly<BallState> => {
  if (!s.ball) throw new Error("Carom: no ball is present");
  return s.ball;
};
const count = (screen: Screen): number =>
  screen === "title" || screen === "paused"
    ? 3
    : screen === "matchover"
      ? 2
      : screen === "howto"
        ? 1
        : 0;
const rect = (screen: Screen, index: number): Rect | null =>
  index < 0 || index >= count(screen)
    ? null
    : {
        x: 460,
        y:
          (screen === "title" ? 405 : screen === "howto" ? 570 : 420) +
          index * 72,
        w: 360,
        h: 58,
      };
const start = (s: CaromState, mode: Mode): CaromState => ({
  ...s,
  screen: "countdown",
  mode,
  menuIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: homeBall(),
  paddles: {
    left: { ...s.paddles.left, cy: K.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: K.FIELD_CY, vy: 0 },
  },
  obstacleClock: 0,
  obstacleClockRunning: true,
  obstacles: [pose(0, 0), pose(1, 0)],
});
const move = (
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState => {
  const cy = clamp(p.cy + vy * dt, K.PADDLE_MIN_CY, K.PADDLE_MAX_CY);
  return {
    ...p,
    cy,
    vy: dt > 0 && cy !== p.cy + vy * dt ? (cy - p.cy) / dt : vy,
  };
};
type Events = { paddle: boolean; wall: boolean; obstacle: boolean };

function paddleHit(
  b: BallState,
  p: DeepReadonly<PaddleState>,
  side: Side,
  e: Events,
): BallState {
  const x0 = side === "left" ? K.P1_X0 : K.P2_X0,
    x1 = side === "left" ? K.P1_X1 : K.P2_X1,
    y0 = p.cy - K.PADDLE_HALF,
    y1 = p.cy + K.PADDLE_HALF;
  if (!(
    b.x > x0 - K.BALL_R &&
    b.x < x1 + K.BALL_R &&
    b.y > y0 - K.BALL_R &&
    b.y < y1 + K.BALL_R
  ))
    return b;
  const ds = [
      b.x - (x0 - K.BALL_R),
      x1 + K.BALL_R - b.x,
      b.y - (y0 - K.BALL_R),
      y1 + K.BALL_R - b.y,
    ],
    f = ds.indexOf(Math.min(...ds));
  if (f < 2) {
    const speed = Math.min(Math.hypot(b.vx, b.vy) * K.SPEED_MULT, K.SPEED_CAP),
      a = clamp((b.y - p.cy) / K.PADDLE_HALF, -1, 1) * K.MAX_BOUNCE_ANGLE;
    e.paddle = true;
    return {
      ...b,
      x: side === "left" ? K.P1_X1 + K.BALL_R : K.P2_X0 - K.BALL_R,
      vx: (side === "left" ? 1 : -1) * speed * Math.cos(a),
      vy: speed * Math.sin(a),
      spin: clamp(
        b.spin + p.vy * K.SPIN_FROM_PADDLE,
        -K.SPIN_CLAMP,
        K.SPIN_CLAMP,
      ),
    };
  }
  e.wall = true;
  return {
    ...b,
    y: f === 2 ? y0 - K.BALL_R : y1 + K.BALL_R,
    vy: f === 2 ? (b.vy > 0 ? -b.vy : b.vy) : b.vy < 0 ? -b.vy : b.vy,
  };
}
function obstacleHit(
  b: BallState,
  o: DeepReadonly<ObstacleState>,
  e: Events,
): BallState {
  const c = Math.cos(o.theta),
    s = Math.sin(o.theta),
    dx = b.x - o.cx,
    dy = b.y - o.cy,
    lx = dx * c + dy * s,
    ly = -dx * s + dy * c,
    qx = clamp(lx, -K.OBSTACLE_HW, K.OBSTACLE_HW),
    qy = clamp(ly, -K.OBSTACLE_HH, K.OBSTACLE_HH),
    ox = lx - qx,
    oy = ly - qy,
    d = Math.hypot(ox, oy);
  if (d >= K.BALL_R) return b;
  let nx: number, ny: number, push: number;
  if (d > 0) {
    nx = ox / d;
    ny = oy / d;
    push = K.BALL_R - d;
  } else {
    const px = K.OBSTACLE_HW - Math.abs(lx),
      py = K.OBSTACLE_HH - Math.abs(ly);
    if (px <= py) {
      nx = lx >= 0 ? 1 : -1;
      ny = 0;
      push = K.BALL_R + px;
    } else {
      nx = 0;
      ny = ly >= 0 ? 1 : -1;
      push = K.BALL_R + py;
    }
  }
  const wx = nx * c - ny * s,
    wy = nx * s + ny * c,
    dot = b.vx * wx + b.vy * wy;
  e.obstacle ||= dot < 0;
  return {
    ...b,
    x: b.x + wx * push,
    y: b.y + wy * push,
    vx: dot < 0 ? b.vx - 2 * dot * wx : b.vx,
    vy: dot < 0 ? b.vy - 2 * dot * wy : b.vy,
  };
}
function simulate(
  source: DeepReadonly<BallState>,
  p: DeepReadonly<CaromState["paddles"]>,
  os: DeepReadonly<readonly ObstacleState[]>,
  dt: number,
): { ball: BallState; events: Events } {
  let b: BallState = { ...source, trail: source.trail.map((v) => ({ ...v })) };
  const events = { paddle: false, wall: false, obstacle: false };
  const n = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / K.MAX_SUBSTEP),
    ),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed) {
      const a = (b.spin / speed) * h,
        c = Math.cos(a),
        s = Math.sin(a),
        vx = b.vx * c - b.vy * s,
        vy = b.vx * s + b.vy * c;
      b = { ...b, vx, vy };
    }
    b = {
      ...b,
      spin: b.spin * 0.5 ** (h / K.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - K.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: K.BALL_R, vy: -b.vy };
      events.wall = true;
    } else if (b.y + K.BALL_R > K.FIELD_H && b.vy > 0) {
      b = { ...b, y: K.FIELD_H - K.BALL_R, vy: -b.vy };
      events.wall = true;
    }
    b = paddleHit(b, p.left, "left", events);
    b = paddleHit(b, p.right, "right", events);
    for (const o of os) b = obstacleHit(b, o, events);
  }
  return { ball: b, events };
}
function choose(s: CaromState): CaromState {
  if (s.screen === "title") {
    const n = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(n, "solo")
      : s.menuIndex === 1
        ? start(n, "versus")
        : { ...n, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return initial(s.muted, s.titleIndex, s.simTime);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : initial(s.muted, s.titleIndex, s.simTime);
  if (s.screen === "matchover")
    return s.menuIndex === 0
      ? start(s, s.mode)
      : initial(s.muted, s.titleIndex, s.simTime);
  return s;
}

function makeDebug(): CaromDebugApi {
  const setB = (s: RState, v: Partial<BallState>): CaromState => ({
    ...clone(s),
    ball: { ...ball(s), trail: ball(s).trail.map((p) => ({ ...p })), ...v },
  });
  const setP = (
    s: RState,
    side: Side,
    v: Partial<PaddleState>,
  ): CaromState => ({
    ...clone(s),
    paddles: { ...clone(s).paddles, [side]: { ...s.paddles[side], ...v } },
  });
  return {
    version: K.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...clone(s), ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...clone(s), ball: homeBall() }),
    spawnObstacle: (s, index) => {
      if (index !== 0 && index !== 1)
        throw new RangeError(`Carom: obstacle ${index} does not exist`);
      return {
        ...clone(s),
        obstacles: [
          ...s.obstacles
            .filter((o) => o.index !== index)
            .map((o) => ({ ...o })),
          pose(index, s.obstacleClock),
        ].sort((a, b) => a.index - b.index),
      };
    },
    reset: (s) => initial(s.muted),
    reconcile: (s) => ({
      ...clone(s),
      obstacles: s.obstacles.map((o) => pose(o.index, s.obstacleClock)),
    }),
    setScreen: (s, screen) => ({ ...clone(s), screen }),
    setMode: (s, mode) => ({ ...clone(s), mode }),
    setMenuIndex: (s, menuIndex) => ({ ...clone(s), menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...clone(s), titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...clone(s), resumeScreen }),
    setScore: (s, p1, p2) => ({ ...clone(s), score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...clone(s), winner }),
    setReceiver: (s, receiver) => ({ ...clone(s), receiver }),
    setPaddleCy: (s, v, cy) => setP(s, v, { cy }),
    setPaddleVy: (s, v, drivenVy) => setP(s, v, { drivenVy }),
    setPaddleDriven: (s, v, driven) => setP(s, v, { driven }),
    setBallPosition: (s, x, y) => setB(s, { x, y }),
    setBallVelocity: (s, vx, vy) => setB(s, { vx, vy }),
    setBallSpin: (s, spin) => setB(s, { spin }),
    setBallHeld: (s, held) => setB(s, { held }),
    setBallHoldTimer: (s, holdTimer) => setB(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => setB(s, { serveSign }),
    drawBallServeSign: (s) => setB(s, { serveSign: drawSign() }),
    setAiTracking: (s, tracking) => ({
      ...clone(s),
      ai: { ...s.ai, tracking },
    }),
    setAiMovement: (s, movement) => ({
      ...clone(s),
      ai: { ...s.ai, movement },
    }),
    setMuted: (s, muted) => ({ ...clone(s), muted }),
    setObstacleClock: (s, obstacleClock) => ({
      ...clone(s),
      obstacleClock,
      obstacles: s.obstacles.map((o) => pose(o.index, obstacleClock)),
    }),
    setObstacleClockRunning: (s, obstacleClockRunning) => ({
      ...clone(s),
      obstacleClockRunning,
    }),
    snapshot: (s) => ({
      ...clone(s),
      version: K.CAROM_DEBUG_VERSION,
      ball: s.ball
        ? {
            ...s.ball,
            trail: s.ball.trail.map((p) => ({ ...p })),
            speed: Math.hypot(s.ball.vx, s.ball.vy),
          }
        : null,
    }),
    menuItemRect: (s, index) => rect(s.screen, index),
  };
}

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>) {
    for (const action of K.ACTIONS)
      api.input.register(action, { keys: [...K.BINDINGS[action]] });
    api.audio.define(K.CUES.paddleHit, {
      wave: "square",
      freq: 280,
      freqTo: 440,
      durationMs: 55,
      gain: 0.1,
    });
    api.audio.define(K.CUES.wallBounce, {
      wave: "sine",
      freq: 180,
      freqTo: 130,
      durationMs: 45,
      gain: 0.08,
    });
    api.audio.define(K.CUES.obstacleBounce, {
      wave: "triangle",
      freq: 520,
      freqTo: 300,
      durationMs: 70,
      gain: 0.1,
    });
    api.audio.define(K.CUES.score, {
      wave: "square",
      freq: 620,
      freqTo: 920,
      durationMs: 180,
      gain: 0.1,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
    api.diagnostics.register("ball", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy).toFixed(1) : "0",
    );
    api.diagnostics.register("spin", (s) => s.ball?.spin.toFixed(1) ?? "0");
    api.diagnostics.register(
      "left",
      (s) =>
        `${s.paddles.left.cy.toFixed(1)} @ ${s.paddles.left.vy.toFixed(1)}`,
    );
    api.diagnostics.register(
      "right",
      (s) =>
        `${s.paddles.right.cy.toFixed(1)} @ ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [initial(false), makeDebug()];
  },
  update(state: RState, api: UpdateApi, dt: number): CaromState {
    let s = { ...clone(state), simTime: state.simTime + dt };
    const before = state.screen;
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    else if (s.muted !== api.audio.muted()) api.audio.setMuted(s.muted);
    s = { ...s, muted: api.audio.muted() };
    if (
      (before === "countdown" || before === "playing") &&
      api.input.pressed("pause")
    )
      s = { ...s, screen: "paused", resumeScreen: before, menuIndex: 0 };
    else if (
      before === "paused" &&
      (api.input.pressed("pause") || api.input.pressed("back"))
    )
      s = { ...s, screen: s.resumeScreen };
    else if (
      before === "howto" &&
      (api.input.pressed("confirm") || api.input.pressed("back"))
    )
      s = initial(s.muted, s.titleIndex, s.simTime);
    else if (before === "matchover" && api.input.pressed("back"))
      s = initial(s.muted, s.titleIndex, s.simTime);
    else if (
      before === "title" ||
      before === "paused" ||
      before === "matchover"
    ) {
      const up = api.input.pressed("p1-up") || api.input.pressed("p2-up"),
        down = api.input.pressed("p1-down") || api.input.pressed("p2-down"),
        n = count(before);
      if (up) s = { ...s, menuIndex: (s.menuIndex + n - 1) % n };
      else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % n };
      else if (api.input.pressed("confirm")) s = choose(s);
    }
    if (
      before === "title" ||
      before === "howto" ||
      before === "paused" ||
      before === "matchover"
    ) {
      const hit = (x: number, y: number): number => {
        for (let i = 0; i < count(before); i++) {
          const r = rect(before, i)!;
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
            return i;
        }
        return -1;
      };
      const p = api.input.pointer();
      let hover = p.device === "mouse" ? hit(p.x, p.y) : -1,
        down = -1,
        up = -1;
      for (const q of api.input.pointerSamples()) {
        const h = hit(q.x, q.y);
        if (h >= 0) hover = h;
        if (q.type === "down") down = h;
        if (q.type === "up") up = h;
      }
      if (hover >= 0) s = { ...s, menuIndex: hover };
      if (down >= 0 && down === up)
        s = choose({
          ...s,
          menuIndex: down,
          titleIndex: before === "title" ? down : s.titleIndex,
        });
    }
    if (s.screen !== "countdown" && s.screen !== "playing") return s;
    const li =
      s.mode === "solo"
        ? (api.input.value("p1-down") || api.input.value("p2-down")) -
          (api.input.value("p1-up") || api.input.value("p2-up"))
        : api.input.value("p1-down") - api.input.value("p1-up");
    const left = move(
      s.paddles.left,
      s.paddles.left.driven ? s.paddles.left.drivenVy : li * K.PADDLE_SPEED,
      dt,
    );
    let right: PaddleState;
    if (s.paddles.right.driven)
      right = move(s.paddles.right, s.paddles.right.drivenVy, dt);
    else if (s.mode === "versus")
      right = move(
        s.paddles.right,
        (api.input.value("p2-down") - api.input.value("p2-up")) *
          K.PADDLE_SPEED,
        dt,
      );
    else {
      let target = K.AI_HOME_Y,
        dz = K.AI_HOME_DEADZONE;
      if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
        target = s.ball.y - s.ball.vy * K.AI_REACT;
        dz = K.AI_DEADZONE;
      }
      const d = target - s.paddles.right.cy,
        v =
          !s.ai.movement || Math.abs(d) <= dz
            ? 0
            : Math.sign(d) *
              Math.min(K.AI_SPEED, dt ? Math.abs(d) / dt : K.AI_SPEED);
      right = move(s.paddles.right, v, dt);
    }
    s = { ...s, paddles: { left, right } };
    if (s.ball) {
      let b: BallState = {
        ...s.ball,
        trail: s.ball.trail.map((p) => ({ ...p })),
      };
      if (s.screen === "countdown") {
        const timer = b.holdTimer - dt;
        if (timer <= 0) {
          const dir = s.receiver === "left" ? -1 : 1;
          b = {
            ...b,
            held: false,
            holdTimer: 0,
            vx: dir * K.SERVE_SPEED * Math.cos(K.SERVE_ANGLE),
            vy: b.serveSign * K.SERVE_SPEED * Math.sin(K.SERVE_ANGLE),
            trail: [],
          };
          s = { ...s, screen: "playing" };
        } else b = { ...b, holdTimer: timer };
      } else if (!b.held) {
        const result = simulate(b, s.paddles, s.obstacles, dt);
        b = result.ball;
        if (result.events.paddle) api.audio.play(K.CUES.paddleHit);
        if (result.events.wall) api.audio.play(K.CUES.wallBounce);
        if (result.events.obstacle) api.audio.play(K.CUES.obstacleBounce);
        let scorer: Side | null = null;
        if (b.x - K.BALL_R > K.FIELD_W) scorer = "left";
        else if (b.x + K.BALL_R < 0) scorer = "right";
        if (scorer) {
          api.audio.play(K.CUES.score);
          const score = {
              p1: s.score.p1 + (scorer === "left" ? 1 : 0),
              p2: s.score.p2 + (scorer === "right" ? 1 : 0),
            },
            won =
              scorer === "left"
                ? score.p1 >= K.WIN_SCORE && score.p1 - score.p2 >= K.WIN_LEAD
                : score.p2 >= K.WIN_SCORE && score.p2 - score.p1 >= K.WIN_LEAD;
          s = won
            ? { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 }
            : {
                ...s,
                score,
                receiver: scorer === "left" ? "right" : "left",
                screen: "countdown",
              };
          if (!won) b = homeBall();
        }
      }
      b = {
        ...b,
        trail: [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
          (p) => p.t >= s.simTime - K.TRAIL_TIME,
        ),
      };
      s = { ...s, ball: b };
    }
    if (s.obstacleClockRunning) {
      const obstacleClock = s.obstacleClock + dt;
      s = {
        ...s,
        obstacleClock,
        obstacles: s.obstacles.map((o) => pose(o.index, obstacleClock)),
      };
    }
    return s;
  },
  render(state: RState, api: RenderApi): void {
    const c = api.ctx;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    c.strokeStyle = "rgba(90,220,255,.2)";
    c.lineWidth = 2;
    c.strokeRect(18, 18, K.FIELD_W - 36, K.FIELD_H - 36);
    c.setLineDash([12, 16]);
    c.beginPath();
    c.moveTo(K.NET_X, 34);
    c.lineTo(K.NET_X, K.FIELD_H - 34);
    c.stroke();
    c.setLineDash([]);
    const bar = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ): void => {
      c.save();
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 20;
      c.beginPath();
      c.roundRect(x, y, w, h, 9);
      c.fill();
      c.restore();
    };
    for (const o of state.obstacles) {
      c.save();
      c.translate(o.cx, o.cy);
      c.rotate(o.theta);
      bar(
        -K.OBSTACLE_W / 2,
        -K.OBSTACLE_H / 2,
        K.OBSTACLE_W,
        K.OBSTACLE_H,
        GOLD,
      );
      c.restore();
    }
    bar(
      K.P1_X0,
      state.paddles.left.cy - K.PADDLE_HALF,
      K.PADDLE_W,
      K.PADDLE_H,
      CYAN,
    );
    bar(
      K.P2_X0,
      state.paddles.right.cy - K.PADDLE_HALF,
      K.PADDLE_W,
      K.PADDLE_H,
      PINK,
    );
    if (state.ball) {
      state.ball.trail.forEach((p, i) => {
        c.globalAlpha = ((i + 1) / state.ball!.trail.length) * 0.35;
        c.fillStyle = WHITE;
        c.beginPath();
        c.arc(
          p.x,
          p.y,
          (K.BALL_R * (i + 1)) / state.ball!.trail.length,
          0,
          Math.PI * 2,
        );
        c.fill();
      });
      c.globalAlpha = 1;
      c.save();
      c.fillStyle = "#fff";
      c.shadowColor = state.ball.spin >= 0 ? PINK : CYAN;
      c.shadowBlur = 22;
      c.beginPath();
      c.arc(state.ball.x, state.ball.y, K.BALL_R, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = WHITE;
    c.font = "700 54px system-ui";
    c.fillText(String(state.score.p1), 550, 62);
    c.fillText(String(state.score.p2), 730, 62);
    c.font = "700 15px system-ui";
    c.fillStyle = "rgba(230,251,255,.65)";
    c.fillText(
      state.mode === "solo"
        ? "SOLO // HUMAN × CIRCUIT"
        : "VERSUS // LOCAL DUEL",
      640,
      108,
    );
    if (state.screen === "countdown") {
      c.font = "800 28px system-ui";
      c.fillStyle = GOLD;
      c.fillText("READY", 640, 308);
    }
    const shade = (): void => {
      c.fillStyle = "rgba(3,9,18,.9)";
      c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    };
    const menu = (items: readonly string[]): void =>
      items.forEach((label, i) => {
        const r = rect(state.screen, i)!;
        c.fillStyle =
          i === state.menuIndex
            ? "rgba(70,229,255,.18)"
            : "rgba(255,255,255,.035)";
        c.strokeStyle = i === state.menuIndex ? CYAN : "rgba(230,251,255,.2)";
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(r.x, r.y, r.w, r.h, 12);
        c.fill();
        c.stroke();
        c.fillStyle = i === state.menuIndex ? "#fff" : "rgba(230,251,255,.72)";
        c.font = "700 20px system-ui";
        c.fillText(label, 640, r.y + r.h / 2);
      });
    if (state.screen === "title") {
      shade();
      c.font = "900 112px system-ui";
      c.fillStyle = WHITE;
      c.shadowColor = CYAN;
      c.shadowBlur = 28;
      c.fillText(K.TITLE_TEXT, 640, 210);
      c.shadowBlur = 0;
      c.font = "600 18px system-ui";
      c.fillStyle = GOLD;
      c.fillText("BANK THE ANGLE. BEND THE RALLY.", 640, 292);
      menu(K.TITLE_ITEMS);
    } else if (state.screen === "howto") {
      shade();
      c.font = "900 54px system-ui";
      c.fillStyle = WHITE;
      c.fillText("HOW TO PLAY", 640, 92);
      c.font = "600 21px system-ui";
      c.fillStyle = CYAN;
      c.fillText("SOLO  W/S or ↑/↓     •     VERSUS  W/S  +  ↑/↓", 640, 175);
      c.fillStyle = "rgba(230,251,255,.82)";
      c.font = "500 19px system-ui";
      [
        "Move through contact to load the ball with spin.",
        "Spin curves every flight, then fades — time your return.",
        "Use the rotating gold bars for sharp bank shots.",
        "First to 11, win by 2.  P / ESC pauses.  M mutes.",
      ].forEach((t, i) => c.fillText(t, 640, 265 + i * 48));
      menu(["BACK TO MENU"]);
    } else if (state.screen === "paused") {
      shade();
      c.font = "900 64px system-ui";
      c.fillStyle = WHITE;
      c.fillText("PAUSED", 640, 230);
      menu(K.PAUSE_ITEMS);
    } else if (state.screen === "matchover") {
      shade();
      c.font = "900 60px system-ui";
      c.fillStyle = state.winner === "left" ? CYAN : PINK;
      c.fillText(
        state.winner === "left" ? "LEFT SIDE WINS" : "RIGHT SIDE WINS",
        640,
        205,
      );
      c.font = "800 35px system-ui";
      c.fillStyle = WHITE;
      c.fillText(`${state.score.p1}  —  ${state.score.p2}`, 640, 285);
      menu(K.MATCHOVER_ITEMS);
    }
    if (state.muted) {
      c.textAlign = "right";
      c.font = "700 14px system-ui";
      c.fillStyle = "rgba(230,251,255,.55)";
      c.fillText("MUTED", 1252, 28);
    }
  },
};

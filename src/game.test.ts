import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import { FIELD_H, FIELD_W, HOLD_TIME, SERVE_SPEED } from "./constants";
import { game } from "./game";

function harness(step = 10) {
  const canvas = createCanvas(FIELD_W, FIELD_H);
  return createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: FIELD_W,
    height: FIELD_H,
    game,
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => FIELD_W,
      cssHeight: () => FIELD_H,
      dpr: () => 1,
      events: () => new EventTarget(),
    },
  });
}

describe("Carom simulation", () => {
  it("initializes the complete title world and debug surface", async () => {
    const engine = harness();
    await engine.initialize();
    const shot = engine.debug.snapshot(engine.state);
    expect(shot.screen).toBe("title");
    expect(shot.ball?.held).toBe(true);
    expect(shot.obstacles).toHaveLength(2);
    expect(engine.debug.menuItemRect(engine.state, 2)).not.toBeNull();
  });

  it("serves toward the receiver when the hold elapses", async () => {
    const engine = harness(10);
    await engine.initialize();
    engine.apply((s) => engine.debug.setScreen(s, "countdown"));
    engine.apply((s) => engine.debug.setBallHoldTimer(s, HOLD_TIME));
    await engine.advance(101);
    const shot = engine.debug.snapshot(engine.state);
    expect(shot.screen).toBe("playing");
    expect(shot.ball?.held).toBe(false);
    expect(shot.ball?.vx).toBeLessThan(0);
    expect(shot.ball?.speed).toBeCloseTo(SERVE_SPEED, 5);
  });

  it("poses entities immutably and fails loudly without a ball", async () => {
    const engine = harness();
    await engine.initialize();
    const old = engine.state;
    engine.apply((s) => engine.debug.setPaddleCy(s, "left", 123));
    expect(old.paddles.left.cy).not.toBe(123);
    engine.apply((s) => engine.debug.clearWorld(s));
    expect(() => engine.debug.setBallSpin(engine.state, 10)).toThrow(/no ball/);
  });
});

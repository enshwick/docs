import { describe, expect, it } from 'vitest';

import { FogClock } from '../fog-clock.ts';
import { FogGate, FogMode } from '../fog-gate.ts';

describe('FogGate', () => {
  it('draws the fog with the shader only where WebGL runs and motion is welcome', () => {
    expect(new FogGate({ webgl: true, reducedMotion: false }).mode).toBe(FogMode.Shader);
  });

  it('keeps the still drawn fog without WebGL', () => {
    expect(new FogGate({ webgl: false, reducedMotion: false }).mode).toBe(FogMode.Drawn);
  });

  it('keeps the still drawn fog when the reader asks for less motion, WebGL or not', () => {
    expect(new FogGate({ webgl: true, reducedMotion: true }).mode).toBe(FogMode.Drawn);
    expect(new FogGate({ webgl: false, reducedMotion: true }).mode).toBe(FogMode.Drawn);
  });

  it('runs only while the tab is shown and the hero is on screen', () => {
    const gate = new FogGate({ webgl: true, reducedMotion: false });

    expect(gate.runs({ pageVisible: true, onScreen: true })).toBe(true);
    expect(gate.runs({ pageVisible: false, onScreen: true })).toBe(false);
    expect(gate.runs({ pageVisible: true, onScreen: false })).toBe(false);
    expect(gate.runs({ pageVisible: false, onScreen: false })).toBe(false);
  });

  it('never asks for frames under reduced motion, wherever the hero is', () => {
    const gate = new FogGate({ webgl: true, reducedMotion: true });

    expect(gate.runs({ pageVisible: true, onScreen: true })).toBe(false);
  });
});

describe('FogClock', () => {
  it('lets at most 30 frames a second through', () => {
    const clock = new FogClock();
    const frames = Array.from({ length: 60 }, (_, index) => index * (1000 / 60));
    const drawn = frames.filter((now) => clock.due(now));

    expect(drawn.length).toBeLessThanOrEqual(30);
    expect(drawn.length).toBeGreaterThanOrEqual(29);
  });

  it('draws the first frame at once', () => {
    expect(new FogClock().due(0)).toBe(true);
  });

  it('counts time only while running, so a pause does not end in a jump', () => {
    const clock = new FogClock();

    clock.due(0);
    clock.due(100);
    clock.pause(100);
    clock.resume(10_000);

    expect(clock.elapsed(10_050)).toBeCloseTo(150);
  });
});

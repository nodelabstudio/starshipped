"use client";

import { useSyncExternalStore } from "react";

// Synthesized UI audio, off by default. The enabled flag is a tiny external
// store in the use-now.ts style: getSnapshot returns the cached module-level
// value (never a fresh computation), which only moves inside toggleSound.
const STORAGE_KEY = "starshipped:sound";

let enabled =
  typeof window !== "undefined" &&
  localStorage.getItem(STORAGE_KEY) === "on";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

// serverSnapshot is false: SSR always renders the off state.
export function useSoundEnabled() {
  return useSyncExternalStore(subscribe, () => enabled, () => false);
}

export function toggleSound() {
  enabled = !enabled;
  localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  for (const listener of listeners) listener();
}

// One AudioContext for the whole app, created lazily on first actual play.
// Sound only turns on via the toggle button, so by the time a cue fires a
// user gesture has occurred and the context is allowed to run.
let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Short oscillator tick for UI hover (~80ms, exponential decay).
export function blip() {
  if (!enabled) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1100, t);
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.09);
}

// Rising filtered sweep for hyperspace jumps (~450ms).
export function whoosh() {
  if (!enabled) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.4);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  osc.connect(filter).connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

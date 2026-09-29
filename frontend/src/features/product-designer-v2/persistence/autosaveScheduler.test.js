import test from "node:test";
import assert from "node:assert/strict";
import { createAutosaveScheduler } from "./autosaveScheduler.js";

test("autosave debounce guarda sólo el último documento y flush es inmediato", async () => {
  const calls = [];
  const timers = new Map();
  let timerId = 0;
  const scheduler = createAutosaveScheduler(async (value) => calls.push(value), {
    setTimer: (callback) => { timerId += 1; timers.set(timerId, callback); return timerId; },
    clearTimer: (id) => timers.delete(id),
  });
  scheduler.schedule("a");
  scheduler.schedule("ab");
  assert.equal(timers.size, 1);
  [...timers.values()][0]();
  await Promise.resolve();
  assert.deepEqual(calls, ["ab"]);
  await scheduler.flush("ahora");
  assert.deepEqual(calls, ["ab", "ahora"]);
});


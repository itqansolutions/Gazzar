import assert from "node:assert/strict";
import test from "node:test";
import { resolveFormat, timerPhaseAt, describeFormat, buildTemplateName, defaultFormatParams, beepsBetween } from "../src/lib/block-formats.ts";

test("Tabata alternates work/rest and finishes after rounds*(work+rest)", () => {
  const b = { type: "TABATA", rounds: 8, workSeconds: 20, restSeconds: 10 };
  assert.equal(resolveFormat(b).totalSeconds, 240);
  assert.deepEqual(timerPhaseAt(b, 0), { label: "work", round: 1, secondsLeft: 20, phaseSeconds: 20, done: false });
  assert.equal(timerPhaseAt(b, 20).label, "rest");
  assert.equal(timerPhaseAt(b, 30).round, 2);
  assert.equal(timerPhaseAt(b, 239).round, 8);
  assert.equal(timerPhaseAt(b, 240).done, true);
});

test("EMOM starts a new round every interval", () => {
  const b = { type: "EMOM", rounds: 10, intervalSeconds: 60 };
  assert.equal(timerPhaseAt(b, 59).round, 1);
  assert.equal(timerPhaseAt(b, 60).round, 2);
  assert.equal(timerPhaseAt(b, 600).done, true);
  assert.equal(describeFormat(b), "EMOM 10 x 60s");
});

test("AMRAP counts down to the time cap; For Time without cap counts up", () => {
  assert.equal(timerPhaseAt({ type: "AMRAP", durationSeconds: 600 }, 100).secondsLeft, 500);
  assert.equal(timerPhaseAt({ type: "AMRAP", durationSeconds: 600 }, 600).done, true);
  assert.equal(timerPhaseAt({ type: "FOR_TIME" }, 75).secondsLeft, 75);
  assert.equal(timerPhaseAt({ type: "FOR_TIME" }, 75).done, false);
  assert.equal(describeFormat({ type: "AMRAP", durationSeconds: 600 }), "AMRAP 10 min");
});

test("defaults, naming and beeps", () => {
  assert.equal(defaultFormatParams("TABATA").workSeconds, 20);
  assert.equal(buildTemplateName(" Ahmed ", "Day 2", "Strength"), "Ahmed - Day 2 - Strength");
  assert.equal(buildTemplateName("", "Day 2", ""), "Day 2");
  assert.ok(beepsBetween({ type: "TABATA", rounds: 8, workSeconds: 20, restSeconds: 10 }, 19, 20) >= 1);
  assert.equal(beepsBetween({ type: "AMRAP", durationSeconds: 10 }, 9, 10), 3);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createReverseState, reverseSeconds, startReverse, pauseReverse,
  beginReverseEntry, saveReverseEntry, clearReverseSession, reverseTotalSeconds,
} from './reverse-tracking.js';

const existingRecord = () => ({ id: 'old', description: '이전 작업', durationSeconds: 30, startedAt: 1_000, endedAt: 31_000, savedAt: 40_000 });

test('defaults need neither a planned task nor a Pomodoro and preserve saved fields', () => {
  const saved = { elapsed: 7, draft: '작성 중인 작업', records: [existingRecord()], custom: { kept: true } };
  const before = structuredClone(saved);
  const reverse = createReverseState(saved);
  assert.equal(reverse.elapsed, 7);
  assert.equal(reverse.draft, '작성 중인 작업');
  assert.equal(reverse.started, null);
  assert.equal(reverse.entryOpen, false);
  assert.deepEqual(reverse.records, saved.records);
  assert.deepEqual(reverse.custom, saved.custom);
  assert.deepEqual(saved, before);
  const fresh = createReverseState();
  assert.deepEqual(fresh.records, []);
  assert.equal(reverseTotalSeconds(fresh, 100), 0);
  for (const key of ['active', 'courses', 'pomo', 'clockMode']) assert.equal(Object.hasOwn(fresh, key), false);
});

test('elapsed time excludes pause gaps and repeated pause preserves the work end time', () => {
  const reverse = createReverseState();
  startReverse(reverse, 1_000);
  assert.equal(reverseSeconds(reverse, 4_500), 3.5);
  pauseReverse(reverse, 5_000);
  assert.equal(reverse.elapsed, 4);
  pauseReverse(reverse, 8_000);
  assert.equal(reverse.endedAt, 5_000);
  assert.equal(reverseSeconds(reverse, 10_000), 4);
  startReverse(reverse, 11_000);
  assert.equal(reverse.sessionStartedAt, 1_000);
  assert.equal(reverse.endedAt, null);
  assert.equal(reverseSeconds(reverse, 14_000), 7);
  beginReverseEntry(reverse, 15_000);
  assert.equal(reverse.elapsed, 8);
  assert.equal(reverse.started, null);
  assert.equal(reverse.endedAt, 15_000);
  assert.equal(reverse.entryOpen, true);
});

test('zero timestamp is valid and repeated start never resets a running counter', () => {
  const reverse = createReverseState();
  startReverse(reverse, 0);
  startReverse(reverse, 4_000);
  assert.equal(reverse.started, 0);
  assert.equal(reverse.sessionStartedAt, 0);
  assert.equal(reverseSeconds(reverse, 10_000), 10);
});

test('save trims text, keeps the measured end time, and does not double-count history', () => {
  const historical = Object.freeze(existingRecord());
  const history = Object.freeze([historical]);
  const reverse = createReverseState({ records: history });
  const previousCollection = reverse.records;
  startReverse(reverse, 50_000);
  beginReverseEntry(reverse, 65_000);
  reverse.draft = '  회의 자료 정리\n ';
  assert.equal(reverseTotalSeconds(reverse, 70_000), 45);
  const record = saveReverseEntry(reverse, 'new', 90_000);
  assert.deepEqual(record, {
    id: 'new', description: '회의 자료 정리', durationSeconds: 15,
    startedAt: 50_000, endedAt: 65_000, savedAt: 90_000,
  });
  assert.equal(reverse.records[0], record);
  assert.equal(reverse.records[1], historical);
  assert.deepEqual(previousCollection, [historical]);
  assert.deepEqual(history, [historical]);
  assert.equal(reverseTotalSeconds(reverse, 150_000), 45);
  assert.equal(reverse.elapsed, 0);
  assert.equal(reverse.started, null);
  assert.equal(reverse.sessionStartedAt, null);
  assert.equal(reverse.endedAt, null);
  assert.equal(reverse.draft, '');
  assert.equal(reverse.entryOpen, false);
});

test('blank descriptions reject saving without losing duration, draft, or earlier records', () => {
  const reverse = createReverseState({ records: [existingRecord()] });
  startReverse(reverse, 1_000);
  beginReverseEntry(reverse, 11_000);
  reverse.draft = ' \n\t ';
  const before = structuredClone(reverse);
  assert.throws(() => saveReverseEntry(reverse, 'no-record', 50_000), /어떤 작업을 했는지 입력/);
  assert.deepEqual(reverse, before);
  reverse.draft = '나중에 적은 내용';
  saveReverseEntry(reverse, 'valid-record', 60_000);
  assert.equal(reverse.records[0].durationSeconds, 10);
  assert.equal(reverse.records[0].endedAt, 11_000);
});

test('save freezes an actively running counter before validating text', () => {
  const reverse = createReverseState({ draft: ' ' });
  startReverse(reverse, 1_000);
  assert.throws(() => saveReverseEntry(reverse, 'invalid', 4_000), /입력/);
  assert.equal(reverse.elapsed, 3);
  assert.equal(reverse.started, null);
  assert.equal(reverse.endedAt, 4_000);
  assert.equal(reverse.records.length, 0);
});

test('unstarted and subsecond measurements cannot create entries', () => {
  const reverse = createReverseState({ draft: '짧은 작업' });
  assert.throws(() => beginReverseEntry(reverse, 100), /1초 이상/);
  assert.throws(() => saveReverseEntry(reverse, 'zero', 100), /1초 이상/);
  startReverse(reverse, 1_000);
  assert.throws(() => beginReverseEntry(reverse, 1_500), /1초 이상/);
  assert.equal(reverse.elapsed, .5);
  assert.equal(reverse.records.length, 0);
  assert.equal(reverse.draft, '짧은 작업');
  startReverse(reverse, 2_000);
  beginReverseEntry(reverse, 2_500);
  saveReverseEntry(reverse, 'one-second', 3_000);
  assert.equal(reverse.records[0].durationSeconds, 1);
});

test('a paused input draft survives JSON persistence and later resume', () => {
  const reverse = createReverseState();
  startReverse(reverse, 1_000);
  beginReverseEntry(reverse, 6_000);
  reverse.draft = '작성하다 잠시 멈춤';
  const restored = createReverseState(JSON.parse(JSON.stringify(reverse)));
  assert.deepEqual(restored, reverse);
  assert.equal(reverseSeconds(restored, 900_000), 5);
  startReverse(restored, 1_000_000);
  assert.equal(restored.entryOpen, false);
  assert.equal(restored.draft, reverse.draft);
  pauseReverse(restored, 1_004_000);
  assert.equal(restored.elapsed, 9);
  assert.equal(restored.sessionStartedAt, 1_000);
});

test('running JSON persistence retains its timestamp without a lifecycle restart', () => {
  const reverse = createReverseState();
  startReverse(reverse, 10_000);
  const restored = createReverseState(JSON.parse(JSON.stringify(reverse)));
  assert.equal(reverseSeconds(restored, 40_000), 30);
  pauseReverse(restored, 40_000);
  assert.equal(restored.elapsed, 30);
});

test('pausing for a mode switch preserves unsaved data and leaves other counters untouched', () => {
  const app = {
    task: { elapsed: 13, started: null, done: false },
    pomo: { elapsed: 25, rounds: 2, totalFocusSeconds: 75 },
    reverse: createReverseState({ draft: '역추적 중' }),
  };
  const independent = structuredClone({ task: app.task, pomo: app.pomo });
  startReverse(app.reverse, 1_000);
  pauseReverse(app.reverse, 9_000);
  const persisted = JSON.parse(JSON.stringify(app));
  const restored = createReverseState(persisted.reverse);
  assert.equal(restored.elapsed, 8);
  assert.equal(restored.draft, '역추적 중');
  assert.equal(restored.started, null);
  assert.deepEqual({ task: app.task, pomo: app.pomo }, independent);
  assert.deepEqual({ task: persisted.task, pomo: persisted.pomo }, independent);
});

test('reset clears only the current measurement and draft, never saved history', () => {
  const reverse = createReverseState({ records: [existingRecord()], custom: 'preserve' });
  const history = reverse.records;
  startReverse(reverse, 1_000);
  reverse.draft = '버릴 초안';reverse.entryOpen = true;reverse.error = '이전 오류';
  clearReverseSession(reverse);
  assert.equal(reverse.records, history);
  assert.deepEqual(reverse.records, [existingRecord()]);
  assert.equal(reverseTotalSeconds(reverse, 90_000), 30);
  assert.equal(reverse.custom, 'preserve');
  assert.equal(reverse.error, '');
  assert.equal(reverse.draft, '');
  assert.equal(reverse.entryOpen, false);
});

test('clock moving backwards cannot subtract already measured work', () => {
  const reverse = createReverseState({ elapsed: 7 });
  startReverse(reverse, 20_000);
  assert.equal(reverseSeconds(reverse, 10_000), 7);
  pauseReverse(reverse, 10_000);
  assert.equal(reverse.elapsed, 7);
});

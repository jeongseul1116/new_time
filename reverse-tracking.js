// Independent, wall-clock-backed time tracking. All mutations are confined to the
// supplied reverse state; planned tasks and Pomodoro counters are never consulted.
const nonnegative = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const hasTimestamp = value => Number.isFinite(value);

export function createReverseState(existing) {
  const saved = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
  return {
    elapsed: 0,
    started: null,
    sessionStartedAt: null,
    endedAt: null,
    draft: '',
    entryOpen: false,
    error: '',
    ...saved,
    records: Array.isArray(saved.records) ? [...saved.records] : [],
  };
}

export function reverseSeconds(reverse, now = Date.now()) {
  const elapsed = nonnegative(reverse.elapsed);
  return elapsed + (hasTimestamp(reverse.started) ? Math.max(0, (now - reverse.started) / 1000) : 0);
}

export function startReverse(reverse, now = Date.now()) {
  if (!hasTimestamp(reverse.started)) {
    if (!hasTimestamp(reverse.sessionStartedAt)) reverse.sessionStartedAt = now;
    reverse.started = now;
  }
  reverse.endedAt = null;
  reverse.entryOpen = false;
  reverse.error = '';
  return reverse;
}

export function pauseReverse(reverse, now = Date.now()) {
  if (hasTimestamp(reverse.started)) {
    reverse.elapsed = reverseSeconds(reverse, now);
    reverse.endedAt = now;
  }
  // Repeated pauses must not move the actual work end time to the later moment
  // when the user describes or saves the work.
  reverse.started = null;
  return reverse;
}

export function beginReverseEntry(reverse, now = Date.now()) {
  pauseReverse(reverse, now);
  if (reverseSeconds(reverse, now) < 1) throw new Error('1초 이상 측정한 뒤 기록해 주세요.');
  reverse.entryOpen = true;
  reverse.error = '';
  return reverse;
}

export function saveReverseEntry(reverse, id, now = Date.now()) {
  pauseReverse(reverse, now);
  const durationSeconds = reverseSeconds(reverse, now);
  if (durationSeconds < 1) throw new Error('1초 이상 측정한 뒤 기록해 주세요.');
  const description = String(reverse.draft ?? '').trim();
  if (!description) throw new Error('어떤 작업을 했는지 입력해 주세요.');
  const endedAt = hasTimestamp(reverse.endedAt) ? reverse.endedAt : now;
  const record = {
    id,
    description,
    durationSeconds,
    startedAt: hasTimestamp(reverse.sessionStartedAt) ? reverse.sessionStartedAt : endedAt - durationSeconds * 1000,
    endedAt,
    savedAt: now,
  };
  // Replace the collection instead of mutating an existing history reference.
  reverse.records = [record, ...reverse.records];
  clearReverseSession(reverse);
  return record;
}

export function clearReverseSession(reverse) {
  reverse.elapsed = 0;
  reverse.started = null;
  reverse.sessionStartedAt = null;
  reverse.endedAt = null;
  reverse.draft = '';
  reverse.entryOpen = false;
  reverse.error = '';
  return reverse;
}

export function reverseTotalSeconds(reverse, now = Date.now()) {
  return reverse.records.reduce((sum, record) => sum + nonnegative(record.durationSeconds), 0) + reverseSeconds(reverse, now);
}

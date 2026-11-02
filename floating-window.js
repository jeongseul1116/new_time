// The compact clock has its own layout; it does not inherit the planner's CSS.
const styles = `
:root {
  color-scheme: dark;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Noto Sans KR", sans-serif;
  color: #f5f5f7;
  background: #101012;
  --accent: #ff9f0a;
  --muted: #98989f;
}
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; height: 100dvh; }
button, input { font: inherit; }
button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
button { border: 0; }
[hidden] { display: none !important; }
.clock-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  grid-template-rows: 28px minmax(0, 1fr);
  column-gap: 32px;
  row-gap: 20px;
}
.time-heading { display: flex; align-items: center; justify-content: space-between; min-width: 0; }
.time-heading h1 { margin: 0; color: var(--accent); font-size: 13px; line-height: 20px; font-weight: 500; }
.heading-tools { display: flex; align-items: center; gap: 8px; }
.view-switch { display: grid; grid-template-columns: repeat(2, 24px); padding: 2px; background: #28282b; border-radius: 7px; }
.view-switch button { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border-radius: 5px; background: transparent; color: var(--muted); font-size: 10px; }
.view-switch button[aria-pressed="true"] { color: var(--accent); background: #4a4a4d; }
.view-switch button:disabled { opacity: .35; cursor: default; }
.settings-toggle {
  padding: 4px; width: 28px; height: 28px; display: grid; place-items: center;
  color: var(--muted); background: transparent; border-radius: 7px;
}
.settings-toggle:hover { background: #28282b; color: #fff; }
.pomo-tabs {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 2px; margin: 0; border-radius: 8px; background: #28282b;
}
.pomo-tabs button {
  min-width: 0; padding: 0 8px; border-radius: 6px; background: transparent;
  color: var(--muted); font-size: 10px; line-height: 24px; font-weight: 500; white-space: nowrap;
}
.pomo-tabs .selected { background: #4a4a4d; color: var(--accent); box-shadow: 0 1px 3px #0004; }
.readout { min-width: 0; display: flex; flex-direction: column; align-items: stretch; }
.time-accent { width: 24px; height: 3px; border-radius: 2px; background: var(--accent); flex-shrink: 0; }
#mini-timer {
  margin-top: 9px; color: #f5f5f7; font-size: 58px; line-height: 64px;
  letter-spacing: -2.5px; font-weight: 200; font-variant-numeric: tabular-nums;
  white-space: nowrap; text-align: left;
}
body[data-long-time="true"] #mini-timer { font-size: 46px; letter-spacing: -2px; }
#mini-timer-state { margin-top: 7px; font-size: 10px; line-height: 14px; color: var(--muted); }
.pomo-track { margin-top: auto; height: 2px; background: #303033; border-radius: 2px; flex-shrink: 0; overflow: hidden; }
#mini-pomo-progress { height: 100%; background: var(--accent); }
.timer-dial { display: none; }
body[data-timer-view="circle"] .readout { position: relative; align-items: center; justify-content: center; }
body[data-timer-view="circle"] .timer-dial { display: block; position: absolute; inset: 0; width: 114px; height: 114px; margin: auto; }
.timer-dial .dial-track { fill: #303033; }
.timer-dial .dial-remaining { fill: var(--accent); }
body[data-timer-view="circle"] .time-accent, body[data-timer-view="circle"] .pomo-track { display: none; }
body[data-timer-view="circle"] #mini-timer { display: none; }
body[data-timer-view="circle"][data-long-time="true"] #mini-timer { font-size: 22px; }
body[data-timer-view="circle"] #mini-timer-state { display: none; }
.task-panel { min-width: 0; display: grid; grid-template-rows: 18px 52px 12px; row-gap: 16px; }
#mini-focus-name {
  margin: 0; font-size: 12px; line-height: 18px; font-weight: 400; color: #c5c5cb;
  text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.actions { display: flex; align-items: center; justify-content: space-between; }
.actions button {
  width: 52px; height: 52px; padding: 0; border-radius: 50%; flex-shrink: 0;
  color: #d1d1d6; background: #2c2c2f; font-size: 10px; line-height: 16px;
  box-shadow: inset 0 0 0 1px #ffffff04;
}
.actions button:hover { filter: brightness(1.2); }
.actions .primary { background: #102d19; color: #4bd56e; }
.actions .primary.running { background: #38260d; color: #ffb340; }
#mini-pomo-count { margin: 0; font-size: 9px; line-height: 12px; text-align: center; color: var(--muted); }
.settings-panel {
  position: absolute; z-index: 2; top: 58px; left: 24px; width: 176px; padding: 14px;
  border: 1px solid #49494c; border-radius: 12px; background: #242426;
  box-shadow: 0 8px 24px #0008;
}
.settings-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.settings-heading strong { font-size: 11px; font-weight: 500; }
.settings-heading button { padding: 0; background: none; color: var(--accent); font-size: 11px; }
.settings-panel label { display: flex; align-items: center; gap: 8px; margin-top: 10px; color: #b4b4ba; font-size: 11px; }
.settings-panel label span { flex: 1; }
.settings-panel input { min-width: 0; width: 50px; padding: 4px; background: #333336; color: #fff; border: 1px solid #505054; border-radius: 5px; text-align: center; font-size: 12px; }
@media (max-width: 459px) {
  body { padding: 20px; }
  .clock-layout { grid-template-columns: 40% minmax(0, 1fr); column-gap: 24px; }
  #mini-timer { font-size: 50px; }
  .actions button { width: 44px; height: 44px; }
  .settings-panel { left: 20px; }
}
`;

const markup = `
<main class="clock-layout" aria-label="작은 시계">
  <div class="time-heading">
    <h1>타이머</h1>
    <div class="heading-tools">
      <div class="view-switch" role="group" aria-label="타이머 표시 방식">
        <button id="mini-view-numeric" aria-label="숫자 보기" title="숫자 보기" aria-pressed="true">12</button>
        <button id="mini-view-circle" aria-label="원형 보기" title="원형 보기" aria-pressed="false"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" opacity=".3"/><path d="M8 8V2.5A5.5 5.5 0 0 1 13.5 8Z" fill="currentColor"/></svg></button>
      </div>
    <button class="settings-toggle" id="mini-settings-toggle" aria-label="시간 설정" aria-expanded="false" aria-controls="mini-settings">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m10 3 4 0 .6 2.5 2 .9 2.3-.8 2 3.5-1.8 1.7v2.4l1.8 1.7-2 3.5-2.3-.8-2 .9L14 21h-4l-.6-2.5-2-.9-2.3.8-2-3.5 1.8-1.7v-2.4L3.1 9.1l2-3.5 2.3.8 2-.9Z"/></svg>
    </button>
    </div>
  </div>
  <div class="pomo-tabs" role="group" aria-label="집중 또는 휴식">
    <button id="mini-pomo-focus">집중</button>
    <button id="mini-pomo-break">휴식</button>
  </div>
  <section class="readout" aria-label="남은 시간">
    <svg class="timer-dial" viewBox="0 0 114 114" aria-hidden="true"><circle class="dial-track" cx="57" cy="57" r="53"/><path class="dial-remaining" id="mini-dial-remaining"/></svg>
    <div class="time-accent" aria-hidden="true"></div>
    <span id="mini-timer"></span>
    <small id="mini-timer-state"></small>
    <div class="pomo-track" aria-hidden="true"><div id="mini-pomo-progress"></div></div>
  </section>
  <section class="task-panel" aria-label="현재 작업">
    <h2 id="mini-focus-name"></h2>
    <p id="mini-focus-course" hidden></p>
    <div class="actions">
      <button id="mini-reset">재설정</button>
      <button id="mini-toggle" class="primary">시작</button>
      <button id="mini-complete">완료</button>
    </div>
    <p id="mini-pomo-count"></p>
  </section>
</main>
<section class="settings-panel" id="mini-settings" aria-label="포모도로 시간 설정" hidden>
  <div class="settings-heading"><strong>시간 설정</strong><button id="mini-settings-done">완료</button></div>
  <label><span>집중</span><input id="mini-focus-minutes" type="number" min="1" max="180" aria-label="집중 시간"> 분</label>
  <label><span>휴식</span><input id="mini-break-minutes" type="number" min="1" max="180" aria-label="휴식 시간"> 분</label>
</section>`;

export function createFloatingClock(doc, { onAction, onDurationChange, onViewChange }) {
  doc.documentElement.lang = 'ko';
  doc.head.innerHTML = '<meta name="viewport" content="width=device-width,initial-scale=1"><title>차곡 · 시계</title>';
  const style = doc.createElement('style');
  style.textContent = styles;
  doc.head.append(style);
  doc.body.innerHTML = markup;

  const panel = doc.getElementById('mini-settings');
  const trigger = doc.getElementById('mini-settings-toggle');
  const setSettingsOpen = open => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (!open) trigger.focus();
  };
  trigger.onclick = () => setSettingsOpen(panel.hidden);
  doc.getElementById('mini-settings-done').onclick = () => setSettingsOpen(false);
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setSettingsOpen(false);
  });
  doc.addEventListener('click', event => {
    if (!panel.hidden && !panel.contains(event.target) && !trigger.contains(event.target)) setSettingsOpen(false);
  });
  for (const id of ['toggle', 'reset', 'complete', 'pomo-focus', 'pomo-break']) {
    doc.getElementById('mini-' + id).onclick = () => onAction(id);
  }
  for (const view of ['numeric', 'circle']) {
    doc.getElementById('mini-view-' + view).onclick = () => onViewChange(view);
  }
  for (const id of ['focus-minutes', 'break-minutes']) {
    doc.getElementById('mini-' + id).onchange = event => onDurationChange(id, event.target.value);
  }
}

// A true filled sector, measured clockwise from twelve o'clock.
export function remainingSectorPath(fraction, center, radius) {
  const portion = Math.max(0, Math.min(1, fraction));
  if (portion === 0) return '';
  const top = center - radius;
  if (portion === 1) {
    return `M ${center} ${top} A ${radius} ${radius} 0 1 1 ${center} ${center + radius} A ${radius} ${radius} 0 1 1 ${center} ${top} Z`;
  }
  const angle = -Math.PI / 2 + portion * Math.PI * 2;
  const x = center + radius * Math.cos(angle);
  const y = center + radius * Math.sin(angle);
  return `M ${center} ${center} L ${center} ${top} A ${radius} ${radius} 0 ${portion > .5 ? 1 : 0} 1 ${x} ${y} Z`;
}

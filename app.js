import { createFloatingClock, updateRemainingRing } from './floating-window.js';

const $=s=>document.querySelector(s);
let clockMode="pomodoro",floatingWindow=null;
const uid=()=>crypto.randomUUID();
const seed=()=>({courses:[{id:uid(),name:'나만의 사이드 프로젝트',tasks:[{id:uid(),name:'아이디어 정리하기',minutes:30,elapsed:0,done:false,children:[]},{id:uid(),name:'서비스 화면 설계하기',minutes:90,elapsed:0,done:false,children:[{id:uid(),name:'레퍼런스 찾아보기',minutes:20,elapsed:0,done:false,children:[]},{id:uid(),name:'와이어프레임 그리기',minutes:40,elapsed:0,done:false,children:[]},{id:uid(),name:'디자인 다듬기',minutes:30,elapsed:0,done:false,children:[]}]},{id:uid(),name:'오늘의 작업 회고',minutes:15,elapsed:0,done:false,children:[]}]},{id:uid(),name:'나를 위한 작은 루틴',tasks:[{id:uid(),name:'책 읽고 생각 기록하기',minutes:20,elapsed:0,done:false,children:[]}]}],active:null,started:null});
let state;try{state=JSON.parse(localStorage.getItem('chagok-v1'))}catch{}if(!state?.courses)state=seed();
state.timerView = state.timerView === "circle" ? "circle" : "numeric";
state.pomo ||= {phase:'focus',elapsed:0,started:null,rounds:0};
state.pomo.focusMinutes ||= 25;state.pomo.breakMinutes ||= 5;
const pomoDuration=()=>60*(state.pomo.phase==='focus'?state.pomo.focusMinutes:state.pomo.breakMinutes);
const pomoSeconds=()=>state.pomo.elapsed+(state.pomo.started?Math.max(0,(Date.now()-state.pomo.started)/1000):0);
const all=()=>state.courses.flatMap(c=>c.tasks.flatMap(t=>[t,...t.children]));
const leaves=()=>state.courses.flatMap(c=>c.tasks.flatMap(t=>t.children.length?t.children:[t]));
const find=id=>all().find(t=>t.id===id);
const active=()=>find(state.active);
const seconds=t=>t.elapsed+(state.active===t.id&&state.started?Math.max(0,(Date.now()-state.started)/1000):0);
const save=()=>{try{localStorage.setItem('chagok-v1',JSON.stringify(state))}catch{toast('저장 공간이 부족해 기록을 저장하지 못했습니다.')}};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=s=>{s=Math.floor(s);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')};
let toastTimeout;function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('show'),2600)}
function pause(){if(state.pomo.started){state.pomo.elapsed=pomoSeconds();state.pomo.started=null;}if(active()&&state.started)active().elapsed=seconds(active());state.started=null;save()}
function select(id){const t=find(id);if(t.children.length){toast('세부 작업을 선택해 주세요.');return}if(t.done){toast('완료 체크를 해제하면 다시 집중할 수 있어요.');return}pause();state.active=id;state.started=Date.now();if(clockMode==='pomodoro'){if(state.pomo.phase!=='focus'){state.pomo.phase='focus';state.pomo.elapsed=0}state.pomo.started=Date.now()}save();render()}
function complete(id){const t=find(id);if(t.children.length){const done=!t.children.every(x=>x.done);if(t.children.some(x=>x.id===state.active))pause();t.children.forEach(x=>x.done=done);t.done=done}else{if(state.active===id)pause();t.done=!t.done}save();render()}
function taskHTML(t,child=false){const done=t.children.length?t.children.every(x=>x.done):t.done;return `<div class="task ${child?'child':''} ${done?'done':''} ${state.active===t.id?'active':''}" data-id="${t.id}"><button class="check" data-action="done" aria-label="${done?'완료 해제':'작업 완료'}">${done?'✓':''}</button><div class="task-main"><input class="task-name" aria-label="작업 이름" value="${escape(t.name)}" maxlength="120"><div class="task-meta">${t.children.length?`세부 작업 ${t.children.length}개 · 예상 ${t.children.reduce((s,x)=>s+x.minutes,0)}분`:`예상 <input class="time-input" aria-label="예상 시간 (분)" type="number" min="1" max="1440" value="${t.minutes}"> 분 <span data-elapsed="${t.id}">· 기록 ${Math.floor(seconds(t)/60)}분</span>`}</div></div><div class="task-tools">${!child?'<button class="muted-button" data-action="child" title="세부 작업 추가" aria-label="세부 작업 추가">＋</button>':''}<button class="muted-button" data-action="up" title="위로 이동" aria-label="위로 이동">↑</button><button class="muted-button" data-action="delete" title="작업 삭제" aria-label="작업 삭제">×</button>${!t.children.length?'<button class="task-play" data-action="play" aria-label="이 작업에 집중하기">▶</button>':''}</div></div>${t.children.map(x=>taskHTML(x,true)).join('')}`}
function render(){$('#course-count').textContent=state.courses.length;$('#courses').innerHTML=state.courses.map((c,i)=>`<article class="course" data-course="${c.id}"><div class="course-heading"><span class="course-icon">${String(i+1).padStart(2,'0')}</span><h3>${escape(c.name)}</h3><small>${c.tasks.reduce((s,t)=>s+(t.children.length?t.children.reduce((a,x)=>a+x.minutes,0):t.minutes),0)}분 계획</small><button class="muted-button" data-action="delete-course" aria-label="코스 삭제">×</button></div>${c.tasks.map(t=>taskHTML(t)).join('')}<button class="add-task" data-action="add">＋ 새로운 작업 추가</button></article>`).join('')||'<div class="empty">새 코스를 만들고 첫 작업을 설계해 보세요.</div>';updateTimer()}
function updateBaseTimer(){const t=active();if(t&&state.started&&clockMode==='timer'&&seconds(t)>=t.minutes*60){pause();toast('설정한 시간이 끝났어요. 수고하셨습니다!');}$('#focus-name').textContent=t?t.name:'집중할 작업을 선택하세요';const c=state.courses.find(c=>c.tasks.some(x=>x.id===t?.id||x.children.some(a=>a.id===t?.id)));$('#focus-course').textContent=c?`${c.name} · 예상 ${t.minutes}분`:'작업 옆 재생 버튼을 눌러 시작하세요';$('#timer').textContent=format(t?(clockMode==='timer'?Math.max(0,t.minutes*60-seconds(t)):seconds(t)):0);$('#timer-state').textContent=state.started?'나만의 속도로 집중하는 중':t?.done?'잘 해냈어요!':t?(clockMode==='timer'&&seconds(t)>=t.minutes*60?'타이머 종료':'잠시 숨을 고르는 중'):'준비되셨나요?';$('#toggle').textContent=state.started?'일시 정지':'시작';$('#toggle').classList.toggle('running',Boolean(state.started));const tasks=leaves(),done=tasks.filter(t=>t.done).length;$('#done-count').textContent=`${done} / ${tasks.length}`;$('#total-time').textContent=`${Math.floor(all().reduce((s,t)=>s+seconds(t),0)/60)}분`;$('#progress').style.width=`${tasks.length?done/tasks.length*100:0}%`;$('#encouragement').textContent=done?'하나씩 쌓이는 오늘의 성취, 잘하고 있어요.':'작은 시작도 멋진 진전이에요.';document.querySelectorAll('[data-elapsed]').forEach(el=>el.textContent=`· 기록 ${Math.floor(seconds(find(el.dataset.elapsed))/60)}분`);}
$('#courses').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const c=state.courses.find(x=>x.id===b.closest('[data-course]').dataset.course),id=b.closest('[data-id]')?.dataset.id,t=find(id);switch(b.dataset.action){case'add':c.tasks.push({id:uid(),name:'새로운 작업',minutes:25,elapsed:0,done:false,children:[]});break;case'child':if(state.active===id)pause();t.children.push({id:uid(),name:'새로운 세부 작업',minutes:15,elapsed:0,done:false,children:[]});t.done=false;break;case'play':select(id);return;case'done':complete(id);return;case'up':{const list=c.tasks.includes(t)?c.tasks:c.tasks.find(p=>p.children.includes(t)).children;const i=list.indexOf(t);if(i>0)[list[i-1],list[i]]=[list[i],list[i-1]];break}case'delete':if(!confirm('이 작업과 기록을 삭제할까요?'))return;if(state.active===id||t.children.some(x=>x.id===state.active)){pause();state.active=null}c.tasks=c.tasks.filter(x=>x.id!==id);c.tasks.forEach(x=>x.children=x.children.filter(y=>y.id!==id));break;case'delete-course':if(!confirm('코스와 모든 작업 기록을 삭제할까요?'))return;if(c.tasks.some(x=>x.id===state.active||x.children.some(y=>y.id===state.active))){pause();state.active=null}state.courses=state.courses.filter(x=>x.id!==c.id);break;default:return}save();render();if(['add','child'].includes(b.dataset.action)){const inputs=$('#courses').querySelectorAll(`[data-course="${c.id}"] .task-name`);const input=b.dataset.action==='child'?$(`[data-id="${t.children.at(-1).id}"] .task-name`):inputs[inputs.length-1];input.focus();input.select()}});
$('#courses').addEventListener('change',e=>{const row=e.target.closest('[data-id]');if(!row)return;const t=find(row.dataset.id);if(e.target.matches('.task-name'))t.name=e.target.value.trim()||'이름 없는 작업';if(e.target.matches('.time-input'))t.minutes=Math.min(1440,Math.max(1,Number(e.target.value)||1));save();render()});
$('#toggle').onclick=()=>{if(state.started){pause();render();return}let t=active();if(!t||t.done||t.children.length)t=leaves().find(x=>!x.done);if(!t){toast('집중할 작업을 먼저 추가해 주세요.');return}if(clockMode==='timer'&&seconds(t)>=t.minutes*60){toast('타이머가 종료됐어요. 재설정하거나 스톱워치로 전환해 주세요.');return}select(t.id)};
$('#complete').onclick=()=>{const t=active();if(!t){toast('먼저 집중할 작업을 선택해 주세요.');return}if(t.done){toast('이미 완료한 작업이에요.');return}complete(t.id);toast('한 걸음 더 나아갔어요. 수고하셨습니다!');const next=leaves().find(x=>!x.done);state.active=next?.id||null;save();render()};
$('#reset').onclick=()=>{if(!active())return;if(!confirm('현재 작업의 측정 시간을 초기화할까요?'))return;pause();active().elapsed=0;save();render()};
$('#add-course').onclick=()=>{$('#course-dialog').showModal();$('#course-title').focus()};$('#cancel-dialog').onclick=()=>$('#course-dialog').close();$('#course-form').onsubmit=e=>{e.preventDefault();const name=$('#course-title').value.trim();if(!name)return;state.courses.push({id:uid(),name,tasks:[]});save();render();$('#course-form').reset();$('#course-dialog').close()};
$('#date').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date());render();setInterval(updateTimer,500);

function setMode(mode){pause();clockMode=mode;$('#mode-pomodoro').classList.toggle('tab-active',mode==='pomodoro');$('#pomo-controls').hidden=mode!=='pomodoro';$('#mode-timer').classList.toggle('tab-active',mode==='timer');$('#mode-stopwatch').classList.toggle('tab-active',mode==='stopwatch');updateTimer()}
$('#mode-pomodoro').onclick=()=>setMode('pomodoro');
$('#mode-timer').onclick=()=>setMode('timer');
$('#mode-stopwatch').onclick=()=>setMode('stopwatch');
function syncFloating(){
 if(!floatingWindow||floatingWindow.closed)return;
 const doc=floatingWindow.document;
 for(const id of ['focus-name','focus-course','timer','timer-state','toggle','pomo-count','pomo-focus','pomo-break']){
  const target=doc.getElementById('mini-'+id),source=document.getElementById(id);
  if(target&&source){target.textContent=source.textContent;if(['toggle','pomo-focus','pomo-break'].includes(id))target.className=source.className;}
 }
 for(const id of ['focus-minutes','break-minutes']){const input=doc.getElementById('mini-'+id);if(input&&doc.activeElement!==input)input.value=document.getElementById(id).value;}
 doc.body.dataset.phase=state.pomo.phase;
 doc.body.dataset.timerView=effectiveTimerView();
 for(const view of ['numeric','circle'])doc.getElementById('mini-view-'+view).setAttribute('aria-pressed',String(effectiveTimerView()===view));
 doc.getElementById('mini-view-circle').disabled=clockMode==='stopwatch';
 updateRemainingRing(doc.getElementById('mini-dial-remaining'),remainingFraction());
 doc.body.dataset.longTime=String($('#timer').textContent.length>5);
 if(clockMode==='pomodoro'){const p=state.pomo;doc.getElementById('mini-timer-state').textContent=`${p.phase==='focus'?p.focusMinutes:p.breakMinutes}분 · ${p.phase==='focus'?'집중':'휴식'} ${p.started?'중':'준비'}`;}
 for(const phase of ['focus','break'])doc.getElementById('mini-pomo-'+phase).setAttribute('aria-pressed',String(state.pomo.phase===phase));
 const taskTitle=doc.getElementById('mini-focus-name');taskTitle.title=taskTitle.textContent;const progress=doc.getElementById('mini-pomo-progress');if(progress)progress.style.width=$('#pomo-progress').style.width;
 doc.title=effectiveTimerView()==='circle'?'원형 타이머 · 차곡':($('#timer').textContent||'타이머')+' · 차곡';
 doc.querySelector('.readout').setAttribute('aria-label',effectiveTimerView()==='circle'?`남은 시간 ${Math.round(remainingFraction()*100)}퍼센트`:'남은 시간');
}
$('#float-timer').onclick=async()=>{
 if(floatingWindow&&!floatingWindow.closed){floatingWindow.focus();return}
 try{
  const pinned='documentPictureInPicture' in window;
  floatingWindow=pinned?await window.documentPictureInPicture.requestWindow({width:480,height:210}):window.open('','chagok-focus','popup=yes,width=480,height=210');
  if(!floatingWindow){toast('팝업이 차단되었어요. 이 사이트의 팝업을 허용해 주세요.');return}
  const doc=floatingWindow.document;
  createFloatingClock(doc, {
    onAction: id => { document.getElementById(id).click(); syncFloating(); },
    onDurationChange: (id, value) => { setPomoMinutes(id, value); syncFloating(); },
    onViewChange: view => setTimerView(view)
  });
  syncFloating();
  if(!pinned)toast('별도 창을 열었어요. 항상 위 고정은 데스크톱 Chrome·Edge에서 지원됩니다.');
 }catch(error){toast('작은 창을 열지 못했어요. 데스크톱 Chrome·Edge에서 다시 시도해 주세요.');}
};

function updateTimer(){
 if(clockMode==='pomodoro'&&state.pomo.started&&pomoSeconds()>=pomoDuration()){
  const wasFocus=state.pomo.phase==='focus';pause();if(wasFocus)state.pomo.rounds++;state.pomo.phase=wasFocus?'break':'focus';state.pomo.elapsed=0;save();toast(wasFocus?`집중 완료! ${state.pomo.breakMinutes}분 동안 쉬어가세요.`:'휴식 완료! 다음 집중을 시작해 보세요.');
 }
 updateBaseTimer();
 const p=state.pomo,isFocus=p.phase==='focus';$('#pomo-focus').textContent=`집중 ${p.focusMinutes}분`;$('#pomo-break').textContent=`휴식 ${p.breakMinutes}분`;for(const [id,value] of [['focus-minutes',p.focusMinutes],['break-minutes',p.breakMinutes]]){const input=document.getElementById(id);if(document.activeElement!==input)input.value=value;}
 $('#pomo-focus').classList.toggle('selected',isFocus);$('#pomo-break').classList.toggle('selected',!isFocus);
 $('#pomo-count').textContent=`집중 완료 ${p.rounds}회`;
 $('#pomo-progress').style.width=`${Math.min(100,pomoSeconds()/pomoDuration()*100)}%`;
 if(clockMode==='pomodoro'){
  const remaining=Math.max(0,pomoDuration()-pomoSeconds());$('#timer').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(Math.floor(remaining)%60).padStart(2,'0')}`;$('#timer-state').textContent=isFocus?(p.started?'지금은 집중하는 시간':`${p.focusMinutes}분, 한 가지에만 집중하세요`):(p.started?'잠시 쉬어가세요':`${p.breakMinutes}분 휴식 준비`);$('#toggle').textContent=p.started?'일시 정지':'시작';$('#toggle').classList.toggle('running',Boolean(p.started));if(!isFocus){$('#focus-name').textContent='잠깐의 쉼, 다음 집중을 위해';$('#focus-course').textContent='스트레칭하거나 물 한 잔 마셔보세요.'}
 }
 updateTimerView();
 syncFloating();
}
const originalToggle=$('#toggle').onclick;
$('#toggle').onclick=()=>{if(clockMode!=='pomodoro'){originalToggle();return}if(state.pomo.started){pause();render();return}if(state.pomo.phase==='break'){state.pomo.started=Date.now();save();render()}else originalToggle()};
const originalReset=$('#reset').onclick;
$('#reset').onclick=()=>{if(clockMode!=='pomodoro'){originalReset();return}if(!confirm('현재 포모도로 시간을 처음으로 되돌릴까요? 작업 기록은 유지됩니다.'))return;pause();state.pomo.elapsed=0;save();render()};
function changePhase(phase){pause();clockMode='pomodoro';state.pomo.phase=phase;state.pomo.elapsed=0;save();setMode('pomodoro');render()}
$('#pomo-focus').onclick=()=>changePhase('focus');$('#pomo-break').onclick=()=>changePhase('break');

function setPomoMinutes(id,value){
 const minutes=Math.min(180,Math.max(1,Math.floor(Number(value))||1));
 const phase=id==='focus-minutes'?'focus':'break';
 if(state.pomo.phase===phase){pause();state.pomo.elapsed=0;}
 state.pomo[phase==='focus'?'focusMinutes':'breakMinutes']=minutes;save();render();
 toast('시간을 저장했어요.'+(state.pomo.phase===phase?' 현재 세션은 처음부터 준비됩니다.':''));
}
for(const id of ['focus-minutes','break-minutes'])document.getElementById(id).onchange=e=>setPomoMinutes(id,e.target.value);

function effectiveTimerView(){return clockMode==='stopwatch'?'numeric':state.timerView}
function remainingFraction(){
 if(clockMode==='stopwatch')return 1;
 const t=active();
 const duration=clockMode==='pomodoro'?pomoDuration():(t?.minutes||0)*60;
 const elapsed=clockMode==='pomodoro'?pomoSeconds():(t?seconds(t):0);
 return duration?Math.max(0,Math.min(1,1-elapsed/duration)):0;
}
function updateTimerView(){
 const view=effectiveTimerView();
 document.querySelector('.clock').dataset.timerView=view;
 for(const type of ['numeric','circle'])$('#view-'+type).setAttribute('aria-pressed',String(view===type));
 $('#view-circle').disabled=clockMode==='stopwatch';
 const fraction=remainingFraction();
 updateRemainingRing($('#dial-remaining'),fraction);
 $('#timer-dial').setAttribute('aria-label',`남은 시간 ${Math.round(fraction*100)}퍼센트`);
}
function setTimerView(view){
 if(!['numeric','circle'].includes(view)||clockMode==='stopwatch')return;
 state.timerView=view;save();updateTimerView();syncFloating();
}
$('#view-numeric').onclick=()=>setTimerView('numeric');
$('#view-circle').onclick=()=>setTimerView('circle');

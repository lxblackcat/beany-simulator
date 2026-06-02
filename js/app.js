/**
 * app.js — Main game logic for Beany Simulator
 * Sequential A/B choices, show both after pick, day-jump nav, replay
 */

let state = {
  runId: null,
  otherRunIds: [],
  currentNodeId: null,
  currentPairIdx: 0,
  resolvedRounds: [],
  resolvedLabels: {},
  beanyAnimator: null,
  nodeIds: [],
  prevFiveAxis: null,
  nodeComplete: false,
};

// AXIS_KEYS is already defined in radar.js — only use AXIS_CN here
const AXIS_CN   = {attachment:'依恋',trust:'信任',stability:'稳定',energy:'能量',curiosity:'好奇'};

function computePrevFiveAxis(n) {
  if (!n||!n.fiveAxis||!n.personalityDelta) return null;
  const p={};for(const k of AXIS_KEYS)p[k]=(n.fiveAxis[k]||0)-(n.personalityDelta[k]||0);return p;
}
function deriveElemWeights(fa) {
  if(!fa)return null;
  const raw={water:fa.attachment||0,earth:fa.trust||0,wood:fa.stability||0,fire:fa.energy||0,metal:fa.curiosity||0};
  const s=Object.values(raw).reduce((a,b)=>a+b,0);if(!s)return raw;
  const n={};for(const[k,v]of Object.entries(raw))n[k]=v/s;return n;
}

function getCurrentNode() {return RUN_DATA[state.runId]?.nodes[state.currentNodeId]||null;}
function getCurrentRun() {return RUN_DATA[state.runId];}
function getRounds() {return getCurrentNode()?.rounds||[];}
function getPairCount() {return Math.ceil(getRounds().length/2);}
function getPair(i) {const r=getRounds();return{a:r[i*2]||null,b:r[i*2+1]||null};}
function shortAction(t) {
  if(!t)return'互动';
  return t.replace(/[。，、！？]/g,' ').trim();
}
function getDaysIndex() {
  const days={};
  for(const nid of state.nodeIds){
    const m=nid.match(/day(\d+)/);
    if(m){const d=+m[1];if(!days[d])days[d]=[];days[d].push(nid);}
  }
  return Object.keys(days).sort((a,b)=>+a-+b).map(d=>({day:+d,nodes:days[d]}));
}

function initGame(runIds) {
  try {
    state.runId=runIds[0];
    state.otherRunIds=Object.keys(RUN_DATA).filter(k=>k!==state.runId);
    state.nodeIds=Object.entries(RUN_DATA[state.runId].nodes)
      .filter(([id,n])=>n.rounds&&n.rounds.length>0)
      .sort((a,b)=>a[1].day-b[1].day||a[1].session-b[1].session)
      .map(([id])=>id);
    if(!state.nodeIds.length){document.getElementById('story-area').innerHTML='⚠️ 无数据';return;}

    state.currentNodeId=state.nodeIds[0];
    resetNodeState();
    state.beanyAnimator=new BeanyAnimator('beany-stage');
    updateBeanyColor();
    renderSwitcher();

    const n=getCurrentNode();
    state.prevFiveAxis=computePrevFiveAxis(n);
    const iv=state.prevFiveAxis||n?.fiveAxis;
    if(iv)drawRadar(document.getElementById('radar-canvas'),iv);

    renderScene();
    renderPairs();
    renderStats();
    renderTimeline();
    renderDayNav();
    updateControls();
  } catch(e) {
    document.getElementById('story-area').innerHTML='<div style="padding:2rem;color:#FF5722">⚠️ 加载错误: '+e.message+'</div>';
    console.error(e);
  }
}

function resetNodeState() {
  state.currentPairIdx=0;state.resolvedRounds=[];state.resolvedLabels={};
  state.nodeComplete=false;state.prevFiveAxis=computePrevFiveAxis(getCurrentNode());
}

function renderScene() {
  const n=getCurrentNode();const r=getCurrentRun();
  if(!n||!r)return;const h=document.getElementById('scene-header');if(!h)return;
  h.innerHTML=`<div class="scene-day">Day ${n.day} · ${n.session===1?'下班后':'睡前'} · <span style="color:${r.color}">${r.dominantElementCn} · ${r.shishen} · ${r.ageStageLabel}</span></div>
    <div class="scene-dm">🎬 ${n.environment||''}</div>
    <div style="margin-top:0.3rem;font-size:0.75rem;color:var(--text-muted)">🏷 ${n.eventType||'—'} · ${n.rounds.length} 轮互动</div>`;
}

function renderPairs() {
  const area=document.getElementById('story-area');if(!area)return;
  const n=getCurrentNode();
  if(!n||!n.rounds){area.innerHTML='<div style="color:var(--text-muted);text-align:center;padding:2rem">暂无互动数据</div>';return;}
  const rn=getCurrentRun();

  let html='';
  const total=getPairCount();
  for(let p=0;p<total;p++){
    const{a,b}=getPair(p);if(!a&&!b)continue;
    const label=`互动 ${p+1}/${total}`;
    const isResolved=state.resolvedLabels[p]!==undefined;
    const isCurrent=p===state.currentPairIdx&&!state.nodeComplete;

    if(isResolved){
      const chosen=state.resolvedLabels[p];
      const cr=chosen==='A'?a:b;const or=chosen==='A'?b:a;
      html+=`<div class="round-card" style="opacity:0.85"><div class="round-label">${label} ✓</div><div class="choices">`;
      html+=resolvedCard(cr,chosen,rn,true);
      if(or)html+=resolvedCard(or,chosen==='A'?'B':'A',rn,false);
      html+=`</div></div>`;
    } else if(isCurrent){
      html+=`<div class="round-card"><div class="round-label">${label}</div><div class="choices">`;
      if(a)html+=choiceBtn(a,'A',rn);
      if(b)html+=choiceBtn(b,'B',rn);
      html+=`</div></div>`;
    } else {
      html+=`<div class="round-card" style="opacity:0.3;pointer-events:none"><div class="round-label">${label}</div><div class="choices"><div style="flex:1;text-align:center;padding:0.8rem;color:var(--text-muted);font-size:0.8rem">等待探索</div></div></div>`;
    }
  }

  if(state.nodeComplete){
    html+=`<div style="text-align:center;padding:1rem;color:var(--text-secondary)">
      <div style="margin-bottom:0.5rem;font-size:0.9rem">✨ 所有互动已探索</div>
      <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
        <button onclick="replayNode()" style="background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.8rem">🔄 重玩节点</button>
        <button onclick="showNodeSummary()" style="background:${rn.color};border:none;color:white;padding:0.4rem 1.2rem;border-radius:8px;cursor:pointer;font-size:0.8rem">📊 节点总结</button>
        <button onclick="nextNode()" style="background:transparent;border:1px solid ${rn.color};color:${rn.color};padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.8rem">下一节点 ▶</button>
      </div></div>`;
  }

  area.innerHTML=html;
  area.scrollTop=area.scrollHeight;
}

function choiceBtn(round,label,run){
  const act=shortAction(round.personAction.action);
  const br=round.beanyReaction;
  const preview=br?`🐱 ${br.mood} · ${br.action}`:'';
  return `<div class="choice-btn" onclick="resolveChoice('${label}')">
    <div class="choice-label" style="background:${run.color}44;color:${run.color}">${label}</div>
    <div class="choice-action" style="white-space:normal;word-break:break-word">${act}</div>
    <div class="choice-beany">${preview}</div></div>`;
}

function resolvedCard(round,label,run,isChosen){
  const pa=round.personAction;const br=round.beanyReaction;
  const ge=GESTURE_MAP[br.action]||'';const me=MOOD_EMOJI[br.mood]||'';
  const op=isChosen?'1':'0.35';const sc=isChosen?'1':'0.95';
  return `<div style="flex:1;opacity:${op};transform:scale(${sc});transition:all 0.3s">
    <div class="round-resolved" style="border-left-color:${isChosen?run.color:'var(--border-color)'};margin-bottom:0;flex:1">
      <div class="person-name">${isChosen?run.shishen+' · '+label:'— · '+label}<span class="mood-tag"> ${pa.mood||''}</span></div>
      <div class="person-text">${pa.action}</div>
      <div class="beany-line"><span class="beany-mood">${me} ${br.mood} · &quot;${br.meaning}&quot;</span><span> ${ge} ${br.action}</span></div></div></div>`;
}

function resolveChoice(label) {
  const p=state.currentPairIdx;const{a,b}=getPair(p);
  const round=label==='A'?a:b;if(!round)return;
  state.resolvedRounds.push({pairIdx:p,label,round,a,b});
  state.resolvedLabels[p]=label;
  state.currentPairIdx++;
  if(state.currentPairIdx>=getPairCount()){
    state.nodeComplete=true;
    const n=getCurrentNode();
    if(state.prevFiveAxis&&n?.fiveAxis)animateRadarTo(document.getElementById('radar-canvas'),n.fiveAxis,800);
  }
  if(round.beanyReaction&&state.beanyAnimator)state.beanyAnimator.playReaction(round.beanyReaction.action,round.beanyReaction.mood);
  renderPairs();updateControls();
}

function replayNode(){
  resetNodeState();
  const n=getCurrentNode();
  state.prevFiveAxis=computePrevFiveAxis(n);
  if(state.prevFiveAxis)animateRadarTo(document.getElementById('radar-canvas'),state.prevFiveAxis,400);
  if(state.beanyAnimator)state.beanyAnimator.reset();
  renderPairs();updateControls();
}

function renderSwitcher() {
  const c=document.getElementById('ten-shen-switcher');if(!c)return;
  const ids=[state.runId,...state.otherRunIds].filter(id=>RUN_DATA[id]);
  c.innerHTML=ids.map(id=>{
    const r=RUN_DATA[id];
    return`<button class="switch-btn${id===state.runId?' active':''}" style="--btn-color:${r.color}" onclick="switchPersona('${id}')">${r.shishen}</button>`;
  }).join('');
}

function switchPersona(newId){
  if(newId===state.runId||!RUN_DATA[newId])return;
  state.runId=newId;resetNodeState();updateBeanyColor();renderSwitcher();
  const n=getCurrentNode();
  if(state.prevFiveAxis)animateRadarTo(document.getElementById('radar-canvas'),state.prevFiveAxis);
  else if(n?.fiveAxis)animateRadarTo(document.getElementById('radar-canvas'),n.fiveAxis);
  renderScene();renderPairs();renderStats();renderTimeline();renderDayNav();updateControls();
  if(state.beanyAnimator)state.beanyAnimator.reset();
  document.getElementById('story-area').scrollTop=0;
}

function renderStats(){
  const n=getCurrentNode();const r=getCurrentRun();if(!n||!r)return;
  const cw=deriveElemWeights(n.fiveAxis);const bc=document.getElementById('elem-bars');
  if(cw&&bc){
    bc.innerHTML=Object.entries(ELEM_COLORS).map(([e,c])=>{
      const p=Math.round((cw[e]||0)*100);
      return`<div class="elem-bar-row"><span class="elem-label" style="color:${c}">${ELEM_CN[e]||e}</span><div class="elem-bar-track"><div class="elem-bar-fill" style="width:${Math.max(p,3)}%;background:${c}"></div></div><span class="elem-value">${p}%</span></div>`;
    }).join('');
  }
  document.getElementById('char-status').innerHTML=`
    <div class="status-item"><div class="status-val" style="color:${r.color}">${r.dominantElementCn}</div><div class="status-label">主导五行</div></div>
    <div class="status-item"><div class="status-val">${r.shishen}</div><div class="status-label">十神</div></div>
    <div class="status-item"><div class="status-val">${r.ageStageLabel}</div><div class="status-label">年龄</div></div>
    <div class="status-item"><div class="status-val">Day ${n.day}</div><div class="status-label">当前天数</div></div>`;
  document.getElementById('stats-title').style.color=r.color;
  document.getElementById('stats-shishen').textContent=`${r.shishen} · ${r.dominantElementCn}`;
  document.getElementById('stats-runs').innerHTML=`情感依赖型主人 <span style="color:var(--text-muted)">· Day ${n.day}</span>`;
}

function updateControls(){
  const n=getCurrentNode();const t=n?n.rounds.length:0;const d=state.resolvedRounds.length;
  document.getElementById('node-progress').textContent=`${d}/${t} 互动 · ${state.nodeIds.indexOf(state.currentNodeId)+1}/${state.nodeIds.length}`;
  document.getElementById('next-node-btn').disabled=!state.nodeComplete;
  renderDayNav();
}

function renderTimeline(){
  const ev=getCurrentRun()?.finalStats?.events_history||[];const c=document.getElementById('event-timeline');if(!c)return;
  if(!ev.length){c.innerHTML='<div style="color:var(--text-muted);font-size:0.8rem">暂无事件</div>';return;}
  c.innerHTML=ev.slice(-10).map(e=>`<div class="timeline-item"><div class="timeline-dot" style="background:${getCurrentRun().color}"></div><span>${e}</span></div>`).join('');
}

function renderDayNav(){
  const c=document.getElementById('day-nav');if(!c)return;
  const days=getDaysIndex();const cur=getCurrentNode();
  c.innerHTML='跳到：'+days.map(({day,nodes})=>{
    const active=cur&&cur.day===day;
    return`<button class="day-btn${active?' active':''}" onclick="jumpToDay(${day})">Day ${day}</button>`;
  }).join('');
}

function jumpToDay(day){
  const days=getDaysIndex();const de=days.find(d=>d.day===day);
  if(!de||!de.nodes.length)return;
  state.currentNodeId=de.nodes[0];resetNodeState();
  const n=getCurrentNode();
  if(state.prevFiveAxis)animateRadarTo(document.getElementById('radar-canvas'),state.prevFiveAxis);
  else if(n?.fiveAxis)animateRadarTo(document.getElementById('radar-canvas'),n.fiveAxis);
  renderScene();renderPairs();renderStats();renderTimeline();renderDayNav();updateControls();
  updateBeanyColor();if(state.beanyAnimator)state.beanyAnimator.reset();
  document.getElementById('story-area').scrollTop=0;
}

function nextNode() {
  const i=state.nodeIds.indexOf(state.currentNodeId);
  if(i>=state.nodeIds.length-1)return;
  const old=getCurrentNode();state.currentNodeId=state.nodeIds[i+1];resetNodeState();
  if(old?.fiveAxis){
    animateRadarTo(document.getElementById('radar-canvas'),old.fiveAxis,400,()=>{
      if(state.prevFiveAxis)animateRadarTo(document.getElementById('radar-canvas'),state.prevFiveAxis,400);
    });
  } else if(state.prevFiveAxis)animateRadarTo(document.getElementById('radar-canvas'),state.prevFiveAxis);
  renderScene();renderPairs();renderStats();renderTimeline();renderDayNav();updateControls();
  updateBeanyColor();if(state.beanyAnimator)state.beanyAnimator.reset();
  document.getElementById('story-area').scrollTop=0;
}

function prevNode() {
  const i=state.nodeIds.indexOf(state.currentNodeId);
  if(i<=0)return;
  state.currentNodeId=state.nodeIds[i-1];resetNodeState();
  if(state.prevFiveAxis)animateRadarTo(document.getElementById('radar-canvas'),state.prevFiveAxis);
  renderScene();renderPairs();renderStats();renderTimeline();renderDayNav();updateControls();
  updateBeanyColor();if(state.beanyAnimator)state.beanyAnimator.reset();
  document.getElementById('story-area').scrollTop=0;
}

function updateBeanyColor(){if(state.beanyAnimator)state.beanyAnimator.setColor(getCurrentRun()?.color||'#888');}

function showNodeSummary(){
  const n=getCurrentNode();if(!n)return;
  const m=document.getElementById('summary-modal');const c=document.getElementById('summary-card-content');
  if(!m||!c)return;
  const d=n.personalityDelta||{};
  c.innerHTML=`<h2>📊 节点总结</h2><div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem">🏷 ${n.eventType||'—'} · 💖 ${(n.importanceScore*100).toFixed(0)}%</div><div class="summary-delta-list">${
    Object.entries(d).map(([k,v])=>{const cn=AXIS_CN[k]||k;const s=v>0?'⬆':v<0?'⬇':'—';const col=v>0?'#4CAF50':v<0?'#FF5722':'#888';return`<div class="summary-delta-item"><span>${cn}</span><span style="color:${col}">${s} ${(v*1000).toFixed(0)}‰</span></div>`;}).join('')
  }</div><button onclick="closeSummary()" style="margin-top:0.5rem;background:${(getCurrentRun()||{}).color||'#888'};border:none;color:white;padding:0.5rem 2rem;border-radius:8px;cursor:pointer">关闭</button>`;
  m.classList.add('active');
}
function closeSummary(){document.getElementById('summary-modal')?.classList.remove('active');}

// Compare
let compareActive=false;
function toggleCompare(){compareActive=!compareActive;const o=document.getElementById('compare-overlay');if(!o)return;if(compareActive){renderCompare();o.classList.add('active');}else o.classList.remove('active');}
function renderCompare(){
  const oid=Object.keys(RUN_DATA).find(id=>id!==state.runId);if(!oid)return;
  const m=getCurrentRun(),oth=RUN_DATA[oid];const n=getCurrentNode(),on=oth?.nodes[state.currentNodeId];
  const col=(panel,run,nd,label)=>{
    if(!nd?.rounds){panel.innerHTML=`<h3 style="color:${run.color}">${label} · ${run.shishen}</h3><div style="color:var(--text-muted)">无数据</div>`;return;}
    panel.innerHTML=`<h3 style="color:${run.color}">${label} · ${run.shishen}</h3><div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem">🏷 ${nd.eventType} · ${nd.rounds.length} 轮</div>${
      nd.rounds.map((r,i)=>`<div style="margin-bottom:0.4rem;padding:0.5rem;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.8rem"><div style="font-weight:600;margin-bottom:0.2rem">R${i+1}: ${shortAction(r.personAction.action)}</div><div style="color:var(--text-secondary)">🐱 ${r.beanyReaction.mood} · &quot;${r.beanyReaction.meaning}&quot; · ${r.beanyReaction.action}</div></div>`).join('')
    }`;
  };
  col(document.getElementById('compare-panel-a'),m,n,'当前');
  col(document.getElementById('compare-panel-b'),oth,on,'对比');
}

// Keyboard
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key===' ')nextNode();
  else if(e.key==='ArrowLeft')prevNode();
  else if(e.key==='c'||e.key==='C')toggleCompare();
  else if(e.key==='Escape'){if(compareActive)toggleCompare();closeSummary();}
});

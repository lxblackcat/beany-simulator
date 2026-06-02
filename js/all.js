/**
 * radar.js — 5-axis pentagon radar chart
 * Smooth animation between value states
 */

// 5-axis → 五行映射：依恋→水, 信任→土, 稳定→木, 能量→火, 好奇→金
const AXIS_LABELS = ['依恋 💧', '信任 🪨', '稳定 🌳', '能量 🔥', '好奇 ✨'];
const AXIS_KEYS = ['attachment', 'trust', 'stability', 'energy', 'curiosity'];
// 颜色统一为五行色：水蓝 土棕 木绿 火橙 金黄
const AXIS_COLORS = ['#2196F3', '#8D6E63', '#4CAF50', '#FF5722', '#FFC107'];

let currentFiveAxis = { attachment: 0.2, trust: 0.2, stability: 0.2, energy: 0.2, curiosity: 0.2 };
let targetFiveAxis = { ...currentFiveAxis };
let animFrameId = null;

function drawRadar(canvas, data, animate = false) {
  if (!canvas || !canvas.getContext) return;
  
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.35;
  
  const values = [
    data.attachment || 0.2,
    data.trust || 0.2,
    data.stability || 0.2,
    data.energy || 0.2,
    data.curiosity || 0.2,
  ];
  
  const levels = 4;
  const angleStep = (Math.PI * 2) / 5;
  const startAngle = -Math.PI / 2; // Start from top
  
  ctx.clearRect(0, 0, w, h);
  
  // Draw background grid
  for (let l = 1; l <= levels; l++) {
    const r = (radius * l) / levels;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = startAngle + angleStep * i;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = l === levels ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // Draw axis lines
  for (let i = 0; i < 5; i++) {
    const angle = startAngle + angleStep * i;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // Draw data polygon
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const val = Math.min(values[i], 0.5) / 0.5; // Normalize to 0-1 (max 0.5)
    const r = radius * val;
    const angle = startAngle + angleStep * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  // Fill
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(79, 195, 247, 0.15)');
  gradient.addColorStop(0.5, 'rgba(79, 195, 247, 0.08)');
  gradient.addColorStop(1, 'rgba(79, 195, 247, 0.02)');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Stroke
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw data points
  for (let i = 0; i < 5; i++) {
    const val = Math.min(values[i], 0.5) / 0.5;
    const r = radius * val;
    const angle = startAngle + angleStep * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = AXIS_COLORS[i];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // Draw labels
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < 5; i++) {
    const angle = startAngle + angleStep * i;
    const r = radius + 20;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    
    ctx.fillStyle = AXIS_COLORS[i];
    ctx.globalAlpha = 0.7;
    ctx.fillText(AXIS_LABELS[i], x, y);
    
    // Value label
    const vr = radius * (Math.min(values[i], 0.5) / 0.5);
    const vx = cx + (vr + 14) * Math.cos(angle);
    const vy = cy + (vr + 14) * Math.sin(angle);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    ctx.font = '10px sans-serif';
    ctx.fillText(values[i].toFixed(3), vx, vy);
    ctx.globalAlpha = 1;
  }
}

function animateRadarTo(canvas, targetData, duration = 600, onComplete) {
  targetFiveAxis = { ...targetData };
  
  const start = { ...currentFiveAxis };
  const startTime = performance.now();
  
  if (animFrameId) cancelAnimationFrame(animFrameId);
  
  function step(time) {
    const elapsed = time - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    
    const interim = {};
    for (const key of AXIS_KEYS) {
      interim[key] = start[key] + (targetFiveAxis[key] - start[key]) * eased;
    }
    
    drawRadar(canvas, interim);
    
    if (t < 1) {
      animFrameId = requestAnimationFrame(step);
    } else {
      currentFiveAxis = { ...targetFiveAxis };
      animFrameId = null;
      if (onComplete) onComplete();
    }
  }
  
  // Start from current state without resetting to start
  currentFiveAxis = { ...start };
  animFrameId = requestAnimationFrame(step);
}
/**
 * trend.js — Element trend line chart
 * Draws 5-element (金木水火土) evolution across nodes
 */

function drawTrend(canvas, data, elemColors) {
  if (!canvas || !data || data.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width, h = rect.height;
  const pad = { top: 8, bottom: 16, left: 4, right: 4 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  if (cw <= 0 || ch <= 0) return;

  const elements = ['metal','wood','water','fire','earth'];
  const elemLabels = ['金','木','水','火','土'];
  const elemColorsList = elements.map(e => elemColors[e] || '#888');
  const values = data.map(d => elements.map(e => (d[e] || 0) * 100)); // to %
  const count = values.length;
  const maxVal = 60; // cap at 60% for readability
  const xStep = cw / Math.max(count - 1, 1);

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Draw background grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let v = 0; v <= maxVal; v += 10) {
    const y = pad.top + ch - (v / maxVal) * ch;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v + '%', pad.left + cw, y + 2);
  }

  // Draw lines
  for (let e = 0; e < 5; e++) {
    ctx.beginPath();
    ctx.strokeStyle = elemColorsList[e];
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    for (let i = 0; i < count; i++) {
      const x = pad.left + i * xStep;
      const v = Math.min(values[i][e], maxVal);
      const y = pad.top + ch - (v / maxVal) * ch;
      if (i === 0) ctx.moveTo(x, y);
      else {
        // Smooth curve
        const px = pad.left + (i - 1) * xStep;
        const pv = Math.min(values[i - 1][e], maxVal);
        const py = pad.top + ch - (pv / maxVal) * ch;
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
      }
    }
    ctx.stroke();

    // Draw dots
    for (let i = 0; i < count; i++) {
      const x = pad.left + i * xStep;
      const v = Math.min(values[i][e], maxVal);
      const y = pad.top + ch - (v / maxVal) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = elemColorsList[e];
      ctx.fill();
    }
  }

  // Draw legend (compact, at bottom-right)
  const legendX = w - 4;
  const legendY = pad.top + 2;
  ctx.font = '6px sans-serif';
  ctx.textAlign = 'right';
  for (let e = 0; e < 5; e++) {
    ctx.fillStyle = elemColorsList[e];
    ctx.fillText(elemLabels[e], legendX, legendY + e * 9);
  }

  // X-axis: label every data point with day number
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '6px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < count; i++) {
    // Show label for first, last, and every other point
    if (i === 0 || i === count - 1) {
      const x = pad.left + i * xStep;
      ctx.fillText('D' + (i + 1), x, h - 2);
    } else if (i % 2 === 0 && count <= 7) {
      // For <=7 days, label every other middle point
      const x = pad.left + i * xStep;
      ctx.fillText('D' + (i + 1), x, h - 2);
    }
  }
}
/**
 * beany.js — Beany circle animation engine
 * Controls the visual representation: circle, eyes, mood emoji, gesture emoji
 */

// Action → gesture emoji mapping
const GESTURE_MAP = {
  '贴住': '👉👈',
  '贴': '👉👈',
  '压': '💕',
  '压了压': '💕',
  '蹭': '💫',
  '沉了沉': '⬇️',
  '沉': '⬇️',
  '不动': '💤',
  '没动': '...',
  '没醒': '💤',
  '睡着': '💤',
  '睡': '💤',
  '窝': '🔄',
  '拱': '🐾',
  '缩': '😰',
  '趴平': '⬇️😌',
  '放松': '🌸',
  '眯': '😌',
  '贴了贴': '👉👈',
};

// Mood → face/emoji mapping
const MOOD_EMOJI = {
  '安心': '😌',
  '软': '💫',
  '柔软': '🌸',
  '困': '😴',
  '好奇': '🤔',
  '迷糊': '😵‍💫',
  '不安': '😟',
  '开心': '😊',
  '舒服': '😊',
  '放松': '😌',
  '温暖': '🥰',
  '依赖': '🥺',
  '平静': '😐',
  '冷淡': '😑',
  '回避': '😤',
  '不满': '😾',
  '满意': '😊',
  '舍不得': '🥺',
  '睡着了': '😴💤',
};

// Mood → eye style
const EYE_STYLES = {
  '安心': 'closed',     // ^_^ relaxed
  '软': 'closed',
  '柔软': 'closed',
  '困': 'sleepy',
  '好奇': 'wide',
  '迷糊': 'sleepy',
  '不安': 'wide',
  '开心': 'closed',
  '舒服': 'closed',
  '放松': 'closed',
  '温暖': 'closed',
  '依赖': 'closed',
  '平静': 'normal',
  '冷淡': 'normal',
  '回避': 'normal',
  '不满': 'normal',
  '满意': 'closed',
  '舍不得': 'closed',
  '睡着了': 'sleepy',
};

// Action → position class
const POSITION_MAP = {
  '贴住': 'beany-left',
  '贴': 'beany-left',
  '压': 'beany-right',
  '压了压': 'beany-right',
  '沉了沉': 'beany-down',
  '沉': 'beany-down',
  '不动': 'beany-sleep',
  '没动': 'beany-sleep',
  '没醒': 'beany-sleep',
  '睡着': 'beany-sleep',
  '睡': 'beany-sleep',
  '趴平': 'beany-down',
  '眯': 'beany-center',
  '蹭': 'beany-center',
  '拱': 'beany-center',
  '缩': 'beany-down',
  '窝': 'beany-center',
  '放松': 'beany-center',
  '贴了贴': 'beany-left',
};

// Default fallback
const DEFAULT_GESTURE = '✨';
const DEFAULT_MOOD = '😐';
const DEFAULT_EYE = 'normal';
const DEFAULT_POS = 'beany-center';

class BeanyAnimator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }
    
    this.circle = null;
    this.moodEl = null;
    this.gestureEl = null;
    this.eyesEl = null;
    
    this.init();
  }
  
  init() {
    // Create Beany circle
    this.circle = document.createElement('div');
    this.circle.className = 'beany-circle beany-center';
    this.circle.id = 'beany-circle';
    
    // Create eyes
    this.eyesEl = document.createElement('div');
    this.eyesEl.className = 'eyes';
    for (let i = 0; i < 2; i++) {
      const eye = document.createElement('div');
      eye.className = 'eye';
      this.eyesEl.appendChild(eye);
    }
    this.circle.appendChild(this.eyesEl);
    
    // Mood emoji container
    this.moodEl = document.createElement('div');
    this.moodEl.className = 'beany-mood-emoji';
    this.moodEl.textContent = DEFAULT_MOOD;
    this.circle.appendChild(this.moodEl);
    
    // Gesture emoji container
    this.gestureEl = document.createElement('div');
    this.gestureEl.className = 'beany-gesture';
    this.circle.appendChild(this.gestureEl);
    
    this.container.innerHTML = '';
    this.container.appendChild(this.circle);
  }
  
  setColor(color) {
    if (this.circle) {
      this.circle.style.backgroundColor = color;
    }
  }
  
  setEyes(style) {
    if (!this.eyesEl) return;
    const eyes = this.eyesEl.querySelectorAll('.eye');
    eyes.forEach(e => {
      e.className = 'eye';
      if (style) e.classList.add(style);
    });
  }
  
  setMood(mood) {
    if (!this.moodEl) return;
    const emoji = MOOD_EMOJI[mood] || DEFAULT_MOOD;
    this.moodEl.textContent = emoji;
    this.moodEl.style.animation = 'none';
    void this.moodEl.offsetWidth; // Trigger reflow
    this.moodEl.style.animation = 'float 0.6s ease-out';
    
    // Set eye style based on mood
    const eyeStyle = EYE_STYLES[mood] || DEFAULT_EYE;
    this.setEyes(eyeStyle);
  }
  
  setGesture(action) {
    if (!this.gestureEl) return;
    
    // Find matching gesture emoji
    let gesture = DEFAULT_GESTURE;
    for (const [key, val] of Object.entries(GESTURE_MAP)) {
      if (action.includes(key)) {
        gesture = val;
        break;
      }
    }
    
    this.gestureEl.textContent = gesture;
    this.gestureEl.style.animation = 'none';
    void this.gestureEl.offsetWidth;
    this.gestureEl.style.animation = 'gesturePop 0.5s ease-out';
    
    // Position the gesture emoji randomly in upper-right area of circle
    const x = 30 + Math.random() * 40;
    const y = -20 - Math.random() * 20;
    this.gestureEl.style.left = `${x}%`;
    this.gestureEl.style.top = `${y}%`;
  }
  
  setPosition(action) {
    if (!this.circle) return;
    
    let posClass = DEFAULT_POS;
    for (const [key, val] of Object.entries(POSITION_MAP)) {
      if (action.includes(key)) {
        posClass = val;
        break;
      }
    }
    
    this.circle.className = `beany-circle ${posClass}`;
    
    // If sleeping, reduce opacity
    if (posClass === 'beany-sleep') {
      this.circle.style.opacity = '0.8';
    } else {
      this.circle.style.opacity = '1';
    }
  }
  
  playReaction(actionStr, moodStr) {
    // Play the full reaction animation sequence
    this.setMood(moodStr);
    this.setGesture(actionStr);
    this.setPosition(actionStr);
    
    // Small scale bounce when reacting
    if (this.circle) {
      this.circle.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      this.circle.style.transform = this.circle.style.transform; // Trigger
    }
  }
  
  reset() {
    if (this.circle) {
      this.circle.className = 'beany-circle beany-center';
      this.circle.style.opacity = '1';
    }
    this.setEyes('normal');
    if (this.moodEl) this.moodEl.textContent = '';
    if (this.gestureEl) this.gestureEl.textContent = '';
  }
}
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

// 5-axis → element mapping (must match build-data.mjs)
const CLIENT_AXIS_TO_ELEM = {
  attachment: 'water',
  trust: 'earth',
  stability: 'wood',
  energy: 'fire',
  curiosity: 'metal',
};

// Derive dominant element from 5-axis values as fallback
function deriveDominantFromFiveAxis(fiveAxis) {
  if (!fiveAxis) return null;
  let maxVal = -Infinity;
  let maxAxis = null;
  for (const [axis, val] of Object.entries(fiveAxis)) {
    if (val > maxVal) { maxVal = val; maxAxis = axis; }
  }
  return maxAxis ? (CLIENT_AXIS_TO_ELEM[maxAxis] || null) : null;
}

function getDominantElement(n, r) {
  // Priority: 5-axis derived > data dominantElement > run dominantElement
  const fromAxis = n && n.fiveAxis ? deriveDominantFromFiveAxis(n.fiveAxis) : null;
  if (fromAxis) return fromAxis;
  if (n && n.dominantElement && ELEM_CN[n.dominantElement]) return n.dominantElement;
  return r ? r.dominantElement : null;
}

function getNodeColor(n,r) {
  const elem = getDominantElement(n, r);
  if (elem && ELEM_COLORS[elem]) return ELEM_COLORS[elem];
  if (r) return r.color;
  return '#888';
}

function getNodeDominantCn(n,r) {
  const elem = getDominantElement(n, r);
  if (elem && ELEM_CN[elem]) return ELEM_CN[elem];
  if (r) return r.dominantElementCn;
  return '—';
}

function drawTrendChart(){const canvas=document.getElementById('trend-canvas');if(!canvas)return;const ids=state.nodeIds;if(!ids||ids.length<2)return;const run=RUN_DATA[state.runId];if(!run)return;
  // Aggregate by day: use the LAST node per day (latest state)
  const byDay={};for(const id of ids){const nd=run.nodes[id];if(!nd||!nd.fiveAxis)continue;const m=id.match(/day(\d+)/);if(!m)continue;const day=m[1];const w=deriveElemWeights(nd.fiveAxis);if(w)byDay[day]=w;}const days=Object.keys(byDay).sort((a,b)=>+a-+b);const data=days.map(d=>byDay[d]);
if(data.length>=2)drawTrend(canvas,data,ELEM_COLORS);}

const AGE_MAP={childhood:'幼年',youth:'青年',stable:'稳定','中年':'中年','稳定':'稳定','':'—'};const AXIS_CN   = {attachment:'依恋',trust:'信任',stability:'稳定',energy:'能量',curiosity:'好奇'};

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
  // Calculate position within current day
  const day=parseInt(n.day,10);
  const dayNodes=state.nodeIds.filter(id=>id.startsWith('day'+day+'_'));
  const idxInDay=dayNodes.indexOf(state.currentNodeId);
  const sessionLabel=n.session===1?'下班后':'睡前';
  const dayProgress=dayNodes.length>1?`〈${idxInDay+1}/${dayNodes.length}〉`:'';
  h.innerHTML=`<div class="scene-day">Day ${n.day} ${dayProgress}${sessionLabel} · <span style="color:${getNodeColor(n,r)}">${getNodeDominantCn(n,r)} · ${r.shishen} · ${AGE_MAP[n.ageStage]||r.ageStageLabel}</span></div>
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
    const day=parseInt(n.day,10);
    const dayNodes=state.nodeIds.filter(id=>id.startsWith('day'+day+'_'));
    const idxInDay=dayNodes.indexOf(state.currentNodeId);
    const nextHint=idxInDay < dayNodes.length-1 ? `本日还有 1 个场景` : `Day ${day} 已完成，准备进入 Day ${day+1}`;
    html+=`<div style="text-align:center;padding:1rem;color:var(--text-secondary)">
      <div style="margin-bottom:0.3rem;font-size:0.9rem">✨ 所有互动已探索</div>
      <div style="margin-bottom:0.5rem;font-size:0.7rem;color:var(--text-muted)">💡 ${nextHint}</div>
      <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
        <button onclick="replayNode()" style="background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.8rem">🔄 重玩节点</button>
        <button onclick="showNodeSummary()" style="background:${rn.color};border:none;color:white;padding:0.4rem 1.2rem;border-radius:8px;cursor:pointer;font-size:0.8rem">📊 节点总结</button>
        <button onclick="nextNode()" style="background:transparent;border:1px solid ${rn.color};color:${rn.color};padding:0.4rem 1rem;border-radius:8px;cursor:pointer;font-size:0.8rem">继续 ▶</button>
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
    <div class="status-item"><div class="status-val" style="color:${getNodeColor(n,r)}">${getNodeDominantCn(n,r)}</div><div class="status-label">主导五行</div></div>
    <div class="status-item"><div class="status-val">${r.shishen}</div><div class="status-label">十神</div></div>
    <div class="status-item"><div class="status-val">${AGE_MAP[n.ageStage]||'—'}</div><div class="status-label">年龄</div></div>
    <div class="status-item"><div class="status-val">Day ${n.day}</div><div class="status-label">当前天数</div></div>`;
  document.getElementById('stats-title').style.color=getNodeColor(n,r);
  document.getElementById('stats-shishen').textContent=`${r.shishen} · ${getNodeDominantCn(n,r)}`;
  document.getElementById('stats-runs').innerHTML=`情感依赖型主人 <span style="color:var(--text-muted)">· Day ${n.day}</span>`;
  drawTrendChart();
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

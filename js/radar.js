/**
 * radar.js — 5-axis pentagon radar chart
 * Smooth animation between value states
 */

const AXIS_LABELS = ['依恋', '信任', '稳定', '能量', '好奇'];
const AXIS_KEYS = ['attachment', 'trust', 'stability', 'energy', 'curiosity'];
const AXIS_COLORS = ['#2196F3', '#FFC107', '#4CAF50', '#FF5722', '#9C27B0'];

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

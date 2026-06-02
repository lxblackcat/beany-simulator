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

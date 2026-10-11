// Shared canvas toolkit for the AI-course explainer plates (perceptron,
// why-transformers, codex-agent). Pure functions of their arguments; plates
// stay pure functions of time. Light paper palette; neutral, not a brand set.
export const C = {bg:'#f7f6f1',panel:'#ffffff',edge:'#d9d5ca',text:'#23272e',muted:'#7b776c',green:'#2e7d4f',wash:'#e2f1e7',red:'#bf4d42',blue:'#3f79b3',purple:'#8168b0'};
export const ZH = '"PingFang SC",system-ui,sans-serif', MONO = '"IBM Plex Mono",Menlo,monospace';
export const W = 1920, H = 1080;

export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => 1 - Math.pow(1 - clamp(v), 3);

export function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size = 36, col: string = C.text, font: string = ZH, align: CanvasTextAlign = 'left') {
  c.font = `500 ${size}px ${font}`; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y);
}
export function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, active = false) {
  c.fillStyle = active ? C.wash : C.panel; c.strokeStyle = active ? C.green : C.edge; c.lineWidth = 2;
  c.beginPath(); c.roundRect(x, y, w, h, 22); c.fill(); c.stroke();
}
export function line(c: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, col: string = C.edge) {
  c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(a, b); c.stroke();
}
export function arrow(c: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, col: string = C.muted) {
  line(c, x, y, a, b, col); const t = Math.atan2(b - y, a - x);
  line(c, a, b, a - 14 * Math.cos(t - .5), b - 14 * Math.sin(t - .5), col);
  line(c, a, b, a - 14 * Math.cos(t + .5), b - 14 * Math.sin(t + .5), col);
}
export function dot(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string = C.green) {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
export function reveal(c: CanvasRenderingContext2D, t: number, start: number, draw: () => void) {
  const k = ease((t - start) / .7); c.save(); c.globalAlpha = k; c.translate(0, 20 * (1 - k)); draw(); c.restore();
}
export function wrap(c: CanvasRenderingContext2D, s: string, x: number, y: number, max = 1620, size = 34, col: string = C.text) {
  c.font = `500 ${size}px ${ZH}`; let row = '';
  for (const ch of s) { if (c.measureText(row + ch).width > max) { text(c, row, x, y, size, col); row = ch; y += size * 1.5 } else row += ch }
  text(c, row, x, y, size, col);
}
export function terminal(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  box(c, x, y, w, h); text(c, '>_', x + 30, y + 47, 28, C.green, MONO); text(c, label, x + 95, y + 47, 25, C.muted, MONO); line(c, x, y + 72, x + w, y + 72);
}
export function codeBlock(c: CanvasRenderingContext2D, x: number, y: number, w: number, lines: string[], size = 30, lh = 46) {
  const h = lines.length * lh + 56; box(c, x, y, w, h); text(c, '>_', x + 30, y + 44, 24, C.green, MONO); line(c, x, y + 66, x + w, y + 66);
  lines.forEach((s, i) => text(c, s, x + 34, y + 108 + i * lh, size, /^#|注释/.test(s) ? C.muted : C.text, MONO));
  return h;
}
export function table(c: CanvasRenderingContext2D, x: number, y: number, headers: string[], rows: string[][], cw: number[], lh = 58, highlightLast = false) {
  headers.forEach((s, i) => text(c, s, x + cw.slice(0, i).reduce((a, b) => a + b, 0) + 8, y, 26, C.muted, MONO));
  rows.forEach((r, ri) => {
    const yy = y + 52 + ri * lh, last = highlightLast && ri === rows.length - 1;
    if (last) { c.fillStyle = C.wash; c.beginPath(); c.roundRect(x - 8, yy - 36, cw.reduce((a, b) => a + b, 0) + 8, lh, 12); c.fill(); }
    r.forEach((s, i) => text(c, s, x + cw.slice(0, i).reduce((a, b) => a + b, 0) + 8, yy, 30, last ? C.green : (i === r.length - 1 ? C.green : C.text), MONO));
  });
}
// 2D plot frame: maps data coords into a screen rect.
export function plot(x: number, y: number, w: number, h: number, d0: number[], d1: number[]) {
  const [x0, x1] = d0, [y0, y1] = d1;
  const px = (v: number) => x + (v - x0) / (x1 - x0) * w;
  const py = (v: number) => y + h - (v - y0) / (y1 - y0) * h;
  const frame = (c: CanvasRenderingContext2D) => {
    line(c, x, y + h, x + w, y + h, C.muted); line(c, x, y, x, y + h, C.muted);
    text(c, 'x1', x + w - 20, y + h + 36, 24, C.muted, MONO); text(c, 'x2', x - 34, y + 22, 24, C.muted, MONO);
  };
  const seg = (c: CanvasRenderingContext2D, a: number, b: number, u: number, v: number, col: string = C.green, lw = 4) => {
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(px(a), py(b)); c.lineTo(px(u), py(v)); c.stroke();
  };
  const pt = (c: CanvasRenderingContext2D, a: number, b: number, col: string, label?: string) => {
    dot(c, px(a), py(b), 9, col); if (label) text(c, label, px(a) + 14, py(b) - 12, 26, col, MONO);
  };
  return {frame, seg, pt, px, py};
}
export function chain4(c: CanvasRenderingContext2D, t: number, active: number, names = ['观察', '决策', '执行', '回流']) {
  names.forEach((s, i) => {
    const x = 120 + i * 445; box(c, x, 370, 350, 190, i === active);
    text(c, String(i + 1).padStart(2, '0'), x + 28, 417, 22, C.muted, MONO);
    text(c, s, x + 28, 488, 56, i === active ? C.green : C.text);
    if (i < 3) arrow(c, x + 360, 465, x + 423, 465);
  });
  const u = ((t % 4) + 4) % 4 / 4; dot(c, 120 + u * 1685, 606, 6); line(c, 120, 606, 1805, 606);
}
export function strip(c: CanvasRenderingContext2D, x: number, y: number, w: number, steps: string[], size = 40) {
  const gap = 60, bw = (w - gap * (steps.length - 1)) / steps.length;
  steps.forEach((s, i) => {
    const sx = x + i * (bw + gap), last = i === steps.length - 1;
    box(c, sx, y, bw, 110, last); text(c, s, sx + bw / 2, y + 70, size, last ? C.green : C.text, ZH, 'center');
    if (!last) arrow(c, sx + bw + 8, y + 55, sx + bw + gap - 8, y + 55);
  });
}
// Standard chrome shared by every scene of every episode.
export function header(c: CanvasRenderingContext2D, series: string, lesson: string) {
  text(c, 'AI ENGINEERING / 从零开始', 100, 70, 25, C.muted, MONO);
  text(c, lesson, 1560, 70, 28, C.green, MONO, 'right'); line(c, 100, 102, 1820, 102);
}
export function captionBlock(c: CanvasRenderingContext2D, lines: string[], times: number[], t: number, total: number, note: string) {
  line(c, 100, 900, 1820, 900);
  lines.forEach((s, i) => { if (t >= times[i]) text(c, s, 100, 956 + i * 54, 36, C.text); });
  line(c, 100, 1030, 1820, 1030); line(c, 100, 1030, 100 + 1720 * clamp(t / total), 1030, C.green);
  text(c, note, 100, 1064, 21, C.muted);
  text(c, `${Math.floor(t).toString().padStart(2, '0')} / ${Math.round(total)} s`, 1820, 1064, 22, C.muted, MONO, 'right');
}
// Scene entry wipe: a paper curtain slides off in the first `dur` seconds,
// green leading edge, direction alternating by scene index. Deterministic in t.
export function sceneWipe(c: CanvasRenderingContext2D, t: number, sceneIndexSeed: number, dur = 0.55) {
  if (t >= dur) return;
  const k = ease(t / dur);
  const fromRight = sceneIndexSeed % 2 === 1;
  const edge = fromRight ? W * (1 - k) : W * k;
  c.fillStyle = C.bg;
  if (fromRight) c.fillRect(edge, 0, W - edge, H); else c.fillRect(0, 0, edge, H);
  c.fillStyle = C.green;
  if (fromRight) c.fillRect(edge, 0, 14, H); else c.fillRect(edge - 14, 0, 14, H);
}
export function sceneTitle(c: CanvasRenderingContext2D, title: string, no: string) {
  text(c, title, 100, 215, 64); text(c, no, 1820, 215, 30, C.muted, MONO, 'right');
}

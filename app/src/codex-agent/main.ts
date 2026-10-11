// Entry for the attention explainer: preview player (default) or export mode
// (?export=1, driven by scripts/render.ts through the window.__pdoom API).
import { Engine, type AdaptiveSampling } from '../engine/engine';
import { PW, PH, SCALE } from '../engine/gl';
import { makeTimeline } from './timeline';
import { DURATION as D } from './cues';

const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
const ONLY = params.get('only'); // comma-separated scene ids to load (faster stills)
const FROM = params.get('t') ? parseFloat(params.get('t')!) : null;

const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = PW;
canvas.height = PH;
// the stylesheet pins the export canvas to 1920x1080; inline the real size so ?portrait=1
// (1080x1920) is not squashed into a landscape box
canvas.style.width = PW + 'px';
canvas.style.height = PH + 'px';

// the explainer ships its own audio analysis and cue sheet
const engine = new Engine(canvas, makeTimeline, {
  audio: 'data/codex-agent.json',
  lyrics: 'data/codex-agent-lyrics.json',
});

declare global {
  interface Window { __pdoom: any }
}

let TIMELINE: typeof engine.timeline = [];

async function boot() {
  const onlySet = ONLY ? new Set(ONLY.split(',')) : null;
  await engine.init(onlySet ? (e) => onlySet.has(e.id) : undefined);
  TIMELINE = engine.timeline;
  if (EXPORT) setupExport();
  else setupPlayer();
}

// ------------------------------------------------------------------ export API
function setupExport() {
  document.body.classList.add('export');
  window.__pdoom = {
    engine,
    duration: engine.duration,
    errors: engine.errors,
    scale: SCALE,
    width: PW,
    height: PH,
    timeline: TIMELINE.map((e) => ({ id: e.id, start: e.start, end: e.end })),
    still(t: number, samples: number | AdaptiveSampling = 1, shutter = 0.5) { return engine.render(t, 1 / 60, true, samples, shutter); },
    async png() {
      const px = await engine.readPixelsAsync(), row = PW * 4;
      const img = new ImageData(PW, PH);
      for (let y = 0; y < PH; y++) img.data.set(px.subarray((PH - 1 - y) * row, (PH - y) * row), y * row);
      const oc = new OffscreenCanvas(PW, PH);
      oc.getContext('2d')!.putImageData(img, 0, 0);
      const b = new Uint8Array(await (await oc.convertToBlob({ type: 'image/png' })).arrayBuffer());
      let s = '';
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return btoa(s);
    },
    async stream(opts: { from: number; to: number; fps: number; ws: string; samples?: number | AdaptiveSampling; shutter?: number; inflight?: number }) {
      const ws = new WebSocket(opts.ws);
      ws.binaryType = 'arraybuffer';
      let acked = 0;
      ws.onmessage = (e) => { if (typeof e.data === 'string') acked = Math.max(acked, +e.data || 0); };
      await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = (e) => rej(e); });
      const dt = 1 / opts.fps;
      const n0 = Math.round(opts.from * opts.fps), n1 = Math.round(opts.to * opts.fps);
      const buf = new Uint8Array(PW * PH * 4);
      const S = opts.samples ?? 1, SH = opts.shutter ?? 0.5;
      if (n0 > 0) engine.render((n0 - 1) * dt, dt, false, typeof S === 'number' ? S : 1, SH);
      const used: Record<number, number> = {};
      for (let n = n0; n < n1; n++) {
        const k = engine.render(n * dt, dt, false, S, SH);
        used[k] = (used[k] ?? 0) + 1;
        await engine.readPixelsAsync(buf);
        if (opts.inflight) while (n - n0 - acked >= opts.inflight) await new Promise((r) => setTimeout(r, 2));
        while (ws.bufferedAmount > 64 * 1024 * 1024) await new Promise((r) => setTimeout(r, 2));
        ws.send(buf);
        if (n % 30 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      const drainedAt = performance.now();
      while (acked < n1-n0 && performance.now() - drainedAt < 30000) await new Promise((r) => setTimeout(r, 5));
      if(acked<n1-n0)throw new Error('Frame delivery timeout');
      ws.close();
      return used;
    },
  };
  window.__pdoom.ready = true;
}

// Silent preview uses a wall-clock anchor; export remains a pure time function.
function setupPlayer(){
 const scrub=document.getElementById('scrub') as HTMLInputElement;
 const info=document.getElementById('info')!;
 scrub.max=String(engine.duration);scrub.step='0.001';
 let t=FROM??0,playing=false,last=performance.now();
 const toggle=()=>{playing=!playing;last=performance.now()};
 canvas.onclick=toggle;
 scrub.oninput=()=>{t=Number(scrub.value);last=performance.now()};
 window.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();toggle()}if(e.key==='ArrowRight')t=Math.min(D-.001,t+1);if(e.key==='ArrowLeft')t=Math.max(0,t-1)});
 function tick(){const now=performance.now();if(playing)t=Math.min(engine.duration-.001,t+(now-last)/1000);last=now;engine.render(t,1/30);scrub.value=String(t);info.textContent=t.toFixed(1)+' / '+Math.round(D)+' s · 点击画面或空格播放 · 无配音';requestAnimationFrame(tick)}tick();
}
boot().catch(e=>{console.error(e);window.__pdoom={error:String(e.stack??e)};document.getElementById('errs')!.textContent=String(e)});

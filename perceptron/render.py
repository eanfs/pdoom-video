"""Render isolated 15 s segments with the project's native Three.js exporter."""
import re, shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
root = HERE.parents[0] if False else HERE.parent
prod = HERE.name
out = root / f'out/{prod}'
segments = out / 'segments'
segments.mkdir(parents=True, exist_ok=True)
duration = float(re.search(r'export const DURATION = ([0-9.]+);',
                           (root / f'app/src/{prod}/cues.ts').read_text()).group(1))
SEG = 15
n = int(duration // SEG) + (1 if duration % SEG > 1e-6 else 0)
final = {'perceptron': 'perceptron-1080p.mp4', 'why-transformers': 'why-transformers-1080p.mp4'}.get(prod, 'agent-loop-codex-1080p.mp4')

def render(i):
    lo, hi = i * SEG, min((i + 1) * SEG, duration)
    target = segments / f'{i:02d}.mp4'
    args = ['bun', 'scripts/render-token-plan.ts', 'video', '--page', f'{prod}.html',
            '--url', 'http://127.0.0.1:5299', '--from', str(lo), '--to', str(hi),
            '--fps', '30', '--samples', '1', '--shutter', '0.2', '--crf', '18',
            '--preset', 'fast', '--noaudio', '--out', str(target)]
    with (segments / f'{i:02d}.log').open('w') as log:
        subprocess.run(args, cwd=root / 'app', stdout=log, stderr=subprocess.STDOUT, check=True, timeout=1200)
    print(f'segment {i+1}/{n} complete', flush=True)
    return target

with ThreadPoolExecutor(max_workers=2) as pool:
    files = list(pool.map(render, range(n)))
concat = segments / 'concat.txt'
concat.write_text(''.join(f"file '{f.name}'\n" for f in files))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
                '-c', 'copy', '-movflags', '+faststart', str(out / final)], check=True)
for srt in HERE.glob('*.srt'):
    shutil.copyfile(srt, out / srt.name)
print(out / final, flush=True)

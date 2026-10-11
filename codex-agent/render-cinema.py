"""Render the 14-01 cinema variant: adaptive motion blur + post chain.

Same cues/timing as render.py, but --samples auto --shutter 0.2 (like the
reference music-video command) and the cinematic plate (bloom/halation/CA/
grain/vignette). Output: agent-loop-cinematic-1080p.mp4.
"""
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
root = HERE.parent
out = root / 'out/codex-agent'
segments = out / 'segments-cinema'
segments.mkdir(parents=True, exist_ok=True)
duration = float(re.search(r'export const DURATION = ([0-9.]+);',
                           (root / 'app/src/codex-agent/cues.ts').read_text()).group(1))
SEG = 15
n = int(duration // SEG) + (1 if duration % SEG > 1e-6 else 0)
final = 'agent-loop-cinematic-1080p.mp4'

def render(i):
    lo, hi = i * SEG, min((i + 1) * SEG, duration)
    target = segments / f'{i:02d}.mp4'
    args = ['bun', 'scripts/render-token-plan.ts', 'video', '--page', 'codex-agent-cinema.html',
            '--url', 'http://127.0.0.1:5299', '--from', str(lo), '--to', str(hi),
            '--fps', '30', '--samples', 'auto', '--shutter', '0.2', '--crf', '22',  # grain is expensive to encode; 17 gave ~900 MB
            '--preset', 'fast', '--noaudio', '--out', str(target)]
    with (segments / f'{i:02d}.log').open('w') as log:
        subprocess.run(args, cwd=root / 'app', stdout=log, stderr=subprocess.STDOUT, check=True, timeout=1800)
    print(f'segment {i+1}/{n} complete', flush=True)
    return target

with ThreadPoolExecutor(max_workers=2) as pool:
    files = list(pool.map(render, range(n)))
concat = segments / 'concat.txt'
concat.write_text(''.join(f"file '{f.name}'\n" for f in files))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
                '-c', 'copy', '-movflags', '+faststart', str(out / final)], check=True)
narration = HERE / 'narration.wav'
if narration.exists():
    silent = out / (final.replace('.mp4', '-silent.mp4'))
    out.joinpath(final).rename(silent)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(narration),
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest',
                    '-movflags', '+faststart', str(out / final)], check=True)
print(out / final, flush=True)

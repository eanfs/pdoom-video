from pathlib import Path
import hashlib, json, re, subprocess

HERE = Path(__file__).resolve().parent
root = HERE.parent
prod = HERE.name
out = root / f'out/{prod}'
final = 'agent-loop-codex-1080p.mp4'
video = out / final
duration = float(re.search(r'export const DURATION = ([0-9.]+);',
                           (root / f'app/src/{prod}/cues.ts').read_text()).group(1))
frames = round(duration * 30)
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
assert (v['width'], v['height'], v['r_frame_rate']) == (1920, 1080, '30/1') and abs(int(v['nb_frames']) - frames) <= 2, (v['width'], v['height'], v['r_frame_rate'], v['nb_frames'], frames)
assert abs(float(probe['format']['duration']) - duration) < .05
assert not any(s['codec_type'] == 'audio' for s in probe['streams'])
subprocess.run(['ffmpeg', '-v', 'error', '-i', str(video), '-f', 'null', '-'], check=True, capture_output=True)
black = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(video), '-vf', 'blackdetect=d=0.08:pix_th=0.02:pic_th=0.98', '-an', '-f', 'null', '-'], check=True, capture_output=True, text=True)
assert 'black_start:' not in black.stderr
(out / 'blackdetect.txt').write_text(black.stderr)
nscenes = len(re.findall(r'"id":', (root / f'app/src/{prod}/cues.ts').read_text()))
marks = [round(duration * (i + 0.5) / nscenes, 2) for i in range(nscenes)]
frames_dir = out / 'final-frames'; frames_dir.mkdir(exist_ok=True)
for n, t in enumerate(marks):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', str(video), '-frames:v', '1', str(frames_dir / f'{n:02d}.png')], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '1', '-i', str(frames_dir / '%02d.png'),
                '-vf', f'scale=640:360,tile=3x3:margin=8:padding=8:color=0x161616', '-frames:v', '1', str(out / 'contact-sheet.jpg')], check=True)
def pixels(path, at=None):
    args = ['ffmpeg', '-v', 'error'] + ([] if at is None else ['-ss', str(at)]) + ['-i', str(path), '-frames:v', '1', '-vf', 'scale=320:180', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    return subprocess.check_output(args)
check = marks[len(marks) // 2]
a = pixels(video, check); b = pixels(out / f'stills/f_{check:07.2f}.png') if (out / f'stills/f_{check:07.2f}.png').exists() else pixels(root / f'out/wip/ca-check/f_{check:07.2f}.png') if (root / f'out/wip/ca-check/f_{check:07.2f}.png').exists() else None
mae = sum(abs(x - y) for x, y in zip(a, b)) / len(a) if b else None
result = {'duration': duration, 'width': 1920, 'height': 1080, 'fps': 30, 'frames': frames,
          'scenes': nscenes, 'audio': False, 'decode': 'passed',
          'blackFrames': 'none at specified threshold', 'stillComparisonAtSeconds': check,
          'meanAbsoluteError255': mae, 'bytes': video.stat().st_size,
          'sha256': hashlib.sha256(video.read_bytes()).hexdigest()}
(HERE / 'media-validation.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))

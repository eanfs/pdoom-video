#!/usr/bin/env python3
"""Narrate an episode with Volcengine Doubao TTS and rebuild its timeline.

Usage: python3 aieng-tts/narrate.py <prod>        # perceptron | why-transformers | codex-agent

Per narration line: synthesise one clip (cached by voice+text in aieng-tts/cache/),
measure its real duration with ffprobe, write <prod>/tts-manifest.json, then call
that episode's build.py so cues.ts/SRT pick up audio-driven timings. Finally
assemble <prod>/narration.wav with exactly the LEAD/GAP/TAIL layout the timing
formula uses, so the muxed track is sample-accurate against the cue sheet.

Credentials come from the environment (never committed):
  VOLC_TTS_TOKEN   the API key VALUE (a UUID) from the Volcengine console
  VOLC_TTS_VOICE   optional, default zh_female_cancan_mars_bigtts
"""
import hashlib
import importlib.util
import json
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from volc_tts import VolcTTS  # noqa: E402

RATE = 24000


def load_episode(prod):
    spec = importlib.util.spec_from_file_location('episode_build', ROOT / prod / 'build.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def dur_of(path):
    return float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)]).strip())


def pcm_of(path):
    return subprocess.check_output(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-'])


def main(prod):
    build = load_episode(prod)
    tts = VolcTTS(voice=__import__('os').environ.get('VOLC_TTS_VOICE', 'zh_female_cancan_mars_bigtts'))
    cache = HERE / 'cache' / tts.voice
    cache.mkdir(parents=True, exist_ok=True)

    scenes, clips = {}, {}
    for sc in build.SCENES:
        durs = []
        for ln in sc['lines']:
            h = hashlib.sha1((tts.voice + '|' + ln).encode()).hexdigest()[:16]
            mp3 = cache / (h + '.mp3')
            if not mp3.exists():
                for attempt in range(3):
                    try:
                        tts.synthesize(ln, mp3)
                        break
                    except Exception as e:
                        if attempt == 2:
                            raise
                        print('retry after TTS error:', e, flush=True)
            clips[(sc['id'], len(durs))] = mp3
            durs.append({'text': ln, 'dur': round(dur_of(mp3), 3)})
            print(f"{sc['id']} line {len(durs)}: {durs[-1]['dur']}s", flush=True)
        scenes[sc['id']] = durs

    (ROOT / prod / 'tts-manifest.json').write_text(
        json.dumps({'voice': tts.voice, 'style': 'volc.apikey', 'scenes': scenes},
                   ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # Rebuild cues/SRT with measured durations (build.py reads tts-manifest.json).
    build.build()

    # Assemble the narration track with the exact same layout as the timing formula.
    silence = lambda secs: bytes(int(round(secs * RATE)) * 2)
    parts = []
    for sc in build.SCENES:
        parts.append(silence(build.LEAD))
        for i, _ln in enumerate(sc['lines']):
            parts.append(pcm_of(clips[(sc['id'], i)]))
            if i < len(sc['lines']) - 1:
                parts.append(silence(build.GAP))
        parts.append(silence(build.TAIL))
    pcm = b''.join(parts)
    target = round(build.DURATION * RATE) if hasattr(build, 'DURATION') else len(pcm) // 2
    assert abs(len(pcm) // 2 - target) <= RATE // 10, (len(pcm) // 2, target)
    pcm = pcm[:target * 2] + bytes(max(0, target * 2 - len(pcm)))
    out = ROOT / prod / 'narration.wav'
    with wave.open(str(out), 'wb') as w:
        w.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        w.writeframes(pcm)
    print(json.dumps({'prod': prod, 'voice': tts.voice, 'clips': sum(len(v) for v in scenes.values()),
                      'narration_wav': str(out), 'samples': len(pcm) // 2}))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage: python3 aieng-tts/narrate.py <prod>')
    main(sys.argv[1])

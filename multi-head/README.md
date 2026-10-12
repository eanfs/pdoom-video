# 多头注意力（07-03）：PDOOM 引擎电影感课样片

约 332 秒、1920×1080、30 fps，火山豆包语音配音（zh_female_cancan_mars_bigtts，逐句合成、按实测时长定轴）。
复用 pdoom-video 的 Three.js Engine、Layer2D 与离线导出器；新增独立入口 `app/multi-head.html`，
不使用原项目歌曲或歌词。

场景与旁白逐字取自父仓库 `hypit-productions/ai-engineering-zh/episodes/07-03/lesson.json`
（12 场景 × 3 句，首场为钩子「一个头不够用」）；画面数字来自同目录 `evidence/course-run.txt` 的实跑输出。

电影感后期：`plate.ts` 的 `render()` 返回值叠加 bloom 0.3 / halation 0.2 / ca 1.6 / grain 0.06 /
vignette 0.32 / exposure 1.02 / hud 0；渲染参数为 `--samples auto --shutter 0.2 --fps 30 --crf 22 --preset fast`
（自适应运动模糊；颗粒编码很贵，故不用 CRF 17）。

## 文件

- `SCRIPT.md`：分镜、场景表与画面数字出处。
- `build.py`：从场景数据生成 `../app/src/multi-head/cues.ts`、`../data/multi-head*.json`、`multi-head.srt`。
- `course-run.txt`：课程 `main.py` 实跑原始输出（画面所有数字的来源）。
- `../app/src/multi-head/`：入口、时间轴与动画绘制（`plate.ts` 用共享 `../explain-kit.ts`）。
- `../app/multi-head.html`：浏览器预览入口。
- `render.py` / `validate.py`：分段渲染与验收。
- `../out/multi-head/multi-head-1080p.mp4`：成片（忽略目录，不入库）。

## 复现

```bash
python3 multi-head/build.py
VOLC_TTS_TOKEN=<key> python3 aieng-tts/narrate.py multi-head
cd app
PDOOM_NO_HMR=1 bunx vite --host 127.0.0.1 --port 5299 --strictPort
# 另一终端，子项目根目录：
python3 multi-head/render.py && python3 multi-head/validate.py
```

需要 Google Chrome、FFmpeg、Bun。预览打开 `http://127.0.0.1:5299/multi-head.html`，点击画面或空格播放。

# 为什么需要 Transformer（07-01）：PDOOM 引擎课程样片

约 255 秒、1920×1080、30 fps，无配音。复用 pdoom-video 的 Three.js Engine、Layer2D 与离线导出器；
新增独立入口 `app/why-transformers.html`，不使用原项目歌曲或歌词。实现父仓库制作计划「Task 11 · 样片 B」
的 12 场景结构；因按用户先前指示跳过音频，旁白改为阅读节奏字幕（每场景 3 段），时长按 T-L 档落在 240–360 秒。

## 文件

- `SCRIPT.md`：分镜、场景表与画面数字出处。
- `build.py`：从场景数据生成 `../app/src/why-transformers/cues.ts`、`../data/why-transformers*.json`、`why-transformers.srt`。
- `course-run.txt`：课程 `main.py` 实跑原始输出（画面所有数字的来源）。
- `../app/src/why-transformers/`：入口、时间轴与动画绘制（`plate.ts` 用共享 `../explain-kit.ts`）。
- `../app/why-transformers.html`：浏览器预览入口。
- `render.py` / `validate.py`：分段渲染与验收。
- `../out/why-transformers/why-transformers-1080p.mp4`：成片（忽略目录，不入库）。

## 复现

```bash
python3 why-transformers/build.py
cd app
PDOOM_NO_HMR=1 bunx vite --host 127.0.0.1 --port 5299 --strictPort
# 另一终端，子项目根目录：
python3 why-transformers/render.py && python3 why-transformers/validate.py
```

需要 Google Chrome、FFmpeg、Bun。预览打开 `http://127.0.0.1:5299/why-transformers.html`，点击画面或空格播放。

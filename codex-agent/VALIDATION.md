# 样片验收（14-01 · 9 场景版）

2026-10-11，按制作计划 Task 12 的 9 场景结构重制并完成验收（旧 7 场景 90 秒版见 git 历史）。

- 成片：`out/codex-agent/agent-loop-codex-1080p.mp4`。
- 1920×1080、30 fps、5495 帧（5494±2 容差内，分段取整）、183.15 秒（T-M 档 180–240 秒），H.264，无音轨。
- `tsc --noEmit` 通过（含共享 `explain-kit.ts` 与三条产线）。
- FFmpeg 全片解码通过；blackdetect（d=0.08）无黑帧。
- 逐场景抽帧 9 张 + 接触表；91.58 s 处成片与渲染器源静帧逐像素平均差 1.99/255（< 3/255 阈值，残差来自运动模糊）。
- 机器可读结果：`media-validation.json`（含 SHA-256）。

同批完成的另两集见 `../perceptron/media-validation.json`（248.56 s，MAE 2.02）与
`../why-transformers/media-validation.json`（254.54 s，MAE 1.98）。

边界与未做项：按用户先前指示跳过音频，字幕为阅读时间轴而非 ASR 对齐；未连接真实模型；
每场景 3 段字幕的结构对齐计划，但未做 TTS 旁白与响度处理。

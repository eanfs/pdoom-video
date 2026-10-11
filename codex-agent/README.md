# Agent 循环（14-01）：PDOOM 引擎课程样片

约 183 秒、1920×1080、30 fps，无配音。复用 pdoom-video 的 Three.js Engine、Layer2D、合成和离线导出器；
新增独立入口，不使用原项目歌曲或歌词。本版按父仓库制作计划「Task 12 · 样片 C」重制为 9 场景结构
（原 7 场景 90 秒测试片升级；git 历史保留旧版）。因按用户先前指示跳过音频，旁白改为阅读节奏字幕
（每场景 3 段），时长按 T-M 档落在 180–240 秒。

## 内容和视觉

片头含「第 14 章 · 智能体工程 / 第 01 节 / Agent 循环」。依次演示：循环总览（观察·决策·执行·回流）、
ReAct 三段式、2026 年原生推理的转变、五大要素（模型/工具/记忆/宿主/停止条件）、工具请求与本地执行
（120 × 0.15 = 18）、同一循环的三类应用、三个具体工程坑、总结。

主色为炭黑 `#161616`、面板灰 `#202020`、灰白 `#f3f3ef`、次级灰 `#a2a29d`，浅绿 `#b0f2b5` 仅用于
活动状态与结果，红 `#efaaa4` 仅用于错误与坑。这是 Codex 启发的设计选择，不是官方品牌规范。
关闭原音乐视频的光晕、颗粒和色差，保证代码与中文可读。

课程来源：父仓库 `phases/14-agent-engineering/01-the-agent-loop/docs/zh.md` 及 `code/main.py`。
原始运行输出保存于 `course-run.txt`。未连接真实模型；JSON 展示工具请求的 action 和 args 字段。

## 文件

- `SCRIPT.md`：分镜与字幕文本（9 场景表）。
- `build.py`：从场景数据生成 `../app/src/codex-agent/cues.ts`、`../data/codex-agent*.json`、`agent-loop.srt`。
- `../app/src/codex-agent/cues.ts`：场景和阅读字幕的唯一时间源。
- `../app/src/codex-agent/plate.ts`：动画绘制（共享 `../explain-kit.ts`）。
- `../app/codex-agent.html`：浏览器预览入口。
- `render.py`：按 cues 时长自动分 15 秒段渲染，两段并行，之后无损拼接。
- `validate.py`：流检查、黑帧扫描、逐场景抽帧、静帧比对，写 `media-validation.json`。
- `../out/codex-agent/agent-loop-codex-1080p.mp4`：成片。
- `agent-loop.srt`：字幕；尚未生成音频，属于临时阅读时间轴。
- `local-engine-provenance.json`：从用户本地项目复制的引擎文件及 SHA-256。

## 复现

```bash
python3 codex-agent/build.py
cd app
PDOOM_NO_HMR=1 bunx vite --host 127.0.0.1 --port 5299 --strictPort
```

另一个终端在子项目根目录运行：

```bash
python3 codex-agent/render.py && python3 codex-agent/validate.py
```

需要 Google Chrome、FFmpeg、Bun。预览打开 `http://127.0.0.1:5299/codex-agent.html`，点击画面或空格播放。
预览使用独立时钟，无音轨依赖。

## 接入状态

该目录为主课程仓库新增的 Git 子模块 `pdoom-video`，上游地址保留为 `https://github.com/mexicat/pdoom-video`。
初始克隆来自用户指定的本地仓库，必要的未提交引擎支持改动按文件复制到此独立检出；原目录没有被修改。
本轮三集样片（03-01、07-01、14-01）的制作代码在本子模块内提交；上游基础提交本身不含这些测试片。
新机器要复现本片，需要同时携带本地改动，而不仅是更新子模块指针。

所有生成视频、分段和抽帧都在忽略的 `out/` 目录；音频继续按用户指示跳过。本轮无模型或配音计费调用。

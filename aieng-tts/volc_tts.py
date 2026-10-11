#!/usr/bin/env python3
"""Volcengine (火山引擎 / 豆包语音) TTS backend for the attention explainer.

Why not arkcli: ARK / arkcli 只能做语音模型的广场检索，不提供语音合成调用
（arkcli 的 skill 明确写了 TTS 只支持 models search；binary 里也没有 openspeech /
voice_type / X-Api-Resource-Id 这些字符串）。所以要走豆包语音自己的接口，
在火山引擎控制台开通「语音合成」后拿到 appid + access token。

Four transports, pick with --style:

  apikey  **默认**，新版控制台发的 API Key：一个字符串就够，不需要 App ID
          POST /api/v3/tts/unidirectional
          header X-Api-Key:<key>   X-Api-Resource-Id: volc.service_type.10029
          响应是若干个 JSON 对象首尾相接，每个带一段 base64 音频，拼起来才是一个完整 mp3
  v1      老的一次性合成：POST JSON，返回单个 {"code":3000,"data":"<base64>"}
          header Authorization: Bearer;<access_token>   （注意是分号）
  raw     同样的 JSON body，但响应体直接是音频字节（自建网关常见）
  openai  OpenAI 形状的 /v1/audio/speech，POST {"model":..., "input":..., "voice":...}

Credentials (env or flags):
  VOLC_TTS_TOKEN     apikey 风格：API Key 本身；其它风格：Access Token
  VOLC_TTS_APPID     只有 v1 风格需要（控制台「语音合成」应用的 App ID）
  VOLC_TTS_RESOURCE_ID  默认 volc.service_type.10029（大模型语音合成）
  VOLC_TTS_VOICE     音色，默认 zh_female_cancan_mars_bigtts
  VOLC_TTS_CLUSTER   v1 的集群，默认 volcano_tts
  VOLC_TTS_ENDPOINT / VOLC_TTS_STYLE

CLI:
  python volc_tts.py --text "小猫坐在垫子上" --out clip.mp3
  python volc_tts.py --text "小猫坐在垫子上" --dry-run     # 只打印请求，不联网、不计费
  python volc_tts.py --probe --token <A> --appid <B>      # 排除是哪一种凭证
"""
import argparse
import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
import uuid

DEFAULT_ENDPOINT = {
    "apikey": "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
    "v1": "https://openspeech.bytedance.com/api/v1/tts",
    "raw": "https://openspeech.bytedance.com/api/v1/tts",
    "openai": "https://openspeech.bytedance.com/api/v3/tts/openai",
}
DEFAULT_RESOURCE_ID = "volc.service_type.10029"   # 大模型语音合成

# A few codes worth naming (含义以控制台错误码文档为准); everything else is printed verbatim
HINTS = {
    3000: "成功",
    3001: "请求参数有误（检查 voice_type / cluster / encoding 拼写）",
    3002: "通常是无权限：应用没开通语音合成，或 token 不属于这个 appid",
    3003: "通常是额度或并发超限：到控制台看剩余额度",
}


def json_objects(raw):
    """Decode every JSON object in a byte string, back to back (the v3 endpoint streams them)."""
    text = raw.decode("utf-8", "replace")
    dec, out, i = json.JSONDecoder(), [], 0
    while i < len(text):
        while i < len(text) and text[i] in " \r\n\t":
            i += 1
        if i >= len(text):
            break
        try:
            obj, j = dec.raw_decode(text, i)
        except ValueError:
            break
        out.append(obj)
        i = j
    return out


class VolcTTS:
    def __init__(self, appid="", token="", cluster="volcano_tts",
                 voice="zh_female_cancan_mars_bigtts", endpoint="", style="apikey",
                 encoding="mp3", speed=1.0, emotion="", model="",
                 resource_id="", sample_rate=24000,
                 uid="attention-explainer", timeout=60, extra_headers=None):
        self.appid = appid or os.environ.get("VOLC_TTS_APPID", "")
        self.token = token or os.environ.get("VOLC_TTS_TOKEN", "")
        self.cluster = cluster or os.environ.get("VOLC_TTS_CLUSTER", "volcano_tts")
        self.voice = voice or os.environ.get("VOLC_TTS_VOICE", "zh_female_cancan_mars_bigtts")
        self.style = style or os.environ.get("VOLC_TTS_STYLE", "apikey")
        self.endpoint = endpoint or os.environ.get("VOLC_TTS_ENDPOINT", "") or DEFAULT_ENDPOINT.get(self.style, DEFAULT_ENDPOINT["apikey"])
        self.resource_id = resource_id or os.environ.get("VOLC_TTS_RESOURCE_ID", "") or DEFAULT_RESOURCE_ID
        self.sample_rate = sample_rate
        self.encoding = encoding
        self.speed = speed
        self.emotion = emotion
        self.model = model
        self.uid = uid
        self.timeout = timeout
        self.extra_headers = extra_headers or {}

    # ---------------------------------------------------------------- request
    def build(self, text):
        """Return (url, headers, body_bytes). Pure: used by --dry-run too."""
        rid = str(uuid.uuid4())
        if self.style == "apikey":
            audio_params = {
                "format": self.encoding,
                "sample_rate": self.sample_rate,
                # v3 的语速是整数偏移量：0 = 正常，不是 v1 的 1.0 倍率
                "speech_rate": int(round((self.speed - 1.0) * 100)),
            }
            if self.emotion:
                audio_params["emotion"] = self.emotion
            body = {
                "user": {"uid": self.uid},
                "req_params": {"text": text, "speaker": self.voice, "audio_params": audio_params},
            }
            headers = {
                "X-Api-Key": self.token,
                "X-Api-Resource-Id": self.resource_id,
                "Content-Type": "application/json",
            }
        elif self.style in ("v1", "raw"):
            body = {
                "app": {"appid": self.appid, "token": self.token, "cluster": self.cluster},
                "user": {"uid": self.uid},
                "audio": {
                    "voice_type": self.voice,
                    "encoding": self.encoding,
                    "speed_ratio": self.speed,
                    "loudness_ratio": 1.0,
                },
                "request": {
                    "reqid": rid,
                    "text": text,
                    "operation": "query",
                    "with_frontend": 1,
                    "frontend_type": "unitTson",
                },
            }
            if self.emotion:
                body["audio"]["emotion"] = self.emotion
            headers = {
                # 火山引擎的 TTS 鉴权就是 "Bearer;<token>"（分号，不是空格）
                "Authorization": "Bearer;" + self.token,
                "Content-Type": "application/json",
            }
        else:  # openai
            body = {"model": self.model or "tts-1", "input": text, "voice": self.voice,
                    "response_format": self.encoding, "speed": self.speed}
            headers = {"Authorization": "Bearer " + self.token, "Content-Type": "application/json"}
        headers["X-Api-Request-Id"] = rid
        headers.update(self.extra_headers)
        return self.endpoint, headers, json.dumps(body, ensure_ascii=False).encode("utf-8")

    # ---------------------------------------------------------------- response
    def parse(self, raw, content_type=""):
        """Return audio bytes, or raise with a readable message."""
        if self.style == "raw" or content_type.startswith("audio/") or raw[:3] in (b"ID3", b"\xff\xfb", b"\xff\xf3", b"RIFF"):
            return raw
        objs = json_objects(raw)
        if not objs:
            raise RuntimeError("expected JSON from the TTS endpoint, got: %r" % raw[:200])
        chunks, codes, messages = [], [], []
        for o in objs:
            hdr = o.get("header") if isinstance(o.get("header"), dict) else {}
            code = o.get("code", hdr.get("code", o.get("status_code")))
            if code is not None:
                codes.append(code)
            msg = o.get("message") or hdr.get("message")
            if msg:
                messages.append(str(msg))
            for k in ("data", "audio", "audio_data", "b64_audio"):
                v = o.get(k)
                if isinstance(v, str) and v:
                    chunks.append(v)
                    break
                if isinstance(v, dict) and v.get("audio"):
                    chunks.append(v["audio"])
                    break
        bad = [c for c in codes if c not in (0, 3000)]
        if bad and not chunks:
            self._fail(bad[0], "; ".join(messages[:2]))
        if chunks:
            # the v3 endpoint streams several JSON objects; one audio file is all of them joined
            return b"".join(base64.b64decode(c) for c in chunks)
        raise RuntimeError("no audio in the response: keys=" + ",".join(sorted(objs[0].keys())))

    def _fail(self, code, message):
        """Turn a gateway error code + message into something actionable."""
        hint = HINTS.get(code, "")
        if "load grant" in message:
            hint = ("App ID 不对，或者这个应用还没开通语音合成 —— 控制台 语音技术 → 语音合成 → 应用管理，"
                    "用那里的 APP ID（通常是一串数字）+ Access Token")
        elif "app key not found" in message:
            hint = "缺 App ID：接口需要 X-Api-App-Id（或 X-Api-App-Key）"
        elif "Invalid X-Api-Key" in message:
            hint = "API Key 不对：--token 要填控制台那个 key 的值（UUID），不是它的名字"
        elif "invalid auth token" in message:
            hint = "Access Token 不对（v1 的 header 是 Authorization: Bearer;<token>，是分号）"
        elif "resource id" in message:
            hint = "缺 X-Api-Resource-Id（大模型音色用 volc.service_type.10029）"
        raise RuntimeError("TTS failed code=%s message=%s%s" % (code, message, ("\n  → " + hint) if hint else ""))

    # ---------------------------------------------------------------- io
    def preflight(self, url):
        """Catch the one mistake everybody makes: reaching for an ARK / Agent Plan key.

        ARK 没有语音合成路由（/api/plan/v3/audio/speech 是空 body 的 404），Agent Plan
        的资源只有 text / image / video。TTS 属于「豆包语音 / 语音技术」，要单独开通，
        用控制台的 App ID + Access Token。
        """
        ark_key = self.token.startswith("ark-")
        ark_url = "ark.cn-beijing.volces.com" in url or "volces.com/api/v3" in url
        if ark_key or ark_url:
            raise RuntimeError(
                "这看起来是 ARK / Agent Plan 的 key 或 endpoint，但它没有语音合成能力：\n"
                "  · /api/plan/v3/audio/speech、/audio/generations、/tts 全部是 404（无此路由）\n"
                "  · Agent Plan 的资源只有 text / image / video 三类\n"
                "  · ARK 平台模型目录里也没有任何 TTS/ASR 模型\n"
                "语音合成请到火山引擎控制台开通「语音技术 → 语音合成」，用它的 App ID 和\n"
                "Access Token（不是 ARK API Key），endpoint 用 openspeech.bytedance.com。\n"
                "边界说明见 attention/README.md。"
            )

    def synthesize(self, text, out_path):
        url, headers, body = self.build(text)
        self.preflight(url)
        if not self.appid and self.style in ("v1", "raw"):
            raise RuntimeError("missing appid (set VOLC_TTS_APPID or --appid)")
        if not self.token:
            raise RuntimeError("missing token: set VOLC_TTS_TOKEN (apikey 风格就是 API Key 本身)")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                raw, ctype = r.read(), r.headers.get("Content-Type", "")
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:  # let parse() turn the error body into the same readable message + hint
                self.parse(raw, e.headers.get("Content-Type", ""))
            except RuntimeError:
                raise
            raise RuntimeError("HTTP %s from %s: %s" % (e.code, url, raw[:400].decode("utf-8", "replace")))
        audio = self.parse(raw, ctype)
        out_path = pathlib.Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(audio)
        return out_path, len(audio)


def probe(appid, token, cluster="volcano_tts", voice="zh_female_cancan_mars_bigtts", text="你好，测试"):
    """Try the shapes people mix up, newest first. Prints one line per attempt, keeps no audio.

    新版控制台只发一个 API Key（名字像 api-key-20251231103750，值是个 UUID），
    用 X-Api-Key 传；老控制台发的是一对 APP ID + Access Token，用 v1 的 Bearer;<token>。
    这里两种都试，省得猜哪条是名字哪条是值。
    """
    attempts = [("X-Api-Key = arg1", VolcTTS(token=appid, voice=voice, style="apikey")),
                ("X-Api-Key = arg2", VolcTTS(token=token, voice=voice, style="apikey"))]
    for label, a, t in (("v1 appid=arg1 token=arg2", appid, token),
                        ("v1 appid=arg2 token=arg1", token, appid),
                        ("v1 appid=arg1 token=arg1", appid, appid),
                        ("v1 appid=arg2 token=arg2", token, token)):
        attempts.append((label, VolcTTS(appid=a, token=t, cluster=cluster, voice=voice, style="v1")))
    print("voice=" + voice + "   (先试新版 API Key，再试 APP ID/Access Token 的四种顺序)")
    for label, t in attempts:
        try:
            url, headers, body = t.build(text)
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as r:
                raw, ct = r.read(), r.headers.get("Content-Type", "")
            audio = t.parse(raw, ct)
            print("  OK    %-26s -> %d bytes of audio" % (label, len(audio)))
            used = "X-Api-Key" if t.style == "apikey" else "v1 Bearer"
            print("\n可用。style=%s，token 用 %s。例如：" % (t.style, label.split("=")[-1].strip()))
            print("  VOLC_TTS_TOKEN='<那个值>' <bundled-python> attention/build.py --tts volc")
            return 0
        except urllib.error.HTTPError as e:
            try:
                j = json.loads(e.read().decode("utf-8", "replace"))
                hdr = j.get("header") or {}
                print("  fail  %-26s http %s %s" % (label, e.code, hdr.get("message") or j.get("message")))
            except Exception:
                print("  fail  %-26s http %s" % (label, e.code))
        except Exception as e:
            print("  fail  %-26s %s" % (label, str(e).splitlines()[0]))
    print("\n没有一种组合被接受。检查：key 是否已删除/轮换；该应用是否开通了语音合成；"
          "音色是否属于这个账号。")
    return 1


def main(argv=None):
    ap = argparse.ArgumentParser(description="Synthesise one line with Volcengine TTS")
    ap.add_argument("--text", default="你好，测试", help="要合成的文本")
    ap.add_argument("--out", default="out.mp3")
    ap.add_argument("--appid", default="")
    ap.add_argument("--token", default="")
    ap.add_argument("--cluster", default="")
    ap.add_argument("--voice", default="")
    ap.add_argument("--endpoint", default="")
    ap.add_argument("--style", default="", choices=["", "apikey", "v1", "raw", "openai"])
    ap.add_argument("--resource-id", default="", help="apikey 风格用，默认 " + DEFAULT_RESOURCE_ID)
    ap.add_argument("--sample-rate", type=int, default=24000)
    ap.add_argument("--encoding", default="mp3", choices=["mp3", "wav", "ogg_opus", "pcm"])
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--emotion", default="")
    ap.add_argument("--model", default="")
    ap.add_argument("--header", action="append", default=[], metavar="K:V")
    ap.add_argument("--dry-run", action="store_true", help="print the request and exit")
    ap.add_argument("--probe", action="store_true",
                    help="try the usual (appid, token) orderings and report which one the service accepts")
    a = ap.parse_args(argv)

    extra = {}
    for h in a.header:
        k, _, v = h.partition(":")
        extra[k.strip()] = v.strip()

    tts = VolcTTS(appid=a.appid, token=a.token, cluster=a.cluster or "volcano_tts",
                  voice=a.voice or "zh_female_cancan_mars_bigtts", endpoint=a.endpoint,
                  style=a.style or "apikey", encoding=a.encoding, speed=a.speed,
                  emotion=a.emotion, model=a.model, resource_id=a.resource_id,
                  sample_rate=a.sample_rate, extra_headers=extra)
    if a.probe:
        return probe(a.appid, a.token, a.cluster or "volcano_tts",
                     a.voice or "zh_female_cancan_mars_bigtts", a.text)

    url, headers, body = tts.build(a.text)
    if a.dry_run:
        shown = dict(headers)
        if "Authorization" in shown:
            shown["Authorization"] = shown["Authorization"][:20] + "...<redacted>"
        print("POST " + url)
        for k, v in shown.items():
            print(k + ": " + v)
        print()
        print(json.dumps(json.loads(body.decode("utf-8")), ensure_ascii=False, indent=2))
        return 0
    try:
        path, n = tts.synthesize(a.text, a.out)
    except RuntimeError as e:
        print("error: " + str(e), file=sys.stderr)
        return 2
    print("wrote %s (%d bytes)" % (path, n))
    return 0


if __name__ == "__main__":
    sys.exit(main())

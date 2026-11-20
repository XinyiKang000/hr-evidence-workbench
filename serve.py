"""Optional localhost bridge for live OpenAI generation."""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/cases.js": ("cases.js", "text/javascript; charset=utf-8"),
    "/core.js": ("core.js", "text/javascript; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
}


def ask_openai(prompt, model, api_key):
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps({"model": model, "input": prompt, "store": False}).encode(),
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=60) as response:
        result = json.load(response)
    if result.get("status") != "completed":
        raise ValueError("OpenAI 未完成生成。")
    text = "\n".join(
        part["text"] for item in result.get("output", [])
        if item.get("type") == "message" and item.get("role") == "assistant"
        for part in item.get("content", []) if part.get("type") == "output_text"
    )
    if not text.strip():
        raise ValueError("模型未返回可用文本。")
    return {"text": text, "model": result.get("model", model)}


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, payload, content_type="application/json; charset=utf-8"):
        if isinstance(payload, dict):
            payload = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def allowed_host(self):
        port = self.server.server_port
        return self.headers.get("Host") in {f"127.0.0.1:{port}", f"localhost:{port}"}

    def do_GET(self):
        if not self.allowed_host():
            return self.reply(403, {"error": "仅供本机访问。"})
        if self.path == "/api/status":
            return self.reply(200, {"ready": bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_MODEL"))})
        asset = ASSETS.get(self.path)
        if not asset:
            return self.reply(404, {"error": "页面不存在。"})
        filename, content_type = asset
        self.reply(200, (ROOT / filename).read_bytes(), content_type)

    def do_POST(self):
        origin = self.headers.get("Origin")
        if not self.allowed_host() or origin != "http://" + self.headers["Host"]:
            return self.reply(403, {"error": "请从工作台页面发起请求。"})
        if self.path != "/api/generate":
            return self.reply(404, {"error": "页面不存在。"})
        if self.headers.get_content_type() != "application/json":
            return self.reply(415, {"error": "请求格式必须为 JSON。"})
        api_key, model = os.getenv("OPENAI_API_KEY"), os.getenv("OPENAI_MODEL")
        if not api_key or not model:
            return self.reply(503, {"error": "请先在本机配置 OPENAI_API_KEY 和 OPENAI_MODEL。"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 32_000:
                raise ValueError
            payload = json.loads(self.rfile.read(size))
            prompt = payload.get("prompt") if isinstance(payload, dict) else None
            if not isinstance(prompt, str) or not prompt.strip():
                raise ValueError
        except (ValueError, TimeoutError):
            return self.reply(400, {"error": "提示词为空或请求格式有误。"})
        try:
            result = ask_openai(prompt, model, api_key)
        except (URLError, ValueError, KeyError, TimeoutError):
            return self.reply(502, {"error": "模型调用未完成。请检查本地 API 配置、额度或网络。"})
        self.reply(200, result)


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", 8765), Handler) as server:
        print("http://127.0.0.1:8765", flush=True)
        server.serve_forever()

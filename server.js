// Tiny dependency-free server: serves the website and proxies caption requests.
// Requires Node.js 18+ and an Anthropic API key in ANTHROPIC_API_KEY.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CAPTION_MODEL || "claude-sonnet-5-5";
const KEY = process.env.ANTHROPIC_API_KEY;
// Free option: set GEMINI_API_KEY (from aistudio.google.com) and Gemini is used instead.
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };

async function caption(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (!KEY && !GEMINI_KEY) return send(500, { error: "Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on the server." });
  try {
    const { prompt, image, mediaType } = JSON.parse(raw);
    if (GEMINI_KEY) {
      const parts = [];
      if (image) parts.push({ inline_data: { mime_type: mediaType, data: image } });
      parts.push({ text: prompt });
      const g = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 400 } })
      });
      const gd = await g.json();
      if (!g.ok) return send(g.status, { error: (gd.error && gd.error.message) || "Gemini API error" });
      const cand = gd.candidates && gd.candidates[0];
      const text = cand && cand.content && cand.content.parts ? cand.content.parts.map(x => x.text || "").join("").trim() : "";
      if (!text) return send(502, { error: "Gemini returned no caption (it may have blocked the image)." });
      return send(200, { text });
    }
    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: image } });
    content.push({ type: "text", text: prompt });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: "user", content }] })
    });
    const data = await r.json();
    if (!r.ok) return send(r.status, { error: (data.error && data.error.message) || "API error" });
    send(200, { text: data.content.filter(b => b.type === "text").map(b => b.text).join("").trim() });
  } catch (e) { send(500, { error: e.message }); }
}

http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/caption") return caption(req, res);
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  const file = path.join(__dirname, path.normalize(p).replace(/^(\.\.[\/\\])+/, ""));
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}).listen(PORT, () => console.log("Image Caption Studio running at http://localhost:" + PORT));
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
let GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GBASE = "https://generativelanguage.googleapis.com/v1beta/";
// If the model name is not found, ask Google which models this key can use and pick a Flash one.
async function discoverModel() {
  const r = await fetch(GBASE + "models?pageSize=200", { headers: { "x-goog-api-key": GEMINI_KEY } });
  const d = await r.json();
  const names = (d.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map(m => m.name.replace(/^models\//, ""))
    .filter(n => /flash/.test(n) && !/(tts|image|live|audio|embed|thinking|exp|8b|latest)/.test(n));
  names.sort((a, b) => (/preview/.test(a) - /preview/.test(b)) || b.localeCompare(a));
  return names[0] || null;
}
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
      const callG = () => fetch(GBASE + "models/" + GEMINI_MODEL + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 400 } })
      });
      let g = await callG();
      let gd = await g.json();
      if (g.status === 404 && !process.env.GEMINI_MODEL) {
        const found = await discoverModel();
        if (found) { GEMINI_MODEL = found; console.log("Using Gemini model " + found); g = await callG(); gd = await g.json(); }
      }
      if (!g.ok) return send(g.status, { error: "Gemini (" + GEMINI_MODEL + "): " + ((gd.error && gd.error.message) || "API error") });
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
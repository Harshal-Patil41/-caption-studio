(function () {
  var $ = function (i) { return document.getElementById(i) };
  var drop = $("drop"), fileIn = $("file"), go = $("go"), out = $("out"), err = $("err"), copy = $("copy"), regen = $("regen"), dl = $("dl"),
    info = $("info"), clear = $("clear"), count = $("count"), histEl = $("hist"), hEmpty = $("hEmpty"), steps = document.querySelectorAll(".step");
  var blob = null, url = null, sample = null, busy = false, hist = [];

  claude.use("sample").then(function (s) { sample = s; if (!s) err.textContent = "The caption service is not available in this view. Please open the page from your Claude account." }).catch(function () { });

  function setStep(n) { steps.forEach(function (s, i) { s.classList.toggle("on", i === n); s.classList.toggle("done", i < n) }) }
  function seg(id) {
    $(id).onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $(id).querySelectorAll("button").forEach(function (x) { x.classList.remove("on") }); b.classList.add("on"); if (blob) setStep(1)
    }
  }
  seg("tone"); seg("len");
  function val(id) { return $(id).querySelector(".on").dataset.v }

  function setFile(f) {
    if (!f || !/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { err.textContent = "Please choose a JPG, PNG, WebP or GIF image."; return }
    err.textContent = ""; blob = f; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(f);
    var img = document.createElement("img"); img.alt = "Uploaded preview"; img.src = url;
    drop.innerHTML = ""; drop.appendChild(img);
    info.textContent = f.name + " · " + (f.size / 1024).toFixed(0) + " KB"; clear.hidden = false; go.disabled = false;
    out.className = "out ph"; out.textContent = "Ready. Choose your preferences and click Generate caption.";
    count.textContent = ""; copy.disabled = regen.disabled = dl.disabled = true; setStep(1); window.DIP && DIP.load(f);
  }
  drop.onclick = function () { fileIn.click() };
  drop.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileIn.click() } };
  fileIn.onchange = function () { setFile(fileIn.files[0]) };
  ["dragover", "dragenter"].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add("over") }) });
  ["dragleave", "drop"].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove("over") }) });
  drop.addEventListener("drop", function (e) { setFile(e.dataTransfer.files[0]) });
  document.addEventListener("paste", function (e) { var it = [].find.call(e.clipboardData.items || [], function (i) { return i.type.indexOf("image/") === 0 }); if (it) setFile(it.getAsFile()) });
  clear.onclick = function () {
    blob = null; fileIn.value = ""; drop.innerHTML = '<span>🖼️<br><b>Click to upload</b>, drag &amp; drop, or paste (Ctrl+V)<br><small>JPG, PNG, WebP, GIF</small></span>';
    info.textContent = ""; clear.hidden = true; go.disabled = true; out.className = "out ph"; out.textContent = "Your caption will appear here once an image is uploaded.";
    count.textContent = ""; copy.disabled = regen.disabled = dl.disabled = true; setStep(0); window.DIP && DIP.clear()
  };

  function stats(t) { var w = t.trim().split(/\s+/).length; count.textContent = w + " words · " + t.length + " characters" }
  function renderHist() {
    hEmpty.hidden = hist.length > 0; histEl.innerHTML = "";
    hist.forEach(function (h) {
      var li = document.createElement("li"), im = document.createElement("img"), sp = document.createElement("span");
      im.src = h.url; im.alt = ""; sp.textContent = h.text; li.append(im, sp);
      li.onclick = function () { out.className = "out"; out.textContent = h.text; stats(h.text); copy.disabled = dl.disabled = false; window.scrollTo({ top: 0, behavior: "smooth" }) };
      histEl.appendChild(li)
    })
  }

  var MSG = { not_granted: "Permission was declined. Reload the page and allow access to generate captions.", rate_limited: "Too many requests. Please wait a moment and try again.", image_rejected: "That image could not be processed. Please try a different one.", session_expired: "Please sign in again and retry." };

  async function run() {
    if (busy || !blob) return;
    if (!sample) { err.textContent = "The caption service is not available in this view."; return }
    busy = true; err.textContent = ""; go.disabled = true; copy.disabled = regen.disabled = dl.disabled = true;
    out.className = "out"; out.textContent = "Analysing image…"; drop.classList.add("scan"); setStep(2);
    var prompt = "Look at the attached image and write a caption. Tone: " + val("tone") + ". Length: " + val("len") + ". Language: " + $("lang").value + ". Reply with only the caption text.";
    try {
      var sb = (window.DIP && await DIP.blob()) || blob; var r = await sample(prompt, { images: sb, modelTier: "quick", cache: false, onText: function (u) { out.textContent = u.text } });
      var t = r.text.trim(); out.textContent = t; stats(t); copy.disabled = regen.disabled = dl.disabled = false;
      hist.unshift({ url: url, text: t }); hist = hist.slice(0, 5); renderHist();
    } catch (e) {
      out.className = "out ph"; out.textContent = "Ready. Choose your preferences and click Generate caption."; setStep(1);
      if (e && e.code !== "cancelled") err.textContent = MSG[e.code] || (e && e.code === "error" && e.message && e.message !== "error" ? "Error: " + e.message : "Something went wrong. Please try again.");
    } finally { busy = false; go.disabled = false; drop.classList.remove("scan") }
  }
  go.onclick = run; regen.onclick = run;
  copy.onclick = function () {
    var t = out.textContent, d = function () { copy.textContent = "Copied ✓"; setTimeout(function () { copy.textContent = "📋 Copy" }, 1500) };
    try { navigator.clipboard.writeText(t).then(d, function () { fb(t); d() }) } catch (e) { fb(t); d() }
  };
  function fb(t) { var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy") } catch (e) { } a.remove() }
  dl.onclick = async function () {
    try {
      var d = await claude.use("downloads"); if (!d) { err.textContent = "Saving is not available here. Please use Copy instead."; return }
      await d.save({ filename: "caption.txt", data: new Blob([out.textContent], { type: "text/plain" }) })
    } catch (e) { }
  };
})();
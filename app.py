import base64, time
import cv2, numpy as np, torch
from flask import Flask, jsonify, render_template, request
from PIL import Image, UnidentifiedImageError
from transformers import BlipProcessor, BlipForConditionalGeneration

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

MODEL = "Salesforce/blip-image-captioning-base"
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Loading BLIP model (first run downloads ~1 GB)...")
processor = BlipProcessor.from_pretrained(MODEL)
model = BlipForConditionalGeneration.from_pretrained(MODEL).to(device).eval()
print("Model ready on", device)

def to_b64(img):
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()

def dip_pipeline(pil):
    """Classic DIP steps shown to the user."""
    bgr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    eq = cv2.equalizeHist(gray)
    edges = cv2.Canny(blur, 80, 160)
    hist = cv2.calcHist([gray], [0], None, [64], [0, 256]).flatten().tolist()
    h, w = gray.shape
    stats = {
        "width": w, "height": h,
        "brightness": round(float(gray.mean()), 1),
        "contrast": round(float(gray.std()), 1),
        "edge_density": round(float((edges > 0).mean() * 100), 2),
    }
    stages = [
        {"name": "Original", "note": "Resized to max 1024 px", "img": to_b64(bgr)},
        {"name": "Grayscale", "note": "Weighted sum of R, G, B", "img": to_b64(gray)},
        {"name": "Histogram equalised", "note": "Spreads out the intensity levels", "img": to_b64(eq)},
        {"name": "Canny edges", "note": "Gaussian blur, then gradient thresholds", "img": to_b64(edges)},
    ]
    return stages, hist, stats

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/caption", methods=["POST"])
def caption():
    f = request.files.get("image")
    if not f:
        return jsonify(error="No image received. Choose a file and try again."), 400
    try:
        pil = Image.open(f.stream).convert("RGB")
    except (UnidentifiedImageError, OSError):
        return jsonify(error="That file isn't a readable image. Use JPG, PNG or WEBP."), 400
    pil.thumbnail((1024, 1024))

    stages, hist, stats = dip_pipeline(pil)

    t0 = time.time()
    inputs = processor(images=pil, return_tensors="pt").to(device)  # resize 384, normalise
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=40, num_beams=5, num_return_sequences=3)
    caps = []
    for o in out:
        c = processor.decode(o, skip_special_tokens=True).strip()
        if c and c not in caps:
            c = c[0].upper() + c[1:]
            caps.append(c)
    stats["inference_s"] = round(time.time() - t0, 2)
    stats["device"] = device

    return jsonify(caption=caps[0], alternatives=caps[1:], stages=stages, histogram=hist, stats=stats)

if __name__ == "__main__":
    app.run(debug=False, port=5000)

# AI Image Caption Generator (Digital Image Processing project)

Flask backend + BLIP (Hugging Face) captioning model + OpenCV preprocessing views.

## Run
    python -m venv venv && venv\Scripts\activate      (Windows)   |   source venv/bin/activate (Mac/Linux)
    pip install -r requirements.txt
    python app.py
Open http://127.0.0.1:5000  (first start downloads the model once, ~1 GB, needs internet).

## Pipeline
1. Upload (drag and drop or browse) -> Flask `/api/caption`
2. Pillow decode + resize (max 1024 px)
3. OpenCV: grayscale, histogram equalisation, Gaussian blur, Canny edges, histogram, stats
4. BLIP: resize to 384x384, normalise, ViT encoder -> text decoder, beam search (5 beams) -> 3 captions
5. JSON back to the page, which renders caption, stages, histogram, stats

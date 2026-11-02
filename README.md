# Image Caption Studio

A website that generates captions for uploaded images and analyses them using
digital image processing (DIP) techniques, all running in the browser.

## Run it
1. Install Node.js 18 or newer.
2. Get an Anthropic API key and set it:
   - Windows (PowerShell): `$env:ANTHROPIC_API_KEY="your-key"`
   - Mac/Linux: `export ANTHROPIC_API_KEY="your-key"`
3. In this folder run `node server.js`
4. Open http://localhost:3000

The DIP panel works without a key. Only caption generation needs one.
Do not put your key inside the HTML or JavaScript files. It stays on the server.

## Project structure
- `index.html`: page layout
- `css/style.css`: styling (dark theme, glass cards)
- `js/main.js`: upload, options, caption generation, history, copy and save
- `js/dip.js`: image processing (all implemented from scratch on canvas pixels)
- `js/background.js`: animated cracked-tile background (canvas)
- `js/adapter.js`: sends caption requests to the local server
- `server.js`: serves the site and calls the captioning API

## DIP concepts used (js/dip.js)
| Concept | Method |
|---|---|
| Resize and normalize | Scale to max 1024 px before captioning |
| Grayscale | Y = 0.299R + 0.587G + 0.114B |
| Histogram | Intensity counts for RGB and gray |
| Histogram equalization | CDF mapping |
| Brightness and contrast | g(x) = c(f(x) - 128) + 128 + b |
| Edge detection | Sobel Gx and Gy kernels |
| Gaussian blur | 3x3 kernel [1 2 1; 2 4 2; 1 2 1] / 16 |
| Sharpening | Kernel [0 -1 0; -1 5 -1; 0 -1 0] |
| Thresholding | Otsu's method |
| Dominant colours | k-means clustering, k = 5 |

## Pipeline
Upload, resize and normalize, enhance, analyse, then caption.

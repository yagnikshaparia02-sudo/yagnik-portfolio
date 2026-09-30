# Yagnik's portfolio

A static portfolio with home, résumé and experience pages. Serve the repository as static files; no npm install or build step is required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Layout and motion

- `portfolio.css`: shared navigation, fluid layout and responsive rules. The portrait is visible at widths of 768px and above, and hidden below 768px. The mobile/tablet navigation menu is used below 1100px.
- `portfolio.js`: particle network, typewriter, menu, scroll reveals, motion toggle, portrait fallback and back-to-top control. Animation pauses when the page is hidden; the canvas also pauses when its section is offscreen. The device's reduced-motion preference is respected.
- `index.html`, `Resume.dc.html`, `Experience.dc.html`: page content and component lifecycle hooks.
- `support.js`: generated design-canvas runtime; do not edit by hand. It loads React from unpkg. Google Fonts are also external; system fonts are fallbacks.
- `assets/`: existing portrait and downloadable CV.

## Browser checks

Visit `http://localhost:8000/tests/responsive.html` and select **Run all checks**. The harness checks all three pages at 16 widths from 320px to 2560px, including either side of the portrait and navigation breakpoints. It checks horizontal overflow, photo visibility, header height, menu keyboard behavior, motion pause, principles filters and FAQ disclosure. The controls also provide a preview at each width.

For manual QA, scroll the homepage, test the links and CV download, resize a browser across 767/768px, and enable the operating system's reduced-motion preference. Verify on Safari/iOS and Chrome/Android before a production release.

# Beyaricko Degu · Portfolio

[![Live Site](https://img.shields.io/badge/Live-jerichonega.github.io%2Fportfolio-00e5d4?style=flat-square&logo=github)](https://jerichonega.github.io/portfolio/)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

Personal portfolio of Beyaricko Degu, AI automation engineer and web developer based in the Netherlands.

## Features

- Dark, cyan-accented design with subtle grid background and scroll reveal
- Project cards with live screenshots, live demo and code links
- Working contact form via [FormSubmit](https://formsubmit.co) (AJAX, honeypot spam trap)
- Downloadable PDF CV generated from `cv.html`
- SEO: canonical URLs, Open Graph / Twitter image, JSON-LD Person data, `sitemap.xml`
- Accessibility: skip link, labelled form fields, visible focus, `aria-expanded` menu, `prefers-reduced-motion` support, AA text contrast
- Zero frameworks: pure HTML, CSS and vanilla JavaScript

## Project Structure

```
portfolio/
├── index.html                  # Homepage (markup only)
├── cv.html                     # Web CV (print-ready)
├── *.html                      # Articles and PPD archive
├── sitemap.xml
├── assets/
│   ├── css/style.css           # All shared styles and tokens
│   ├── js/main.js              # Typewriter, reveal, menu, contact form
│   ├── img/                    # Favicon, OG image, project screenshots
│   └── Beyaricko-Degu-CV.pdf   # Regenerate after editing cv.html (see below)
└── .github/workflows/pages.yml # Deploys to GitHub Pages on push to main
```

## Run Locally

No build step needed. Just open `index.html` in a browser:

```bash
# Clone the repo
git clone https://github.com/jerichoNega/portfolio.git
cd portfolio

# Open directly
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

## Design Decisions

- **No framework** — keeps the repo approachable and load time near-zero
- **CSS custom properties** — all colours and tokens in `:root` for easy theming
- **IntersectionObserver** — performant scroll reveal without scroll event listeners
- **`defer` on scripts** — JS loads after HTML parse, no render blocking

## Updating the CV PDF

After editing `cv.html`, regenerate the PDF with headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --no-pdf-header-footer --print-to-pdf=assets/Beyaricko-Degu-CV.pdf "file://$PWD/cv.html"
```

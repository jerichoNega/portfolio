# Beyaricko Degu — Portfolio

[![Live Site](https://img.shields.io/badge/Live-jerichonega.github.io%2Fportfolio-00e5d4?style=flat-square&logo=github)](https://jerichonega.github.io/portfolio/)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

Personal portfolio site for Beyaricko Degu — Engineer · Builder · Strategist.

## Features

- Dark cyberpunk aesthetic with scanline overlay and animated grid background
- Cursor-following glow effect
- Typewriter role animation
- Scroll-triggered reveal animations via IntersectionObserver
- Mobile-responsive layout with hamburger navigation
- Skills, Services, Portfolio, Blog, and Contact sections
- Zero frameworks — pure HTML, CSS, and vanilla JavaScript

## Project Structure

```
portfolio/
├── index.html          # Markup only — no embedded styles or scripts
├── assets/
│   ├── css/
│   │   └── style.css   # All styles, variables, animations, responsive rules
│   └── js/
│       └── main.js     # Typewriter, scroll reveal, hamburger, form feedback
├── resume.pdf          # CV download (add your own)
└── README.md
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

## What's Next

- [ ] Wire blog articles to real content
- [ ] Add live demo link for AI Content Engine
- [ ] Connect contact form to a backend or Formspree
- [ ] Add Open Graph image for social previews

# Portfolio

Source of [jerichonega.github.io/portfolio](https://jerichonega.github.io/portfolio/), the site of Beyaricko (Jericho) Degu, web developer in Eindhoven.

Plain HTML, CSS and JavaScript, no framework and no build step. GitHub Actions deploys `main` to Pages.

- `index.html`, `cv.html`, articles
- `assets/css/site.css`: tokens and all styles
- `assets/js/site.js`: the live page measurements in the hero, and the contact form (Web3Forms; the access key is public by design)
- `assets/fonts/`: Atkinson Hyperlegible Next, self-hosted, SIL Open Font License

The hero reads its own LCP, CLS and page weight from the Performance API, so a visitor sees real numbers from their own device.

Run it with `python3 -m http.server` in this folder.

After editing `cv.html`, regenerate the PDF:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --no-pdf-header-footer --print-to-pdf=assets/Beyaricko-Degu-CV.pdf "file://$PWD/cv.html"
```

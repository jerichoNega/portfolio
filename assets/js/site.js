// Name field, agent pipeline simulation, scroll work, page measurements, contact form.

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Name field: the h1 is a grid of pixels. The pointer squeezes them aside and a photo opens in the gap.
   Touch screens have no hover, so there the name plays the same thing on its own, and a sideways drag takes over. */
const nameWrap = document.querySelector('.name-wrap');
const canvas = document.getElementById('field');
if (canvas && !calm) {
  const INK = '#f1f0ea', HOT = '#ff5a1f';
  const SWEEP = 3600, REST = 900;
  const h1 = document.getElementById('name');
  const side = nameWrap.querySelector('.side');
  const ctx = canvas.getContext('2d');
  const tiny = document.createElement('canvas');
  const tctx = tiny.getContext('2d');
  const noHover = matchMedia('(hover: none)').matches;
  const photos = [];
  const bodyFont = getComputedStyle(document.body).fontFamily;
  let W, H, nameH, step, size, wMax, band, px = [], home = [], pointer = null, visible = true, awake = 0;
  let open = 0, cx = 0, shown = 0, travel = 0, swapAt = 0, closing = false, sweepFrom = 0;

  const sample = draw => {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#fff';
    draw(c);
    const data = c.getImageData(0, 0, W, H).data;
    const pts = [];
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      if (data[((y | 0) * W + (x | 0)) * 4 + 3] > 128) pts.push([x, y]);
    }
    return pts;
  };

  const build = () => {
    const box = nameWrap.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const lines = [...h1.children].map(s => s.getBoundingClientRect());
    const font = parseFloat(getComputedStyle(h1).fontSize);
    W = Math.round(box.width);
    H = Math.round(box.height);
    nameH = Math.round(h1.getBoundingClientRect().bottom - box.top);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    step = Math.max(3, Math.min(6, Math.round(W / 240)));
    size = step * 0.76;
    wMax = W < 600 ? Math.min(nameH * .5, W * .24) : Math.min(nameH * .4, W * .2);
    band = Math.max(W * .14, 44);
    cx = W / 2;

    const latin = sample(c => {
      c.font = `900 ${font}px AnybodyName`;
      c.textBaseline = 'middle';
      [...h1.children].forEach((s, i) => c.fillText(s.textContent.toUpperCase(), lines[i].left - box.left, lines[i].top - box.top + lines[i].height / 2));
    });
    home = latin;
    px = home.map(([x, y]) => ({ x, y, vx: 0, vy: 0 }));
    awake = 2;
  };

  /* The photo is always drawn whole into the gap, so it is squeezed while the gap opens. It settles from a
     slight zoom, anchored at the top so a head is never cut, and lags the pointer a little.
     It starts as blocks the size of the name pixels and sharpens as it reaches full width. */
  const drawPhoto = (w, x, lag) => {
    const img = photos[shown % photos.length];
    const ratio = (2 * wMax) / nameH, iw = img.naturalWidth, ih = img.naturalHeight;
    const sw = Math.min(iw, ih * ratio), sh = sw / ratio, sx = (iw - sw) / 2;
    const dw = 2 * w, block = step * (1 + (1 - open) * (1 - open) * 9);
    const zoom = 1.05 + (1 - open) * .14, spare = dw * (zoom - 1) / 2;
    const left = x - w - spare + Math.max(-spare, Math.min(spare, lag * .2));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - w, 0, dw, nameH); ctx.clip();
    if (open > .97) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, sx, 0, sw, sh, left, 0, dw * zoom, nameH * zoom);
    } else {
      tiny.width = Math.max(1, Math.ceil(dw / block));
      tiny.height = Math.max(1, Math.ceil(nameH / block));
      tctx.drawImage(img, sx, 0, sw, sh, 0, 0, tiny.width, tiny.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tiny, left, 0, dw * zoom, nameH * zoom);
    }
    ctx.restore();
  };

  /* A strip along the bottom of the photo, sliding in once the gap is fully open */
  const drawJoke = (w, x) => {
    const text = photos[shown % photos.length].joke;
    const show = Math.min(1, (open - .86) / .12);
    if (show <= 0) return;
    const font = Math.max(11, Math.min(20, wMax * .085)), pad = font * .7, room = 2 * w - pad * 2;
    ctx.font = `700 ${font}px ${bodyFont}`;
    const lines = [''];
    for (const word of text.split(' ')) {
      const next = `${lines[lines.length - 1]} ${word}`.trim();
      if (ctx.measureText(next).width > room && lines[lines.length - 1]) lines.push(word);
      else lines[lines.length - 1] = next;
    }
    const lh = font * 1.2, tall = lines.length * lh + pad * 1.4, top = nameH - tall * show;
    ctx.fillStyle = '#04040a';
    ctx.fillRect(x - w, top, 2 * w, tall * show);
    ctx.save();
    ctx.beginPath(); ctx.rect(x - w, top, 2 * w, tall * show); ctx.clip();
    ctx.fillStyle = INK;
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x - w + pad, top + pad * .7 + i * lh));
    ctx.restore();
  };

  const frame = now => {
    if (visible && W) {
      const ready = photos.length > 0;
      let goal = null;
      if (pointer) goal = pointer.x;
      else if (noHover && ready) {
        const t = now - sweepFrom;
        if (t > SWEEP + REST) { sweepFrom = now; shown++; cx = W * .22; }
        else if (t < SWEEP) goal = W * (.5 - .28 * Math.cos(t / SWEEP * Math.PI));
      }
      if (goal !== null || open > .002 || awake > 0) {
        const held = goal !== null && ready;
        if (held) {
          const from = cx;
          cx += (Math.min(W - wMax, Math.max(wMax, goal)) - cx) * .16;
          travel += Math.abs(cx - from);
          if (pointer && !closing && open > .9 && (travel > W * .3 || now - swapAt > 2800)) closing = true;
        }
        open += ((held && !closing ? 1 : 0) - open) * (closing ? .26 : .13);
        if (closing && open < .05) { closing = false; shown++; travel = 0; swapAt = now; }
        if (open < .002 && !held) open = 0;
        const w = wMax * open, span = w + band;

        const R = Math.max(70, W * 0.085), R2 = R * R;
        let moving = 0;
        ctx.clearRect(0, 0, W, H);
        if (open > .01) { drawPhoto(w, cx, (goal ?? cx) - cx); drawJoke(w, cx); }
        ctx.fillStyle = INK;
        const hot = [];
        for (let i = 0; i < px.length; i++) {
          const p = px[i], h = home[i];
          let tx = h[0];
          if (open > .002) {
            const d = h[0] - cx, a = Math.abs(d);
            if (a < span) tx = cx + (d < 0 ? -1 : 1) * (w + a / span * band);
          }
          p.vx = (p.vx + (tx - p.x) * 0.075) * 0.78;
          p.vy = (p.vy + (h[1] - p.y) * 0.055) * 0.8;
          if (pointer && !ready) {
            const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 1) {
              const d = Math.sqrt(d2), f = (1 - d / R) * 5.5;
              p.vx += dx / d * f; p.vy += dy / d * f;
            }
          }
          p.x += p.vx; p.y += p.vy;
          const speed = Math.abs(p.vx) + Math.abs(p.vy);
          if (speed > 0.05) moving++;
          if (speed > 1.6) hot.push(p); else ctx.fillRect(p.x, p.y, size, size);
        }
        ctx.fillStyle = HOT;
        for (const p of hot) ctx.fillRect(p.x, p.y, size, size);
        awake = moving ? 2 : awake - 1;
        if (side) side.classList.toggle('under', W >= 600 && open > .1 && cx + w > W * .64);
      }
    }
    requestAnimationFrame(frame);
  };

  const place = e => {
    const r = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const enter = e => {
    place(e);
    if (open < .05) { cx = pointer.x; shown++; travel = 0; swapAt = performance.now(); }
  };
  const leave = () => { pointer = null; closing = false; sweepFrom = performance.now() + 500; };

  const loadPhotos = () => {
    const set = {
      signing: 'Terrible photo. Great diploma.',
      together: 'Sorry about the photos, haha. The code is better.',
      gown: noHover ? 'Scroll down, the work is better.' : 'You hovered for this? Scroll down, the work is better.'
    };
    for (const name in set) {
      const img = new Image();
      img.joke = set[name];
      img.onload = () => { photos.push(img); if (photos.length === 1) sweepFrom = performance.now(); };
      img.src = `assets/img/hero/${name}.webp`;
    }
  };

  document.fonts.load('900 100px AnybodyName', 'JERICHODGU').then(() => {
    document.documentElement.classList.add('has-field');
    build();
    requestAnimationFrame(frame);
    if (document.readyState === 'complete') loadPhotos(); else addEventListener('load', loadPhotos);
    canvas.addEventListener('pointerenter', enter);
    canvas.addEventListener('pointerdown', enter);
    canvas.addEventListener('pointermove', place);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', leave);
    canvas.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    let width = innerWidth, wait;
    addEventListener('resize', () => {
      if (innerWidth === width) return;
      width = innerWidth;
      clearTimeout(wait);
      wait = setTimeout(build, 200);
    });
  });
}

/* Build, Measure, Reach, Automate: each word gets a small version of the pixels in the name.
   A scene returns where every pixel should be at time t, and t = null is its resting picture.
   Colour: 0 ink, 1 teal, 2 orange. Coordinates are grid cells. */
const verbCanvases = [...document.querySelectorAll('.verb')];
if (verbCanvases.length) {
  const CELL = 6, DOT = 4.5, COLOURS = ['#f1f0ea', '#00e0c2', '#ff5a1f'];
  const smooth = v => v * v * (3 - 2 * v);
  const SCENES = {
    /* A page assembles block by block out of the loose pixels along the bottom */
    build(C, R) {
      const half = Math.round(C * .5), third = Math.floor(C / 3);
      const blocks = [[0, 0, C, 1], [0, 2, Math.round(C * .42), 2], [0, 5, Math.round(C * .16), 2], [half, 2, C - half, 5],
        [0, 8, third - 1, 3], [third, 8, third - 1, 3], [third * 2, 8, C - third * 2, 3]];
      const slots = [];
      blocks.forEach(([x, y, w, h], b) => {
        for (let i = 0; i < w * h; i++) slots.push({ x: x + i % w, y: y + Math.floor(i / w), at: b + i / (w * h) });
      });
      return {
        loop: 5,
        at: t => {
          const built = t === null ? 99 : Math.min(1, (t % 5) / 3.6) * blocks.length;
          return slots.map((s, i) => built > s.at ? [s.x, s.y, t !== null && built - s.at < .4 ? 1 : 0] : [(i * 7) % C, R - 1, 0]);
        }
      };
    },
    /* A scan runs over slow, tall bars and leaves them short */
    measure(C, R) {
      const n = Math.floor(C / 2);
      return {
        loop: 4.4,
        at: t => {
          const scan = t === null ? n + 2 : Math.min(1, (t % 4.4) / 3.2) * (n + 2);
          const out = [];
          for (let i = 0; i < n; i++) {
            const done = i < scan - 1, h = done ? 2 + (i * 5) % 3 : 6 + (i * 37) % 6, here = Math.abs(i - scan) < 1.5;
            for (let j = 0; j < R; j++) out.push([i * 2, R - 1 - Math.min(j, h - 1), here ? 2 : done && t !== null ? 1 : 0]);
          }
          return out;
        }
      };
    },
    /* One page, several markets: pixels fan out from a source along separate routes */
    reach(C, R) {
      const ends = [0, 2.75, 5.5, 8.25, 11].map(v => v * (R - 1) / 11), mid = (R - 1) / 2, per = Math.floor(C / 2);
      const fixed = [];
      for (let y = -1; y <= 1; y++) for (let x = 0; x < 3; x++) fixed.push([x, Math.round(mid) + y, 0]);
      ends.forEach(y => { for (let x = 0; x < 3; x++) fixed.push([C - 3 + x, Math.round(y), 0]); });
      return {
        loop: 5,
        at: t => {
          const out = fixed.map(f => [f[0], f[1], t === null ? 0 : 2]);
          ends.forEach((end, b) => {
            for (let i = 0; i < per; i++) {
              const u = (i / per + (t || 0) * .16) % 1;
              out.push([3 + u * (C - 6), mid + (end - mid) * smooth(Math.min(1, u * 1.5)), t !== null && i % 6 === 0 ? 1 : 0]);
            }
          });
          return out;
        }
      };
    },
    /* Work goes round on its own and waits at one gate for a person */
    automate(C, R) {
      const flat = C - 1, tall = R - 1, P = 2 * (flat + tall), start = flat / 2;
      const along = s => {
        let d = (((s % 1) + 1) % 1) * P;
        if (d < start) return [start - d, tall];
        d -= start;
        if (d < tall) return [0, tall - d];
        d -= tall;
        if (d < flat) return [d, 0];
        d -= flat;
        if (d < tall) return [flat, d];
        return [flat - (d - tall), tall];
      };
      const track = [];
      for (let d = 0; d < P; d += 2) track.push(along(d / P));
      const warp = u => u < .42 ? u / .42 * .5 : u < .6 ? .5 : .5 + (u - .6) / .4 * .5;
      return {
        loop: 7,
        at: t => {
          const out = track.map(([x, y]) => [x, y, 0]);
          let waiting = false;
          for (let k = 0; k < 4; k++) {
            const u = ((t || 0) / 7 + k / 4) % 1, held = u >= .42 && u < .6;
            waiting = waiting || held;
            for (let j = 0; j < 6; j++) {
              const [x, y] = along(warp(u) - j * 1.1 / P);
              out.push([x, y, t === null ? 0 : held ? 2 : 1]);
            }
          }
          for (let y = 1; y < 4; y++) out.push([Math.round(flat / 2), y, t === null ? 0 : waiting ? 2 : 1]);
          return out;
        }
      };
    }
  };

  const items = verbCanvases.map(el => ({ el, ctx: el.getContext('2d'), t: 0, active: false, until: 0, px: [] }));
  const place = item => {
    const box = item.el.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    item.el.width = box.width * dpr; item.el.height = box.height * dpr;
    item.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    item.w = box.width; item.h = box.height;
    item.scene = SCENES[item.el.dataset.verb](Math.floor(box.width / CELL), Math.floor(box.height / CELL));
    item.px = item.scene.at(null).map(([x, y]) => ({ x: x * CELL, y: y * CELL, vx: 0, vy: 0, k: 0 }));
  };
  const paint = item => {
    item.ctx.clearRect(0, 0, item.w, item.h);
    for (let k = 0; k < 3; k++) {
      item.ctx.fillStyle = COLOURS[k];
      for (const p of item.px) if (p.k === k) item.ctx.fillRect(p.x, p.y, DOT, DOT);
    }
  };
  items.forEach(i => { place(i); paint(i); });

  if (!calm) {
    let running = false, last = 0;
    const tick = now => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      let busy = false;
      for (const item of items) {
        if (item.until && now > item.until) { item.until = 0; item.active = item.held || false; }
        if (!item.active && !item.moving) continue;
        if (item.active) item.t += dt;
        const goal = item.scene.at(item.active ? item.t : null);
        let moving = 0;
        item.px.forEach((p, i) => {
          const [gx, gy, k] = goal[i], tx = gx * CELL, ty = gy * CELL;
          if (Math.abs(tx - p.x) > item.w * .5) { p.x = tx; p.vx = 0; } // a route restarting, not a move
          p.vx = (p.vx + (tx - p.x) * .12) * .72;
          p.vy = (p.vy + (ty - p.y) * .12) * .72;
          p.x += p.vx; p.y += p.vy;
          const speed = Math.abs(p.vx) + Math.abs(p.vy);
          if (speed > .05) moving++;
          p.k = speed > 8 ? 2 : k;
        });
        item.moving = moving > 0;
        paint(item);
        busy = busy || item.active || item.moving;
      }
      if (busy) requestAnimationFrame(tick); else running = false;
    };
    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(tick);
    };
    const hold = (item, on) => {
      item.held = on;
      item.active = on || !!item.until;
      if (on && !item.t) item.t = 0;
      if (!on && !item.until) item.t = 0;
      item.moving = true;
      wake();
    };

    const touch = matchMedia('(hover: none)').matches;
    for (const item of items) {
      const row = item.el.closest('article');
      if (touch) {
        new IntersectionObserver(([e]) => hold(item, e.isIntersecting), { rootMargin: '-35% 0px -35% 0px' }).observe(row);
      } else {
        row.addEventListener('pointerenter', () => hold(item, true));
        row.addEventListener('pointerleave', () => hold(item, false));
        /* One pass when the row first scrolls in, for anyone who never hovers */
        const once = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          once.disconnect();
          item.t = 0;
          item.until = performance.now() + item.scene.loop * 1000;
          item.active = true;
          item.moving = true;
          wake();
        }, { threshold: .7 });
        once.observe(row);
      }
    }
  }

  let wideVerbs = innerWidth, waitVerbs;
  addEventListener('resize', () => {
    if (innerWidth === wideVerbs) return;
    wideVerbs = innerWidth;
    clearTimeout(waitVerbs);
    waitVerbs = setTimeout(() => items.forEach(i => { place(i); paint(i); }), 200);
  });
}

/* Content bot: Search Console first, update before new. Invented shop, invented numbers. */
const gscEl = document.getElementById('gsc');
if (gscEl) {
  const TITLE_CHECKS = ['Under 60 characters', 'Top query in the first half', 'Matches what the page says', 'No claim without a source', 'Not used on another page'];
  const PAGES = [
    { url: '/brewing-guide', kind: 'A', clicks: [410, 262], impr: [21000, 20400], pos: [6.2, 6.4], gain: 90, action: 'title',
      why: 'Impressions held and the position barely moved, but clicks fell 36%. People see the page and pick another result, so the snippet is the problem, not the content.',
      queries: [['pour over ratio', 6200, 5.8], ['v60 grind size', 4100, 7.2], ['how to brew coffee', 3900, 9.4]],
      fix: { type: 'serp', before: 'Coffee Brewing Guide - Tips and Tricks for Brewing Great Coffee at Home | Demo Shop', after: 'Pour Over Ratio and V60 Grind Size Guide | Demo Shop',
        desc: 'How much coffee per cup, how fine to grind for a V60, and the three mistakes that make pour over bitter.' },
      checks: TITLE_CHECKS, result: [24, 31] },
    { url: '/beans/ethiopia-yirgacheffe', kind: 'B', clicks: [61, 67], impr: [8000, 8400], pos: [10.1, 9.6], gain: 70, action: 'links',
      why: 'Position 9.6 with 8,400 impressions: right on the edge of page one. The cheapest win is links from the pages Google already trusts.',
      queries: [['yirgacheffe coffee', 3100, 8.9], ['ethiopian coffee beans', 2700, 10.4], ['fruity coffee beans', 1200, 11.8]],
      fix: { type: 'list', head: 'Three links from pages that get clicks', items: ['Brewing guide: "a light, fruity roast like our Yirgacheffe"', 'Whole beans: the light roast row', 'Cold brew: "works well as cold brew"'] },
      checks: ['Links come from pages with clicks', 'Link text reads naturally', 'One link per page', 'Page still matches the query'], result: [15, 28] },
    { url: '/blog/coffee-trends-2024', kind: 'A', clicks: [140, 71], impr: [7600, 4200], pos: [7.9, 11.3], gain: 30, action: 'refresh',
      why: 'It slid from position 7.9 to 11.3. The page still says 2024, its prices are out of date, and the pages that passed it are from this year.',
      queries: [['coffee trends', 2400, 10.8], ['specialty coffee prices', 1100, 12.6], ['coffee trends 2026', 700, 14.1]],
      fix: { type: 'diff', rows: [['Title', 'Coffee Trends 2024', 'Coffee Trends 2026: What Changed in Two Years'], ['Prices', '€9.50 for 250 g', '€12.90 for 250 g, from the current price list'], ['New section', '', 'What the shop roasts more of since 2024, from its own orders']] },
      checks: ['Every number has a source', 'Same URL, no redirect', 'Date updated on the page', 'No claim without a source'], result: [19, 40] },
    { url: '/grinders', kind: 'B', clicks: [22, 24], impr: [5400, 5600], pos: [14.6, 14.2], gain: 45, action: 'material',
      why: 'At position 14 a new title will not do it. The pages above it show their own tests, and this one reads like everyone else\'s.',
      queries: [['best coffee grinder', 2600, 15.1], ['burr grinder vs blade', 1700, 12.9], ['hand grinder for v60', 800, 13.4]],
      fix: { type: 'material', have: ['Grind times the shop measured for 4 grinders'], missing: ['Own photos of each grind size', 'A line from the roaster on which grinder they use'] } },
    { url: '/decaf', kind: 'C', clicks: [0, 0], impr: [2100, 2300], pos: [8.1, 7.8], gain: 25, action: 'title',
      why: 'Position 7.8, 2,300 impressions, nobody clicks. The search is "decaf coffee beans": people want to buy, and the snippet reads like a blog post.',
      queries: [['decaf coffee beans', 1500, 7.1], ['swiss water decaf', 500, 8.6], ['decaf without chemicals', 300, 9.9]],
      fix: { type: 'serp', before: 'All About Decaf: What You Need to Know | Demo Shop', after: 'Swiss Water Decaf Coffee Beans, Roasted Weekly | Demo Shop',
        desc: 'Decaf made with water instead of chemicals. Three origins, roasted every Monday and shipped the next day.' },
      checks: TITLE_CHECKS, result: [31, 58], absolute: true },
    { url: '/cold-brew', kind: 'A', clicks: [180, 96], impr: [9000, 5100], pos: [5.4, 5.6], gain: 0, action: 'wait',
      why: 'Clicks and impressions both fell while the position held. It did the same last autumn: people stop searching for cold brew when it gets cold. Rewriting it now would be wasted work.',
      queries: [['cold brew recipe', 3300, 4.9], ['cold brew ratio', 1100, 5.8], ['cold brew at home', 700, 6.3]],
      fix: { type: 'note', text: 'No change. Check again in April, when the searches come back.' } },
    { url: 'New post: best espresso machines', kind: 'N', gain: null, action: 'new',
      why: 'On the plan because a competitor wrote one. Nothing on the site ranks for it, the shop sells no machines, and new posts here took months to get seen. It goes to the bottom.',
      fix: { type: 'note', text: 'Not now. If it stays on the plan, it should link to the grinders page and help that one instead.' } }
  ];
  PAGES.sort((a, b) => (b.gain ?? -1) - (a.gain ?? -1));
  const KIND = { A: 'Losing clicks', B: 'Just under page one', C: 'Seen, never clicked', N: 'New post' };
  const ACTION = { title: 'Title and snippet', links: 'Internal links', refresh: 'Refresh facts and dates', material: 'First-hand material', wait: 'Wait, seasonal', new: 'New blog post' };
  const LEARN = { title: [9, 6, '+21%'], links: [5, 3, '+12%'], refresh: [7, 4, '+9%'], material: [3, 2, '+34%'], new: [12, 2, '0 clicks'] };
  const state = PAGES.map(() => 'todo');
  let sel = 0, flash = null;
  const tableEl = document.getElementById('gsc-table'), detail = document.getElementById('gsc-detail'), learnEl = document.getElementById('gsc-learn'), countEl = document.getElementById('sim-count');
  const fmt = n => Math.round(n).toLocaleString('en');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ctr = (c, i) => i ? c / i * 100 : 0;
  const ch = (a, b, flip) => { if (!a && !b) return ''; if (!a) return '<span class="up">new</span>'; const d = (b - a) / a * 100, good = flip ? d < 0 : d > 0; return `<span class="${Math.abs(d) < 1 ? '' : good ? 'up' : 'dn'}">${d > 0 ? '+' : ''}${d.toFixed(0)}%</span>`; };
  const STATUS = { todo: '', live: '<span class="st live">live</span>', measured: '<span class="st done">measured</span>', asked: '<span class="st ask">asked shop</span>' };

  const series = (p, extra) => {
    const W = [0, .04, -.03, .05, -.02, .03, -.04, .02, .06, -.01, .03, -.03, .01];
    const a = p.clicks[0] / 13, b = p.clicks[1] / 13;
    const s = [...W.map(w => a * (1 + w)), ...W.map((w, i) => (a + (b - a) * Math.min(1, (i + 2) / 6)) * (1 + w))];
    if (extra) {
      const after = p.absolute ? i => (p.result[1] / 4.3) * Math.min(1, (i + 1) / 6) : i => b * (1 + p.result[1] / 100 * Math.min(1, (i + 1) / 6));
      for (let i = 0; i < 8; i++) s.push(after(i) * (1 + W[i]));
    }
    return s;
  };
  const chart = (p, measured) => {
    const s = series(p, measured), n = 34, W = 600, H = 150, L = 34, R = 8, T = 10, B = 20;
    const top = Math.max(4, ...s) * 1.15, x = i => L + i / (n - 1) * (W - L - R), y = v => H - B - v / top * (H - B - T);
    const d = s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
    const grid = [0, .5, 1].map(k => `<line x1="${L}" x2="${W - R}" y1="${y(top * k / 1.15)}" y2="${y(top * k / 1.15)}" class="g"/><text x="${L - 6}" y="${y(top * k / 1.15) + 4}" text-anchor="end">${fmt(top * k / 1.15)}</text>`).join('');
    const cut = state[sel] !== 'todo' ? `<line x1="${x(25.5)}" x2="${x(25.5)}" y1="${T}" y2="${H - B}" class="cut"/><text x="${x(25.5) + 5}" y="${T + 10}">change live</text>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" class="gsc-chart" role="img" aria-label="Clicks per week for ${esc(p.url)}">${grid}<text x="${x(0)}" y="${H - 4}">26 weeks ago</text><text x="${x(25)}" y="${H - 4}" text-anchor="end">now</text>${measured ? `<text x="${x(33)}" y="${H - 4}" text-anchor="end">day 56</text>` : ''}${cut}<path d="${d}" class="ln"/></svg>`;
  };

  const drawTable = () => {
    tableEl.innerHTML = `<thead><tr><th>Page</th><th>Why it is listed</th><th>Clicks</th><th>Position</th><th>Expected</th><th></th></tr></thead><tbody>${PAGES.map((p, i) => `
      <tr class="${i === sel ? 'on' : ''}${p.kind === 'N' ? ' new' : ''}" data-i="${i}" tabindex="0"><th scope="row">${esc(p.url)}</th><td><span class="k k${p.kind}">${KIND[p.kind]}</span></td>
      <td>${p.clicks ? `${fmt(p.clicks[1])} ${ch(...p.clicks)}` : 'none'}</td><td>${p.pos ? p.pos[1].toFixed(1) : 'none'}</td>
      <td>${p.gain === null ? '?' : p.gain ? `+${p.gain}/mo` : 'wait'}</td><td>${STATUS[state[i]]}</td></tr>`).join('')}</tbody>`;
    tableEl.querySelectorAll('tbody tr').forEach(r => {
      const pick = () => { sel = +r.dataset.i; draw(); };
      r.addEventListener('click', pick);
      r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  };

  const fixHtml = (p, st) => {
    const f = p.fix;
    let body = '';
    if (f.type === 'serp') body = `<p class="fx-h">Draft: new title and description</p><div class="gs old"><span class="gs-url">demo-shop.nl › ${esc(p.url.slice(1))}</span><span class="gs-title">${esc(f.before)}</span></div><div class="gs"><span class="gs-url">demo-shop.nl › ${esc(p.url.slice(1))}</span><span class="gs-title">${esc(f.after)}</span><span class="gs-desc">${esc(f.desc)}</span></div>`;
    if (f.type === 'list') body = `<p class="fx-h">Draft: ${esc(f.head)}</p><ul class="fx-list">${f.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    if (f.type === 'diff') body = `<p class="fx-h">Draft: what changes on the page</p><table class="fx-diff">${f.rows.map(([k, a, b]) => `<tr><th>${k}</th><td><del>${esc(a) || 'nothing'}</del></td><td><ins>${esc(b)}</ins></td></tr>`).join('')}</table>`;
    if (f.type === 'material') body = `<p class="fx-h">Draft blocked: real material needed</p><ul class="fx-list"><li class="have">Have: ${esc(f.have.join(', '))}</li>${f.missing.map(t => `<li class="miss">Missing: ${esc(t)}</li>`).join('')}</ul><p class="fx-note">The bot does not fill gaps with made-up text. Missing material is a question for the shop.</p>`;
    if (f.type === 'note') body = `<p class="fx-h">Decision</p><p class="fx-note">${esc(f.text)}</p>`;
    const checks = p.checks ? `<ul class="fx-checks">${p.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : '';
    let btn = '';
    if (f.type === 'material') btn = st === 'asked' ? '<p class="fx-note">Asked the shop for the photos. The page waits until they arrive.</p>' : '<button type="button" data-do="ask">Ask the shop for the material</button>';
    else if (p.checks && st === 'todo') btn = `<button type="button" data-do="approve">Approve and log the change</button>`;
    else if (st === 'live') btn = `<button type="button" data-do="measure">Skip ahead 56 days</button>`;
    else if (st === 'measured') btn = `<p class="fx-res">Day 28: ${p.absolute ? `${p.result[0]} clicks` : `+${p.result[0]}% clicks`}. Day 56: ${p.absolute ? `${p.result[1]} clicks a month, from none` : `+${p.result[1]}%`}. Added to the table below.</p>`;
    return `<div class="fx">${body}${checks}${btn}</div>`;
  };

  const draw = () => {
    drawTable();
    const p = PAGES[sel], st = state[sel];
    if (p.kind === 'N') {
      detail.innerHTML = `<div class="dt-h"><b>${esc(p.url)}</b><span class="k kN">${KIND.N}</span></div><p class="dt-why">${esc(p.why)}</p>${fixHtml(p, st)}`;
    } else {
      const cards = [['Clicks', fmt(p.clicks[1]), ch(...p.clicks), 'c'], ['Impressions', fmt(p.impr[1]), ch(...p.impr), 'i'], ['CTR', `${ctr(p.clicks[1], p.impr[1]).toFixed(1)}%`, ch(ctr(p.clicks[0], p.impr[0]), ctr(p.clicks[1], p.impr[1])), 't'], ['Position', p.pos[1].toFixed(1), ch(p.pos[0], p.pos[1], true), 'p']];
      detail.innerHTML = `<div class="dt-h"><b>${esc(p.url)}</b><span class="k k${p.kind}">${KIND[p.kind]}</span><span class="dt-a">${ACTION[p.action]}</span></div>
        <div class="mc">${cards.map(([l, v, d, c]) => `<div class="mc-${c}"><span>${l}</span><b>${v}</b><small>${d}</small></div>`).join('')}</div>
        ${chart(p, st === 'measured')}
        <p class="dt-why">${esc(p.why)}</p>
        <table class="dt-q"><thead><tr><th>Top queries</th><th>Impressions</th><th>Position</th></tr></thead><tbody>${p.queries.map(([q, i, ps]) => `<tr><td>${esc(q)}</td><td>${fmt(i)}</td><td>${ps.toFixed(1)}</td></tr>`).join('')}</tbody></table>
        ${fixHtml(p, st)}`;
    }
    detail.querySelectorAll('[data-do]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.do;
      if (a === 'approve') state[sel] = 'live';
      if (a === 'ask') state[sel] = 'asked';
      if (a === 'measure') { state[sel] = 'measured'; const L = LEARN[p.action]; L[0]++; L[1]++; flash = p.action; }
      draw();
      detail.querySelector('[data-do]')?.focus({ preventScroll: true });
    }));
    learnEl.innerHTML = `<table class="gsc-learn-t"><thead><tr><th>Type of change</th><th>Measured</th><th>More clicks</th><th>Median at 56 days</th></tr></thead><tbody>${Object.entries(LEARN).map(([k, [n, w, m]]) => `<tr class="${k === 'new' ? 'new' : ''}${k === flash ? ' flash' : ''}"><th>${ACTION[k]}</th><td>${n}</td><td>${w} of ${n}</td><td>${m}</td></tr>`).join('')}</tbody></table><p class="gsc-muted">New posts get a list of their own: most were still not seen by Google after 8 weeks.</p>`;
    flash = null;
    const live = state.filter(s => s === 'live').length, done = state.filter(s => s === 'measured').length;
    countEl.textContent = live || done ? `${live} change${live === 1 ? '' : 's'} live, ${done} measured` : '';
  };
  draw();
}

/* Scroll: headings stretch into place, cards recede under the next one */
if (window.gsap && window.ScrollTrigger && !calm) {
  gsap.registerPlugin(ScrollTrigger);
  document.fonts.ready.then(() => ScrollTrigger.matchMedia({
    all: () => {
      for (const h of document.querySelectorAll('main h2')) {
        const end = getComputedStyle(h).getPropertyValue('--w').trim();
        h.style.minHeight = `${h.offsetHeight}px`; // a narrow heading must not pull the page up
        gsap.fromTo(h, { '--w': 55 }, { '--w': end, ease: 'none', scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 45%', scrub: .4 } });
      }
    },
    '(min-width: 900px) and (min-height: 700px)': () => {
      const cards = gsap.utils.toArray('.card');
      cards.slice(0, -1).forEach((card, i) => {
        gsap.to(card, { scale: .94, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 12%', scrub: true } });
      });
    },
    /* Phones: cards are taller than the screen, so they open as they arrive instead of stacking,
       and the row in the middle of the screen gets what hover gives on a desktop. */
    '(max-width: 899px)': () => {
      for (const card of gsap.utils.toArray('.card')) {
        gsap.fromTo(card, { clipPath: 'inset(7% 7%)' }, { clipPath: 'inset(0% 0%)', ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 55%', scrub: true } });
      }
      for (const row of gsap.utils.toArray('.rows article, dl > div')) {
        ScrollTrigger.create({ trigger: row, start: 'top 62%', end: 'bottom 38%', toggleClass: 'on' });
      }
    }
  }));
}

/* Funnel: a GA4 style funnel exploration on an invented shop, with ranked moves that change one step each */
const funnelEl = document.getElementById('funnel');
if (funnelEl) {
  const STEPS = ['Session start', 'Viewed a product', 'Added to cart', 'Began checkout', 'Purchase'];
  const SRC = {
    google: { label: 'google / organic', base: [860, 380, 140, 108, 88] },
    ai: { label: 'chatgpt.com / referral', base: [100, 52, 22, 18, 16] },
    social: { label: 'instagram / social', base: [230, 70, 22, 16, 10] },
    mail: { label: 'newsletter / email', base: [160, 108, 56, 48, 46] }
  };
  const MOVES = [
    { name: 'New title on the brewing guide', kind: 'SEO', score: 82, src: 'google', fx: [180, 60, 18, 14, 12],
      says: 'More people arrive from Google, but the step that grows most is the first one. The guide still needs a clear way to the beans.' },
    { name: 'Answer-first copy and schema', kind: 'AI search', score: 74, src: 'ai', fx: [160, 90, 25, 19, 16],
      says: 'AI search sends fewer people than Google, but they land on a product and more of them buy.' },
    { name: 'Subscription in the monthly email', kind: 'Email', score: 69, src: 'mail', fx: [80, 60, 34, 30, 26],
      says: 'The smallest source with the best rate: a third of these sessions end in a purchase. Cheap to repeat every month.' }
  ];
  const on = new Set();
  let seg = null, last = null;
  const total = document.getElementById('flow-total');
  const chart = document.getElementById('fn-chart');
  const table = document.getElementById('fn-table');
  const segEl = document.getElementById('fn-seg');
  const fmt = n => Math.round(n).toLocaleString('en');
  const pct = (a, b) => b ? `${(a / b * 100).toFixed(1)}%` : '0%';
  const vals = (key, set) => SRC[key].base.map((v, i) => v + MOVES.filter((m, j) => set.has(j) && m.src === key).reduce((s, m) => s + m.fx[i], 0));
  const keys = () => seg ? [seg] : Object.keys(SRC);
  const sumOf = set => STEPS.map((_, i) => keys().reduce((s, k) => s + vals(k, set)[i], 0));

  /* Bars: a column per step, blue for who carried on, a hatched block for who dropped off, orange for what a move added */
  const cols = STEPS.map((name, i) => {
    const col = document.createElement('div');
    col.className = 'fn-col';
    col.innerHTML = `<div class="fn-head"><span>${i + 1}. ${name}</span><b></b></div><div class="fn-track"><div class="fn-drop"></div><div class="fn-fill"><div class="fn-add"></div></div></div><div class="fn-foot"></div>`;
    chart.append(col);
    return { head: col.querySelector('.fn-head b'), drop: col.querySelector('.fn-drop'), fill: col.querySelector('.fn-fill'), add: col.querySelector('.fn-add'), foot: col.querySelector('.fn-foot') };
  });

  const draw = () => {
    const now = sumOf(on), base = sumOf(new Set()), top = sumOf(new Set(MOVES.map((_, i) => i)))[0];
    cols.forEach((c, i) => {
      const h = now[i] / top * 100, added = now[i] - base[i];
      c.fill.style.height = `${h}%`;
      c.add.style.height = now[i] ? `${added / now[i] * 100}%` : '0';
      c.drop.style.height = i ? `${(now[i - 1] - now[i]) / top * 100}%` : '0';
      c.drop.style.bottom = `${h}%`;
      c.head.textContent = pct(now[i], now[0]);
      c.foot.innerHTML = `<b>${fmt(now[i])}</b>${added > 0 ? ` <em>+${fmt(added)}</em>` : ''}${i < STEPS.length - 1 ? `<span>Abandonment ${fmt(now[i] - now[i + 1])}, ${pct(now[i] - now[i + 1], now[i])}</span>` : '<span>completed the funnel</span>'}`;
    });
    segEl.textContent = seg ? SRC[seg].label : 'All users';
    const rows = Object.keys(SRC).map(k => {
      const v = vals(k, on);
      return `<tr class="${seg === k ? 'on' : ''}" data-src="${k}" tabindex="0"><th scope="row">${SRC[k].label}</th>${v.map(n => `<td>${fmt(n)}</td>`).join('')}<td><b>${pct(v[4], v[0])}</b></td></tr>`;
    }).join('');
    table.innerHTML = `<thead><tr><th>Session source / medium</th>${STEPS.map((s, i) => `<th>Step ${i + 1}</th>`).join('')}<th>Purchase rate</th></tr></thead><tbody>${rows}</tbody>`;
    table.querySelectorAll('tbody tr').forEach(r => {
      const pick = () => { seg = seg === r.dataset.src ? null : r.dataset.src; draw(); };
      r.addEventListener('click', pick);
      r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    const all = STEPS.map((_, i) => Object.keys(SRC).reduce((s, k) => s + vals(k, on)[i], 0));
    if (seg) {
      const v = vals(seg, on), worst = v.slice(0, 4).map((n, i) => (n - v[i + 1]) / n).reduce((w, r, i, a) => r > a[w] ? i : w, 0);
      total.textContent = `${SRC[seg].label}: ${pct(v[4], v[0])} buy. The biggest drop is from "${STEPS[worst].toLowerCase()}" to "${STEPS[worst + 1].toLowerCase()}". Click the row again for everyone.`;
    } else if (last !== null && on.has(last)) {
      total.textContent = MOVES[last].says;
    } else {
      total.textContent = `${fmt(all[0])} sessions, ${fmt(all[4])} purchases (${pct(all[4], all[0])}). Most people leave before they see a product. Click a source in the table to see its own funnel.`;
    }
  };

  const list = document.getElementById('moves');
  MOVES.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span>${m.name}</span><span>${m.kind}, score ${m.score}</span>`;
    b.addEventListener('click', () => {
      if (on.has(i)) on.delete(i); else on.add(i);
      last = i;
      b.setAttribute('aria-pressed', String(on.has(i)));
      b.lastChild.textContent = on.has(i) ? 'Applied' : `${m.kind}, score ${m.score}`;
      draw();
    });
    list.append(b);
  });
  draw();
}

/* Review tour demo */
const tourTitle = document.getElementById('tour-title');
if (tourTitle) {
  const head = document.getElementById('t-head');
  const btn = document.getElementById('t-btn');
  const serp = document.getElementById('t-serp-text');
  const STEPS = [
    { el: 't-head', title: 'Headline rewritten.', note: 'The old one said nothing. This one matches what people search for.', on: () => { head.textContent = 'Fresh beans, roasted in Eindhoven every Monday'; } },
    { el: 't-btn', title: 'Button contrast fixed.', note: 'The old colours failed WCAG AA.', on: () => btn.classList.add('fixed') },
    { el: 't-serp', title: 'Search title changed.', note: 'You cannot see this on the page, so the tour shows it here.', on: () => { serp.textContent = 'Fresh coffee beans from Eindhoven | Northwind Coffee'; } },
    { el: 't-img', title: 'Still open.', note: 'This photo is a placeholder and needs your pick. The tour says so instead of hiding it.', on: () => {} }
  ];
  const reset = () => { head.textContent = 'Welcome to our website'; btn.classList.remove('fixed'); serp.textContent = 'Home | Northwind'; };
  const back = document.getElementById('tour-back');
  const next = document.getElementById('tour-next');
  let at = 0;
  const show = () => {
    reset();
    STEPS.slice(0, at + 1).forEach(s => s.on());
    document.querySelectorAll('.hl').forEach(e => e.classList.remove('hl'));
    document.getElementById(STEPS[at].el).classList.add('hl');
    tourTitle.textContent = STEPS[at].title;
    document.getElementById('tour-note').textContent = STEPS[at].note;
    document.getElementById('tour-step').textContent = `Step ${at + 1} of ${STEPS.length}`;
    back.disabled = at === 0;
    next.textContent = at === STEPS.length - 1 ? 'Start over' : 'Next';
  };
  next.addEventListener('click', () => { at = (at + 1) % STEPS.length; show(); });
  back.addEventListener('click', () => { at = Math.max(0, at - 1); show(); });
  show();
}

/* Data section: an invented shop as a GA4 / Looker Studio style report, raw GA4 against cleaned numbers */
const chartEl = document.getElementById('dash-chart');
if (chartEl) {
  const WIGGLE = [0, .03, -.02, .05, -.03, .01, .04, -.01, .06, .03, .07, .05];
  const LAUNCH = 7; // week 8, index 7
  const CHANNELS = {
    google: { label: 'Organic search', color: '#1a73e8', base: 400, lift: 14, noise: 30, tagged: .02, real: .018 },
    paid: { label: 'Paid search', color: '#e8710a', base: 220, lift: 2, noise: 40, tagged: .09, real: .016 },
    email: { label: 'Email', color: '#12b5cb', base: 100, lift: 3, noise: 5, tagged: .03, real: .03 },
    social: { label: 'Organic social', color: '#d01884', base: 140, lift: 0, noise: 25, tagged: .02, real: .004 },
    direct: { label: 'Direct', color: '#7cb342', base: 120, lift: 1, noise: 760, tagged: .015, real: .012 }
  };
  const KEYS = Object.keys(CHANNELS);
  const READS = {
    all: { raw: 'Looks great. Too great: this is what most reports show.', clean: 'Nearly half the visits were staff and bots, and most conversions were not orders. This is the number to plan on.' },
    google: { raw: 'Steady growth, with little to clean here.', clean: 'The new landing page in week 8 is working. Put the next hour of content work here.' },
    paid: { raw: 'Paid looks like the star of the account.', clean: 'The tag counted page views as conversions. Fix the tag before touching the budget.' },
    email: { raw: 'Small, so it is easy to skip in a report.', clean: 'Small but honest: the best order rate of any channel. Send more often.' },
    social: { raw: 'Decent traffic and a few conversions.', clean: 'Hardly any orders come from here. Keep it for reach and stop judging it on sales.' },
    direct: { raw: 'The biggest channel by far. That should worry you.', clean: 'Most of this was staff logging in. Exclude that traffic in GA4 and it stops hiding everything else.' }
  };
  const data = {};
  KEYS.forEach(k => {
    const c = CHANNELS[k];
    data[k] = WIGGLE.map((w, i) => {
      const clean = Math.round(c.base * (1 + w) + Math.max(0, i - LAUNCH + 1) * c.lift);
      const raw = clean + Math.round(c.noise * (1 + w / 2));
      return { raw, clean, tagged: Math.round(raw * c.tagged), orders: Math.round(clean * c.real) };
    });
  });
  const sum = (keys, f) => WIGGLE.map((_, i) => keys.reduce((s, k) => s + f(data[k][i]), 0));

  let view = 'clean', channel = 'all', shown = null, frameId = 0;
  const NSC = 'http://www.w3.org/2000/svg';
  const fmt = n => Math.round(n).toLocaleString('en');
  const nice = v => { const p = 10 ** Math.floor(Math.log10(v)), n = v / p; return [1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(s => n <= s) * p; };
  const el = (tag, attrs = {}, kids = []) => {
    const e = tag.startsWith('svg:') ? document.createElementNS(NSC, tag.slice(4)) : document.createElement(tag);
    for (const k in attrs) k === 'text' ? (e.textContent = attrs[k]) : e.setAttribute(k, attrs[k]);
    e.append(...kids);
    return e;
  };
  const delta = (now, before) => {
    if (!before) return el('span', { text: '' });
    const d = (now - before) / before * 100;
    if (Math.abs(d) < .5) return el('span', { text: 'no change' });
    return el('span', { class: d >= 0 ? 'up' : 'dn', text: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}%` });
  };

  /* Chart: stacked areas per channel, a dashed raw total over the cleaned view, a dot for the change */
  const tip = document.getElementById('dash-tip');
  const svg = el('svg:svg', { role: 'img' });
  chartEl.prepend(svg);
  const add = (tag, attrs, text) => { const e = el('svg:' + tag, text === undefined ? attrs : { ...attrs, text }); svg.append(e); return e; };
  let box = {}, areas = {}, rawLine, hair;
  const layout = () => {
    const W = chartEl.clientWidth, H = W < 480 ? 210 : 250, L = 44, R = 10, T = 16, B = 24;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    box = { W, H, L, R, T, B, x: i => L + i / 11 * (W - L - R) };
    box.grid = [0, 1, 2, 3, 4].map(() => ({ line: add('line', { class: 'grid' }), text: add('text', { 'text-anchor': 'end' }) }));
    [0, 3, 7, 11].forEach(i => add('text', { x: box.x(i), y: H - 4, 'text-anchor': i === 11 ? 'end' : i ? 'middle' : 'start' }, `Week ${i + 1}`));
    areas = {};
    KEYS.forEach(k => { areas[k] = add('path', { class: 'ar', fill: CHANNELS[k].color }); });
    rawLine = add('path', { class: 'rawl' });
    add('line', { class: 'ev', x1: box.x(LAUNCH), x2: box.x(LAUNCH), y1: T, y2: H - B });
    add('text', { x: box.x(LAUNCH) - 6, y: T - 4, 'text-anchor': 'end' }, 'New landing page');
    add('circle', { class: 'evd', cx: box.x(LAUNCH), cy: H - B, r: 5 });
    hair = add('line', { class: 'hair', y1: T, y2: H - B, opacity: 0 });
  };
  const target = () => {
    const f = view === 'clean' ? w => w.clean : w => w.raw;
    const stack = {};
    KEYS.forEach(k => { stack[k] = data[k].map(f); });
    const rawTotal = sum(KEYS, w => w.raw);
    return { stack, rawTotal, top: nice(Math.max(...rawTotal) * 1.05), rawOn: view === 'clean' ? 1 : 0, dim: Object.fromEntries(KEYS.map(k => [k, channel === 'all' || channel === k ? 1 : .18])) };
  };
  const mix = (a, b, k) => ({
    stack: Object.fromEntries(KEYS.map(c => [c, a.stack[c].map((v, i) => v + (b.stack[c][i] - v) * k)])),
    rawTotal: b.rawTotal, top: a.top + (b.top - a.top) * k, rawOn: a.rawOn + (b.rawOn - a.rawOn) * k,
    dim: Object.fromEntries(KEYS.map(c => [c, a.dim[c] + (b.dim[c] - a.dim[c]) * k]))
  });
  const paint = s => {
    const { H, T, B, L, W, R } = box, y = v => H - B - v / s.top * (H - B - T);
    box.grid.forEach((g, i) => {
      const v = s.top / 4 * i, gy = y(v);
      Object.entries({ x1: L, x2: W - R, y1: gy, y2: gy }).forEach(([k, val]) => g.line.setAttribute(k, val));
      g.text.setAttribute('x', L - 8); g.text.setAttribute('y', gy + 4); g.text.textContent = fmt(v);
    });
    let base = WIGGLE.map(() => 0);
    KEYS.forEach(k => {
      const top = base.map((b, i) => b + s.stack[k][i]);
      const up = top.map((v, i) => `${i ? 'L' : 'M'}${box.x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
      const down = base.map((v, i) => `L${box.x(i).toFixed(1)} ${y(v).toFixed(1)}`).reverse().join('');
      areas[k].setAttribute('d', up + down + 'Z');
      areas[k].setAttribute('opacity', s.dim[k]);
      base = top;
    });
    rawLine.setAttribute('d', s.rawTotal.map((v, i) => `${i ? 'L' : 'M'}${box.x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(''));
    rawLine.setAttribute('opacity', s.rawOn);
  };
  const calmNow = () => typeof calm !== 'undefined' ? calm : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = () => {
    const to = target(), from = shown || to, began = performance.now();
    cancelAnimationFrame(frameId);
    const run = now => {
      const k = calmNow() ? 1 : Math.min(1, (now - began) / 450), e = 1 - (1 - k) ** 3;
      shown = mix(from, to, e);
      paint(shown);
      if (k < 1) frameId = requestAnimationFrame(run);
    };
    run(began);
  };

  /* Scorecards, legend, channel list, plain-words line, table */
  const cardsEl = document.getElementById('dash-kpis');
  const legend = document.getElementById('dash-legend');
  const list = document.getElementById('dash-list');
  const read = document.getElementById('dash-read');
  const table = document.getElementById('dash-table');
  const filterEl = document.getElementById('dash-filter');
  const select = document.getElementById('dash-channel');
  select.append(el('option', { value: 'all', text: 'All channels' }), ...KEYS.map(k => el('option', { value: k, text: CHANNELS[k].label })));
  select.addEventListener('change', () => { channel = select.value; update(); });

  const spark = vals => {
    const W = 120, H = 30, top = Math.max(...vals) * 1.1, lo = Math.min(...vals) * .8;
    const pts = vals.map((v, i) => [i / 11 * W, H - (v - lo) / (top - lo) * H]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    return el('svg:svg', { class: 'rep-spk', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      [el('svg:path', { class: 'a', d: `${d}L${W} ${H}L0 ${H}Z` }), el('svg:path', { d })]);
  };
  const last4 = a => a.slice(8).reduce((s, v) => s + v, 0), prev4 = a => a.slice(4, 8).reduce((s, v) => s + v, 0);

  const update = () => {
    const clean = view === 'clean', keys = channel === 'all' ? KEYS : [channel];
    const visits = sum(keys, w => clean ? w.clean : w.raw);
    const conv = sum(keys, w => clean ? w.orders : w.tagged);
    const rate = visits.map((v, i) => conv[i] / v * 100);
    const noise = sum(keys, w => w.raw - w.clean);
    const tot = a => a.reduce((s, v) => s + v, 0);
    const cards = [
      ['Sessions', fmt(tot(visits)), delta(last4(visits), prev4(visits)), visits],
      [clean ? 'Orders' : 'Key events', fmt(tot(conv)), delta(last4(conv), prev4(conv)), conv],
      ['Conversion rate', `${(tot(conv) / tot(visits) * 100).toFixed(1)}%`, delta(last4(conv) / last4(visits), prev4(conv) / prev4(visits)), rate],
      clean ? ['Removed as noise', fmt(tot(noise)), el('span', { text: 'staff, bots, test orders' }), noise] : ['Removed as noise', '0', el('span', { text: 'no filters yet' }), null]
    ];
    cardsEl.replaceChildren(...cards.map(([k, v, d, s]) => el('div', { class: 'rep-card' }, [el('span', { class: 'rep-k', text: k }), el('span', { class: 'rep-v', text: v }), el('span', { class: 'rep-d' }, [d]), ...(s ? [spark(s)] : [])])));

    legend.replaceChildren(...KEYS.map(k => el('span', {}, [el('i', { style: `background:${CHANNELS[k].color}` }), CHANNELS[k].label])), ...(clean ? [el('span', {}, [el('i', { class: 'ln' }), 'Raw total'])] : []));

    const shareBase = KEYS.reduce((s, k) => s + last4(data[k].map(w => clean ? w.clean : w.raw)), 0);
    list.replaceChildren(...KEYS.map(k => {
      const v = data[k].map(w => clean ? w.clean : w.raw), n = last4(v), share = n / shareBase * 100;
      const b = el('button', { type: 'button', class: 'rep-row', 'aria-pressed': String(channel === k) }, [
        el('span', { class: 'n' }, [el('i', { style: `background:${CHANNELS[k].color}` }), CHANNELS[k].label]),
        el('span', { class: 'v' }, [fmt(n), el('small', { text: `${share.toFixed(0)}%` }), ' ', delta(n, prev4(v))]),
        el('span', { class: 'bar' }, [el('span', { style: `width:${share.toFixed(1)}%;background:${CHANNELS[k].color}` })])
      ]);
      b.addEventListener('click', () => { channel = channel === k ? 'all' : k; update(); });
      return b;
    }));

    filterEl.replaceChildren(...(clean ? ['Internal traffic excluded', 'Bots filtered', 'Orders only'].map(t => el('i', { text: t })) : [el('span', { text: 'No filters applied' })]));
    read.textContent = READS[channel][view];
    select.value = channel;
    svg.setAttribute('aria-label', `Sessions per week per channel over 12 weeks, ${clean ? 'cleaned, with the raw total as a dashed line' : 'raw GA4'}. ${READS[channel][view]}`);
    const rows = channel === 'all' ? WIGGLE.map((_, i) => KEYS.reduce((s, k) => ({ raw: s.raw + data[k][i].raw, clean: s.clean + data[k][i].clean, tagged: s.tagged + data[k][i].tagged, orders: s.orders + data[k][i].orders }), { raw: 0, clean: 0, tagged: 0, orders: 0 })) : data[channel];
    table.innerHTML = `<table><thead><tr><th>Week</th><th>Raw sessions</th><th>Cleaned</th><th>Key events</th><th>Real orders</th></tr></thead><tbody>${rows.map((w, i) => `<tr><td>${i + 1}</td><td>${fmt(w.raw)}</td><td>${fmt(w.clean)}</td><td>${w.tagged}</td><td>${w.orders}</td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    go();
  };
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; update(); }));

  const hover = e => {
    const r = chartEl.getBoundingClientRect(), px = e.clientX - r.left;
    const i = Math.max(0, Math.min(11, Math.round((px - box.L) / (box.W - box.L - box.R) * 11)));
    const x = box.x(i), clean = view === 'clean';
    hair.setAttribute('x1', x); hair.setAttribute('x2', x); hair.setAttribute('opacity', 1);
    const keys = channel === 'all' ? KEYS : [channel];
    tip.replaceChildren(el('strong', { text: `Week ${i + 1}${i === LAUNCH ? ', new landing page' : ''}` }),
      ...keys.slice().reverse().map(k => el('div', {}, [el('i', { style: `background:${CHANNELS[k].color}` }), CHANNELS[k].label, el('b', { text: fmt(clean ? data[k][i].clean : data[k][i].raw) })])),
      ...(clean && channel === 'all' ? [el('div', {}, ['Raw total', el('b', { text: fmt(sum(KEYS, w => w.raw)[i]) })])] : []));
    tip.hidden = false;
    tip.style.left = `${x > box.W / 2 ? x - tip.offsetWidth - 10 : x + 10}px`;
  };
  const out = () => { tip.hidden = true; hair.setAttribute('opacity', 0); };
  chartEl.addEventListener('pointermove', hover);
  chartEl.addEventListener('pointerdown', hover);
  chartEl.addEventListener('pointerleave', out);

  layout();
  update();
  let dashWide = innerWidth, dashWait;
  addEventListener('resize', () => {
    if (innerWidth === dashWide) return;
    dashWide = innerWidth;
    clearTimeout(dashWait);
    dashWait = setTimeout(() => { layout(); shown = null; update(); }, 200);
  });
}

/* Terminal: an invented session that stops at the human, with the status bar counting along */
const termLog = document.getElementById('term-log');
if (termLog) {
  const ask = document.getElementById('term-ask');
  const barEl = document.getElementById('term-bar');
  const JOBS = [
    { ask: 'refresh the brewing guide title, then check it', branch: 'guide-title', draft: 'New title drafted, 58 characters.' },
    { ask: 'add the subscription block to the monthly email', branch: 'email-block', draft: 'Block added, test send looks right.' }
  ];
  const WORK = [
    ['Claude Code sends 2 subagents for the page and the search data', 'claude', 9, 3],
    ['Claude Code writes the change on a branch', 'claude', 7, 1],
    ['Codex reviews the diff: 1 note, fixed', 'codex', 11, 2],
    ['Antigravity opens it in a browser: looks right', 'agy', 8, 2]
  ];
  const start = { claude: 24, codex: 3, agy: 7, context: 17 };
  let use = { ...start }, job = 0, waiting = false, seen = false, timers = [];

  const row = html => {
    const el = document.createElement('div');
    el.className = 'bar-row';
    el.innerHTML = html;
    barEl.append(el);
    return el;
  };
  const meter = (key, wide = '') => `<span class="meter${wide}" data-m="${key}"><i></i></span> <em data-p="${key}"></em>`;
  row('<span>ENV:</span> <span class="hot">Opus 5.5</span> <span class="dim">(1000K)</span>');
  row(`<b>CLAUDE:</b> <span class="dim wk">Session:</span> ${meter('claude')} <span class="dim wk">(reset 2h 12m)</span>`);
  row(`<b>CODEX:</b> ${meter('codex')}`);
  row(`<b>ANTIGRAVITY:</b> ${meter('agy')}`);
  row(`<b>CONTEXT:</b> ${meter('context', ' wide')}`);
  const gitRow = row('');
  const modeRow = row('');

  const paint = (busy, branch = 'main', changed = 0, agents = 0) => {
    for (const key in use) {
      const m = barEl.querySelector(`[data-m=${key}]`), v = Math.min(99, Math.round(use[key]));
      m.style.setProperty('--p', `${v}%`);
      m.classList.toggle('busy', key === busy);
      barEl.querySelector(`[data-p=${key}]`).textContent = `${v}%`;
    }
    gitRow.textContent = `◆ PWD: coffee-shop | Branch: ${branch} | New: ${changed}`;
    modeRow.innerHTML = `<span class="hot">▸▸ human in the loop on</span> <span class="dim">· ${agents ? `← ${agents} agent${agents > 1 ? 's' : ''}` : 'waiting for you'}</span>`;
  };
  const line = (text, kind = '') => {
    const p = document.createElement('p');
    p.textContent = text;
    if (kind) p.className = kind;
    termLog.append(p);
  };
  const later = (fn, ms) => timers.push(setTimeout(fn, calm ? 0 : ms));

  const run = () => {
    const task = JOBS[job % JOBS.length];
    termLog.replaceChildren();
    ask.classList.remove('open');
    if (job % JOBS.length === 0) use = { ...start };
    use.context = start.context;
    paint(null, task.branch, 0, 1);
    line(`> ${task.ask}`, 'cmd');
    let at = 900;
    WORK.forEach(([text, who, cost, agents], i) => {
      later(() => {
        line(text);
        use[who] += cost / 2;
        use.context += 8;
        paint(who, task.branch, i > 0 ? 2 : 0, agents);
      }, at);
      at += 1100;
    });
    later(() => {
      paint(null, task.branch, 2);
      line(task.draft);
      line('Nothing goes out until a person says so.', 'hot');
      line('Waiting for the human. That is you, for now.', 'dim');
      ask.classList.add('open');
      waiting = true;
    }, at);
  };

  const answer = yes => {
    if (!waiting) return;
    waiting = false;
    ask.classList.remove('open');
    const task = JOBS[job % JOBS.length];
    line(yes ? '> y' : '> n', 'cmd');
    if (yes) {
      line('Merged and live. Checked the live page too.');
      line('Lesson saved to the skill, so the next run starts smarter.', 'dim');
      paint(null, 'main', 0);
    } else {
      line('Sent back with your note. Nothing went out.');
      line('Good call. That is the job, and it is why I still have one.', 'dim');
      paint(null, task.branch, 2);
    }
    job++;
    later(run, 3600);
  };

  ask.addEventListener('click', e => {
    const b = e.target.closest('[data-term]');
    if (b) answer(b.dataset.term === 'y');
  });
  addEventListener('keydown', e => {
    if (!waiting || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'y' || e.key === 'n') answer(e.key === 'y');
  });

  paint();
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !seen) { seen = true; run(); }
  }, { threshold: .35 }).observe(termLog);
}

/* Raw versus compact tool output, invented task */
const cliOut = document.getElementById('cli-out');
if (cliOut) {
  const RAW = JSON.stringify({
    data: { id: '142', type: 'tasks', attributes: {
      title: 'Update pricing page', description: '<p>See brief</p>', created_at: '2026-10-02T08:14:22Z', updated_at: '2026-10-29T15:02:09Z',
      due_date: '2026-11-06', closed: false, private: false, position: 1800, placement: 214000, initial_estimate: 120, worked_time: 45,
      billable_time: 45, remaining_time: 75, todo_count: 3, open_todo_count: 1, subscriber_ids: ['18', '22', '31'], custom_fields: { 'cf_1042': null, 'cf_1043': 'b' }
    }, relationships: {
      project: { data: { type: 'projects', id: '77' } }, assignee: { data: { type: 'people', id: '18' } }, creator: { data: { type: 'people', id: '22' } },
      workflow_status: { data: { type: 'statuses', id: '5' } }, task_list: { data: { type: 'lists', id: '9' } }
    } }, meta: { settings: { locale: 'en', tz: 'UTC' }, request_id: 'c41f09' }
  }, null, 2);
  const COMPACT = '#142 Update pricing page\nopen, due Fri 6 Nov, 1 todo left\nlast note: waiting for copy';
  const size = document.getElementById('cli-size');
  const buttons = document.querySelectorAll('[data-show="raw"], [data-show="compact"]');
  const show = which => {
    const text = which === 'raw' ? RAW : COMPACT;
    cliOut.textContent = text;
    size.textContent = `${text.length.toLocaleString('en')} characters (invented task, same facts)`;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.show === which)));
  };
  buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.show)));
  show('compact');
}

/* Live audit of this page */
const auditOut = document.getElementById('audit-out');
if (auditOut) {
  const live = { lcp: null, cls: 0, inp: null };
  const watch = (type, cb, extra = {}) => {
    try { new PerformanceObserver(l => { cb(l.getEntries()); render(); }).observe({ type, buffered: true, ...extra }); } catch { /* unsupported */ }
  };
  const lum = rgb => {
    const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const contrast = (a, b) => { const [x, y] = [lum(parse(a)), lum(parse(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const meta = name => document.querySelector(`meta[name="${name}"]`)?.content || '';

  const render = () => {
    const all = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')];
    const kb = Math.round(all.reduce((s, e) => s + (e.encodedBodySize || 0), 0) / 1024);
    const imgs = [...document.images];
    const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]), textarea')];
    const labelled = fields.filter(f => f.getAttribute('aria-label') || document.querySelector(`label[for="${f.id}"]`));
    const levels = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]);
    const skips = levels.filter((l, i) => i && l - levels[i - 1] > 1).length;
    const style = getComputedStyle(document.body);
    const ratio = contrast(style.color, style.backgroundColor);
    const desc = meta('description').length;
    const schema = (() => { try { return JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type']; } catch { return ''; } })();
    const groups = [
      ['Speed', [
        ['LCP', live.lcp === null ? 'measuring' : `${(live.lcp / 1000).toFixed(2)} s`, live.lcp === null || live.lcp <= 2500],
        ['CLS', live.cls.toFixed(3), live.cls <= 0.1],
        ['INP', live.inp === null ? 'click something' : `${Math.round(live.inp)} ms`, live.inp === null || live.inp <= 200],
        ['Loaded so far', `${kb} KB`, true]
      ]],
      ['Accessibility', [
        ['Language set', document.documentElement.lang || 'missing', !!document.documentElement.lang],
        ['Images with alt', `${imgs.filter(i => i.alt).length} of ${imgs.length}`, imgs.every(i => i.alt)],
        ['Fields with labels', `${labelled.length} of ${fields.length}`, labelled.length === fields.length],
        ['Skipped heading levels', String(skips), skips === 0],
        ['Body text contrast', `${ratio.toFixed(1)}:1`, ratio >= 4.5]
      ]],
      ['SEO', [
        ['Title length', String(document.title.length), document.title.length <= 60],
        ['Description length', String(desc), desc >= 50 && desc <= 160],
        ['One h1', String(document.querySelectorAll('h1').length), document.querySelectorAll('h1').length === 1],
        ['Canonical', document.querySelector('link[rel=canonical]') ? 'set' : 'missing', !!document.querySelector('link[rel=canonical]')],
        ['Schema', schema || 'missing', !!schema]
      ]]
    ];
    auditOut.innerHTML = groups.map(([name, rows]) => `<div><h4>${name}</h4><ul>${rows.map(([k, v, ok]) => `<li class="${ok ? '' : 'bad'}"><span>${k}</span><b>${v}</b></li>`).join('')}</ul></div>`).join('');
  };
  watch('largest-contentful-paint', e => { live.lcp = e[e.length - 1].startTime; });
  watch('layout-shift', e => { for (const x of e) if (!x.hadRecentInput) live.cls += x.value; });
  watch('event', e => { for (const x of e) if (x.interactionId) live.inp = Math.max(live.inp || 0, x.duration); }, { durationThreshold: 16 });
  addEventListener('load', render);
  render();
  new IntersectionObserver(([e]) => { if (e.isIntersecting) render(); }).observe(auditOut);
}

/* De or het quiz */
const quizWord = document.getElementById('quiz-word');
if (quizWord) {
  const WORDS = [['afspraak', 'de'], ['huis', 'het'], ['ervaring', 'de'], ['ziekenhuis', 'het'], ['gemeente', 'de'], ['weer', 'het'], ['meisje', 'het'], ['les', 'de'], ['boek', 'het'], ['stad', 'de']];
  const out = document.getElementById('quiz-out');
  let i = 0, score = 0, tries = 0;
  quizWord.textContent = WORDS[0][0];
  document.querySelectorAll('#quiz [data-a]').forEach(b => b.addEventListener('click', () => {
    const [word, answer] = WORDS[i % WORDS.length];
    const right = b.dataset.a === answer;
    tries += 1;
    if (right) score += 1;
    out.textContent = `${right ? 'Goed' : 'Nee'}: ${answer} ${word}. ${score} of ${tries}`;
    i += 1;
    quizWord.textContent = WORDS[i % WORDS.length][0];
  }));
}

/* DutchMaster screens */
const dutchShot = document.getElementById('dutch-shot');
if (dutchShot) {
  const tabs = document.querySelectorAll('#dutch-tabs button');
  tabs.forEach(t => t.addEventListener('click', () => {
    dutchShot.src = `assets/img/projects/${t.dataset.src}.webp`;
    dutchShot.alt = t.dataset.alt;
    tabs.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
  }));
}

/* Dashboard screens */
const deskShot = document.getElementById('desk-shot');
if (deskShot) {
  const tabs = document.querySelectorAll('#desk-tabs button');
  const note = document.getElementById('desk-note');
  tabs.forEach(t => t.addEventListener('click', () => {
    deskShot.src = `assets/img/projects/${t.dataset.src}.webp`;
    deskShot.alt = t.dataset.alt;
    note.textContent = t.dataset.note;
    tabs.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
  }));
}

/* Thuis: before and after slider, ambient tab */
const tvRange = document.getElementById('tv-range');
if (tvRange) {
  const compare = document.getElementById('tv-compare');
  const ambient = document.getElementById('tv-ambient');
  const tabs = document.querySelectorAll('#tv-tabs button');
  tvRange.addEventListener('input', () => compare.style.setProperty('--x', `${tvRange.value}%`));
  tabs.forEach(t => t.addEventListener('click', () => {
    const on = t.dataset.show === 'ambient';
    ambient.hidden = !on;
    compare.hidden = on;
    tabs.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
  }));
}

/* Housing finder: scan demo and code tab */
const scanLog = document.getElementById('scan-log');
if (scanLog) {
  const ROWS = [
    ['site A: 14 listings, 13 seen before', 'skip-row'],
    ['site B: blocked, retry with next fingerprint', 'skip-row'],
    ['site B: 200 OK, fingerprint remembered', ''],
    ['studio, Veldhoven: over budget, skipped', 'skip-row'],
    ['room, Best: too small, skipped', 'skip-row'],
    ['studio, Eindhoven: new, score passes', 'hit']
  ];
  const alertBox = document.getElementById('scan-alert');
  const panes = { scan: document.getElementById('house-scan'), code: document.getElementById('house-code') };
  const tabs = document.querySelectorAll('#house-tabs button');
  let timer;
  const run = () => {
    clearInterval(timer);
    scanLog.textContent = '';
    alertBox.hidden = true;
    let n = 0;
    const add = () => {
      if (n === ROWS.length) { clearInterval(timer); alertBox.hidden = false; return; }
      const li = document.createElement('li');
      li.textContent = ROWS[n][0];
      li.className = ROWS[n][1];
      scanLog.append(li);
      n += 1;
    };
    if (calm) { while (n <= ROWS.length) add(); return; }
    timer = setInterval(add, 650);
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    const which = t.dataset.show;
    panes.scan.hidden = which !== 'scan';
    panes.code.hidden = which !== 'code';
    tabs.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
    if (which === 'scan') run();
  }));
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { run(); o.disconnect(); } }, { threshold: .4 }).observe(panes.scan);
}

/* Contact form */
const form = document.getElementById('contactForm');
if (form) {
  const status = document.getElementById('formStatus');
  const button = form.querySelector('button[type=submit]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Sending';
    status.textContent = '';
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || 'Request failed');
      form.reset();
      status.textContent = 'Thanks, it arrived. I reply within two working days.';
    } catch {
      status.innerHTML = 'That did not work. Please mail me at <a href="mailto:beyaricko.nega@gmail.com">beyaricko.nega@gmail.com</a>.';
    } finally {
      button.disabled = false;
      button.textContent = 'Send';
    }
  });
}

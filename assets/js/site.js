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

/* Pipeline */
const STATIONS = [
  { name: 'Signal', at: 0.03, color: '#04040a' },
  { name: 'Facts', at: 0.17, color: '#04040a' },
  { name: 'Draft', at: 0.33, color: '#04040a' },
  { name: 'Decision', at: 0.5, color: '#ff5a1f' },
  { name: 'Live', at: 0.67, color: '#04040a' },
  { name: 'Lesson', at: 0.84, color: '#04040a' }
];
const EVENTS = ['task changed', 'new mail in', 'tracking stopped', 'page returns 404', 'traffic dropped', 'report is due', 'blog task opened', 'spend spike'];
const NS = 'http://www.w3.org/2000/svg';

const path = document.getElementById('sim-path');
if (path) {
  const length = path.getTotalLength();
  const tokensEl = document.getElementById('sim-tokens');
  const logEl = document.getElementById('sim-log');
  const countEl = document.getElementById('sim-count');
  const bigEl = document.getElementById('sim-big');
  const approveBtn = document.getElementById('approve');
  const rejectBtn = document.getElementById('reject');
  const stationAt = name => STATIONS.find(s => s.name === name);
  const gate = stationAt('Decision');
  const tokens = [];
  const waiting = [];
  let lessons = 0;
  let lastSpawn = -1e9;
  let last = 0;

  const point = t => path.getPointAtLength((t % 1) * length);
  const log = text => {
    const li = document.createElement('li');
    li.textContent = `${new Date().toTimeString().slice(0, 8)}  ${text}`;
    logEl.prepend(li);
    while (logEl.children.length > 3) logEl.lastChild.remove();
  };
  const colorAt = t => [...STATIONS].reverse().find(s => t >= s.at)?.color || STATIONS[0].color;
  const refresh = () => {
    countEl.textContent = `${waiting.length} waiting for you`;
    approveBtn.disabled = rejectBtn.disabled = !waiting.length;
    bigEl.textContent = lessons;
  };

  for (const s of STATIONS) {
    const p = point(s.at);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('r', 11);
    dot.setAttribute('fill', s.color); dot.setAttribute('class', 'st-dot');
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('class', 'st-label');
    const inside = p.y < 60 ? -20 : p.y < 190 ? 34 : -24;
    label.setAttribute('x', Math.min(Math.max(p.x, 70), 530)); label.setAttribute('y', p.y + inside);
    label.textContent = s.name;
    document.getElementById('sim-stations').append(dot, label);
  }

  /* Side loops: subagents branch off at Facts, drafts circle Check, lessons fly to the centre */
  const subsEl = document.getElementById('sim-subs');
  const svgEl = (tag, attrs, parent = subsEl) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.append(e);
    return e;
  };
  const factsAt = stationAt('Facts').at, facts = point(factsAt);
  const SUBS = [['search', 225], ['site', 350], ['history', 475]].map(([name, x]) => {
    const y = 128, r = 16;
    const line = svgEl('path', { class: 'sub-line', d: `M${facts.x} ${facts.y}C${facts.x} ${facts.y + 44} ${x} ${y - 62} ${x} ${y - r}` });
    svgEl('circle', { class: 'sub-ring', cx: x, cy: y, r });
    svgEl('text', { class: 'sub-label', x, y: y + r + 16 }).textContent = name;
    return { name, x, y, r, line, len: line.getTotalLength() };
  });
  let checkAt = .386;
  for (let t = .33; t < .5; t += .001) if (point(t).y >= 190) { checkAt = t; break; }
  const joint = point(checkAt);
  const RING = { x: 512, y: joint.y, r: 26 };
  svgEl('path', { class: 'sub-line', d: `M${joint.x} ${joint.y}H${RING.x + RING.r}` });
  svgEl('circle', { class: 'sub-ring', cx: RING.x, cy: RING.y, r: RING.r });
  svgEl('text', { class: 'sub-label', x: RING.x, y: RING.y + 5 }).textContent = 'check';
  const lessonAt = stationAt('Lesson').at, lessonPoint = point(lessonAt);
  const back = svgEl('path', { class: 'sub-line', d: `M${lessonPoint.x} ${lessonPoint.y}C${lessonPoint.x + 110} ${lessonPoint.y} 180 214 262 214` });
  const backLen = back.getTotalLength();
  const flyers = [];

  const dotAt = (el, x, y, fill = '#04040a') => {
    el.setAttribute('cx', x); el.setAttribute('cy', y); el.setAttribute('fill', fill);
  };
  const flyer = (r, update, done) => {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('r', r);
    tokensEl.append(el);
    flyers.push({ el, p: 0, update, done });
  };

  const spawn = () => {
    const label = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('r', 7);
    tokensEl.append(el);
    tokens.push({ t: STATIONS[0].at, label, el, released: false, queued: false, sent: false, checked: false, busy: false });
    log(`signal: ${label}`);
  };
  const remove = token => {
    token.el.remove();
    tokens.splice(tokens.indexOf(token), 1);
  };
  const draw = token => {
    const p = point(token.t);
    token.el.setAttribute('cx', p.x);
    token.el.setAttribute('cy', p.y);
    token.el.setAttribute('fill', token.back ? '#ff5a1f' : colorAt(token.t));
  };

  /* Quicker with every lesson, down to about half the time */
  const pace = () => Math.max(.55, 1 - lessons * .07);
  const sendSubagents = token => {
    token.busy = true;
    let out = SUBS.length;
    log(`${SUBS.length} subagents out: ${token.label}`);
    SUBS.forEach((sub, i) => flyer(4.5, (el, p) => {
      if (p < .22) {
        const q = sub.line.getPointAtLength(p / .22 * sub.len);
        dotAt(el, q.x, q.y);
      } else if (p < .78) {
        const a = -Math.PI / 2 + (p - .22) / .56 * Math.PI * 2 * (i === 1 ? 2 : 1);
        dotAt(el, sub.x + Math.cos(a) * sub.r, sub.y + Math.sin(a) * sub.r);
      } else {
        const q = sub.line.getPointAtLength((1 - (p - .78) / .22) * sub.len);
        dotAt(el, q.x, q.y);
      }
    }, () => {
      out -= 1;
      if (!out) { token.busy = false; log(`facts back: ${token.label}`); }
    }));
    flyers.slice(-SUBS.length).forEach((f, i) => { f.speed = 1 / ((1700 + i * 350) * pace()); });
  };
  const runCheck = token => {
    token.busy = true;
    const turns = token.again ? 1 : Math.random() < .4 ? 2 : 1;
    if (turns > 1) log(`check failed, redraft: ${token.label}`);
    token.el.style.opacity = 0;
    flyer(7, (el, p) => {
      if (p < .12 || p > .88) {
        const k = p < .12 ? p / .12 : (1 - p) / .12;
        dotAt(el, joint.x + (RING.x + RING.r - joint.x) * k, joint.y);
      } else {
        const q = (p - .12) / .76, a = q * Math.PI * 2 * turns;
        dotAt(el, RING.x + Math.cos(a) * RING.r, RING.y + Math.sin(a) * RING.r, turns > 1 && q < .5 ? '#ff5a1f' : '#04040a');
      }
    }, () => { token.busy = false; token.el.style.opacity = 1; });
    flyers[flyers.length - 1].speed = 1 / (1500 * turns * pace());
  };
  const storeLesson = token => {
    remove(token);
    flyer(5, (el, p) => {
      const q = back.getPointAtLength(p * backLen);
      dotAt(el, q.x, q.y);
    }, () => {
      lessons += 1;
      log(`measured: ${token.label}, next run is quicker`);
      refresh();
      bigEl.classList.remove('pop');
      void bigEl.getBBox();
      bigEl.classList.add('pop');
    });
    flyers[flyers.length - 1].speed = 1 / 900;
  };

  function approve() {
    const token = waiting.shift();
    if (!token) return;
    token.released = true;
    log(`approved: ${token.label}`);
    refresh();
  }
  function reject() {
    const token = waiting.shift();
    if (!token) return;
    log(`rejected: ${token.label}, back to check`);
    token.back = true;
    token.queued = false;
    token.checked = false;
    refresh();
  }
  approveBtn.addEventListener('click', approve);
  rejectBtn.addEventListener('click', reject);

  const step = dt => {
    for (const f of [...flyers]) {
      f.p = Math.min(1, f.p + dt * (f.speed || .001));
      f.update(f.el, f.p);
      if (f.p >= 1) {
        f.el.remove();
        flyers.splice(flyers.indexOf(f), 1);
        f.done();
      }
    }
    for (const token of [...tokens]) {
      if (token.busy) continue;
      if (token.back) {
        token.t -= dt * 0.00034;
        if (token.t <= checkAt) { token.t = checkAt; token.back = false; token.again = true; }
        draw(token);
        continue;
      }
      if (!token.sent && token.t >= factsAt) {
        token.sent = true;
        sendSubagents(token);
        continue;
      }
      if (!token.checked && token.t >= checkAt) {
        token.checked = true;
        draw(token);
        runCheck(token);
        continue;
      }
      if (!token.released) {
        const slot = gate.at - 0.016 - waiting.indexOf(token) * 0.024;
        const stop = token.queued ? slot : gate.at - 0.016 - waiting.length * 0.024;
        token.t = Math.min(token.t + dt * 0.00011, stop);
        if (!token.queued && token.t >= stop) {
          token.queued = true;
          waiting.push(token);
          log(`draft ready: ${token.label}`);
          refresh();
        }
      } else {
        token.t += dt * 0.00011;
        if (token.t >= lessonAt) {
          storeLesson(token);
          continue;
        }
      }
      draw(token);
    }
  };

  const tick = now => {
    const dt = Math.min(now - last, 50);
    last = now;
    if (now - lastSpawn > 3000 && waiting.length + tokens.filter(t => !t.released && !t.queued).length < 4) {
      lastSpawn = now;
      spawn();
    }
    step(dt);
    if (running) requestAnimationFrame(tick);
  };

  let running = false;
  const start = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } };
  const stop = () => { running = false; };

  if (calm) {
    spawn();
    tokens[0].t = gate.at - 0.016;
    tokens[0].sent = tokens[0].checked = true;
    tokens[0].queued = true;
    waiting.push(tokens[0]);
    draw(tokens[0]);
    refresh();
  } else {
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(path.ownerSVGElement);
  }
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

/* Growth map: sources to pages to goals, with moves that change the flow */
const flowSvg = document.getElementById('flow-svg');
if (flowSvg) {
  const NODES = {
    google: ['Google', 0, 0], ai: ['AI search', 0, 1], social: ['Social', 0, 2], mail: ['Email', 0, 3],
    home: ['Homepage', 1, 0], guide: ['Brewing guide', 1, 1], beans: ['Whole beans', 1, 2], sub: ['Subscription', 1, 3],
    order: ['Orders', 2, 1], news: ['Newsletter', 2, 2]
  };
  const EDGES = [
    ['google', 'home', 420], ['google', 'guide', 260], ['google', 'beans', 180], ['ai', 'guide', 60], ['ai', 'beans', 40],
    ['social', 'home', 140], ['social', 'guide', 90], ['mail', 'beans', 120], ['mail', 'sub', 40],
    ['home', 'order', 40], ['beans', 'order', 90], ['guide', 'order', 8], ['sub', 'order', 22], ['home', 'news', 30], ['guide', 'news', 24]
  ];
  const MOVES = [
    { name: 'New title on the brewing guide', kind: 'SEO', fx: [['google', 'guide', 180], ['guide', 'order', 12], ['guide', 'news', 8]] },
    { name: 'Answer-first copy and schema', kind: 'AI search', fx: [['ai', 'guide', 90], ['ai', 'beans', 70], ['beans', 'order', 16]] },
    { name: 'Subscription in the monthly email', kind: 'Email', fx: [['mail', 'sub', 80], ['sub', 'order', 26]] }
  ];
  const on = new Set();
  const total = document.getElementById('flow-total');
  const NSV = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs, parent) => {
    const e = document.createElementNS(NSV, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.append(e);
    return e;
  };
  let edges = [], dots = [], dotLayer, visible = false, running = false, last = 0;

  const target = e => e.base + [...on].flatMap(i => MOVES[i].fx).filter(f => f[0] === e.from && f[1] === e.to).reduce((s, f) => s + f[2], 0);
  const sums = () => {
    const visits = edges.filter(e => NODES[e.from][1] === 0).reduce((s, e) => s + target(e), 0);
    const orders = edges.filter(e => e.to === 'order').reduce((s, e) => s + target(e), 0);
    return { visits, orders };
  };
  const label = () => {
    const { visits, orders } = sums();
    total.textContent = `${visits.toLocaleString('en')} visits, ${orders} orders a month`;
    for (const id in numbers) {
      const flow = edges.filter(e => e.to === id).reduce((s, e) => s + target(e), 0) || edges.filter(e => e.from === id).reduce((s, e) => s + target(e), 0);
      numbers[id].textContent = flow.toLocaleString('en');
    }
    edges.forEach(e => e.path.classList.toggle('boost', target(e) > e.base));
  };
  let numbers = {};

  const build = () => {
    const narrow = flowSvg.getBoundingClientRect().width < 560;
    const W = narrow ? 620 : 1000, H = narrow ? 640 : 620;
    const colX = narrow ? [75, 310, 545] : [90, 500, 910];
    const rowY = r => 70 + r * ((H - 130) / 3);
    flowSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    flowSvg.replaceChildren();
    numbers = {};
    const at = id => { const [, c, r] = NODES[id]; return [colX[c], rowY(r)]; };
    const layer = make('g', {}, flowSvg);
    edges = EDGES.map(([from, to, base]) => {
      const [x1, y1] = at(from), [x2, y2] = at(to), mid = (x1 + x2) / 2;
      const path = make('path', { class: 'fl-edge', d: `M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}` }, layer);
      return { from, to, base, path, len: path.getTotalLength(), now: base, debt: Math.random() };
    });
    dotLayer = make('g', {}, flowSvg);
    dots = [];
    for (const id in NODES) {
      const [x, y] = at(id), [name, col] = NODES[id];
      const g = make('g', {}, flowSvg);
      const node = make('circle', { class: `fl-node${col === 2 ? ' goal' : ''}`, cx: x, cy: y, r: 11, tabindex: -1 }, g);
      make('text', { class: 'fl-name', x, y: y - 32 }, g).textContent = name;
      numbers[id] = make('text', { class: 'fl-num', x, y: y - 16 }, g);
      node.addEventListener('pointerenter', () => edges.forEach(e => {
        const hit = e.from === id || e.to === id;
        e.path.classList.toggle('lit', hit);
        e.path.classList.toggle('dim', !hit);
      }));
      node.addEventListener('pointerleave', () => edges.forEach(e => e.path.classList.remove('lit', 'dim')));
    }
    paint();
    label();
  };
  const paint = () => { for (const e of edges) e.path.setAttribute('stroke-width', (1.5 + e.now / 26).toFixed(2)); };

  const step = now => {
    const dt = Math.min(now - last, 50);
    last = now;
    for (const e of edges) {
      e.now += (target(e) - e.now) * 0.05;
      e.debt += e.now * dt * 0.000045;
      while (e.debt >= 1 && dots.length < 170) {
        e.debt -= 1;
        dots.push({ e, t: 0, hot: target(e) > e.base && Math.random() < 0.6, el: make('circle', { class: 'fl-dot', r: 3 }, dotLayer) });
        dots[dots.length - 1].el.classList.toggle('hot', dots[dots.length - 1].hot);
      }
      e.debt = Math.min(e.debt, 2);
    }
    paint();
    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i];
      d.t += dt * 0.00042;
      if (d.t >= 1) { d.el.remove(); dots.splice(i, 1); continue; }
      const p = d.e.path.getPointAtLength(d.t * d.e.len);
      d.el.setAttribute('cx', p.x);
      d.el.setAttribute('cy', p.y);
    }
    if (visible) requestAnimationFrame(step); else running = false;
  };

  const list = document.getElementById('moves');
  MOVES.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span>${m.name}</span><span>${m.kind}</span>`;
    b.addEventListener('click', () => {
      if (on.has(i)) on.delete(i); else on.add(i);
      b.setAttribute('aria-pressed', String(on.has(i)));
      b.lastChild.textContent = on.has(i) ? 'Applied' : m.kind;
      if (calm) { edges.forEach(e => { e.now = target(e); }); paint(); }
      label();
    });
    list.append(b);
  });

  build();
  let wide = innerWidth, wait;
  addEventListener('resize', () => {
    if (innerWidth === wide) return;
    wide = innerWidth;
    clearTimeout(wait);
    wait = setTimeout(build, 200);
  });
  if (!calm) new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(step); }
  }).observe(flowSvg);
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

/* Data section: an invented shop, raw GA4 against cleaned numbers, per channel */
const chartEl = document.getElementById('dash-chart');
if (chartEl) {
  const WIGGLE = [0, .03, -.02, .05, -.03, .01, .04, -.01, .06, .03, .07, .05];
  const LAUNCH = 7; // week 8, index 7
  const CHANNELS = {
    all: { label: 'All' },
    google: { label: 'Google', base: 400, lift: 14, noise: 30, tagged: .02, real: .018 },
    paid: { label: 'Paid', base: 220, lift: 2, noise: 40, tagged: .09, real: .016 },
    email: { label: 'Email', base: 100, lift: 3, noise: 5, tagged: .03, real: .03 },
    social: { label: 'Social', base: 140, lift: 0, noise: 25, tagged: .02, real: .004 },
    direct: { label: 'Direct', base: 120, lift: 1, noise: 760, tagged: .015, real: .012 }
  };
  const READS = {
    all: { raw: 'Looks great. Too great: this is what most reports show.', clean: 'Nearly half the visits were staff and bots, and most conversions were not orders. This is the number to plan on.' },
    google: { raw: 'Steady growth, with little to clean here.', clean: 'The new landing page in week 8 is working. Put the next hour of content work here.' },
    paid: { raw: 'Paid looks like the star of the account.', clean: 'The tag counted page views as conversions. Fix the tag before touching the budget.' },
    email: { raw: 'Small, so it is easy to skip in a report.', clean: 'Small but honest: the best order rate of any channel. Send more often.' },
    social: { raw: 'Decent traffic and a few conversions.', clean: 'Hardly any orders come from here. Keep it for reach and stop judging it on sales.' },
    direct: { raw: 'The biggest channel by far. That should worry you.', clean: 'Most of this was staff logging in. Exclude that traffic in GA4 and it stops hiding everything else.' }
  };
  const weeks = key => {
    const c = CHANNELS[key];
    return WIGGLE.map((w, i) => {
      const clean = Math.round(c.base * (1 + w) + Math.max(0, i - LAUNCH + 1) * c.lift);
      const raw = clean + Math.round(c.noise * (1 + w / 2));
      return { raw, clean, tagged: Math.round(raw * c.tagged), orders: Math.round(clean * c.real) };
    });
  };
  const keys = Object.keys(CHANNELS).filter(k => k !== 'all');
  const data = { all: WIGGLE.map((_, i) => keys.reduce((sum, k) => {
    const w = weeks(k)[i];
    return { raw: sum.raw + w.raw, clean: sum.clean + w.clean, tagged: sum.tagged + w.tagged, orders: sum.orders + w.orders };
  }, { raw: 0, clean: 0, tagged: 0, orders: 0 })) };
  keys.forEach(k => { data[k] = weeks(k); });

  let view = 'clean', channel = 'all', shown = null, frameId = 0;
  const NSC = 'http://www.w3.org/2000/svg';
  const tip = document.getElementById('dash-tip');
  const svg = document.createElementNS(NSC, 'svg');
  svg.setAttribute('role', 'img');
  chartEl.prepend(svg);
  const add = (tag, attrs, text) => {
    const e = document.createElementNS(NSC, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    svg.append(e);
    return e;
  };
  const fmt = n => n.toLocaleString('en');
  const nice = v => { const p = 10 ** Math.floor(Math.log10(v)), n = v / p; return [1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(s => n <= s) * p; };

  let box = {}, lines = {}, hair, ends = {};
  const layout = () => {
    const W = chartEl.clientWidth, H = 280, L = 44, R = W < 480 ? 12 : 70, T = 12, B = 26;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    box = { W, H, L, R, T, B, x: i => L + i / 11 * (W - L - R), y: 0 };
    box.grid = [0, 1, 2, 3, 4].map(() => ({ line: add('line', { class: 'grid' }), text: add('text', { 'text-anchor': 'end' }) }));
    [0, 3, 7, 11].forEach(i => add('text', { x: box.x(i), y: H - 6, 'text-anchor': 'middle' }, `Week ${i + 1}`));
    add('line', { class: 'event', x1: box.x(LAUNCH), x2: box.x(LAUNCH), y1: T, y2: H - B });
    add('text', { x: box.x(LAUNCH) - 6, y: T + 10, 'text-anchor': 'end' }, 'New landing page');
    lines = { raw: add('path', { class: 'raw' }), clean: add('path', { class: 'clean' }) };
    ends = { raw: add('text', {}, 'Raw'), clean: add('text', {}, 'Cleaned') };
    hair = add('line', { class: 'hair', y1: T, y2: H - B, opacity: 0 });
  };

  const paint = s => {
    const { H, T, B, L, W, R } = box;
    const top = s.top, y = v => H - B - v / top * (H - B - T);
    box.grid.forEach((g, i) => {
      const v = top / 4 * i, gy = y(v);
      g.line.setAttribute('x1', L); g.line.setAttribute('x2', W - R); g.line.setAttribute('y1', gy); g.line.setAttribute('y2', gy);
      g.text.setAttribute('x', L - 8); g.text.setAttribute('y', gy + 4);
      g.text.textContent = fmt(Math.round(v));
    });
    for (const key of ['raw', 'clean']) {
      lines[key].setAttribute('d', s[key].map((v, i) => `${i ? 'L' : 'M'}${box.x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(''));
      lines[key].setAttribute('opacity', key === 'clean' ? s.cleanOn : 1);
      const end = ends[key];
      end.setAttribute('x', box.x(11) + 8);
      end.setAttribute('y', y(s[key][11]) + 4);
      end.setAttribute('opacity', R > 20 ? (key === 'clean' ? s.cleanOn : 1) : 0);
    }
  };
  const target = () => {
    const d = data[channel];
    return { raw: d.map(w => w.raw), clean: d.map(w => w.clean), top: nice(Math.max(...d.map(w => w.raw)) * 1.05), cleanOn: view === 'clean' ? 1 : 0 };
  };
  const mix = (a, b, k) => ({
    raw: a.raw.map((v, i) => v + (b.raw[i] - v) * k), clean: a.clean.map((v, i) => v + (b.clean[i] - v) * k),
    top: a.top + (b.top - a.top) * k, cleanOn: a.cleanOn + (b.cleanOn - a.cleanOn) * k
  });
  const go = () => {
    const to = target(), from = shown || to, began = performance.now();
    cancelAnimationFrame(frameId);
    const run = now => {
      const k = calm ? 1 : Math.min(1, (now - began) / 450), e = 1 - (1 - k) ** 3;
      shown = mix(from, to, e);
      paint(shown);
      if (k < 1) frameId = requestAnimationFrame(run);
    };
    run(began);
  };

  const kpis = document.getElementById('dash-kpis');
  const read = document.getElementById('dash-read');
  const table = document.getElementById('dash-table');
  const update = () => {
    const d = data[channel], clean = view === 'clean';
    const visits = d.reduce((s, w) => s + (clean ? w.clean : w.raw), 0);
    const conv = d.reduce((s, w) => s + (clean ? w.orders : w.tagged), 0);
    kpis.innerHTML = '';
    [[fmt(Math.round(visits / 12)), 'visits a week'], [fmt(conv), clean ? 'real orders' : 'conversions'], [`${(conv / visits * 100).toFixed(1)}%`, 'conversion rate']].forEach(([n, l]) => {
      const el = document.createElement('div');
      const b = document.createElement('b'), t = document.createElement('span');
      b.textContent = n; t.textContent = l;
      el.append(b, t);
      kpis.append(el);
    });
    read.textContent = READS[channel][view];
    svg.setAttribute('aria-label', `${CHANNELS[channel].label} visits per week over 12 weeks, ${view === 'clean' ? 'raw and cleaned' : 'raw'}. ${READS[channel][view]}`);
    table.innerHTML = `<table><thead><tr><th>Week</th><th>Raw visits</th><th>Cleaned</th><th>Conversions</th><th>Real orders</th></tr></thead><tbody>${d.map((w, i) => `<tr><td>${i + 1}</td><td>${fmt(w.raw)}</td><td>${fmt(w.clean)}</td><td>${w.tagged}</td><td>${w.orders}</td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    document.querySelectorAll('[data-channel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.channel === channel)));
    go();
  };

  const row = document.getElementById('dash-channel');
  for (const key in CHANNELS) {
    const b = document.createElement('button');
    b.className = 'mini'; b.type = 'button'; b.dataset.channel = key; b.textContent = CHANNELS[key].label;
    b.addEventListener('click', () => { channel = key; update(); });
    row.append(b, ' ');
  }
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; update(); }));

  const hover = e => {
    const r = chartEl.getBoundingClientRect(), px = e.clientX - r.left;
    const i = Math.max(0, Math.min(11, Math.round((px - box.L) / (box.W - box.L - box.R) * 11)));
    const w = data[channel][i], x = box.x(i);
    hair.setAttribute('x1', x); hair.setAttribute('x2', x); hair.setAttribute('opacity', 1);
    tip.hidden = false;
    tip.textContent = view === 'clean' ? `Week ${i + 1}: ${fmt(w.clean)} cleaned, ${fmt(w.raw)} raw` : `Week ${i + 1}: ${fmt(w.raw)} visits`;
    tip.style.left = `${Math.min(x + 10, box.W - tip.offsetWidth)}px`;
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

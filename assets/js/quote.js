// Request in, quote out: match a messy request to a catalogue, show why, and let a person confirm every line.
// The reading step is plain rules here so it runs in the browser. Invented supplier, invented parts.
(() => {
  const root = document.getElementById('qm');
  if (!root) return;

  const CAT = [
    { sku: 'IMP-4410', name: 'Impeller, bronze, 4 blade', size: 'dn50', words: 'impeller waaier pump pomp bronze', price: 412.0, stock: 6 },
    { sku: 'IMP-4412', name: 'Impeller, bronze, 6 blade', size: 'dn65', words: 'impeller waaier pump pomp bronze', price: 538.0, stock: 2 },
    { sku: 'MSL-2050', name: 'Mechanical seal set', size: 'dn50', words: 'mechanical seal afdichting asafdichting pump pomp', price: 186.5, stock: 14 },
    { sku: 'MSL-2065', name: 'Mechanical seal set', size: 'dn65', words: 'mechanical seal afdichting asafdichting pump pomp', price: 214.0, stock: 0 },
    { sku: 'FLT-0310', name: 'Fuel filter element, 10 micron', size: '', words: 'fuel filter brandstof element cartridge', price: 38.9, stock: 40 },
    { sku: 'FLT-0325', name: 'Lube oil filter element, 25 micron', size: '', words: 'oil lube filter olie smeerolie element cartridge', price: 44.5, stock: 22 },
    { sku: 'GSK-1050', name: 'Flange gasket, PTFE', size: 'dn50', words: 'gasket pakking flange flens ptfe', price: 7.8, stock: 300 },
    { sku: 'GSK-1080', name: 'Flange gasket, PTFE', size: 'dn80', words: 'gasket pakking flange flens ptfe', price: 9.6, stock: 180 },
    { sku: 'VLV-5050', name: 'Butterfly valve, wafer type', size: 'dn50', words: 'butterfly valve klep vlinderklep wafer', price: 129.0, stock: 9 },
    { sku: 'VLV-5100', name: 'Butterfly valve, wafer type', size: 'dn100', words: 'butterfly valve klep vlinderklep wafer', price: 198.0, stock: 4 },
    { sku: 'VLV-6025', name: 'Ball valve, stainless', size: 'dn25', words: 'ball valve kogelkraan kraan stainless rvs', price: 64.0, stock: 25 },
    { sku: 'BRG-6205', name: 'Deep groove ball bearing 6205-2RS', size: '', words: 'bearing lager kogellager 6205 2rs', price: 11.4, stock: 120 },
    { sku: 'BRG-6308', name: 'Deep groove ball bearing 6308-2RS', size: '', words: 'bearing lager kogellager 6308 2rs', price: 27.9, stock: 35 },
    { sku: 'ZNC-0100', name: 'Zinc anode, hull, 1 kg', size: '', words: 'zinc anode zink anode hull romp', price: 22.0, stock: 60 },
  ];

  const SAMPLES = {
    'Clear request': 'Hi, please quote:\n2x impeller bronze DN50\n2x mechanical seal DN50\n10 flange gaskets DN50\nThanks, Pieter',
    'Messy request': 'Goedemorgen,\nwe need 4 brandstoffilters 10 micron\n1 vlinderklep 100\nlager 6205 x 6 stuks\nand the zinc anodes we had last time\nGr. Anna',
    'Part numbers': 'Order ref 2291\nMSL-2065 qty 3\nBRG-6308 qty 2\nimpeller 6 blade dn 65',
  };

  const SYN = { waaier: 'impeller', pomp: 'pump', afdichting: 'seal', asafdichting: 'seal', pakking: 'gasket', pakkingen: 'gasket', flens: 'flange',
    klep: 'valve', vlinderklep: 'butterfly', kogelkraan: 'ball', lager: 'bearing', lagers: 'bearing', kogellager: 'bearing', brandstof: 'fuel',
    brandstoffilter: 'fuel filter', brandstoffilters: 'fuel filter', olie: 'oil', smeerolie: 'lube oil', zink: 'zinc', rvs: 'stainless', anodes: 'anode',
    gaskets: 'gasket', filters: 'filter', valves: 'valve', seals: 'seal', impellers: 'impeller', bearings: 'bearing' };
  const STOP = new Set('hi hello please quote need we the and for of a an x qty pcs st stuks thanks gr goedemorgen had last time order ref'.split(' '));

  const norm = s => s.toLowerCase().replace(/[(),.;:]/g, ' ');
  const words = s => norm(s).split(/\s+/).flatMap(w => (SYN[w] || w).split(' ')).filter(w => w && !STOP.has(w) && !/^\d{1,3}$/.test(w) && !/^dn\d+$/.test(w));
  const DF = {};
  CAT.forEach(c => new Set(words(c.name + ' ' + c.words)).forEach(w => { DF[w] = (DF[w] || 0) + 1; }));
  const idf = w => Math.log(1 + CAT.length / (DF[w] || 1));

  const parseLine = line => {
    const l = norm(line);
    const sku = (line.toUpperCase().match(/\b[A-Z]{3}-\d{4}\b/) || [])[0] || null;
    const sizeM = l.match(/\bdn\s?(\d{2,3})\b/) || l.match(/\b(?:vlinderklep|valve|klep)\s+(\d{2,3})\b/);
    const size = sizeM ? 'dn' + sizeM[1] : '';
    const qtyM = l.match(/(?:^|\s)(\d{1,3})\s*(?:x|pcs|st|stuks)\b/) || l.match(/\bqty\s*(\d{1,3})\b/) || l.match(/\bx\s*(\d{1,3})\b/) || l.match(/(?:^|\s)(\d{1,3})\s+(?!blade|micron|mm|kg|bar)[a-z]/);
    return { sku, size, qty: qtyM ? +qtyM[1] : 1, qtyFound: !!qtyM, w: words(line.replace(/\b[A-Z]{3}-\d{4}\b/i, '')) };
  };

  const score = (req, c) => {
    const why = [];
    if (req.sku && req.sku === c.sku) return { s: 1, why: ['part number matches exactly'] };
    const cw = new Set(words(c.name + ' ' + c.words + ' ' + c.sku.toLowerCase()));
    let hit = 0, all = 0;
    const hits = [];
    new Set(req.w).forEach(w => { const v = idf(w); all += v; if (cw.has(w)) { hit += v; hits.push(w); } });
    let s = all ? hit / all : 0;
    if (hits.length) why.push('words: ' + hits.slice(0, 4).join(', '));
    if (req.size && c.size) {
      if (req.size === c.size) { s = Math.min(1, s + .2); why.push('size ' + c.size.toUpperCase() + ' matches'); }
      else { s *= .45; why.push('size differs (' + c.size.toUpperCase() + ')'); }
    } else if (c.size && !req.size) { s *= .8; why.push('no size in request'); }
    return { s, why };
  };
  const VAGUE = /last time|vorige keer|same as|zelfde als|as before/i;

  const LEVEL = s => s >= .8 ? ['sure', 'Sure'] : s >= .5 ? ['check', 'Check'] : ['person', 'Needs a person'];
  const eur = n => '€ ' + n.toFixed(2).replace('.', ',');

  let rows = [];
  const ta = root.querySelector('#qm-in');
  const out = root.querySelector('#qm-out');
  const sum = root.querySelector('#qm-sum');
  const btn = root.querySelector('#qm-quote');
  const doc = root.querySelector('#qm-doc');

  const run = () => {
    doc.hidden = true;
    const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
    rows = [];
    lines.forEach(line => {
      const req = parseLine(line);
      if (!req.sku && !req.w.length) return;
      const ranked = CAT.map(c => ({ c, ...score(req, c) })).sort((a, b) => b.s - a.s).slice(0, 3).filter(r => r.s > .15);
      if (!ranked.length) return;
      rows.push({ line, req, ranked, pick: 0, ok: false });
    });
    render();
  };

  const render = () => {
    if (!rows.length) { out.innerHTML = '<p class="qm-empty">No product lines found. Try one of the examples.</p>'; sum.textContent = ''; btn.disabled = true; return; }
    out.innerHTML = rows.map((r, i) => {
      const m = r.ranked[r.pick], vague = VAGUE.test(r.line), shown = vague ? Math.min(m.s, .6) : m.s, [cls, label] = LEVEL(shown);
      const notes = [...m.why];
      if (vague) notes.push('refers to an earlier order, check the history');
      if (!r.req.qtyFound) notes.push('no quantity, assumed 1');
      if (m.c.stock < r.req.qty) notes.push(m.c.stock ? 'only ' + m.c.stock + ' in stock' : 'out of stock');
      const alts = r.ranked.length > 1 ? '<label class="qm-alt">Change match <select data-i="' + i + '">' + r.ranked.map((x, j) => '<option value="' + j + '"' + (j === r.pick ? ' selected' : '') + '>' + x.c.sku + ' ' + x.c.name + (x.c.size ? ' ' + x.c.size.toUpperCase() : '') + ' (' + Math.round(x.s * 100) + '%)</option>').join('') + '</select></label>' : '';
      return '<div class="qm-row' + (r.ok ? ' ok' : '') + '">' +
        '<p class="qm-req">“' + r.line.replace(/</g, '&lt;') + '”</p>' +
        '<p class="qm-match"><b>' + r.req.qty + ' × ' + m.c.sku + '</b> ' + m.c.name + (m.c.size ? ' ' + m.c.size.toUpperCase() : '') + ' <span class="qm-price">' + eur(m.c.price * r.req.qty) + '</span></p>' +
        '<p class="qm-why"><span class="qm-pill ' + cls + '">' + label + ' ' + Math.round(shown * 100) + '%</span> ' + notes.join(' · ') + '</p>' +
        '<div class="qm-act">' + alts + '<button type="button" class="mini" data-ok="' + i + '" aria-pressed="' + r.ok + '">' + (r.ok ? 'Confirmed' : 'Confirm') + '</button></div></div>';
    }).join('');
    const done = rows.filter(r => r.ok).length;
    const total = rows.reduce((t, r) => t + r.ranked[r.pick].c.price * r.req.qty, 0);
    sum.textContent = done + ' of ' + rows.length + ' lines confirmed by a person. Total ' + eur(total) + ' excl. VAT.';
    btn.disabled = done < rows.length;
  };

  out.addEventListener('change', e => { const i = e.target.dataset.i; if (i == null) return; rows[i].pick = +e.target.value; rows[i].ok = false; render(); });
  out.addEventListener('click', e => { const i = e.target.dataset.ok; if (i == null) return; rows[i].ok = !rows[i].ok; render(); });
  btn.addEventListener('click', () => {
    const total = rows.reduce((t, r) => t + r.ranked[r.pick].c.price * r.req.qty, 0);
    doc.innerHTML = '<b>Draft quote, waiting to be sent by a person</b><table>' + rows.map(r => { const c = r.ranked[r.pick].c; return '<tr><td>' + r.req.qty + '</td><td>' + c.sku + '</td><td>' + c.name + (c.size ? ' ' + c.size.toUpperCase() : '') + '</td><td>' + eur(c.price * r.req.qty) + '</td></tr>'; }).join('') + '<tr><td></td><td></td><td><b>Total excl. VAT</b></td><td><b>' + eur(total) + '</b></td></tr></table><p>Each confirmed or corrected match is logged, so the matcher learns which wording means which part.</p>';
    doc.hidden = false;
  });
  root.querySelector('#qm-samples').innerHTML = Object.keys(SAMPLES).map((k, i) => '<button type="button" class="mini" data-s="' + k + '" aria-pressed="' + (i === 1) + '">' + k + '</button>').join(' ');
  root.querySelector('#qm-samples').addEventListener('click', e => {
    const k = e.target.dataset.s; if (!k) return;
    root.querySelectorAll('#qm-samples .mini').forEach(b => b.setAttribute('aria-pressed', b === e.target));
    ta.value = SAMPLES[k]; run();
  });
  root.querySelector('#qm-run').addEventListener('click', run);
  ta.value = SAMPLES['Messy request'];
  run();
})();

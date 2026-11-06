// Live page measurements for the hero, and the contact form.

const self = document.getElementById('self');

if (self && 'PerformanceObserver' in window) {
  const lcpEl = document.getElementById('m-lcp');
  const clsEl = document.getElementById('m-cls');
  const kbEl = document.getElementById('m-kb');
  let cls = 0;

  const watch = (type, onEntries) => {
    try {
      new PerformanceObserver(list => onEntries(list.getEntries())).observe({ type, buffered: true });
    } catch { /* browser lacks this entry type, the text keeps its placeholder */ }
  };

  const weigh = () => {
    const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')];
    const bytes = entries.reduce((sum, e) => sum + (e.encodedBodySize || 0), 0);
    if (bytes) kbEl.textContent = `${Math.round(bytes / 1024)} KB`;
  };

  watch('largest-contentful-paint', entries => {
    const last = entries[entries.length - 1];
    lcpEl.textContent = `${(last.startTime / 1000).toFixed(2)} s`;
  });
  watch('layout-shift', entries => {
    for (const e of entries) if (!e.hadRecentInput) cls += e.value;
    clsEl.textContent = cls.toFixed(2);
  });
  watch('resource', weigh);
  addEventListener('load', weigh);
  self.classList.add('on');
}

const form = document.getElementById('contactForm');

if (form) {
  const status = document.getElementById('formStatus');
  const button = form.querySelector('button');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Sending';
    status.textContent = '';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
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

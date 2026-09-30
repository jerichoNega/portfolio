/**
 * Portfolio — main.js
 * Author: Beyaricko Degu
 * https://github.com/jerichoNega/portfolio
 *
 * Shared by the homepage and the article pages, so every block
 * checks that its elements exist first.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── TYPEWRITER ── */
const typedEl = document.getElementById('typed');

if (typedEl && !reduceMotion) {
  const roles = [
    'AI Automation Engineer',
    'Full-Stack Web Developer',
    'Content & Media Strategist'
  ];

  let roleIndex  = 0;
  let charIndex  = roles[0].length;
  let isDeleting = true;

  function type() {
    const word = roles[roleIndex];

    if (!isDeleting) {
      typedEl.textContent = word.slice(0, ++charIndex);
      if (charIndex === word.length) {
        isDeleting = true;
        setTimeout(type, 2200);
        return;
      }
    } else {
      typedEl.textContent = word.slice(0, --charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        roleIndex  = (roleIndex + 1) % roles.length;
      }
    }

    setTimeout(type, isDeleting ? 45 : 80);
  }

  setTimeout(type, 2600);
}

/* ── SCROLL REVEAL ── */
const revealEls = document.querySelectorAll('.reveal');

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach(el => el.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => observer.observe(el));
}

/* ── MOBILE HAMBURGER ── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  const setMenu = open => {
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  hamburger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setMenu(false);
  });
}

/* ── CONTACT FORM (Web3Forms) ── */
const form = document.getElementById('contactForm');

if (form) {
  const status = document.getElementById('formStatus');
  const button = form.querySelector('.btn-submit');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    button.disabled    = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.className   = 'form-status';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || 'Request failed');

      form.reset();
      status.textContent = 'Thanks, your message is on its way. I will reply within two working days.';
      status.classList.add('ok');
    } catch {
      status.innerHTML = 'Something went wrong. Please email me directly at <a href="mailto:beyaricko.nega@gmail.com">beyaricko.nega@gmail.com</a>.';
      status.classList.add('error');
    } finally {
      button.disabled    = false;
      button.textContent = 'Send message';
    }
  });
}

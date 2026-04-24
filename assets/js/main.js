/**
 * Portfolio — main.js
 * Author: Beyaricko Degu
 * https://github.com/jerichoNega/portfolio
 */

/* ── CURSOR GLOW ── */
const glow = document.getElementById('glow');
document.addEventListener('mousemove', e => {
  glow.style.left = e.clientX + 'px';
  glow.style.top  = e.clientY + 'px';
});

/* ── TYPEWRITER ── */
const roles = [
  'Software Engineer',
  'AI Automation Specialist',
  'Web Designer',
  'Content Strategist',
  'Entrepreneur',
  'Digital Builder'
];

let roleIndex  = 0;
let charIndex  = 0;
let isDeleting = false;

const typedEl = document.getElementById('typed');

function type() {
  const word = roles[roleIndex];

  if (!isDeleting) {
    typedEl.textContent = word.slice(0, ++charIndex);
    if (charIndex === word.length) {
      isDeleting = true;
      setTimeout(type, 1800);
      return;
    }
  } else {
    typedEl.textContent = word.slice(0, --charIndex);
    if (charIndex === 0) {
      isDeleting = false;
      roleIndex  = (roleIndex + 1) % roles.length;
    }
  }

  setTimeout(type, isDeleting ? 55 : 90);
}

setTimeout(type, 1800);

/* ── SCROLL REVEAL ── */
const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => observer.observe(el));

/* ── MOBILE HAMBURGER ── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));

document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* ── CONTACT FORM FEEDBACK ── */
document.querySelector('.btn-submit').addEventListener('click', function () {
  this.textContent   = 'Message Sent ✓';
  this.style.background = '#00ff88';

  setTimeout(() => {
    this.textContent   = 'Send Message →';
    this.style.background = 'var(--cyan)';
  }, 3000);
});

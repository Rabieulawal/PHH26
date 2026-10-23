import './style.css';

const sequence = document.getElementById('sequence');
const hero = document.getElementById('hero');
const canvas = document.getElementById('hero-canvas');
const beats = Array.from(document.querySelectorAll('.hero__beat'));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BEAT_STEPS = [0.34, 0.68];

const revealTargets = Array.from(document.querySelectorAll('[data-reveal]'));
if (!reduceMotion && 'IntersectionObserver' in window && revealTargets.length) {
  document.documentElement.classList.add('js-reveal-ready');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  revealTargets.forEach((target) => revealObserver.observe(target));
}

let scene = null;
let progress = 0;
let target = 0;
let activeBeat = 0;

if (canvas && hero) {
  import('./hero/printerScene.js').then(({ initPrinterScene }) => {
    scene = initPrinterScene(canvas, hero);
    scene.setProgress(reduceMotion ? 1 : target);
  });
}

const readScroll = () => {
  if (!sequence || !hero) return 0;
  const travel = sequence.offsetHeight - hero.offsetHeight;
  if (travel <= 0) return 1;
  const scrolled = -sequence.getBoundingClientRect().top;
  return Math.min(1, Math.max(0, scrolled / travel));
};

const setBeat = (index) => {
  if (index === activeBeat) return;
  activeBeat = index;
  beats.forEach((beat, i) => {
    beat.dataset.active = String(i === index);
  });
};

const tick = () => {
  target = reduceMotion ? 1 : readScroll();
  progress += (target - progress) * 0.12;
  if (Math.abs(target - progress) < 0.0015) progress = target;

  if (scene) scene.setProgress(progress);

  if (!reduceMotion) {
    const step = progress < BEAT_STEPS[0] ? 0 : progress < BEAT_STEPS[1] ? 1 : 2;
    setBeat(step);
  }

  requestAnimationFrame(tick);
};

window.addEventListener('resize', () => {
  target = reduceMotion ? 1 : readScroll();
});

requestAnimationFrame(tick);

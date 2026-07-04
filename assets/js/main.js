import * as THREE from './three.module.min.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL = { signal: 0x3fb0bd, breach: 0xef3b34, amber: 0xf4ab5c, ink: 0x0a0f15 };

/* =========================================================
   1. NAV: scrolled state
   ========================================================= */
const nav = document.querySelector('.nav');
const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScrollNav();
window.addEventListener('scroll', onScrollNav, { passive: true });

/* =========================================================
   1b. FRAMEWORK: simple diagram loop
   ========================================================= */
(function frameworkTrace() {
  const section = document.getElementById('framework');
  if (!section) return;

  const simpleSteps = [...section.querySelectorAll('[data-simple-step]')];
  if (!simpleSteps.length) return;

  let simpleIndex = 0;
  let simpleTimer = null;
  let sectionInView = false;

  function setSimple(nextIndex) {
    simpleIndex = nextIndex;
    simpleSteps.forEach((el, index) => el.classList.toggle('is-active', index === simpleIndex));
  }

  function startSimple() {
    if (simpleTimer || REDUCED || !sectionInView) return;
    simpleTimer = window.setInterval(() => setSimple((simpleIndex + 1) % simpleSteps.length), 1250);
  }

  function stopSimple() {
    if (!simpleTimer) return;
    window.clearInterval(simpleTimer);
    simpleTimer = null;
  }

  setSimple(0);
  if (REDUCED) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      sectionInView = entries.some((entry) => entry.isIntersecting);
      if (sectionInView) startSimple();
      else stopSimple();
    }, { rootMargin: '120px 0px', threshold: 0.2 });
    observer.observe(section);
  } else {
    sectionInView = true;
    startSimple();
  }
})();

/* =========================================================
   2. HERO: spectrogram-waterfall of waveforms (three.js)
   A field of teal audio traces receding in depth; one coral
   trace hides among them: the buried instruction.
   ========================================================= */
(function heroField() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { return; } // graceful: CSS ink background remains

  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COL.ink, 0.055);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(0, 3.1, 15);
  camera.lookAt(0, 0.3, -8);

  const LINES = REDUCED ? 16 : 30;
  const POINTS = 150;
  const WIDTH = 26;
  const SPACING = 1.15;
  const CORAL_INDEX = Math.floor(LINES * 0.42);
  const AMBER_INDEX = Math.floor(LINES * 0.72);

  const group = new THREE.Group();
  scene.add(group);

  const traces = [];
  for (let i = 0; i < LINES; i++) {
    const positions = new Float32Array(POINTS * 3);
    for (let p = 0; p < POINTS; p++) {
      positions[p * 3] = (p / (POINTS - 1) - 0.5) * WIDTH;
      positions[p * 3 + 1] = 0;
      positions[p * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const isCoral = i === CORAL_INDEX;
    const isAmber = i === AMBER_INDEX;
    const depth = i / LINES;
    const mat = new THREE.LineBasicMaterial({
      color: isCoral ? COL.breach : isAmber ? COL.amber : COL.signal,
      transparent: true,
      opacity: isCoral ? 0.88 : isAmber ? 0.6 : 0.14 + (1 - depth) * 0.4,
    });
    const line = new THREE.Line(geo, mat);
    line.position.z = -i * SPACING;
    group.add(line);
    traces.push({ line, geo, phase: i * 0.5, isCoral });
  }

  // pointer parallax
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  if (!REDUCED) {
    window.addEventListener('pointermove', (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.5;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.35;
    });
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function wave(p, t, phase, isCoral) {
    const x = p / (POINTS - 1);
    // benign speech: layered harmonics; coral payload: tighter, sparser
    if (isCoral) {
      const env = Math.exp(-Math.pow((x - 0.5) * 3.2, 2)); // localised burst
      return (Math.sin(x * 34 + t * 2.2 + phase) * 0.55 + Math.sin(x * 61 + t * 1.3) * 0.3) * env * 0.9;
    }
    return (
      Math.sin(x * 7 + t + phase) * 0.5 +
      Math.sin(x * 15 + t * 0.7 + phase) * 0.28 +
      Math.sin(x * 28 - t * 1.1) * 0.14
    );
  }

  let t0 = 0;
  function frame(ts) {
    const t = ts * 0.001;
    for (let i = 0; i < traces.length; i++) {
      const { geo, phase, isCoral } = traces[i];
      const pos = geo.attributes.position.array;
      const amp = isCoral ? 0.9 : 0.7;
      for (let p = 0; p < POINTS; p++) {
        pos[p * 3 + 1] = wave(p, REDUCED ? 0 : t, phase, isCoral) * amp;
      }
      geo.attributes.position.needsUpdate = true;
    }
    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;
    group.rotation.y = cur.x * 0.3;
    group.rotation.x = cur.y * 0.15;
    // slow drift forward, recycling depth for an endless-scan feel
    if (!REDUCED) group.position.z = ((t * 0.6) % SPACING);
    renderer.render(scene, camera);
    if (!REDUCED) requestAnimationFrame(frame);
  }
  if (REDUCED) { frame(0); } else { requestAnimationFrame(frame); }
})();

/* =========================================================
   3. HERO TITLE reveal + buried-echo pulse (GSAP)
   ========================================================= */
window.addEventListener('load', () => {
  if (!window.gsap) {
    // resilience: never leave reveal content hidden if the animation lib is unavailable
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    document.querySelectorAll('.bar-fill').forEach((el) => { el.style.width = (el.dataset.w || '0') + '%'; });
    document.querySelectorAll('.pair-bar > i').forEach((el) => { el.style.width = (el.dataset.w || '0') + '%'; });
    return;
  }
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  if (!REDUCED) {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.hero-kicker', { y: 18, opacity: 0, duration: 0.7 })
      .from('.hero h1 .glyph', { yPercent: 115, opacity: 0, duration: 0.9, stagger: 0.06 }, '-=0.3')
      .fromTo('.hero h1 .buried', { opacity: 0 }, { opacity: 0.32, duration: 1.1 }, '-=0.4')
      .from('.hero-sub', { y: 20, opacity: 0, duration: 0.7 }, '-=0.6')
      .from('.hero-cta > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.4')
      .from('.scroll-cue', { opacity: 0, duration: 0.8 }, '-=0.2');

    // the buried payload breathes beneath the title
    gsap.to('.hero h1 .buried', { y: '+=8', opacity: 0.22, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });
  }

  /* ---- scroll reveals ---- */
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      onStart: () => el.classList.add('is-in'),
    });
  });

  /* ---- horizontal bar charts ---- */
  gsap.utils.toArray('.bar-fill').forEach((el) => {
    const w = el.dataset.w || '0';
    gsap.fromTo(el, { width: '0%' }, {
      width: w + '%', duration: 1.3, ease: 'power3.out',
      scrollTrigger: { trigger: el.closest('.chart-block') || el, start: 'top 78%', once: true },
    });
  });

  /* ---- paired sem/aco bars ---- */
  gsap.utils.toArray('.pair-bar > i').forEach((el) => {
    const w = el.dataset.w || '0';
    gsap.fromTo(el, { width: '0%' }, {
      width: w + '%', duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: el.closest('.pair-grid') || el, start: 'top 80%', once: true },
    });
  });

  /* ---- standout counter ---- */
  const huge = document.querySelector('.standout .huge .num');
  if (huge) {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: 96, duration: 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: '.standout', start: 'top 75%', once: true },
      onUpdate: () => { huge.textContent = Math.round(obj.v); },
    });
  }
});

/* =========================================================
   4. BURIAL INTERACTIVE: dose-response demo (2D canvas)
   Aggregate of the three models at each tested payload level.
   -12dB: 0/24, -9dB: 1/27, -6dB: 4/24
   ========================================================= */
(function burial() {
  const canvas = document.getElementById('burial-canvas');
  const slider = document.getElementById('db-slider');
  if (!canvas || !slider) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const LEVELS = {
    '-12': { gain: 0.10, succ: 0, n: 24, caption: 'Well concealed. The payload is inaudible beneath the cover speech, and no model acted on it.' },
    '-9':  { gain: 0.24, succ: 1, n: 27, caption: 'Slightly louder. A single trial across all three models slipped through, barely above noise.' },
    '-6':  { gain: 0.46, succ: 4, n: 24, caption: 'Now audible to a human too. Success ticks up, but the payload can no longer truly hide.' },
  };

  const valEl = document.getElementById('db-val');
  const capEl = document.getElementById('db-caption');
  const bigEl = document.getElementById('aco-figure');
  const subEl = document.getElementById('aco-sub');
  const noteEl = document.getElementById('aco-note');

  let gain = LEVELS['-12'].gain;
  let targetGain = gain;

  function sizeCanvas() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', sizeCanvas);

  function update() {
    const key = slider.value;
    const L = LEVELS[key];
    targetGain = L.gain;
    valEl.textContent = key;
    capEl.textContent = L.caption;
    const pct = ((L.succ / L.n) * 100).toFixed(1);
    bigEl.textContent = L.succ + '/' + L.n;
    bigEl.classList.toggle('zero', L.succ === 0);
    subEl.textContent = pct + '% of buried-audio trials';
    noteEl.textContent = L.succ === 0
      ? 'Zero breaches at this concealment.'
      : 'Only ' + L.succ + ' breach' + (L.succ > 1 ? 'es' : '') + ', and only once audible.';
  }
  slider.addEventListener('input', update);

  let t = 0;
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    gain += (targetGain - gain) * 0.08;
    if (!REDUCED) t += 0.02;
    const mid = h * 0.5;

    // cover speech (teal): full, calm
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(63,176,189,0.92)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const u = x / w;
      const y = mid + (Math.sin(u * 22 + t) * 0.5 + Math.sin(u * 9 + t * 0.6) * 0.5) * (h * 0.22);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // buried payload (coral): localised burst, scaled by gain
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = `rgba(239,59,52,${0.28 + gain * 1.4})`;
    ctx.shadowColor = 'rgba(239,59,52,0.62)';
    ctx.shadowBlur = gain * 16;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const u = x / w;
      const env = Math.exp(-Math.pow((u - 0.5) * 3.0, 2));
      const y = mid + Math.sin(u * 70 + t * 3) * (h * 0.42) * gain * env;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // faint centre baseline
    ctx.strokeStyle = 'rgba(110,150,165,0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    if (!REDUCED) requestAnimationFrame(draw);
  }

  sizeCanvas();
  update();
  if (REDUCED) { draw(); } else { requestAnimationFrame(draw); }
})();

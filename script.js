(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- scroll + resize registry (one rAF per frame) ---------- */
  const scrollFns = [];
  const resizeFns = [];
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; scrollFns.forEach((f) => f()); });
  }, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => resizeFns.forEach((f) => f()), 120); });

  /* ---------- text splitting ---------- */
  function splitWords(el, cls) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = cls;
            w.style.setProperty('--i', i++);
            if (cls === 'w') {
              const inner = document.createElement('span');
              inner.className = 'wi';
              inner.textContent = part;
              w.append(inner);
            } else {
              w.textContent = part;
            }
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    return i;
  }

  function splitRoll(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = text;
    const roll = document.createElement('span');
    roll.className = 'roll';
    roll.setAttribute('aria-hidden', 'true');
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'c';
      c.style.setProperty('--i', i);
      c.textContent = ch;
      roll.append(c);
    });
    el.append(sr, roll);
  }

  $$('[data-split]').forEach((el) => splitWords(el, 'w'));
  $$('[data-roll]').forEach(splitRoll);

  // hero letters
  $$('.hero-name .line').forEach((line, li) => {
    const text = line.textContent.trim();
    line.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i + li * 4);
      s.textContent = ch;
      line.append(s);
    });
  });

  /* ---------- generative art ---------- */
  let uid = 0;
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const svg = (cls, body) => `<svg class="art ${cls}" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
  const gridLines = () => {
    let g = '';
    for (let x = 40; x < 400; x += 40) g += `<line class="faint" x1="${x}" y1="0" x2="${x}" y2="240"/>`;
    for (let y = 40; y < 240; y += 40) g += `<line class="faint" x1="0" y1="${y}" x2="400" y2="${y}"/>`;
    return g;
  };

  const ART = {
    // Illustrative X-ray fluorescence spectrum with the gallium K lines.
    xrf() {
      const id = `xg${++uid}`;
      const X = (e) => 30 + (e / 14) * 345;
      let d = '';
      for (let e = 0.6; e <= 14.001; e += 0.04) {
        const bg = 24 * Math.exp(-(((e - 6.5) / 4.2) ** 2)) + 6;
        const peaks = 128 * Math.exp(-(((e - 9.25) / 0.13) ** 2)) + 36 * Math.exp(-(((e - 10.26) / 0.14) ** 2));
        const noise = (Math.sin(e * 91.7) + Math.sin(e * 37.3)) * 1.6;
        d += `${d ? 'L' : 'M'}${X(e).toFixed(1)} ${(196 - bg - peaks - noise).toFixed(1)}`;
      }
      return svg('art-xrf', `
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c3bff" stop-opacity=".6"/><stop offset="1" stop-color="#6c3bff" stop-opacity="0"/></linearGradient></defs>
        ${gridLines()}
        <path d="${d}L${X(14)} 196L${X(0.6)} 196Z" fill="url(#${id})"/>
        <path class="vio-ln draw" d="${d}" pathLength="1"/>
        <line class="ln" x1="30" y1="196" x2="375" y2="196"/>
        ${[0, 5, 10].map((e) => `<text class="t" x="${X(e)}" y="214" text-anchor="middle">${e}</text>`).join('')}
        <text class="t" x="375" y="214" text-anchor="end">keV</text>
        <text class="hi" x="${X(9.25) - 8}" y="40" text-anchor="end">Ga Kα</text>
        <text class="hi" x="${X(10.26) + 8}" y="128">Ga Kβ</text>
        <text class="t" x="30" y="30">XRF spectrum (illustrative)</text>
        ${reduce ? '' : '<line class="scan" x1="0" y1="44" x2="0" y2="196"/>'}`);
    },

    // Delivery route with geofences and a moving truck.
    route() {
      const pts = [[44, 176], [78, 118], [124, 152], [150, 82], [196, 122], [224, 62], [252, 164], [292, 108], [318, 182], [342, 72], [368, 132]];
      const d = `M${pts.map((p) => p.join(' ')).join('L')}`;
      return svg('art-route', `
        ${gridLines()}
        <path class="ln" d="${d}" stroke-opacity=".25"/>
        <path class="vio-ln draw" d="${d}" pathLength="1"/>
        ${[1, 5, 8].map((i, k) => `<circle class="fence" cx="${pts[i][0]}" cy="${pts[i][1]}" r="20" style="animation-delay:${k * 0.9}s"/>`).join('')}
        ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#ededea"/>`).join('')}
        <circle r="6" class="vio" cx="${reduce ? pts[0][0] : 0}" cy="${reduce ? pts[0][1] : 0}">${reduce ? '' : `<animateMotion dur="10s" repeatCount="indefinite" path="${d}"/>`}</circle>
        <text class="t" x="20" y="26">GPS · geofencing</text>`);
    },

    // House with a battery bank charging.
    battery() {
      const cells = [0, 1, 2, 3].map((i) => `
        <g transform="translate(${148 + i * 28} 132)">
          <rect class="ln" width="20" height="54" rx="2"/>
          <rect x="7" y="-5" width="6" height="5" fill="#ededea"/>
          <rect class="lvl" x="3" y="3" width="14" height="48" rx="1" style="animation-delay:${i * 0.4}s"/>
        </g>`).join('');
      return svg('art-batt', `
        ${gridLines()}
        <path class="ln" d="M104 116 L200 50 L296 116 M122 104 V200 H278 V104"/>
        <path class="vio" d="M206 64 l-13 22 h11 l-7 18 18 -25 h-11 l8 -15z"/>
        ${cells}
        <line class="ln" x1="40" y1="200" x2="360" y2="200" stroke-opacity=".35"/>
        <text class="t" x="20" y="26">Capacity · efficiency · load · cost</text>`);
    },

    // K-nearest neighbors: a query point and its three closest neighbors.
    knn() {
      const r = seeded(11);
      const pts = Array.from({ length: 30 }, (_, i) => {
        const c = i % 2;
        const cx = c ? 268 : 132;
        return { c, x: cx + (r() - 0.5) * 190, y: 120 + (r() - 0.5) * 170 };
      }).map((p) => ({ ...p, x: clamp(p.x, 24, 376), y: clamp(p.y, 24, 216) }));
      const q = { x: 204, y: 112 };
      const near = [...pts].sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, 3);
      const rad = Math.hypot(near[2].x - q.x, near[2].y - q.y) + 8;
      return svg('art-knn', `
        ${gridLines()}
        <circle class="reach" cx="${q.x}" cy="${q.y}" r="${rad.toFixed(1)}"/>
        ${near.map((p) => `<path class="vio-ln draw" d="M${q.x} ${q.y}L${p.x.toFixed(1)} ${p.y.toFixed(1)}" pathLength="1"/>`).join('')}
        ${pts.map((p) => (p.c
          ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="none" stroke="#ededea" stroke-width="1.4"/>`
          : `<circle class="vio" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5"/>`)).join('')}
        <path class="ln" d="M${q.x - 8} ${q.y}h16M${q.x} ${q.y - 8}v16"/>
        <text class="t" x="20" y="26">k = 3</text>`);
    },

    // Browser window with a blinking caret and a wandering pointer.
    web() {
      return svg('art-web', `
        ${gridLines()}
        <rect x="46" y="34" width="308" height="176" rx="10" fill="#1b1b20" stroke="#ededea" stroke-opacity=".3"/>
        <line x1="46" y1="58" x2="354" y2="58" stroke="#ededea" stroke-opacity=".2"/>
        ${[62, 76, 90].map((x) => `<circle cx="${x}" cy="46" r="4" fill="#ededea" fill-opacity=".35"/>`).join('')}
        <text x="66" y="112" fill="#ededea" style="font-size:38px;font-weight:300;letter-spacing:-1px">VENANCE</text>
        <rect class="blink" x="238" y="84" width="3" height="32" fill="#b6a1ff"/>
        <rect x="66" y="132" width="150" height="7" rx="3.5" fill="#ededea" fill-opacity=".25"/>
        <rect x="66" y="146" width="110" height="7" rx="3.5" fill="#ededea" fill-opacity=".18"/>
        <rect x="66" y="172" width="270" height="22" rx="4" class="vio"/>
        <g class="pointer"><path d="M300 150 l0 22 6 -6 5 10 4 -2 -5 -10 8 0z" fill="#ededea"/></g>`);
    },

    // Spreadsheet with cells being flagged.
    grid() {
      const r = seeded(5);
      let cells = '';
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const x = 38 + col * 54;
          const y = 36 + row * 30;
          cells += `<rect x="${x}" y="${y}" width="50" height="26" rx="2" fill="${row === 0 ? '#2a2a31' : '#1c1c21'}"/>`;
          if (row > 0) cells += `<rect x="${x + 6}" y="${y + 10}" width="${14 + Math.round(r() * 26)}" height="6" rx="3" fill="#ededea" fill-opacity=".22"/>`;
          if (row > 0 && r() < 0.16) cells += `<rect class="cell-flag" x="${x}" y="${y}" width="50" height="26" rx="2" style="animation-delay:${(r() * 4.5).toFixed(2)}s"/>`;
        }
      }
      return svg('art-grid', cells);
    },

    // Bars that sort themselves.
    sort() {
      const a = [0.55, 0.2, 0.85, 0.4, 0.95, 0.3, 0.7, 0.15, 0.6, 0.45, 0.8, 0.35];
      const b = [...a].sort((x, y) => x - y);
      return svg('art-sort', a.map((h, i) => `<rect class="bar${i % 4 === 0 ? ' v' : ''}" x="${44 + i * 27}" y="40" width="18" height="160" rx="2" style="--a:${h};--b:${b[i]};animation-delay:${(i * 0.04).toFixed(2)}s"/>`).join('')
        + '<line class="ln" x1="36" y1="200" x2="364" y2="200" stroke-opacity=".35"/>');
    },

    // Budget lines being allocated.
    ledger() {
      const rows = [[0.7, 0.45], [0.35, 0.6], [0.55, 0.3], [0.25, 0.5], [0.6, 0.75]];
      return svg('art-ledger', rows.map(([a, b], i) => `
        <text class="t" x="40" y="${62 + i * 32}">${i % 2 ? '−' : '+'}</text>
        <rect x="60" y="${52 + i * 32}" width="290" height="12" rx="6" fill="#ededea" fill-opacity=".08"/>
        <rect class="budget" x="60" y="${52 + i * 32}" width="290" height="12" rx="6" style="--a:${a};--b:${b};animation-delay:${i * 0.25}s"/>`).join('')
        + '<line class="ln" x1="40" y1="214" x2="350" y2="214" stroke-opacity=".35"/>');
    },
  };
  $$('[data-art]').forEach((el) => { const f = ART[el.dataset.art]; if (f) el.innerHTML = f(); });

  /* ---------- loader → page start ---------- */
  const loader = $('.loader');
  let seen = null;
  try { seen = sessionStorage.getItem('vk-seen'); } catch (e) { /* storage blocked */ }
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
  const start = () => root.classList.add('ready');

  if (!loader || reduce || seen) {
    if (loader) loader.remove();
    fontsReady.then(() => requestAnimationFrame(start));
  } else {
    const num = $('.loader-count', loader);
    const t0 = performance.now();
    const dur = 1400;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      num.textContent = Math.round((1 - (1 - p) ** 3) * 100);
      if (p < 1) { requestAnimationFrame(step); return; }
      fontsReady.then(() => {
        loader.classList.add('done');
        setTimeout(start, 280);
        setTimeout(() => loader.remove(), 1200);
        try { sessionStorage.setItem('vk-seen', '1'); } catch (e) { /* storage blocked */ }
      });
    };
    requestAnimationFrame(step);
  }

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-split], [data-reveal]').forEach((el) => io.observe(el));

  // statement lights up word by word as it scrolls through
  const scrub = $('[data-scrub]');
  if (scrub) {
    const n = splitWords(scrub, 'sw');
    const words = $$('.sw', scrub);
    const update = () => {
      const r = scrub.getBoundingClientRect();
      const p = reduce ? 1 : clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3), 0, 1);
      const k = Math.round(p * n);
      words.forEach((w, i) => w.classList.toggle('on', i < k));
    };
    scrollFns.push(update);
    update();
  }

  // counters
  const cio = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target;
    const to = +el.dataset.count;
    const from = +(el.dataset.from || 0);
    const dec = +(el.dataset.decimals || 0);
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / 1700, 0, 1);
      const eased = p === 1 ? 1 : 1 - 2 ** (-10 * p);
      el.textContent = (from + (to - from) * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  if (!reduce) {
    $$('[data-count]').forEach((el) => {
      el.textContent = (+(el.dataset.from || 0)).toFixed(+(el.dataset.decimals || 0));
      cio.observe(el);
    });
  }

  // page colour follows the section in the middle of the screen
  const tio = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) document.body.dataset.theme = e.target.dataset.theme;
  }), { rootMargin: '-50% 0px -50% 0px' });
  $$('main [data-theme]').forEach((s) => tio.observe(s));

  /* ---------- nav ---------- */
  const nav = $('.nav');
  let lastY = scrollY;
  scrollFns.push(() => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    if (!root.classList.contains('menu-open')) nav.classList.toggle('hide', y > lastY && y > 400);
    lastY = y;
  });

  const menu = $('#menu');
  const toggle = $('.menu-toggle');
  const label = $('.menu-label', toggle);
  let menuTimer;
  function setMenu(open) {
    clearTimeout(menuTimer);
    toggle.setAttribute('aria-expanded', open);
    label.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('menu-open', open);
    nav.classList.remove('hide');
    if (open) {
      menu.hidden = false;
      void menu.offsetHeight;
      menu.classList.add('open');
      setTimeout(() => $('a', menu).focus({ preventScroll: true }), 50);
    } else {
      menu.classList.remove('open');
      menuTimer = setTimeout(() => { menu.hidden = true; }, reduce ? 0 : 850);
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });

  // local time in Alfred, NY
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const clock = () => $$('[data-clock]').forEach((el) => { el.textContent = fmt.format(new Date()); });
  clock();
  setInterval(clock, 15000);

  /* ---------- hero: signal traces ---------- */
  const hero = $('.hero');
  const canvas = $('.hero-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, t = 0, running = false, visible = true;
    const m = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!m.x) { m.x = m.tx = w * 0.62; m.y = m.ty = h * 0.4; }
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (!m.active) {
        m.tx = w * (0.55 + 0.3 * Math.sin(t * 0.21));
        m.ty = h * (0.42 + 0.22 * Math.sin(t * 0.33 + 1));
      }
      m.x = lerp(m.x, m.tx, 0.07);
      m.y = lerp(m.y, m.ty, 0.07);
      const lines = Math.max(14, Math.round(h / 24));
      const gap = h / (lines + 1);
      const R = Math.min(170, h * 0.22);
      for (let i = 1; i <= lines; i++) {
        const y0 = i * gap;
        const dy = y0 - m.y;
        const vy = Math.exp(-(dy * dy) / (2 * R * R));
        ctx.beginPath();
        for (let x = 0; x <= w + 10; x += 10) {
          const dx = (x - m.x) / (R * 1.6);
          const fall = Math.exp(-dx * dx);
          const lens = (dy / R) * 46 * fall * vy;
          const ring = Math.sin(x * 0.07 - t * 5 + i) * 7 * fall * vy;
          const drift = Math.sin(x * 0.006 + t * 0.8 + i * 0.5) * 2.2;
          const y = y0 + lens + ring + drift;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = vy > 0.45 ? `rgba(166, 140, 255, ${0.2 + vy * 0.55})` : 'rgba(237, 237, 234, 0.11)';
        ctx.stroke();
      }
    };
    const loop = () => {
      if (!visible) { running = false; return; }
      t += 0.016;
      draw();
      requestAnimationFrame(loop);
    };
    size();
    resizeFns.push(() => { size(); if (reduce) draw(); });
    if (reduce) {
      draw();
    } else {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !running) { running = true; requestAnimationFrame(loop); }
      }).observe(canvas);
      if (fine) {
        hero.addEventListener('pointermove', (e) => {
          const r = canvas.getBoundingClientRect();
          m.tx = e.clientX - r.left;
          m.ty = e.clientY - r.top;
          m.active = true;
        });
        hero.addEventListener('pointerleave', () => { m.active = false; });
      }
    }
  }

  /* ---------- hero: letters thicken near the pointer ---------- */
  const chars = $$('.hero-name .ch');
  if (fine && !reduce && chars.length) {
    let px = -1e4, py = -1e4, raf = 0;
    const update = () => {
      raf = 0;
      chars.forEach((c) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const k = clamp(1 - d / 420, 0, 1);
        const e = k * k * (3 - 2 * k);
        c.style.fontVariationSettings = `"wght" ${Math.round(300 + 500 * e)}, "wdth" ${Math.round(100 - 24 * e)}`;
      });
    };
    hero.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(update); });
    hero.addEventListener('pointerleave', () => { px = py = -1e4; if (!raf) raf = requestAnimationFrame(update); });
  }

  /* ---------- marquee: drifts, speeds up and flips with scroll ---------- */
  const track = $('.marquee-track');
  if (track && !reduce) {
    let x = 0, dir = -1, boost = 0, half = track.scrollWidth / 2, py = scrollY, on = true;
    resizeFns.push(() => { half = track.scrollWidth / 2; });
    scrollFns.push(() => {
      const d = scrollY - py;
      py = scrollY;
      if (d) dir = d > 0 ? -1 : 1;
      boost = Math.min(boost + Math.abs(d) * 0.08, 14);
    });
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(track);
    const loop = () => {
      if (on) {
        boost *= 0.94;
        x += dir * (0.9 + boost);
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- experience: accordion + floating preview ---------- */
  $$('.row').forEach((row) => {
    const btn = $('.row-head', row);
    const body = $('.row-body', row);
    body.inert = true;
    btn.addEventListener('click', () => {
      const open = row.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      body.inert = !open;
      const pv = document.querySelector('.preview');
      if (pv) pv.classList.toggle('on', !open && btn.matches(':hover'));
    });
  });

  const preview = $('.preview');
  if (preview && fine && !reduce) {
    const panes = $$('.pv', preview);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, shown = false;
    const follow = () => {
      x = lerp(x, tx, 0.14);
      y = lerp(y, ty, 0.14);
      const w = preview.offsetWidth;
      const flip = tx + w + 48 > innerWidth;
      preview.style.translate = `${(flip ? x - w - 32 : x + 32).toFixed(1)}px ${(y - preview.offsetHeight / 2).toFixed(1)}px`;
      raf = shown || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(follow) : 0;
    };
    $$('.row-head').forEach((head) => {
      const key = head.closest('.row').dataset.preview;
      head.addEventListener('pointerenter', (e) => {
        if (head.closest('.row').classList.contains('open')) return;
        if (!shown) { x = tx = e.clientX; y = ty = e.clientY; }
        panes.forEach((p) => p.classList.toggle('cur', p.dataset.k === key));
        preview.classList.add('on');
        shown = true;
        if (!raf) raf = requestAnimationFrame(follow);
      });
      head.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
      head.addEventListener('pointerleave', () => { preview.classList.remove('on'); shown = false; });
    });
  }

  /* ---------- projects: vertical scroll drives a horizontal reel ---------- */
  const proj = $('.projects');
  const ptrack = $('.p-track');
  const bar = $('.p-progress span');
  const wide = matchMedia('(min-width: 900px)');
  let hOn = false;
  const hUpdate = () => {
    if (!hOn) return;
    const dist = ptrack.offsetWidth - innerWidth;
    const p = clamp(-proj.getBoundingClientRect().top / (proj.offsetHeight - innerHeight), 0, 1);
    ptrack.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  const hSetup = () => {
    hOn = wide.matches && !reduce;
    proj.classList.toggle('h-on', hOn);
    const pin = $('.pin', proj);
    if (hOn) pin.dataset.cursor = 'Scroll'; else pin.removeAttribute('data-cursor');
    if (!hOn) { proj.style.height = ''; ptrack.style.transform = ''; return; }
    proj.style.height = `${ptrack.offsetWidth - innerWidth + innerHeight}px`;
    hUpdate();
  };
  if (proj && ptrack) {
    hSetup();
    scrollFns.push(hUpdate);
    resizeFns.push(hSetup);
    fontsReady.then(hSetup);
  }

  /* ---------- custom cursor ---------- */
  if (fine && !reduce) {
    root.classList.add('has-cursor');
    const cur = $('.cursor');
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    const lab = $('.cursor-label');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      cur.classList.add('on');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    root.addEventListener('mouseleave', () => cur.classList.remove('on'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, [data-cursor]');
      const text = t && t.dataset.cursor ? t.dataset.cursor : '';
      cur.classList.toggle('hover', !!t && !text);
      cur.classList.toggle('label', !!text);
      if (text) lab.textContent = text;
    });
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
    const loop = () => {
      rx = lerp(rx, x, 0.18);
      ry = lerp(ry, y, 0.18);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // magnetic elements
    $$('[data-magnetic]').forEach((el) => {
      const s = +el.dataset.magnetic || 0.3;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${((e.clientX - r.left - r.width / 2) * s).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * s).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0 0'; });
    });
  }

  /* ---------- copy email ---------- */
  $$('[data-copy]').forEach((btn) => {
    const state = $('.copy-state', btn);
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        state.textContent = 'Copied ✓';
        setTimeout(() => { state.textContent = 'Copy'; }, 1800);
      } catch (e) {
        location.href = `mailto:${btn.dataset.copy}`;
      }
    });
  });

  scrollFns.forEach((f) => f());
})();

/* PROTOTYPE ONLY — throwaway interactions for the mobile nav + attendance variants. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- spring ---------- */
  function spring({ from, to, velocity = 0, response = 0.35, damping = 0.8, onUpdate, onDone }) {
    if (reduce) { onUpdate(to, 0); onDone && onDone(); return; }
    const w = (2 * Math.PI) / response;
    const k = w * w;
    const c = 2 * damping * w;
    let x = from, v = velocity, last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / 0.004));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        v += (-k * (x - to) - c * v) * h;
        x += v * h;
      }
      onUpdate(x, v);
      if (Math.abs(x - to) < 0.5 && Math.abs(v) < 20) { onUpdate(to, 0); onDone && onDone(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* Apple's momentum projection (exponential decay form) */
  const project = (v) => (v / 1000) * 0.998 / (1 - 0.998);
  const rubberband = (over, dim, constant = 0.55) => (over * dim * constant) / (dim + constant * Math.abs(over));

  /* ---------- drag physics for a sheet ---------- */
  function makeSheet(el, { dir = 1, openState = false, onScrim } = {}) {
    let y = 0;                    // 0 = open, H = fully closed
    let H = 300;
    let open = openState;
    let dragging = false;
    let samples = [];
    let startY = 0, startVal = 0;
    const scrim = onScrim;
    let animToken = 0;

    const measure = () => { H = el.getBoundingClientRect().height || 300; };
    const set = (val) => {
      y = val;
      el.style.transform = `translate3d(0,${(dir > 0 ? val : -val)}px,0)`;
      if (scrim) {
        const p = Math.max(0, Math.min(1, 1 - Math.abs(val) / Math.max(H, 1)));
        scrim.style.opacity = p;
        scrim.style.pointerEvents = p > 0.02 ? 'auto' : 'none';
      }
    };
    const animate = (to, velocity = 0, damping = 0.8) => {
      const t = ++animToken;
      spring({
        from: y, to, velocity, response: 0.34, damping,
        onUpdate: (v) => { if (t === animToken) set(v); },
        onDone: () => { if (t === animToken) open = to < H * 0.5; }
      });
    };

    measure();
    set(open ? 0 : H + 40);

    function start(e) {
      if (e.button !== undefined && e.button !== 0) return;
      measure();
      animToken++;
      dragging = true;
      startY = e.clientY;
      startVal = y;
      samples = [{ t: performance.now(), p: e.clientY }];
      el.style.willChange = 'transform';
    }
    function move(e) {
      if (!dragging) return;
      const p = e.clientY;
      samples.push({ t: performance.now(), p });
      if (samples.length > 6) samples.shift();

      const raw = (p - startY) * dir;
      let val = startVal + raw;
      if (val < 0) val = -rubberband(-val, H);          // past the open edge
      if (val > H) val = H + rubberband(val - H, H);    // past the closed edge
      set(val);
    }
    function end(e) {
      if (!dragging) return;
      dragging = false;
      const first = samples[0], last = samples[samples.length - 1];
      const dt = Math.max((last.t - first.t) / 1000, 0.001);
      const v = samples.length > 1 ? ((last.p - first.p) * dir) / dt : 0;
      const projected = y + project(v);
      const shouldClose = projected > H * 0.45 || v > 420;
      const shouldOpen = projected < H * 0.55 || v < -420;

      if (open) {
        if (shouldClose && !shouldOpen) animate(H + 40, v);
        else animate(0, v);
      } else {
        if (shouldOpen && !shouldClose) animate(0, v);
        else animate(H + 40, v);
      }
    }

    const handle = el.querySelector('[data-grab]') || el;
    handle.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    return {
      open: () => { measure(); open = true; animate(0); },
      close: () => { open = false; animate(H + 40); },
      isOpen: () => open,
      set
    };
  }

  /* ---------- variant switcher ---------- */
  const VARIANTS = [
    { key: 'A', name: 'Dock + Sheet' },
    { key: 'B', name: 'Pull-down + Segmented' },
    { key: 'C', name: 'Hold dial + Orbit' },
    { key: 'D', name: 'Real structure + App header' },
    { key: 'E', name: 'Real structure + Hold dial' }
  ];
  const sections = [...document.querySelectorAll('[data-variant]')];
  const label = document.getElementById('varLabel');
  let index = Math.max(0, VARIANTS.findIndex(v => v.key === new URLSearchParams(location.search).get('variant')?.toUpperCase()));

  function apply(i) {
    index = (i + VARIANTS.length) % VARIANTS.length;
    const v = VARIANTS[index];
    sections.forEach(s => { s.hidden = s.dataset.variant !== v.key; });
    label.textContent = `${v.key} · ${v.name}`;
    try { history.replaceState(null, '', `?variant=${v.key}`); } catch {}
    closeOverlays();
  }
  document.getElementById('prevVar').onclick = () => apply(index - 1);
  document.getElementById('nextVar').onclick = () => apply(index + 1);
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') apply(index - 1);
    if (e.key === 'ArrowRight') apply(index + 1);
  });
  function closeOverlays() {
    sheetA?.close();
    pullB?.close();
    sheetD?.close();
    sheetE?.close();
    orbit?.classList.remove('open');
    fab?.classList.remove('open');
    fab?.setAttribute('aria-expanded', 'false');
  }

  /* ---------- A: dock + sheet ---------- */
  const dockPill = document.getElementById('dockPillA');
  document.querySelectorAll('[data-dock]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.dock);
      if (i === 3) { sheetA?.open(); return; }
      document.querySelectorAll('[data-dock]').forEach(b => b.classList.toggle('is-on', b === btn));
      dockPill.style.transform = `translateX(${i * 100}%)`;
    });
  });

  const scrimA = document.getElementById('scrimA');
  const sheetA = makeSheet(document.getElementById('sheetA'), { scrim: scrimA });
  document.querySelector('[data-open-a]')?.addEventListener('click', () => sheetA.open());
  document.querySelector('[data-close-a]')?.addEventListener('click', () => sheetA.close());
  scrimA.addEventListener('click', () => sheetA.close());

  /* ---------- B: pull-down + segmented ---------- */
  const scrimB = document.getElementById('scrimB');
  const pullB = makeSheet(document.getElementById('pulldownB'), { dir: -1, scrim: scrimB });
  document.querySelector('[data-open-b]')?.addEventListener('click', () => pullB.open());
  scrimB.addEventListener('click', () => pullB.close());
  document.querySelectorAll('#pulldownB .dest').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); pullB.close(); }));

  const segThumb = document.getElementById('segThumb');
  const segTrack = document.getElementById('segTrack');
  document.querySelectorAll('[data-seg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.seg);
      document.querySelectorAll('[data-seg]').forEach(b => b.classList.toggle('is-on', b === btn));
      segThumb.style.transform = `translateX(${i * 100}%)`;
      segTrack.style.transform = `translateX(-${i * 25}%)`;
    });
  });

  /* ---------- C: orbit + hold dial + carousel ---------- */
  const orbit = document.getElementById('orbitC');
  const fab = document.getElementById('fabC');
  fab.addEventListener('click', () => {
    const on = orbit.classList.toggle('open');
    fab.classList.toggle('open', on);
    fab.setAttribute('aria-expanded', String(on));
  });
  document.querySelector('.screen-c').addEventListener('click', (e) => {
    if (!orbit.classList.contains('open')) return;
    if (e.target.closest('.orbit')) return;
    orbit.classList.remove('open');
    fab.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  });

  const holdBtn = document.getElementById('holdBtn');
  const dialFill = document.getElementById('dialFill');
  const DASH = 653.45, HOLD_MS = 620;
  let holdRaf = 0, holdStart = 0, holdDone = false;

  function setRing(p) { dialFill.style.strokeDashoffset = String(DASH * (1 - p)); }
  function resetHold() {
    cancelAnimationFrame(holdRaf);
    setRing(0);
  }
  function tick(now) {
    const p = Math.min(1, (now - holdStart) / HOLD_MS);
    setRing(p);
    if (p >= 1) { completeHold(); return; }
    holdRaf = requestAnimationFrame(tick);
  }
  function completeHold() {
    holdDone = !holdDone;
    holdBtn.classList.toggle('done', holdDone);
    holdBtn.innerHTML = holdDone
      ? '<span class="dial-small">On the clock</span><span class="dial-big">09:41</span>'
      : '<span class="dial-small">Hold to</span><span class="dial-big">Clock in</span>';
    if (navigator.vibrate) navigator.vibrate(12);
    cancelAnimationFrame(holdRaf);
    setTimeout(() => setRing(0), 260);
  }
  holdBtn.addEventListener('pointerdown', (e) => {
    holdBtn.setPointerCapture(e.pointerId);
    holdStart = performance.now();
    holdRaf = requestAnimationFrame(tick);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    holdBtn.addEventListener(ev, () => { if (!holdBtn.classList.contains('done')) resetHold(); else cancelAnimationFrame(holdRaf); })
  );
  holdBtn.addEventListener('contextmenu', e => e.preventDefault());

  const carousel = document.getElementById('carousel');
  const dots = [...document.querySelectorAll('#dots i')];
  carousel.addEventListener('scroll', () => {
    const i = Math.round(carousel.scrollLeft / Math.max(carousel.clientWidth, 1));
    dots.forEach((d, n) => d.classList.toggle('on', n === Math.min(i, dots.length - 1)));
  }, { passive: true });

  /* ---------- D: real structure + app header ---------- */
  const scrimD = document.getElementById('scrimD');
  const sheetD = makeSheet(document.getElementById('sheetD'), { scrim: scrimD });
  document.querySelectorAll('[data-open-d]').forEach(el => el.addEventListener('click', () => sheetD.open()));
  document.querySelector('[data-close-d]')?.addEventListener('click', () => sheetD.close());
  scrimD.addEventListener('click', () => sheetD.close());
  document.querySelectorAll('#sheetD .sheet-row').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); sheetD.close(); }));

  document.querySelectorAll('[data-tabd]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (Number(btn.dataset.tabd) === 3) return;
      document.querySelectorAll('[data-tabd]').forEach(b => b.classList.toggle('is-on', b === btn));
    });
  });

  const screenD = document.getElementById('screenD');
  const variantD = document.querySelector('[data-variant="D"]');
  const tabbarD = document.getElementById('tabbarD');
  let lastScroll = 0;
  screenD.addEventListener('scroll', () => {
    const y = screenD.scrollTop;
    variantD.classList.toggle('is-scrolled', y > 28);
    if (y > lastScroll + 6 && y > 70) tabbarD.classList.add('is-hidden');
    else if (y < lastScroll - 6 || y < 24) tabbarD.classList.remove('is-hidden');
    lastScroll = y;
  }, { passive: true });

  document.querySelector('[data-refresh]')?.addEventListener('click', function () {
    this.classList.add('spinning');
    setTimeout(() => this.classList.remove('spinning'), 900);
  });

  /* ---------- E: real structure + hold-to-clock dial ---------- */
  const scrimE = document.getElementById('scrimE');
  const sheetE = makeSheet(document.getElementById('sheetE'), { scrim: scrimE });
  document.querySelectorAll('[data-open-e]').forEach(el => el.addEventListener('click', () => sheetE.open()));
  document.querySelector('[data-close-e]')?.addEventListener('click', () => sheetE.close());
  scrimE.addEventListener('click', () => sheetE.close());
  document.querySelectorAll('#sheetE .sheet-row').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); sheetE.close(); }));

  document.querySelectorAll('[data-tabe]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (Number(btn.dataset.tabe) === 3) return;
      document.querySelectorAll('[data-tabe]').forEach(b => b.classList.toggle('is-on', b === btn));
    });
  });

  const screenE = document.getElementById('screenE');
  const variantE = document.querySelector('[data-variant="E"]');
  const tabbarE = document.getElementById('tabbarE');
  let lastScrollE = 0;
  screenE.addEventListener('scroll', () => {
    const y = screenE.scrollTop;
    variantE.classList.toggle('is-scrolled', y > 28);
    if (y > lastScrollE + 6 && y > 70) tabbarE.classList.add('is-hidden');
    else if (y < lastScrollE - 6 || y < 24) tabbarE.classList.remove('is-hidden');
    lastScrollE = y;
  }, { passive: true });

  const holdE = document.getElementById('holdE');
  const ringFillE = document.getElementById('ringFillE');
  const ringWrapE = document.getElementById('ringWrapE');
  const coreStatusE = document.getElementById('coreStatusE');
  const holdHintE = document.getElementById('holdHintE');
  const statusPillE = document.getElementById('statusPillE');
  const DASH_E = 628.32, HOLD_E = 620;
  let onClock = true, eRaf = 0, eStart = 0, eCompleted = false;

  const setRingE = (p) => { ringFillE.style.strokeDashoffset = String(DASH_E * (1 - p)); };
  const resetE = () => { cancelAnimationFrame(eRaf); setRingE(0); };

  function completeE() {
    eCompleted = true;
    onClock = !onClock;
    ringWrapE.classList.toggle('off', !onClock);
    holdE.classList.toggle('off', !onClock);
    coreStatusE.textContent = onClock ? 'On the clock' : 'Off the clock';
    holdHintE.textContent = onClock ? 'Press and hold to clock out' : 'Press and hold to clock in';
    holdE.setAttribute('aria-label', onClock ? 'Hold to clock out' : 'Hold to clock in');
    statusPillE.className = onClock ? 'pill ok' : 'pill wait';
    statusPillE.innerHTML = `<span class="pulse small"></span>${onClock ? 'Clocked in' : 'Off the clock'}`;
    if (navigator.vibrate) navigator.vibrate(12);
    cancelAnimationFrame(eRaf);
    setTimeout(() => setRingE(0), 260);
  }
  function tickE(now) {
    const p = Math.min(1, (now - eStart) / HOLD_E);
    setRingE(p);
    if (p >= 1) { completeE(); return; }
    eRaf = requestAnimationFrame(tickE);
  }
  holdE.addEventListener('pointerdown', (e) => {
    holdE.setPointerCapture(e.pointerId);
    eCompleted = false;
    eStart = performance.now();
    eRaf = requestAnimationFrame(tickE);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    holdE.addEventListener(ev, () => { if (!eCompleted) resetE(); })
  );
  holdE.addEventListener('contextmenu', e => e.preventDefault());

  document.querySelector('[data-refresh-e]')?.addEventListener('click', function () {
    this.classList.add('spinning');
    setTimeout(() => this.classList.remove('spinning'), 900);
  });

  /* ---------- shared: live clock + clock buttons ---------- */
  function tickClock() {
    const d = new Date();
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    document.querySelectorAll('[data-clock]').forEach(el => { el.textContent = t; });
  }
  tickClock();
  setInterval(tickClock, 15000);

  document.querySelectorAll('[data-clockbtn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const out = !btn.dataset.out;
      btn.dataset.out = out ? '1' : '';
      if (btn.classList.contains('primary-pill') || btn.hasAttribute('data-real')) btn.textContent = out ? 'Clock in' : 'Clock out';
      else btn.setAttribute('aria-label', out ? 'Clock in' : 'Clock out');
      const status = btn.closest('.hero')?.querySelector('.status-text');
      const meta = btn.closest('.hero')?.querySelector('.status-meta');
      if (status) status.textContent = out ? 'Off the clock' : 'On the clock';
      if (meta) meta.textContent = out ? 'last 09:12' : 'since 09:12';
    });
  });

  apply(index);
})();

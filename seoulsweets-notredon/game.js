/* Seongsu-dong to Fifth Avenue: a 40-second catch game.
   Pixel art is drawn from sprites.js. No images, no libraries.
   It gets faster the whole way, and gluten bombs fall with the desserts. */
(function () {
  'use strict';
  var W = 144, H = 192, FLOOR = 172, TRIP = 40, REACH = 13;
  var KINDS = window.SS_SPRITES || [], BOMBDEF = window.SS_BOMB;
  var C = { bg: '#292A2D', bg2: '#232427', far: '#34363B', near: '#3F4147', win: '#C69869', cream: '#FAF3E3', tan: '#C69869', cocoa: '#6C5042', red: '#D8343F' };

  var cv = document.getElementById('game'); if (!cv || !KINDS.length) return;
  var ctx = cv.getContext('2d');
  var ui = {
    wrap: document.getElementById('game-wrap'), start: document.getElementById('g-start'), over: document.getElementById('g-over'),
    title: document.getElementById('g-over-title'), line: document.getElementById('g-over-line'), score: document.getElementById('g-over-score'),
    best: document.getElementById('g-over-best'), caption: document.getElementById('g-caption'), mute: document.getElementById('g-mute'),
    share: document.getElementById('g-share')
  };
  var K = 1;

  /* ---------- sprites to offscreen canvases ---------- */
  function sprite(rows, pal) {
    var c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; var x = c.getContext('2d');
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) { var ch = rows[j][i]; if (ch !== '.') { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); } }
    return c;
  }
  KINDS.forEach(function (k) { k.img = sprite(k.rows, k.pal); });
  var BOMB = BOMBDEF.frames.map(function (f) { return sprite(f, BOMBDEF.pal); });
  window.SS_SPRITE_URL = function (id, scale) {
    var k = KINDS.filter(function (q) { return q.id === id; })[0]; if (!k) return '';
    var s = scale || 4, c = document.createElement('canvas'); c.width = 16 * s; c.height = 16 * s; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(k.img, 0, 0, 16 * s, 16 * s); return c.toDataURL();
  };
  var BOX = sprite([
    'f..........................f',
    'ff........................ff',
    '.ff......................ff.',
    '..oooooooooooooooooooooooo..',
    '..occcccccccccccccccccccco..',
    '..occcccccccccccccccccccco..',
    '..octtccccccccccccccccttco..',
    '..occcccccccttttccccccccco..',
    '..occcccccccttttccccccccco..',
    '..occcccccccccccccccccccco..',
    '..osssssssssssssssssssssso..',
    '..oooooooooooooooooooooooo..'
  ], { o: '#6C5042', c: '#FAF3E3', s: '#E2D6BC', t: '#C69869', f: '#E2D6BC' });
  var HEART = sprite(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#D8343F' });
  var HEART0 = sprite(['.rr.rr.', 'r..r..r', 'r.....r', '.r...r.', '..r.r..', '...r...'], { r: '#55575C' });

  /* ---------- skyline: Seoul on the left, New York on the right ---------- */
  var SKY_W = 520, sky = document.createElement('canvas'); sky.width = SKY_W; sky.height = FLOOR;
  (function () {
    var x = sky.getContext('2d'), seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    x.fillStyle = '#3A3C41'; for (var i = 0; i < 46; i++) x.fillRect(Math.floor(rnd() * SKY_W), Math.floor(rnd() * 70) + 14, 1, 1);
    x.fillStyle = C.far;
    for (var a = 0; a < SKY_W;) { var w = 8 + Math.floor(rnd() * 14), mid = a / SKY_W, h = 26 + Math.floor(rnd() * (mid > 0.55 ? 62 : 34)); x.fillRect(a, FLOOR - h, w, h); a += w + Math.floor(rnd() * 3); }
    x.fillStyle = C.near; for (var r = 0; r < 26; r++) x.fillRect(18 - r * 1.6, FLOOR - 58 + r, 30 + r * 3.2, 1);
    x.fillRect(31, FLOOR - 104, 3, 46); x.fillRect(27, FLOOR - 92, 11, 5); x.fillRect(29, FLOOR - 96, 7, 4); x.fillRect(32, FLOOR - 118, 1, 14);
    for (var b = 70; b < SKY_W - 96;) {
      var bw = 12 + Math.floor(rnd() * 14), bh = 30 + Math.floor(rnd() * (b > 280 ? 70 : 40)); x.fillStyle = C.near; x.fillRect(b, FLOOR - bh, bw, bh);
      x.fillStyle = C.win; for (var wy = FLOOR - bh + 4; wy < FLOOR - 6; wy += 6) for (var wx = b + 3; wx < b + bw - 3; wx += 4) if (rnd() < 0.28) x.fillRect(wx, wy, 1, 2);
      b += bw + 2 + Math.floor(rnd() * 5);
    }
    var e = SKY_W - 74; x.fillStyle = C.near;
    x.fillRect(e, FLOOR - 78, 34, 78); x.fillRect(e + 5, FLOOR - 104, 24, 26); x.fillRect(e + 10, FLOOR - 122, 14, 18); x.fillRect(e + 14, FLOOR - 132, 6, 10); x.fillRect(e + 16, FLOOR - 150, 2, 18);
    x.fillStyle = C.win; for (var ey = FLOOR - 100; ey < FLOOR - 6; ey += 6) for (var ex = e + 3; ex < e + 31; ex += 4) if ((ey > FLOOR - 78 || (ex > e + 6 && ex < e + 27)) && rnd() < 0.4) x.fillRect(ex, ey, 1, 2);
    x.fillRect(e + 16, FLOOR - 152, 2, 2);
  })();

  /* ---------- sound ---------- */
  var ac = null, muted = false;
  try { muted = localStorage.getItem('ss_mute') === '1'; } catch (e) {}
  function beep(f, d, type, vol, slide) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  function setMute(m) { muted = m; ui.mute.textContent = m ? 'Sound off' : 'Sound on'; ui.mute.setAttribute('aria-pressed', m ? 'true' : 'false'); try { localStorage.setItem('ss_mute', m ? '1' : '0'); } catch (e) {} }
  setMute(muted);
  ui.mute.addEventListener('click', function () { setMute(!muted); });

  /* ---------- state ---------- */
  var st = null, best = 0, raf = 0, last = 0, rng = Math.random;
  try { best = parseInt(localStorage.getItem('ss_best') || '0', 10) || 0; } catch (e) {}
  function reset() {
    st = { mode: 'idle', t: 0, score: 0, caught: 0, missed: 0, bombs: 0, lives: 3, boxes: 0, streak: 0, bestStreak: 0, got: {}, items: [], pops: [], splats: [],
      bx: W / 2, target: W / 2, spawn: 0.6, lastX: W / 2, flash: 0, red: 0, shake: 0, banner: '', bannerT: 0 };
  }
  reset();

  /* The whole difficulty curve lives here. p runs 0 -> 1 across the 40 seconds. */
  function level(p) {
    return {
      fall: 52 + 150 * Math.pow(p, 1.1),          // px per second: about 3.9x faster by the end
      gap: Math.max(0.24, 0.86 - 0.66 * p),       // seconds between drops
      sway: 1.5 + 11 * p,                         // sideways drift of each falling piece
      bomb: 0.10 + 0.24 * p,                      // share of drops that are gluten bombs
      decoy: 0.42 * p,                            // chance a dessert comes with a bomb right beside it
      jump: 300 + 80 * p                          // how far apart two drops in a row may land, in px per second of gap
    };
  }
  function mult() { return Math.min(5, 1 + Math.floor(st.streak / 5)); }

  function fit() {
    var dpr = window.devicePixelRatio || 1, par = ui.wrap.parentNode, cs = getComputedStyle(par);
    var avail = Math.min(par.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4, 432);   // the column's inner width, minus the frame
    K = Math.max(1, Math.floor(avail * dpr / W));
    cv.width = W * K; cv.height = H * K; cv.style.width = (W * K / dpr) + 'px'; cv.style.height = (H * K / dpr) + 'px';
    ui.wrap.style.width = cv.style.width; ui.wrap.style.height = cv.style.height;
    draw();
  }

  function pick() {
    var missing = KINDS.filter(function (k) { return !st.got[k.id]; });
    var pool = (missing.length && rng() < 0.7) ? missing : KINDS;
    return pool[Math.floor(rng() * pool.length)];
  }
  function drop(L) {
    var reach = L.jump * L.gap, x = st.lastX + (rng() * 2 - 1) * reach;
    x = Math.max(12, Math.min(W - 12, x)); if (Math.abs(x - st.lastX) < 10) x = Math.max(12, Math.min(W - 12, st.lastX + (rng() < 0.5 ? -1 : 1) * (14 + rng() * 20)));
    var v = L.fall * (0.92 + rng() * 0.2), isBomb = rng() < L.bomb;
    st.items.push({ bomb: isBomb, k: isBomb ? null : pick(), x: x, y: -16, v: v * (isBomb ? 1.08 : 1), w: rng() * 6.28, a: L.sway * (0.5 + rng() * 0.7) });
    if (!isBomb) {
      st.lastX = x;
      if (rng() < L.decoy) { var side = (x < 34 || (x < W - 34 && rng() < 0.5)) ? 1 : -1; var d = st.items[st.items.length - 1]; st.items.push({ bomb: true, k: null, x: x + side * (30 + rng() * 6), y: -16 - rng() * 8, v: v, w: d.w, a: d.a }); }   // rides beside the dessert: tight, but always catchable
    }
  }

  function hurt(x, why) {
    st.lives--; st.streak = 0; st.shake = 0.3;
    if (why === 'bomb') { st.red = 0.6; st.bombs++; st.score = Math.max(0, st.score - 30); st.pops.push({ x: x, y: FLOOR - 28, t: 0, s: '-30', c: C.red }); st.banner = 'GLUTEN!'; st.bannerT = 0.9; ui.caption.innerHTML = '<b>Gluten bomb.</b> Our ssal cakes are gluten-free, so keep it out of the box.'; beep(140, 0.34, 'sawtooth', 0.09, 45); }
    else { st.missed++; beep(180, 0.2, 'sawtooth', 0.06, 70); }
    return st.lives <= 0;
  }

  function step(dt) {
    st.t += dt;
    var p = Math.min(st.t / TRIP, 1), L = level(p);
    st.bx += (st.target - st.bx) * Math.min(1, dt * 18);
    st.spawn -= dt;
    if (st.spawn <= 0 && st.t < TRIP - 1.0) { drop(L); st.spawn = L.gap * (0.9 + rng() * 0.25); }
    for (var i = st.items.length - 1; i >= 0; i--) {
      var it = st.items[i]; it.y += it.v * dt;
      var cx = it.x + Math.sin(st.t * 3.2 + it.w) * it.a, bottom = it.y + 16;
      it.cx = cx;
      if (bottom >= FLOOR - 13 && bottom <= FLOOR - 2 && Math.abs(cx - st.bx) < REACH) {
        st.items.splice(i, 1);
        if (it.bomb) { if (hurt(cx, 'bomb')) return end(false); continue; }
        st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); st.caught++;
        var gain = 10 * mult(); st.score += gain;
        st.pops.push({ x: cx, y: FLOOR - 26, t: 0, s: '+' + gain, c: C.tan });
        var first = !st.got[it.k.id]; st.got[it.k.id] = true;
        ui.caption.innerHTML = '<b>' + it.k.name + '</b> ' + it.k.flavors;
        beep(first ? 880 : 660, 0.09, 'square', 0.05, first ? 1320 : 880);
        if (KINDS.every(function (k) { return st.got[k.id]; })) {
          st.score += 150; st.boxes++; st.got = {}; st.flash = 0.5; st.banner = 'BOX FULL +150'; st.bannerT = 1.4;
          beep(523, 0.1, 'square', 0.06); setTimeout(function () { beep(784, 0.1, 'square', 0.06); }, 100); setTimeout(function () { beep(1047, 0.18, 'square', 0.06); }, 200);
        }
      } else if (bottom >= FLOOR) {
        st.items.splice(i, 1);
        if (it.bomb) { st.splats.push({ x: cx, t: 0, c: '#55575C' }); continue; }       // a bomb that lands is harmless
        st.splats.push({ x: cx, t: 0, c: it.k.pal.b || it.k.pal.c });
        if (hurt(cx, 'miss')) return end(false);
      }
    }
    st.pops.forEach(function (o) { o.t += dt; }); st.pops = st.pops.filter(function (o) { return o.t < 0.7; });
    st.splats.forEach(function (o) { o.t += dt; }); st.splats = st.splats.filter(function (o) { return o.t < 1.2; });
    st.flash = Math.max(0, st.flash - dt); st.red = Math.max(0, st.red - dt); st.shake = Math.max(0, st.shake - dt); st.bannerT = Math.max(0, st.bannerT - dt);
    if (st.t >= TRIP && !st.items.length) end(true);
  }

  function text(s, x, y, color, align) { ctx.font = '8px "Press Start 2P", monospace'; ctx.textBaseline = 'top'; ctx.textAlign = align || 'left'; ctx.fillStyle = color || C.cream; ctx.fillText(s, x, y); }

  function draw() {
    ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false;
    var p = Math.min(st.t / TRIP, 1), sx = st.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(sky, Math.round(p * (SKY_W - W)), 0, W, FLOOR, sx, 0, W, FLOOR);
    ctx.fillStyle = C.cocoa; ctx.fillRect(0, FLOOR, W, 2); ctx.fillStyle = C.bg2; ctx.fillRect(0, FLOOR + 2, W, H - FLOOR - 2);
    for (var i = 0; i < KINDS.length; i++) {
      var tx = 4 + i * 17.25, ty = FLOOR + 3;
      if (st.got[KINDS[i].id]) ctx.drawImage(KINDS[i].img, Math.round(tx), ty);
      else { ctx.globalAlpha = 0.16; ctx.drawImage(KINDS[i].img, Math.round(tx), ty); ctx.globalAlpha = 1; }
    }
    ctx.fillStyle = '#4A4C52'; ctx.fillRect(6, 5, W - 12, 1);
    ctx.fillStyle = C.tan; ctx.fillRect(6, 5, Math.round((W - 12) * p), 1); ctx.fillRect(4 + Math.round((W - 12) * p), 3, 5, 5);
    ctx.fillStyle = C.cream; ctx.fillRect(5 + Math.round((W - 12) * p), 4, 3, 3);
    text(String(st.score), 6, 12, C.cream);
    if (mult() > 1) text('x' + mult(), 6, 23, C.tan);
    for (var h = 0; h < 3; h++) ctx.drawImage(h < st.lives ? HEART : HEART0, W - 8 - (h + 1) * 9 + 3, 13);
    st.items.forEach(function (it) {
      var x = Math.round((it.cx === undefined ? it.x : it.cx) - 8) + sx;
      ctx.drawImage(it.bomb ? BOMB[Math.floor(st.t * 8) % 2] : it.k.img, x, Math.round(it.y));
    });
    st.splats.forEach(function (o) { ctx.globalAlpha = Math.max(0, 1 - o.t / 1.2); ctx.fillStyle = o.c; var r = 3 + Math.round(o.t * 10); ctx.fillRect(Math.round(o.x - r), FLOOR - 2, r * 2, 2); ctx.fillRect(Math.round(o.x - r - 3), FLOOR - 4 - Math.round(o.t * 6), 2, 2); ctx.fillRect(Math.round(o.x + r + 1), FLOOR - 5 - Math.round(o.t * 5), 2, 2); ctx.globalAlpha = 1; });
    ctx.drawImage(BOX, Math.round(st.bx - 14) + sx, FLOOR - 13);
    st.pops.forEach(function (o) { ctx.globalAlpha = Math.max(0, 1 - o.t / 0.7); text(o.s, Math.round(o.x), Math.round(o.y - o.t * 22), o.c || C.tan, 'center'); ctx.globalAlpha = 1; });
    if (st.bannerT > 0) { ctx.fillStyle = 'rgba(41,42,45,.86)'; ctx.fillRect(0, 70, W, 20); text(st.banner, W / 2, 76, st.banner === 'GLUTEN!' ? C.red : C.tan, 'center'); }
    if (st.flash > 0) { ctx.fillStyle = 'rgba(250,243,227,' + (st.flash * 0.5).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (st.red > 0) { ctx.fillStyle = 'rgba(216,52,63,' + Math.min(0.5, st.red * 0.9).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (st.mode === 'idle') { ctx.fillStyle = 'rgba(41,42,45,.55)'; ctx.fillRect(0, 0, W, H); }
  }

  function loop(ts) {
    if (st.mode !== 'play') return;
    var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    step(dt); draw();
    if (st.mode === 'play') raf = requestAnimationFrame(loop);
  }

  function start() {
    reset(); st.mode = 'play'; st.began = Date.now(); ui.start.hidden = true; ui.over.hidden = true; ui.wrap.classList.add('playing');
    ui.caption.textContent = 'Catch the desserts. Dodge the gluten bombs.';
    beep(440, 0.08); last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function end(won) {
    st.mode = 'over'; ui.wrap.classList.remove('playing'); cancelAnimationFrame(raf);
    if (won) st.score += 200 + 100 * st.lives;
    var perfect = won && st.lives === 3;
    draw();
    if (st.score > best) { best = st.score; try { localStorage.setItem('ss_best', String(best)); } catch (e) {} }
    ui.title.textContent = perfect ? 'Perfect!' : won ? 'Delivered!' : 'Dropped!';
    ui.line.textContent = won ? 'You made it from Seongsu-dong to 308 5th Ave.' : 'Three strikes before Fifth Avenue.';
    ui.score.textContent = st.score + ' pts · ' + st.caught + ' boxed'; ui.best.textContent = 'Your best ' + best;
    ui.over.hidden = false;
    if (won) { beep(523, 0.12); setTimeout(function () { beep(659, 0.12); }, 120); setTimeout(function () { beep(784, 0.25); }, 240); }
    if (window.SS_ON_GAME_END) { try { window.SS_ON_GAME_END({ score: st.score, caught: st.caught, won: won, perfect: perfect, lives: st.lives, seconds: Math.round(st.t * 10) / 10, streak: st.bestStreak }); } catch (e) {} }
  }

  /* ---------- input ---------- */
  function toX(ev) { var r = cv.getBoundingClientRect(); return Math.max(14, Math.min(W - 14, (ev.clientX - r.left) / r.width * W)); }
  cv.addEventListener('pointerdown', function (ev) { if (st.mode === 'play') { st.target = toX(ev); try { cv.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); } });
  cv.addEventListener('pointermove', function (ev) { if (st.mode === 'play') st.target = toX(ev); });
  var keys = {};
  window.addEventListener('keydown', function (ev) { if (st.mode !== 'play') return; if (ev.key === 'ArrowLeft' || ev.key === 'a') { keys.l = 1; ev.preventDefault(); } if (ev.key === 'ArrowRight' || ev.key === 'd') { keys.r = 1; ev.preventDefault(); } });
  window.addEventListener('keyup', function (ev) { if (ev.key === 'ArrowLeft' || ev.key === 'a') keys.l = 0; if (ev.key === 'ArrowRight' || ev.key === 'd') keys.r = 0; });
  setInterval(function () { if (st.mode === 'play' && (keys.l || keys.r)) st.target = Math.max(14, Math.min(W - 14, st.target + (keys.r ? 6 : -6))); }, 16);
  document.addEventListener('visibilitychange', function () { if (document.hidden && st.mode === 'play') { st.mode = 'paused'; cancelAnimationFrame(raf); } else if (!document.hidden && st.mode === 'paused') { st.mode = 'play'; last = performance.now(); raf = requestAnimationFrame(loop); } });

  [].forEach.call(document.querySelectorAll('[data-g-play]'), function (b) { b.addEventListener('click', start); });
  ui.share.addEventListener('click', function () {
    var url = location.origin + location.pathname, msg = 'I scored ' + st.score + ' on the way from Seongsu-dong to Fifth Ave. Seoul Sweets x Notre Don, Dec 5 + 6.';
    if (navigator.share) navigator.share({ title: 'Seoul Sweets x Notre Don', text: msg, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(msg + ' ' + url).then(function () { ui.share.textContent = 'Copied'; setTimeout(function () { ui.share.textContent = 'Share score'; }, 1600); });
  });

  window.addEventListener('resize', fit);
  (document.fonts && document.fonts.load ? document.fonts.load('8px "Press Start 2P"') : Promise.resolve()).then(fit, fit);
  fit();
  window.SS_GAME = { start: start, state: function () { return st; }, level: level, TRIP: TRIP, W: W, FLOOR: FLOOR, REACH: REACH, _end: end, _step: step, _draw: draw, _reset: reset, _rng: function (f) { rng = f; } };
})();

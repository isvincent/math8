// 決定性動畫引擎：seek(t) 依時間 t 計算所有元素狀態（播放與逐格錄製共用）
const RENDER = location.search.includes('render');
if (RENDER) document.documentElement.classList.add('render');
const TR = 0.75;                       // 轉場長度（秒）
const slides = [...document.querySelectorAll('.slide')];
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
const ez = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const eo = p => 1 - Math.pow(1 - p, 3);
const back = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

const E = [...document.querySelectorAll('[data-t]')].map(e => {
  const d = e.dataset;
  return {
    e, t: +d.t, d: +(d.d || .6), fx: d.fx || 'up', out: d.out != null ? +d.out : null, loop: d.loop || '',
    show: !!d.show, from: (d.from || '0,0').split(',').map(Number), amp: (d.amp || '0,0').split(',').map(Number),
    v0: +d.v0, v1: +d.v1, dec: +(d.dec || 0), pre: d.pre || '', suf: d.suf || '', txt: e.textContent,
    slide: +e.closest('.slide').dataset.i
  };
});
const bySlide = slides.map((_, i) => E.filter(o => o.slide === i));

function apply(o, t) {
  const p = cl((t - o.t) / o.d);
  let op = 1, tf = '', e;
  switch (o.fx) {
    case 'fade': op = ez(p); break;
    case 'up': e = eo(p); op = cl(p * 1.6); tf = `translate(0px,${(1 - e) * 46}px)`; break;
    case 'left': e = eo(p); op = cl(p * 1.6); tf = `translate(${(e - 1) * 70}px,0px)`; break;
    case 'pop': e = back(p); op = cl(p * 3); tf = `scale(${0.25 + 0.75 * e})`; break;
    case 'grow': e = eo(p); op = p > 0 ? 1 : 0; tf = `scaleX(${Math.max(e, 0.001)})`; break;
    case 'draw': e = ez(p); o.e.style.strokeDasharray = '1 1'; o.e.style.strokeDashoffset = (1 - e).toFixed(4); op = p > 0 ? 1 : 0; break;
    case 'move': e = ez(p); tf = `translate(${(o.from[0] * (1 - e)).toFixed(2)}px,${(o.from[1] * (1 - e)).toFixed(2)}px)`;
      op = o.show ? 1 : cl(p * 5); break;
    case 'count': {
      e = ez(p); const v = o.v0 + (o.v1 - o.v0) * e;
      o.e.textContent = o.pre + v.toFixed(o.dec) + o.suf; return;
    }
  }
  if (o.out != null) op *= 1 - cl((t - o.out) / 0.45);
  if (o.loop && t >= o.t + o.d) {
    const lt = t - o.t - o.d;
    if (o.loop === 'pulse') tf += ` scale(${(1 + 0.07 * Math.sin(lt * 4)).toFixed(4)})`;
    else if (o.loop === 'glow') op *= 0.72 + 0.28 * Math.cos(lt * 3);
    else if (o.loop === 'float') tf += ` translate(0px,${(8 * Math.sin(lt * 2)).toFixed(2)}px)`;
  }
  o.e.style.opacity = op.toFixed(3);
  o.e.style.transform = tf;
}

function trans(k, cur, prev, p) {
  const e = ez(p);
  switch (k % 6) {
    case 0: cur.style.opacity = e; cur.style.transform = `scale(${1.12 - 0.12 * e})`; break;                 // 縮放淡入
    case 1: cur.style.transform = `translateX(${(1 - e) * 100}%)`; prev.style.transform = `translateX(${-e * 35}%)`; break; // 推移
    case 2: cur.style.clipPath = `circle(${e * 120}% at 50% 40%)`; break;                                   // 圓形展開
    case 3: cur.style.transform = `translateY(${(1 - e) * 100}%)`; prev.style.transform = `scale(${1 - 0.08 * e})`; prev.style.opacity = 1 - 0.5 * e; break; // 上推
    case 4: { const x = e * 150; cur.style.clipPath = `polygon(0 0, ${x}% 0, ${x - 50}% 100%, 0 100%)`; break; } // 斜向擦除
    case 5: { const v = 50 * (1 - e); cur.style.clipPath = `inset(${v}% ${v}% ${v}% ${v}% round ${60 * (1 - e)}px)`; break; } // 光圈
  }
}

const subEl = document.getElementById('subt'), prog = document.getElementById('prog');
let lastSub = -2;
function seek(t) {
  let i = 0;
  while (i + 1 < STARTS.length && t >= STARTS[i + 1]) i++;
  const inTr = i > 0 && t - STARTS[i] < TR;
  slides.forEach((s, j) => {
    const vis = j === i || (inTr && j === i - 1);
    s.style.display = vis ? 'block' : 'none';
    s.style.transform = ''; s.style.clipPath = ''; s.style.opacity = '';
    s.style.zIndex = j === i ? 2 : 1;
  });
  if (inTr) trans(i - 1, slides[i], slides[i - 1], cl((t - STARTS[i]) / TR));
  for (const o of bySlide[i]) apply(o, t);
  if (inTr) for (const o of bySlide[i - 1]) apply(o, t);
  // 字幕
  let c = -1;
  for (let k = 0; k < CUES.length; k++) {
    const nx = k + 1 < CUES.length ? CUES[k + 1].a : 1e9;
    if (t >= CUES[k].a && t < Math.min(CUES[k].b + 0.35, nx)) { c = k; break; }
  }
  if (c !== lastSub) { subEl.textContent = c >= 0 ? CUES[c].t : ''; lastSub = c; }
  const sp = c >= 0 ? eo(cl((t - CUES[c].a) / 0.18)) : 0;
  subEl.style.opacity = sp; subEl.style.transform = `translateY(${(1 - sp) * 14}px)`;
  document.getElementById('sub').style.opacity = c >= 0 ? 1 : 0.0;
  prog.style.width = (100 * t / TOTAL).toFixed(3) + '%';
}
window.seek = seek;

// ---- 播放模式 ----
const aud = document.getElementById('aud'), btn = document.getElementById('play'),
  bar = document.getElementById('seek'), clock = document.getElementById('clock');
function fit() {
  const w = document.getElementById('wrap');
  if (RENDER) { w.style.left = '0'; w.style.top = '0'; w.style.transform = 'none'; return; }
  const s = Math.min(innerWidth / 1080, (innerHeight - 60) / 1920);
  w.style.transform = `scale(${s}) translate(-50%,-50%)`;
  w.style.transformOrigin = '0 0';
  w.style.left = '50%'; w.style.top = `calc(50% - 25px)`;
  w.style.transform = `translate(-50%,-50%) scale(${s})`; w.style.transformOrigin = 'center center';
}
addEventListener('resize', fit); fit();
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function loop() {
  seek(aud.currentTime); bar.value = aud.currentTime; clock.textContent = fmtT(aud.currentTime) + ' / ' + fmtT(TOTAL);
  if (!aud.paused) requestAnimationFrame(loop);
}
btn.onclick = () => { if (aud.paused) { aud.play(); btn.textContent = '❚❚ 暫停'; requestAnimationFrame(loop); } else { aud.pause(); btn.textContent = '▶ 播放'; } };
bar.oninput = () => { aud.currentTime = +bar.value; seek(+bar.value); };
aud.onended = () => { btn.textContent = '▶ 播放'; };
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); btn.onclick(); } });
seek(RENDER ? 0 : 0.01);

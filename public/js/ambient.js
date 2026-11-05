// Процедурный звук: потрескивание камина и дождь за окном (Web Audio, без файлов).
export function createAmbient() {
  let ctx = null, master = null, timer = null, vol = 0.35;
  function noiseBuffer(seconds, kind) {
    const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.6; }
    }
    return buf;
  }
  function loop(buf, filterType, freq, gain) {
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master); src.start();
    return g;
  }
  function crackle() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const len = 0.004 + Math.random() * 0.018;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 3500; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.15 + Math.random() * 0.5;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = -0.5 + Math.random() * 0.25; src.connect(f).connect(g).connect(pan).connect(master); }
      else src.connect(f).connect(g).connect(master);
      src.start(t + k * (0.01 + Math.random() * 0.05));
    }
    timer = setTimeout(crackle, 60 + Math.random() * (Math.random() < 0.2 ? 900 : 260));
  }
  return {
    start(v = vol) {
      vol = v;
      try {
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
          loop(noiseBuffer(4, 'brown'), 'lowpass', 380, 0.5); // гул огня
          loop(noiseBuffer(5, 'pink'), 'highpass', 1800, 0.07); // дождь
          loop(noiseBuffer(6, 'pink'), 'bandpass', 600, 0.05); // капли по стеклу
        }
        ctx.resume();
        master.gain.setTargetAtTime(vol * 0.6, ctx.currentTime, 0.8);
        clearTimeout(timer); crackle();
      } catch (e) { console.warn('ambient', e); }
    },
    stop() { if (!ctx) return; master.gain.setTargetAtTime(0, ctx.currentTime, 0.4); clearTimeout(timer); timer = null; },
    volume(v) { vol = v; if (ctx && timer) master.gain.setTargetAtTime(vol * 0.6, ctx.currentTime, 0.2); },
  };
}

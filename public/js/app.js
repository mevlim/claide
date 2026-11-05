import { createScene, W, H } from './art.js';
import { STYLE_PRESETS, DEFAULT_SETTINGS } from './presets.js';
import { createAmbient } from './ambient.js';

// ------------------------------------------------------------ хранилище
const LS_SETTINGS = 'mentor.settings.v1', LS_HISTORY = 'mentor.history.v1';
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const settings = { ...DEFAULT_SETTINGS, ...load(LS_SETTINGS, {}) };
let history = load(LS_HISTORY, []);
const saveSettings = () => save(LS_SETTINGS, settings);
const saveHistory = () => save(LS_HISTORY, history.slice(-400));

// ------------------------------------------------------------ DOM
const $ = (s, r = document) => r.querySelector(s);
const canvas = $('#scene'), textEl = $('#text'), speakerEl = $('#speaker'), nameBox = $('.namebox');
const input = $('#input'), form = $('#inputRow'), micBtn = $('#micBtn'), liveBtn = $('#liveBtn'), sendBtn = $('#sendBtn');
const moreEl = $('#more'), modal = $('#modal'), modalTitle = $('#modalTitle'), modalBody = $('#modalBody');
const toastEl = $('#toast');

const scene = createScene(canvas);
const ambient = createAmbient();

// ------------------------------------------------------------ сцена: масштаб «cover» с фокусом на героине
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const s = Math.max(vw / W, vh / H);
  const cw = W * s, ch = H * s;
  // фокус по X на героине (x=270), по Y — чуть выше центра
  let left = vw / 2 - 270 * s; left = Math.min(0, Math.max(vw - cw, left));
  let top = (vh - ch) / 2; if (ch > vh) top = Math.min(0, Math.max(vh - ch, vh * 0.42 - 110 * s));
  Object.assign(canvas.style, { width: cw + 'px', height: ch + 'px', left: left + 'px', top: top + 'px' });
}
addEventListener('resize', layout); layout();

// ------------------------------------------------------------ утилиты
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (s) => esc(s).replace(/\*([^*\n]{1,80})\*/g, '<em class="action">$1</em>');
function toast(msg, kind = '') {
  toastEl.textContent = msg; toastEl.className = 'show ' + kind;
  clearTimeout(toast.t); toast.t = setTimeout(() => (toastEl.className = ''), kind === 'error' ? 6000 : 3200);
}
const MOOD_RE = /<mood>\s*([a-z]+)\s*<\/mood>/gi;
const REM_RE = /<remember>([\s\S]*?)<\/remember>/gi;
const stripTags = (s) => s.replace(MOOD_RE, '').replace(REM_RE, '').replace(/<\/?(mood|remember)>/gi, '').replace(/^\s+/, '');

// Разбор потокового текста: убираем теги, запоминаем, где меняется эмоция.
function parseStream(raw) {
  let display = '', moods = [], remembers = [], i = 0;
  while (i < raw.length) {
    const lt = raw.indexOf('<', i);
    if (lt < 0) { display += raw.slice(i); break; }
    display += raw.slice(i, lt);
    const rest = raw.slice(lt);
    let m;
    if ((m = /^<mood>\s*([a-z]+)\s*<\/mood>/i.exec(rest))) { moods.push({ at: display.length, mood: m[1].toLowerCase() }); i = lt + m[0].length; continue; }
    if ((m = /^<remember>([\s\S]*?)<\/remember>/i.exec(rest))) { remembers.push(m[1].trim()); i = lt + m[0].length; continue; }
    // незакрытый тег в конце потока — ждём продолжения
    const low = rest.toLowerCase();
    const partialOpen = '<mood>'.startsWith(low) || '<remember>'.startsWith(low);
    const unclosed = (low.startsWith('<mood>') && !low.includes('</mood>')) || (low.startsWith('<remember>') && !low.includes('</remember>'));
    if (partialOpen || unclosed) break;
    display += '<'; i = lt + 1;
  }
  return { display: display.replace(/^\s+/, ''), moods, remembers, lead: display.length - display.replace(/^\s+/, '').length };
}

// ------------------------------------------------------------ голос: синтез
let voices = [];
function loadVoices() {
  voices = (window.speechSynthesis?.getVoices() || []);
  const sel = $('#voiceSel'); if (sel) fillVoiceSelect(sel);
}
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
// Оценка «естественности» голоса: нейросетевые голоса браузера звучат намного живее системных.
const FEMALE = /milena|irina|svetlana|dariya|darya|alena|alyona|anna|ekaterina|katya|elena|female|жен|natalia|polina|alice|алис|vera|marina/i;
const MALE = /pavel|dmitry|yuri|maxim|male|муж|artem|filipp/i;
function voiceScore(v) {
  let s = 0;
  if (/^ru/i.test(v.lang)) s += 1000;
  if (/natural|neural|online/i.test(v.name)) s += 300; // Edge: «Microsoft Svetlana Online (Natural)»
  if (/premium|enhanced|улучш/i.test(v.name)) s += 250; // Safari/macOS: «Milena (Premium)»
  if (/google/i.test(v.name)) s += 150; // Chrome: «Google русский»
  if (v.localService === false) s += 40;
  if (FEMALE.test(v.name)) s += 60; else if (MALE.test(v.name)) s -= 80;
  return s;
}
const voiceTier = (v) => { const s = voiceScore(v) - 1000; return s >= 250 ? 'natural' : s >= 150 ? 'good' : 'basic'; };
function pickVoice() {
  if (!voices.length) return null;
  const byURI = voices.find((v) => v.voiceURI === settings.voiceURI);
  if (byURI) return byURI;
  const ru = voices.filter((v) => /^ru/i.test(v.lang)).sort((x, y) => voiceScore(y) - voiceScore(x));
  return ru[0] || null;
}
function fillVoiceSelect(sel) {
  const sorted = [...voices].sort((x, y) => voiceScore(y) - voiceScore(x));
  const ru = sorted.filter((v) => /^ru/i.test(v.lang)), other = sorted.filter((v) => !/^ru/i.test(v.lang));
  const mark = { natural: '★ естественный', good: '◆ хороший', basic: 'простой' };
  const best = ru[0];
  sel.innerHTML = `<option value="">Автовыбор${best ? ' — ' + esc(best.name) : ''}</option>` +
    ru.map((v) => `<option value="${esc(v.voiceURI)}">${mark[voiceTier(v)]} · ${esc(v.name)}</option>`).join('') +
    (other.length ? '<optgroup label="Другие языки">' + other.map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name)} — ${v.lang}</option>`).join('') + '</optgroup>' : '');
  sel.value = settings.voiceURI || '';
}
function voiceAdvice() {
  const v = pickVoice();
  if (!window.speechSynthesis) return 'Синтез речи недоступен в этом браузере.';
  if (!v) return 'В системе нет русского голоса. Лучше всего звучат голоса Microsoft Natural в браузере Edge.';
  const t = voiceTier(v);
  if (t === 'natural') return `Сейчас звучит естественный голос «${v.name}».`;
  const tip = 'Самые живые голоса: в Edge — «Microsoft Svetlana/Dariya Online (Natural)»; на Mac и iPhone — скачайте «Milena (Premium)» в Настройках → Универсальный доступ → Устный контент; в Chrome — «Google русский».';
  return (t === 'good' ? `Сейчас: «${v.name}». ` : `Сейчас простой системный голос «${v.name}», он звучит механически. `) + tip;
}
// Подготовка текста к произнесению: убираем ремарки, ставим паузы там, где их сделал бы человек.
function speakable(text) {
  return text
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/[«»"„“”]/g, '')
    .replace(/\s+[—–-]\s+/g, ', ')
    .replace(/…|\.{3}/g, '... ')
    .replace(/\(([^)]*)\)/g, ', $1, ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\.\.\.\s*,/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}
const tts = {
  queue: [], speaking: false, spokenUpTo: 0, pending: '', chunks: 0, onIdle: null,
  enabled: () => settings.tts && !!window.speechSynthesis,
  reset() { this.queue = []; this.spokenUpTo = 0; this.pending = ''; this.chunks = 0; try { speechSynthesis.cancel(); } catch {} this.speaking = false; updateTalking(); },
  push(text) {
    const clean = speakable(text);
    if (!clean || !/[\p{L}\p{N}]/u.test(clean)) return;
    this.queue.push(clean); this.pump();
  },
  pump() {
    if (this.speaking || !this.queue.length) { if (!this.speaking && !this.queue.length) this.onIdle?.(); return; }
    const text = this.queue.shift();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ru-RU';
    // лёгкие колебания темпа и интонации между фразами — меньше «дикторской» монотонности
    const jitter = 1 + (Math.random() - 0.5) * 0.06;
    u.rate = (+settings.rate || 1) * jitter;
    u.pitch = (+settings.pitch || 1) * (/\?\s*$/.test(text) ? 1.04 : 1) * (1 + (Math.random() - 0.5) * 0.04);
    let finished = false;
    const done = () => { if (finished) return; finished = true; clearTimeout(guard); this.speaking = false; updateTalking(); setTimeout(() => this.pump(), 120); };
    const guard = setTimeout(done, 2500 + (u.text.length * 95) / (u.rate || 1));
    u.onstart = () => { this.speaking = true; updateTalking(); };
    u.onend = u.onerror = done;
    this.speaking = true;
    speechSynthesis.speak(u);
  },
  // Первую фразу отдаём сразу (быстрый старт), дальше склеиваем короткие предложения,
  // чтобы голос не «спотыкался» паузами после каждого.
  feed(display, final) {
    if (!this.enabled()) return;
    const tail = display.slice(this.spokenUpTo);
    const re = /[^.!?…]*[.!?…]+["»)]*\s+/g;
    let m, used = 0;
    while ((m = re.exec(tail))) {
      this.pending += m[0]; used = re.lastIndex;
      if (this.chunks === 0 || this.pending.length >= 70) { this.push(this.pending); this.pending = ''; this.chunks++; }
    }
    if (final) { this.pending += tail.slice(used); used = tail.length; if (this.pending.trim()) this.push(this.pending); this.pending = ''; }
    this.spokenUpTo += used;
  },
  busy() { return this.speaking || this.queue.length > 0; },
};

// ------------------------------------------------------------ голос: распознавание
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, liveMode = false, recFinal = '';
function startListening() {
  if (!SR) { toast('Распознавание речи недоступно в этом браузере. Попробуйте Chrome или Edge.', 'error'); return; }
  if (listening || busy) return;
  tts.reset();
  rec = new SR(); rec.lang = 'ru-RU'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  recFinal = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]; if (r.isFinal) recFinal += r[0].transcript; else interim += r[0].transcript;
    }
    input.value = (recFinal + interim).trim(); autoGrow();
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { toast('Нет доступа к микрофону — разрешите его в браузере.', 'error'); setLive(false); }
    else if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Микрофон: ' + e.error, 'error');
  };
  rec.onend = () => {
    listening = false; micBtn.classList.remove('listening'); scene.setMood(lastMood);
    const text = input.value.trim();
    if (text && recFinal) send(text);
    else if (liveMode && !busy) setTimeout(() => liveMode && !busy && !tts.busy() && startListening(), 400);
  };
  try { rec.start(); listening = true; micBtn.classList.add('listening'); scene.setMood('listen'); } catch {}
}
function stopListening() { try { rec?.stop(); } catch {} }
function setLive(v) {
  liveMode = v; liveBtn.setAttribute('aria-pressed', String(v));
  if (v) { if (!busy && !tts.busy()) startListening(); toast('Живой разговор: говорите, я слушаю.'); }
  else stopListening();
}
micBtn.addEventListener('click', () => (listening ? stopListening() : startListening()));
liveBtn.addEventListener('click', () => setLive(!liveMode));
tts.onIdle = () => { if (liveMode && settings.autoListen && !busy && !listening && started) setTimeout(() => !busy && !tts.busy() && startListening(), 350); };

// ------------------------------------------------------------ окно диалога: печатная машинка
let typing = { full: '', shown: 0, done: true, moods: [], moodIdx: 0, streamDone: true }, busy = false, lastMood = 'neutral', started = false;
function setSpeaker(name, isUser) { speakerEl.textContent = name; nameBox.classList.toggle('user', !!isUser); }
function updateTalking() {
  const typingActive = !typing.done && typing.shown < typing.full.length;
  scene.setTalking(tts.speaking || typingActive);
}
function showUserLine(text) {
  setSpeaker(settings.userName || 'Вы', true);
  textEl.classList.add('user-line'); textEl.innerHTML = fmt(text); moreEl.classList.remove('show');
}
function showThinking() {
  setSpeaker(settings.mentorName, false);
  textEl.classList.remove('user-line');
  textEl.innerHTML = '<span class="thinking"><span>•</span><span>•</span><span>•</span></span>';
}
function beginTyping() {
  typing = { full: '', shown: 0, done: false, moods: [], moodIdx: 0, streamDone: false };
  setSpeaker(settings.mentorName, false); textEl.classList.remove('user-line'); moreEl.classList.remove('show');
}
function skipTyping() {
  if (!typing.done) { typing.shown = typing.full.length; }
}
let lastT = performance.now();
function tick(now) {
  const dt = (now - lastT) / 1000; lastT = now;
  if (!typing.done) {
    const target = typing.full.length;
    if (typing.shown < target) {
      const speed = +settings.textSpeed || 45;
      const backlog = target - typing.shown;
      typing.shown = Math.min(target, typing.shown + dt * speed * (backlog > 220 ? 3 : 1));
      const n = Math.floor(typing.shown);
      while (typing.moodIdx < typing.moods.length && typing.moods[typing.moodIdx].at <= n) { setMood(typing.moods[typing.moodIdx].mood); typing.moodIdx++; }
      textEl.innerHTML = fmt(typing.full.slice(0, n));
      textEl.scrollTop = textEl.scrollHeight;
    } else if (typing.streamDone) {
      typing.done = true; textEl.innerHTML = fmt(typing.full); moreEl.classList.add('show');
      while (typing.moodIdx < typing.moods.length) setMood(typing.moods[typing.moodIdx++].mood);
    }
    updateTalking();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
function setMood(m) { lastMood = m; scene.setMood(m); }
textEl.addEventListener('click', () => { if (!typing.done) skipTyping(); else if (tts.busy()) tts.reset(); });

// ------------------------------------------------------------ чат
let serverHasKey = false;
fetch('/api/status').then((r) => r.json()).then((j) => { serverHasKey = !!j.hasServerKey; updateTitleHint(); }).catch(() => updateTitleHint(true));
function updateTitleHint(offline) {
  const h = $('#titleHint');
  if (offline) h.textContent = 'Сервер недоступен. Запустите «npm start» и откройте http://localhost:3000';
  else if (!serverHasKey && !settings.apiKey) h.textContent = 'Для разговора нужен API-ключ Anthropic: «Настройки → Подключение».';
  else h.textContent = 'Наушники и микрофон сделают беседу живее. Клавиша H прячет интерфейс.';
}
const clientTime = () => new Date().toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
let controller = null;
async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  if (!serverHasKey && !settings.apiKey) { toast('Сначала укажите API-ключ: Настройки → Подключение.', 'error'); openSettings('conn'); return; }
  busy = true; sendBtn.disabled = true; stopListening();
  input.value = ''; autoGrow();
  tts.reset();
  history.push({ role: 'user', content: text, ts: Date.now() }); saveHistory();
  showUserLine(text);
  scene.setThinking(true);
  await new Promise((r) => setTimeout(r, 650));
  showThinking();

  let raw = '', parsed = null, errorMsg = null;
  controller = new AbortController();
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(settings.apiKey ? { 'X-User-Api-Key': settings.apiKey } : {}) },
      body: JSON.stringify({ settings: { ...settings, apiKey: undefined }, messages: history.map(({ role, content }) => ({ role, content })), clientTime: clientTime() }),
    });
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', first = true;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, idx); buf = buf.slice(idx + 2);
        if (!line.startsWith('data: ')) continue;
        const ev = JSON.parse(line.slice(6));
        if (ev.type === 'text') {
          if (first) { first = false; scene.setThinking(false); beginTyping(); }
          raw += ev.text;
          parsed = parseStream(raw);
          typing.full = parsed.display; typing.moods = parsed.moods;
          if (typing.moods.length && typing.moodIdx === 0 && typing.moods[0].at === 0) { setMood(typing.moods[0].mood); typing.moodIdx = 1; }
          tts.feed(parsed.display, false);
        } else if (ev.type === 'error') errorMsg = ev.message;
        else if (ev.type === 'refusal') errorMsg = ev.message;
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') errorMsg = 'Не удалось связаться с сервером: ' + e.message;
  }
  scene.setThinking(false);
  if (parsed) {
    typing.streamDone = true;
    tts.feed(parsed.display, true);
    const content = raw.replace(REM_RE, '').trim();
    history.push({ role: 'assistant', content, ts: Date.now() }); saveHistory();
    if (parsed.remembers.length) remember(parsed.remembers);
  }
  if (errorMsg) {
    toast(errorMsg, 'error');
    if (!parsed) { // откатываем реплику, чтобы её можно было повторить
      history.pop(); saveHistory(); input.value = text; autoGrow();
      setSpeaker(settings.mentorName); textEl.classList.remove('user-line');
      textEl.innerHTML = fmt('*молча смотрит на огонь* …Кажется, нас прервали. Попробуй ещё раз.'); setMood('concern');
    }
  }
  busy = false; sendBtn.disabled = false; controller = null;
  if (!tts.busy()) tts.onIdle?.();
}
function remember(facts) {
  const lines = facts.map((f) => f.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!lines.length) return;
  const existing = settings.notes.toLowerCase();
  const fresh = lines.filter((l) => !existing.includes(l.toLowerCase()));
  if (!fresh.length) return;
  settings.notes = (settings.notes.trim() + '\n' + fresh.map((l) => '• ' + l).join('\n')).trim();
  saveSettings();
  toast('❦ ' + settings.mentorName + ' запомнила: ' + fresh.join('; '));
}

form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); } });
function autoGrow() { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; }
input.addEventListener('input', autoGrow);

// ------------------------------------------------------------ приветствие
function g(f, m, n) { return settings.userGender === 'm' ? m : settings.userGender === 'n' ? n : f; }
function greeting(returning) {
  const vy = settings.address === 'vy', u = settings.userName || '';
  const h = new Date().getHours();
  const hello = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  if (returning) {
    return vy
      ? `<mood>smile</mood>${hello}, ${u}. Рада снова вас видеть. *откладывает книгу* Садитесь ближе к огню. На чём мы остановились — или сегодня о другом?`
      : `<mood>smile</mood>${hello}, ${u}. Рада снова тебя видеть. *откладывает книгу* Садись ближе к огню. Продолжим прошлый разговор — или сегодня о другом?`;
  }
  return vy
    ? `<mood>warm</mood>${hello}, ${u}. *чуть улыбается* Проходите, садитесь в кресло — у камина сегодня особенно уютно. Меня зовут ${settings.mentorName}. Расскажите, с чем вы ${g('пришли', 'пришли', 'пришли')}: учёба, планы, или просто хочется поговорить?`
    : `<mood>warm</mood>${hello}, ${u}. *чуть улыбается* Проходи, садись в кресло — у камина сегодня особенно уютно. Меня зовут ${settings.mentorName}. Расскажи, с чем ${g('пришла', 'пришёл', 'ты здесь')}: учёба, планы, или просто хочется поговорить?`;
}
function playLine(rawLine, store = true) {
  const p = parseStream(rawLine);
  beginTyping(); typing.full = p.display; typing.moods = p.moods; typing.streamDone = true;
  if (p.moods[0]?.at === 0) { setMood(p.moods[0].mood); typing.moodIdx = 1; }
  tts.reset(); tts.feed(p.display, true);
  if (store) { history.push({ role: 'assistant', content: rawLine, ts: Date.now() }); saveHistory(); }
}

// ------------------------------------------------------------ старт
function start() {
  if (started) return;
  started = true;
  document.body.classList.add('started');
  $('#title').classList.add('gone');
  if (settings.ambient) ambient.start(settings.ambientVolume);
  updateSoundIco();
  const lastTs = history.length ? history[history.length - 1].ts || 0 : 0;
  setTimeout(() => {
    if (!history.length) playLine(greeting(false));
    else if (Date.now() - lastTs > 30 * 60 * 1000) playLine(greeting(true));
    else {
      const last = [...history].reverse().find((m) => m.role === 'assistant');
      if (last) playLine(last.content, false); else playLine(greeting(true));
      tts.reset();
    }
    input.focus({ preventScroll: true });
  }, 900);
}
$('#startBtn').addEventListener('click', start);
$('#titleSettingsBtn').addEventListener('click', () => openSettings());

// ------------------------------------------------------------ HUD
document.querySelectorAll('.hud-btn').forEach((b) => b.addEventListener('click', () => {
  const a = b.dataset.action;
  if (a === 'log') openLog();
  if (a === 'memory') openSettings('mem');
  if (a === 'settings') openSettings();
  if (a === 'hide') document.body.classList.toggle('ui-hidden');
  if (a === 'sound') { settings.ambient = !settings.ambient; saveSettings(); settings.ambient ? ambient.start(settings.ambientVolume) : ambient.stop(); updateSoundIco(); }
}));
function updateSoundIco() { $('[data-action="sound"]').classList.toggle('off', !settings.ambient); }
document.addEventListener('keydown', (e) => {
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (e.key === 'Escape') { if (!modal.hidden) closeModal(); else if (document.body.classList.contains('ui-hidden')) document.body.classList.remove('ui-hidden'); }
  if (inField || !started) return;
  if (e.key === 'h' || e.key === 'р') document.body.classList.toggle('ui-hidden');
  if (e.key === 'l' || e.key === 'д') openLog();
  if (e.key === ' ' && !e.repeat && modal.hidden) { e.preventDefault(); if (!typing.done) skipTyping(); else startListening(); }
});
document.addEventListener('keyup', (e) => { if (e.key === ' ' && listening && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) stopListening(); });
$('#stage').addEventListener('click', () => { if (document.body.classList.contains('ui-hidden')) document.body.classList.remove('ui-hidden'); });

// ------------------------------------------------------------ модалки
function openModal(title, node) {
  modalTitle.textContent = title; modalBody.innerHTML = ''; modalBody.append(node); modal.hidden = false;
}
function closeModal() { modal.hidden = true; nameRefresh(); }
modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
function nameRefresh() { if (!nameBox.classList.contains('user')) setSpeaker(settings.mentorName); input.placeholder = `Скажите что-нибудь, ${settings.userName || ''}…`.replace(', …', '…'); }

function openLog() {
  const wrap = document.createElement('div');
  if (!history.length) wrap.innerHTML = '<p class="empty">Разговор ещё не начался.</p>';
  for (const m of history) {
    const d = document.createElement('div'); d.className = 'log-entry ' + m.role;
    d.innerHTML = `<div class="who">${esc(m.role === 'user' ? settings.userName || 'Вы' : settings.mentorName)}</div><div class="what">${fmt(stripTags(m.content))}</div>`;
    wrap.append(d);
  }
  openModal('Журнал', wrap);
  requestAnimationFrame(() => (modalBody.scrollTop = modalBody.scrollHeight));
}

function openSettings(tab = 'chars') {
  const node = $('#settingsTpl').content.cloneNode(true);
  const root = document.createElement('div'); root.append(node);
  // пресеты стиля
  const grid = $('#presetGrid', root);
  for (const [id, p] of Object.entries(STYLE_PRESETS)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'preset' + (settings.style === id ? ' active' : '');
    b.innerHTML = `<b>${esc(p.label)}</b><span>${esc(p.text || 'Только то, что вы опишете ниже.')}</span>`;
    b.onclick = () => { settings.style = id; saveSettings(); grid.querySelectorAll('.preset').forEach((x) => x.classList.remove('active')); b.classList.add('active'); };
    grid.append(b);
  }
  // поля
  root.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') el.checked = !!settings[k]; else el.value = settings[k] ?? '';
    const out = root.querySelector(`[data-o="${k}"]`); if (out) out.textContent = settings[k];
    const apply = () => {
      settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      if (out) out.textContent = settings[k];
      saveSettings();
      if (k === 'ambient') { settings.ambient && started ? ambient.start(settings.ambientVolume) : ambient.stop(); updateSoundIco(); }
      if (k === 'ambientVolume') ambient.volume(settings.ambientVolume);
      if (k === 'tts' && !settings.tts) tts.reset();
      if (k === 'apiKey') { updateKeyStatus(); updateTitleHint(); }
    };
    el.addEventListener('input', apply); el.addEventListener('change', apply);
  });
  const vs = $('#voiceSel', root); fillVoiceSelect(vs);
  $('#testVoice', root).onclick = () => { tts.reset(); const was = settings.tts; settings.tts = true; tts.push(`Здравствуй, ${settings.userName}. Меня зовут ${settings.mentorName}. Так звучит мой голос.`); settings.tts = was; };
  const setAdvice = () => ($('#voiceNote', root).textContent = voiceAdvice() + ' ' + (SR ? 'Голосовой ввод: кнопка микрофона, пробел (удерживать) или режим «живой».' : 'Голосовой ввод работает в Chrome, Edge и Safari.')); setAdvice(); vs.addEventListener('change', setAdvice);
  const updateKeyStatus = () => { $('#keyStatus', root).textContent = serverHasKey ? 'Сервер уже настроен ключом из ANTHROPIC_API_KEY — поле ниже можно оставить пустым.' : settings.apiKey ? 'Ключ сохранён в этом браузере и передаётся только вашему локальному серверу.' : 'Сервер запущен без ключа. Вставьте ключ из console.anthropic.com или задайте ANTHROPIC_API_KEY в .env.'; };
  updateKeyStatus();
  $('#newTalk', root).onclick = () => { if (confirm('Начать новый вечер? Разговор очистится, память о вас останется.')) { history = []; saveHistory(); closeModal(); if (started) playLine(greeting(!!settings.notes.trim())); } };
  $('#wipeAll', root).onclick = () => { if (confirm('Стереть разговор, память и все настройки?')) { localStorage.removeItem(LS_HISTORY); localStorage.removeItem(LS_SETTINGS); location.reload(); } };
  // вкладки
  const tabs = root.querySelectorAll('.tab'), panes = root.querySelectorAll('.tabpane');
  const show = (t) => { tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === t)); panes.forEach((x) => x.classList.toggle('active', x.dataset.pane === t)); };
  tabs.forEach((x) => (x.onclick = () => show(x.dataset.tab)));
  show(tab);
  openModal('Настройки', root);
}
nameRefresh();

// для отладки и скриншотов
window.__mentor = { scene, settings, send, playLine };

// Собирает игру в один HTML-файл для публикации как Artifact на claude.ai.
// В артефакте нет сервера: ответы идут через capability `sample` (аккаунт Claude зрителя),
// микрофон недоступен, поэтому голосовой ввод скрыт (озвучка остаётся).
// Запуск: node scripts/build-artifact.mjs [out.html]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const out = process.argv[2] || path.join(root, 'dist', 'mentor-artifact.html');

function rep(src, a, b, label) {
  if (!src.includes(a)) throw new Error('patch failed: ' + label);
  return src.replace(a, b);
}
// модуль → IIFE, возвращающая свои экспорты
function wrap(name, src, exportsList) {
  const body = src.replace(/^import[^\n]*\n/gm, '').replace(/^export (const|function|let) /gm, '$1 ');
  return `const ${name} = (() => {\n${body}\nreturn { ${exportsList.join(', ')} };\n})();\n`;
}

const presets = wrap('PRESETS', read('public/js/presets.js'), ['STYLE_PRESETS', 'LENGTHS', 'MOODS_HELP', 'DEFAULT_SETTINGS']);
const art = wrap('ART', read('public/js/art.js'), ['createScene', 'W', 'H', 'MOOD_LIST']);
const ambient = wrap('AMBIENT', read('public/js/ambient.js'), ['createAmbient']);
const prompt = wrap('PROMPT', 'const { STYLE_PRESETS, LENGTHS, MOODS_HELP, DEFAULT_SETTINGS } = PRESETS;\n' + read('prompt.js'), ['buildSystemPrompt']);

let app = read('public/js/app.js').replace(/^import[^\n]*\n/gm, '');
app = `const { createScene, W, H } = ART; const { STYLE_PRESETS, DEFAULT_SETTINGS } = PRESETS; const { createAmbient } = AMBIENT; const { buildSystemPrompt } = PROMPT;\nDEFAULT_SETTINGS.tier = 'default';\n` + app;
app = rep(app, 'const SR = window.SpeechRecognition || window.webkitSpeechRecognition;', 'const SR = null; // микрофон в артефакте недоступен', 'SR');
app = rep(app, "fetch('/api/status').then((r) => r.json()).then((j) => { serverHasKey = !!j.hasServerKey; updateTitleHint(); }).catch(() => updateTitleHint(true));",
  "serverHasKey = true; let sampleFn = null; window.claude?.use?.('sample').then((s) => { sampleFn = s; updateTitleHint(); }); updateTitleHint();", 'status');
app = rep(app, "else h.textContent = 'Наушники и микрофон сделают беседу живее. Клавиша H прячет интерфейс.';",
  "else h.textContent = 'Наставница отвечает через ваш аккаунт Claude — при первом сообщении появится запрос разрешения. Клавиша H прячет интерфейс.';", 'hint');
// отправка через sample()
const s0 = app.indexOf('  controller = new AbortController();');
const s1 = app.indexOf('  scene.setThinking(false);\n  if (parsed) {');
if (s0 < 0 || s1 < 0) throw new Error('patch failed: send');
app = app.slice(0, s0) + `  controller = new AbortController();
  try {
    const sample = sampleFn || (await window.claude?.use?.('sample'));
    if (!sample) throw { code: 'not_granted' };
    const turns = history.slice(-40).map(({ role, content }) => ({ role, content }));
    const rules = buildSystemPrompt(settings) + '\\n\\nСейчас у собеседника: ' + clientTime() + '.\\nДальше — разговор. Отвечай только следующей репликой своего персонажа, в описанном формате.';
    let first = true;
    await sample([{ role: 'user', content: rules }, ...turns], {
      cache: false, signal: controller.signal, modelTier: settings.tier || 'default', effort: 'low',
      onText: ({ text: t }) => {
        if (first) { first = false; scene.setThinking(false); beginTyping(); }
        raw = t; parsed = parseStream(raw);
        typing.full = parsed.display; typing.moods = parsed.moods;
        if (typing.moods.length && typing.moodIdx === 0 && typing.moods[0].at === 0) { setMood(typing.moods[0].mood); typing.moodIdx = 1; }
        tts.feed(parsed.display, false);
      },
    });
  } catch (e) {
    const code = e?.code;
    if (code === 'refused') { parsed = null; raw = ''; }
    const msgs = {
      not_granted: 'Разрешите артефакту обращаться к Claude, чтобы наставница могла отвечать.',
      sampling_disabled: 'Claude недоступен для этого аккаунта.',
      rate_limited: 'Слишком много сообщений подряд. Подождите немного и попробуйте снова.',
      session_expired: 'Сессия истекла — войдите в claude.ai заново.',
      refused: 'Наставница предпочла не отвечать на это. Попробуйте сформулировать иначе.',
      empty_completion: 'Ответ получился пустым. Попробуйте ещё раз.',
      prompt_too_large: 'Разговор стал слишком длинным. Начните новый вечер в Настройках → Память.',
    };
    if (code !== 'cancelled') errorMsg = msgs[code] || 'Связь прервалась. Попробуйте ещё раз.';
  }
` + app.slice(s1);
// confirm() в артефакте не работает — подтверждение вторым нажатием
app = rep(app, "$('#newTalk', root).onclick = () => { if (confirm('Начать новый вечер? Разговор очистится, память о вас останется.')) {",
  "const twice = (btn, fn) => () => { if (btn.dataset.armed) return fn(); btn.dataset.armed = '1'; const t = btn.textContent; btn.textContent = 'Нажмите ещё раз для подтверждения'; setTimeout(() => { delete btn.dataset.armed; btn.textContent = t; }, 3500); };\n  $('#newTalk', root).onclick = twice($('#newTalk', root), () => {", 'newTalk');
app = rep(app, "if (started) playLine(greeting(!!settings.notes.trim())); } };", "if (started) playLine(greeting(!!settings.notes.trim())); });", 'newTalk2');
app = rep(app, "$('#wipeAll', root).onclick = () => { if (confirm('Стереть разговор, память и все настройки?')) { localStorage.removeItem(LS_HISTORY); localStorage.removeItem(LS_SETTINGS); location.reload(); } };",
  "$('#wipeAll', root).onclick = twice($('#wipeAll', root), () => { try { localStorage.removeItem(LS_HISTORY); localStorage.removeItem(LS_SETTINGS); } catch {} location.reload(); });", 'wipe');
app = rep(app, "'Голосовой ввод работает в Chrome, Edge и Safari.'", "''", 'srnote');
app = rep(app, "const updateKeyStatus = () => {", "const updateKeyStatus = () => {}; const _unused = () => {", 'keystatus');

// HTML
let html = read('public/index.html');
const bodyStart = html.indexOf('<body>') + 6, bodyEnd = html.indexOf('<script type="module"');
let body = html.slice(bodyStart, bodyEnd);
const c0 = body.indexOf('<div class="tabpane" data-pane="conn">'), c1 = body.indexOf('</template>');
body = body.slice(0, c0) + `<div class="tabpane" data-pane="conn">
      <p class="note">Наставница отвечает через ваш аккаунт Claude: сообщения расходуют ваши лимиты, ключ не нужен.</p>
      <label>Модель
        <select data-k="tier"><option value="quick">Быстрая — живой темп разговора</option><option value="default">Сбалансированная</option><option value="complex">Самая вдумчивая — медленнее</option></select>
      </label>
    </div>
  ` + body.slice(c1);
body = rep(body, '<button class="tab" data-tab="conn">Подключение</button>', '<button class="tab" data-tab="conn">Модель</button>', 'tab');
const fonts = html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];
const icon = '';
const css = read('public/style.css') + `\n#micBtn, #liveBtn, label:has(> input[data-k="autoListen"]) { display: none !important; }\n:root { color-scheme: dark; }\nbody { background: #07060b; }\n`;

const page = `<title>Кабинет у камина</title>
<meta name="description" content="Визуальная новелла-наставник: разговоры об учёбе и жизни у камина.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${css}
</style>
${body}
<script type="module">
${presets}
${art}
${ambient}
${prompt}
${app}
</script>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log('written', out, (page.length / 1024).toFixed(1) + ' KB');

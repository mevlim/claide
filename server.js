// Сервер «Кабинета наставницы»: раздаёт статику и проксирует чат к Claude API (стриминг SSE).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompt.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'public');
const PORT = Number(process.env.PORT) || 3000;
const SERVER_KEY = process.env.ANTHROPIC_API_KEY || '';

const MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
const EFFORTS = new Set(['low', 'medium', 'high']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const defaultClient = SERVER_KEY ? new Anthropic({ apiKey: SERVER_KEY }) : null;

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Приводим историю к виду, который принимает API: только текст, чередование ролей, начало с user.
function sanitizeHistory(raw, userName) {
  const out = [];
  for (const m of Array.isArray(raw) ? raw.slice(-60) : []) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const text = String(m.content ?? '').slice(0, 8000).trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + text;
    else out.push({ role: m.role, content: text });
  }
  if (out.length && out[0].role === 'assistant') out.unshift({ role: 'user', content: `*${userName || 'Гость'} входит в кабинет и садится в кресло напротив.*` });
  return out;
}

async function handleChat(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { res.writeHead(400).end('bad json'); return; }
  const s = body.settings || {};
  const userKey = String(req.headers['x-user-api-key'] || '').trim();
  const client = userKey ? new Anthropic({ apiKey: userKey }) : defaultClient;

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (!client) { send({ type: 'error', code: 'no_key', message: 'Не задан API-ключ. Укажите его в Настройках → Подключение или запустите сервер с ANTHROPIC_API_KEY.' }); res.end(); return; }

  const messages = sanitizeHistory(body.messages, s.userName);
  if (!messages.length || messages[messages.length - 1].role !== 'user') { send({ type: 'error', message: 'Пустое сообщение.' }); res.end(); return; }
  // Текущее время — отдельным системным сообщением в конце, чтобы не ломать кэш системного промпта.
  if (body.clientTime) messages.push({ role: 'system', content: `Сейчас у собеседника: ${String(body.clientTime).slice(0, 120)}.` });

  const model = MODELS.has(s.model) ? s.model : 'claude-opus-5-5';
  const effort = EFFORTS.has(s.effort) ? s.effort : 'low';
  const params = {
    model,
    max_tokens: 16000,
    system: [{ type: 'text', text: buildSystemPrompt(s), cache_control: { type: 'ephemeral' } }],
    messages,
    output_config: { effort },
  };
  // Серверный фолбэк на случай отказа классификатора (Opus 5.5 / Sonnet 5.5 на Claude API).
  if (model !== 'claude-haiku-5-5') { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }

  let closed = false, current = null, sentAny = false;
  res.on('close', () => { closed = true; current?.abort(); });
  // Попытка 1 — с фолбэком и временем; попытка 2 (если API отверг необязательные параметры до начала ответа) — без них.
  const plain = { ...params, messages: messages.filter((m) => m.role !== 'system') };
  delete plain.betas; delete plain.fallbacks;
  for (const [attempt, p] of [[1, params], [2, plain]]) {
    try {
      current = client.beta.messages.stream(p);
      for await (const ev of current) {
        if (closed) break;
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { sentAny = true; send({ type: 'text', text: ev.delta.text }); }
      }
      if (!closed) {
        const final = await current.finalMessage();
        if (final.stop_reason === 'refusal') send({ type: 'refusal', message: 'Наставница предпочла не отвечать на это. Попробуйте сформулировать иначе.' });
        send({ type: 'done', stop_reason: final.stop_reason, model: final.model, usage: final.usage });
      }
      break;
    } catch (err) {
      if (closed || err?.name === 'APIUserAbortError') return;
      if (attempt === 1 && !sentAny && err instanceof Anthropic.BadRequestError) { console.warn('[chat] 400, повтор без доп. параметров:', err.message); continue; }
      let message = 'Ошибка соединения с Claude.';
      if (err instanceof Anthropic.AuthenticationError) message = 'Неверный API-ключ (401). Проверьте ключ в Настройках → Подключение.';
      else if (err instanceof Anthropic.PermissionDeniedError) message = 'Нет доступа к выбранной модели (403).';
      else if (err instanceof Anthropic.NotFoundError) message = 'Модель не найдена (404).';
      else if (err instanceof Anthropic.RateLimitError) message = 'Слишком много запросов (429). Подождите немного.';
      else if (err instanceof Anthropic.BadRequestError) message = 'Некорректный запрос (400): ' + (err.message || '');
      else if (err instanceof Anthropic.InternalServerError) message = 'Сервис временно недоступен (' + (err.status ?? '5xx') + '). Попробуйте ещё раз.';
      else if (err instanceof Anthropic.APIConnectionError) message = 'Не удаётся подключиться к API. Проверьте интернет.';
      else if (err instanceof Anthropic.APIError) message = `Ошибка API (${err.status ?? '?'}): ${err.message}`;
      console.error('[chat]', err?.status || '', err?.message || err);
      send({ type: 'error', message });
      break;
    }
  }
  res.end();
}

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') return handleChat(req, res).catch((e) => { console.error(e); try { res.end(); } catch {} });
  if (req.method === 'GET' && req.url === '/api/status') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ hasServerKey: !!SERVER_KEY })); return; }
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405).end();
}).listen(PORT, () => {
  console.log(`\n  Кабинет наставницы открыт: http://localhost:${PORT}`);
  console.log(SERVER_KEY ? '  Ключ API: из ANTHROPIC_API_KEY\n' : '  Ключ API не задан — укажите его в игре: Настройки → Подключение\n');
});

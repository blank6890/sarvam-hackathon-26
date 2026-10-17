import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const maxSourceLength = 24_000;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

async function readJson(request, limit = 32_000) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > limit) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('Send a valid JSON request.'), { status: 400 }); }
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

async function sarvam(path, payload) {
  const result = await fetch(`https://api.sarvam.ai${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': process.env.SARVAM_API_KEY },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000)
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw Object.assign(new Error(data.error?.message || data.message || `Sarvam returned ${result.status}.`), { status: result.status === 429 ? 429 : 502 });
  return data;
}

async function handleApi(request, response, url) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Use POST for this endpoint.' });
  if (!process.env.SARVAM_API_KEY) return sendJson(response, 503, { error: 'Add SARVAM_API_KEY to the server environment to connect Sarvam.' });
  const body = await readJson(request, 40_000);

  if (url.pathname === '/api/generate') {
    const source = typeof body.source === 'string' ? body.source.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const language = typeof body.language === 'string' ? body.language : 'English';
    if (source.length < 20) return sendJson(response, 400, { error: 'Add at least a few sentences of source material.' });
    if (source.length > maxSourceLength) return sendJson(response, 413, { error: 'Source material is too long. Keep it under 24,000 characters.' });
    if (prompt.length > 1000) return sendJson(response, 400, { error: 'Keep the teaching direction under 1,000 characters.' });

    const completion = await sarvam('/v1/chat/completions', {
      model: 'sarvam-105b',
      temperature: 0.55,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Turn lesson material into a clear, engaging visual explanation in ${language}. Return JSON only, with this shape: {"title":"short title","scenes":[{"title":"scene heading","narration":"2-4 spoken sentences","visual":"one sentence describing what to notice","diagram":"orbit|wave|flow|particles","formula":"optional short equation or label"}]}. Make 3 to 5 scenes. Explain ideas step by step, stay faithful to the source, define jargon, and use a concrete analogy when useful. Choose a diagram type that supports each scene. No markdown.` },
        { role: 'user', content: `Teaching direction: ${prompt || 'Make this intuitive for a curious beginner.'}\n\nSource material:\n${source}` }
      ]
    });
    let lesson;
    try { lesson = JSON.parse(completion.choices?.[0]?.message?.content || ''); }
    catch { throw Object.assign(new Error('Sarvam returned an unreadable lesson. Try a shorter source or a clearer teaching direction.'), { status: 502 }); }
    if (typeof lesson.title !== 'string' || !Array.isArray(lesson.scenes)) throw Object.assign(new Error('Sarvam returned an incomplete lesson. Please try again.'), { status: 502 });
    lesson.scenes = lesson.scenes.slice(0, 5).filter(scene => scene && typeof scene.narration === 'string').map(scene => ({
      title: String(scene.title || 'A closer look').slice(0, 100),
      narration: scene.narration.slice(0, 900),
      visual: String(scene.visual || '').slice(0, 240),
      diagram: ['orbit', 'wave', 'flow', 'particles'].includes(scene.diagram) ? scene.diagram : 'flow',
      formula: String(scene.formula || '').slice(0, 100)
    }));
    if (!lesson.scenes.length) throw Object.assign(new Error('Sarvam did not return any usable scenes. Please try again.'), { status: 502 });
    return sendJson(response, 200, { title: lesson.title.slice(0, 120), scenes: lesson.scenes });
  }

  if (url.pathname === '/api/speech') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const languages = { English: 'en-IN', Hindi: 'hi-IN', Tamil: 'ta-IN', Telugu: 'te-IN', Kannada: 'kn-IN', Bengali: 'bn-IN', Marathi: 'mr-IN' };
    if (!text || text.length > 2500) return sendJson(response, 400, { error: 'Narration must be between 1 and 2,500 characters.' });
    const speech = await sarvam('/text-to-speech', { text, model: 'bulbul:v4-flash', language_code: languages[body.language] || 'en-IN', output_audio_codec: 'wav' });
    if (!speech.audios?.[0]) throw Object.assign(new Error('Sarvam did not return an audio clip.'), { status: 502 });
    return sendJson(response, 200, { audio: speech.audios[0] });
  }

  sendJson(response, 404, { error: 'This endpoint does not exist.' });
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
    const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) return sendJson(response, 403, { error: 'Forbidden.' });
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(content);
  } catch (error) {
    if (response.headersSent) return response.destroy();
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    sendJson(response, status, { error: status === 404 ? 'Not found.' : error.message || 'The server could not complete that request.' });
  }
}).listen(port, '127.0.0.1', () => console.log(`Lesson studio ready at http://localhost:${port}`));

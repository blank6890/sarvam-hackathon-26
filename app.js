const sampleLesson = {
  title: 'The rhythm inside a wave',
  scenes: [
    { title: 'A circle makes a wave', narration: 'Imagine a point traveling around a circle at a steady pace. Track just its height as it moves: it rises, falls, and returns to where it began. That up-and-down trace is a sine wave.', visual: 'Follow the point as its height becomes a repeating wave.', diagram: 'orbit', formula: 'y = sin(θ)' },
    { title: 'Repeating means predictable', narration: 'One complete turn brings the point back to its starting place. So the height repeats too. We call the length of that repeat a period.', visual: 'One full rotation maps to one full wave.', diagram: 'wave', formula: 'period = 2π' },
    { title: 'Waves carry a pattern', narration: 'The wave is a record of circular motion written in a straight line. This same pattern helps describe sound, light, and many other kinds of change.', visual: 'A tiny turning motion can describe a big repeating pattern.', diagram: 'flow', formula: 'circle → wave' }
  ]
};

const form = document.querySelector('#lesson-form');
const fileInput = document.querySelector('#source-file');
const sourceInput = document.querySelector('#source-text');
const promptInput = document.querySelector('#teaching-prompt');
const languageSelect = document.querySelector('#language');
const notice = document.querySelector('#notice');
const generateButton = document.querySelector('#generate-button');
const narrateButton = document.querySelector('#narrate-button');
const sceneStrip = document.querySelector('#scene-strip');
const diagramHost = document.querySelector('#diagram-host');
const audioWrap = document.querySelector('#audio-wrap');
const audioPlayer = document.querySelector('#audio-player');
const playToggle = document.querySelector('#play-toggle');
const playbackScrubber = document.querySelector('#playback-scrubber');
const playerTime = document.querySelector('#player-time');
const playerHint = document.querySelector('#player-hint');
const chapterMarkers = document.querySelector('#chapter-markers');
let lesson = sampleLesson;
let activeScene = 0;
let audioUrl = '';
let narrationReady = false;
let sceneBoundaries = [];

const svg = (name, attrs = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};
const add = (parent, name, attrs = {}, text = '') => {
  const node = svg(name, attrs);
  if (text) node.textContent = text;
  parent.append(node);
  return node;
};

function makeDiagram(type) {
  const root = svg('svg', { viewBox: '0 0 500 250', role: 'img', 'aria-label': `${type} concept diagram` });
  if (type === 'orbit') {
    add(root, 'circle', { cx: 144, cy: 124, r: 76, class: 'orbit-ring' });
    add(root, 'line', { x1: 144, y1: 124, x2: 202, y2: 76, class: 'teal-line' });
    add(root, 'line', { x1: 202, y1: 76, x2: 202, y2: 124, class: 'guide' });
    add(root, 'circle', { cx: 202, cy: 76, r: 6, class: 'coral-fill' });
    add(root, 'circle', { cx: 144, cy: 124, r: 3, class: 'muted-fill' });
    add(root, 'text', { x: 110, y: 220, class: 'small-label' }, 'THE CIRCLE');
    add(root, 'line', { x1: 279, y1: 124, x2: 466, y2: 124, class: 'axis' });
    add(root, 'line', { x1: 279, y1: 45, x2: 279, y2: 207, class: 'axis' });
    add(root, 'path', { d: 'M280 124 C304 124 310 53 335 53 S366 195 391 195 S424 53 449 53 S463 106 480 124', class: 'accent-line' });
    add(root, 'text', { x: 310, y: 220, class: 'small-label' }, 'THE HEIGHT, UNFOLDED');
    const dot = add(root, 'circle', { cx: 335, cy: 53, r: 5, class: 'teal-fill' });
    const motion = svg('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: 'M0 0 C25 0 31 71 56 71 S87 -71 112 -71 S145 71 170 71 S201 0 226 0' });
    dot.append(motion);
  } else if (type === 'wave') {
    add(root, 'line', { x1: 54, y1: 125, x2: 454, y2: 125, class: 'axis' });
    add(root, 'line', { x1: 74, y1: 45, x2: 74, y2: 205, class: 'axis' });
    add(root, 'path', { d: 'M74 125 C98 125 106 58 130 58 S162 192 186 192 S218 58 242 58 S274 192 298 192 S330 58 354 58 S386 192 410 192 S434 125 454 125', class: 'accent-line' });
    add(root, 'line', { x1: 130, y1: 47, x2: 242, y2: 47, class: 'teal-line' });
    add(root, 'path', { d: 'M130 43v8m112-8v8', class: 'teal-line' });
    add(root, 'text', { x: 167, y: 34, class: 'small-label' }, 'ONE PERIOD');
    add(root, 'text', { x: 339, y: 221, class: 'small-label' }, 'REPEATS →');
  } else if (type === 'particles') {
    add(root, 'line', { x1: 55, y1: 126, x2: 455, y2: 126, class: 'axis' });
    for (let i = 0; i < 12; i++) add(root, 'circle', { cx: 75 + i * 33, cy: 126 + Math.sin(i * .8) * 37, r: 4 + (i % 3), class: i % 2 ? 'teal-fill' : 'coral-fill' });
    add(root, 'path', { d: 'M75 197 C115 197 122 146 162 146 S209 197 249 197 S295 146 335 146 S381 197 421 197', class: 'teal-line' });
    add(root, 'text', { x: 84, y: 223, class: 'small-label' }, 'A PATTERN IN MOTION');
  } else {
    add(root, 'circle', { cx: 99, cy: 124, r: 35, class: 'orbit-ring' });
    add(root, 'circle', { cx: 99, cy: 124, r: 5, class: 'coral-fill' });
    add(root, 'path', { d: 'M145 124 H223 M212 115 L223 124 L212 133', class: 'teal-line' });
    add(root, 'rect', { x: 238, y: 79, width: 82, height: 90, rx: 2, fill: 'none', stroke: '#789096' });
    add(root, 'text', { x: 252, y: 128 }, 'IDEA');
    add(root, 'path', { d: 'M326 124 H378 M367 115 L378 124 L367 133', class: 'teal-line' });
    add(root, 'path', { d: 'M383 124 C400 124 404 68 423 68 S448 180 467 180', class: 'accent-line' });
  }
  return root;
}

function renderScene(index) {
  activeScene = index;
  const scene = lesson.scenes[index];
  document.querySelector('#lesson-title').textContent = lesson.title;
  document.querySelector('#scene-title').textContent = scene.title;
  document.querySelector('#scene-narration').textContent = scene.narration;
  document.querySelector('#scene-number').textContent = `SCENE ${String(index + 1).padStart(2, '0')}`;
  const estimatedSeconds = Math.max(8, Math.round(scene.narration.split(/\s+/).length / 2.4));
  const sceneSeconds = narrationReady && sceneBoundaries.length ? Math.round(sceneBoundaries[index + 1] - sceneBoundaries[index]) : estimatedSeconds;
  document.querySelector('#scene-time').textContent = `~ ${sceneSeconds} sec`;
  document.querySelector('#diagram-caption').textContent = scene.visual || 'Notice how each part connects to the next.';
  document.querySelector('#formula').textContent = scene.formula || '';
  document.querySelector('#formula-box').hidden = !scene.formula;
  diagramHost.replaceChildren(makeDiagram(scene.diagram));
  if (narrationReady) setDiagramMotion(!audioPlayer.paused);
  sceneStrip.replaceChildren(...lesson.scenes.map((item, i) => {
    const button = document.createElement('button');
    button.className = `scene-tab${i === index ? ' active' : ''}`;
    button.type = 'button';
    button.setAttribute('aria-current', i === index ? 'step' : 'false');
    const number = document.createElement('span');
    number.textContent = String(i + 1).padStart(2, '0');
    button.append(number, document.createTextNode(item.title));
    button.addEventListener('click', () => {
      if (narrationReady && sceneBoundaries.length) audioPlayer.currentTime = sceneBoundaries[i];
      renderScene(i);
    });
    return button;
  }));
}

function setDiagramMotion(playing) {
  const diagram = diagramHost.querySelector('svg');
  if (playing) diagram?.unpauseAnimations();
  else diagram?.pauseAnimations();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const wholeSeconds = Math.floor(seconds);
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, '0')}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

function updatePlayer() {
  if (!narrationReady || !Number.isFinite(audioPlayer.duration)) return;
  const duration = audioPlayer.duration;
  const current = audioPlayer.currentTime;
  const progress = duration ? current / duration : 0;
  playbackScrubber.value = String(Math.round(progress * 1000));
  playbackScrubber.style.setProperty('--played', `${progress * 100}%`);
  playerTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  const sceneIndex = sceneBoundaries.slice(1).findIndex(end => current < end);
  const index = sceneIndex < 0 ? lesson.scenes.length - 1 : sceneIndex;
  if (index !== activeScene) {
    renderScene(index);
    if (!audioPlayer.paused) playerHint.textContent = `Playing scene ${String(index + 1).padStart(2, '0')} of ${lesson.scenes.length}`;
  }
}

function buildSceneTimeline(duration) {
  if (!duration) return;
  const weights = lesson.scenes.map(scene => Math.max(1, scene.narration.trim().split(/\s+/).length));
  const total = weights.reduce((sum, count) => sum + count, 0);
  sceneBoundaries = [0];
  let elapsed = 0;
  for (const weight of weights) {
    elapsed += duration * weight / total;
    sceneBoundaries.push(elapsed);
  }
  sceneBoundaries[sceneBoundaries.length - 1] = duration;
  chapterMarkers.replaceChildren(...sceneBoundaries.slice(1, -1).map(seconds => {
    const marker = document.createElement('span');
    marker.style.left = `${seconds / duration * 100}%`;
    return marker;
  }));
}

function clearNarration() {
  audioPlayer.pause();
  audioPlayer.removeAttribute('src');
  audioPlayer.load();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = '';
  narrationReady = false;
  sceneBoundaries = [];
  audioWrap.hidden = true;
  playToggle.disabled = true;
  playerTime.textContent = '00:00 / 00:00';
  playbackScrubber.value = '0';
  playbackScrubber.style.setProperty('--played', '0%');
  chapterMarkers.replaceChildren();
}

function setNotice(message = '') {
  notice.textContent = message;
  notice.hidden = !message;
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.size > 100_000) { setNotice('This file is over 100 KB. Use a smaller text or Markdown file.'); return; }
  sourceInput.value = await file.text();
  document.querySelector('#file-name').textContent = file.name;
  setNotice('');
});

const dropZone = document.querySelector('#drop-zone');
for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add('drag-over'); });
for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', async event => {
  const file = event.dataTransfer.files?.[0];
  if (!file) return;
  if (!/\.(txt|md|markdown)$/i.test(file.name) || file.size > 100_000) { setNotice('Choose a TXT or Markdown file under 100 KB.'); return; }
  sourceInput.value = await file.text();
  document.querySelector('#file-name').textContent = file.name;
  setNotice('');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const source = sourceInput.value.trim();
  if (source.length < 20) { setNotice('Add a little more source material first. A few sentences work best.'); sourceInput.focus(); return; }
  if (source.length > 24_000) { setNotice('That source is too long. Keep it under 24,000 characters.'); sourceInput.focus(); return; }
  generateButton.disabled = true;
  generateButton.querySelector('span:nth-child(2)').textContent = 'Building your lesson…';
  setNotice('');
  try {
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, prompt: promptInput.value, language: languageSelect.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The lesson could not be generated.');
    lesson = data;
    clearNarration();
    narrateButton.disabled = false;
    renderScene(0);
  } catch (error) { setNotice(error.message || 'Could not reach the lesson server.'); }
  finally { generateButton.disabled = false; generateButton.querySelector('span:nth-child(2)').textContent = 'Build my lesson'; }
});

narrateButton.addEventListener('click', async () => {
  const text = lesson.scenes.map(scene => scene.narration).join('\n\n');
  if (text.length > 2500) { setNotice('This narration is over Sarvam’s 2,500 character limit. Shorten the lesson before making audio.'); return; }
  narrateButton.disabled = true;
  narrateButton.innerHTML = '<span aria-hidden="true">◌</span> Making audio…';
  setNotice('');
  try {
    const response = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language: languageSelect.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Audio could not be generated.');
    const bytes = Uint8Array.from(atob(data.audio), char => char.charCodeAt(0));
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    audioPlayer.src = audioUrl;
    narrationReady = true;
    audioWrap.hidden = false;
    playToggle.disabled = false;
    playerHint.textContent = 'Scenes follow the narration. Select a chapter to jump.';
    audioPlayer.load();
    audioPlayer.play().catch(() => { playerHint.textContent = 'Narration ready — press play to begin.'; });
  } catch (error) { setNotice(error.message || 'Could not reach the lesson server.'); }
  finally { narrateButton.disabled = false; narrateButton.innerHTML = '<span aria-hidden="true">▶</span> Make narration'; }
});

audioPlayer.addEventListener('loadedmetadata', () => {
  if (!Number.isFinite(audioPlayer.duration)) return;
  buildSceneTimeline(audioPlayer.duration);
  updatePlayer();
});
audioPlayer.addEventListener('timeupdate', updatePlayer);
audioPlayer.addEventListener('durationchange', updatePlayer);
audioPlayer.addEventListener('play', () => {
  playToggle.setAttribute('aria-label', 'Pause lesson');
  playToggle.innerHTML = '<span aria-hidden="true">Ⅱ</span><span>Pause</span>';
  playerHint.textContent = `Playing scene ${String(activeScene + 1).padStart(2, '0')} of ${lesson.scenes.length}`;
  setDiagramMotion(true);
});
audioPlayer.addEventListener('pause', () => {
  playToggle.setAttribute('aria-label', 'Play lesson');
  playToggle.innerHTML = '<span aria-hidden="true">▶</span><span>Play</span>';
  if (narrationReady) setDiagramMotion(false);
});
audioPlayer.addEventListener('ended', () => {
  renderScene(lesson.scenes.length - 1);
  playToggle.setAttribute('aria-label', 'Replay lesson');
  playToggle.innerHTML = '<span aria-hidden="true">↻</span><span>Replay</span>';
  playerHint.textContent = 'Lesson complete. Play again or choose a scene to revisit.';
});
audioPlayer.addEventListener('error', () => {
  if (narrationReady) setNotice('The audio clip could not be played. Generate the narration again.');
});

playToggle.addEventListener('click', () => {
  if (!narrationReady) return;
  if (audioPlayer.paused || audioPlayer.ended) {
    if (audioPlayer.ended) audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => { playerHint.textContent = 'Press play again to start the narration.'; });
  } else audioPlayer.pause();
});
playbackScrubber.addEventListener('input', () => {
  if (!narrationReady || !Number.isFinite(audioPlayer.duration)) return;
  audioPlayer.currentTime = Number(playbackScrubber.value) / 1000 * audioPlayer.duration;
  updatePlayer();
});

document.querySelector('#copy-button').addEventListener('click', async event => {
  try {
    await navigator.clipboard.writeText(lesson.scenes[activeScene].narration);
    event.currentTarget.textContent = 'Copied';
    setTimeout(() => { event.currentTarget.textContent = 'Copy'; }, 1200);
  } catch { setNotice('Clipboard access is unavailable in this browser.'); }
});

renderScene(0);

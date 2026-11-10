/* ===== VidScribe // Frontend Controller ===== */
const STEPS = [
  'Fetching video transcript',
  'Extracting key topics',
  'Analyzing competitor SERPs',
  'Drafting article',
  'Injecting internal links',
  'Scoring SEO'
];
const state = { tone: 'dev', busy: false, data: null };
const $ = (id) => document.getElementById(id);

/* ---------- Three.js Data Core ---------- */
let scene, camera, renderer, wire, core, ring, stars;
let speed = 0.004, targetSpeed = 0.004, mouseX = 0, mouseY = 0;

function initThree() {
  const canvas = $('bg');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 6;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.9, 1),
    new THREE.MeshBasicMaterial({ color: 0xff2e9f, wireframe: true, transparent: true, opacity: 0.55 })
  );
  core = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8 })
  );
  ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.02, 12, 120),
    new THREE.MeshBasicMaterial({ color: 0x7c3aed })
  );
  ring.rotation.x = Math.PI / 2.4;

  const pts = [];
  for (let i = 0; i < 700; i++) pts.push((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.04 }));

  const group = new THREE.Group();
  group.add(wire, core, ring);
  group.position.x = innerWidth > 1280 ? 0 : 0;
  scene.add(group, stars);
  scene.userData.group = group;

  addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / innerWidth - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  animate();
}

function animate(t = 0) {
  requestAnimationFrame(animate);
  speed += (targetSpeed - speed) * 0.05;
  const g = scene.userData.group;
  g.rotation.y += speed;
  g.rotation.x += speed * 0.6;
  ring.rotation.z += speed * 1.5;
  stars.rotation.y += speed * 0.1;
  const pulse = 1 + Math.sin(t * (state.busy ? 0.012 : 0.002)) * (state.busy ? 0.25 : 0.06);
  core.scale.setScalar(pulse);
  wire.material.opacity = state.busy ? 0.9 : 0.55;
  camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.04;
  camera.position.y += (-mouseY * 0.8 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

/* ---------- UI helpers ---------- */
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function renderPipeline(activeIdx = -1) {
  $('pipelineList').innerHTML = STEPS.map((s, i) => {
    const cls = i < activeIdx ? 'done' : i === activeIdx ? 'active' : '';
    return '<li class="step ' + cls + '"><i></i><span>' + s + '</span></li>';
  }).join('');
}

function buildKinetic() {
  const k = $('kinetic');
  k.innerHTML = 'PROCESSING'.split('').map((c) => '<span>' + c + '</span>').join('');
  anime({
    targets: '#kinetic span',
    translateY: [-18, 18],
    rotate: [-6, 6],
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine',
    duration: 700,
    delay: anime.stagger(80)
  });
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- Mini Markdown renderer ---------- */
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a class="injected" href="$2" target="_blank">$1</a>');
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '', i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) {
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code += lines[i++] + '\n';
      html += '<pre><code>' + esc(code) + '</code></pre>';
      i++;
    } else if (l.startsWith('# ')) { html += '<h1>' + inline(l.slice(2)) + '</h1>'; i++; }
    else if (l.startsWith('## ')) { html += '<h2>' + inline(l.slice(3)) + '</h2>'; i++; }
    else if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.split('|').slice(1, -1).map((c) => c.trim());
      html += '<table><thead><tr>' + cells(rows[0]).map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
      rows.slice(2).forEach((r) => { html += '<tr>' + cells(r).map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>'; });
      html += '</tbody></table>';
    } else if (/^- /.test(l)) {
      html += '<ul>';
      while (i < lines.length && /^- /.test(lines[i])) html += '<li>' + inline(lines[i++].slice(2)) + '</li>';
      html += '</ul>';
    } else if (/^\d+\. /.test(l)) {
      html += '<ol>';
      while (i < lines.length && /^\d+\. /.test(lines[i])) html += '<li>' + inline(lines[i++].replace(/^\d+\. /, '')) + '</li>';
      html += '</ol>';
    } else if (l.trim() === '') { i++; }
    else { html += '<p>' + inline(l) + '</p>'; i++; }
  }
  return html;
}

/* ---------- Result rendering ---------- */
function renderResult(d) {
  state.data = d;
  $('output').innerHTML = renderMarkdown(d.markdown);
  anime({ targets: '#output > *', opacity: [0, 1], translateY: [14, 0], delay: anime.stagger(40), duration: 500, easing: 'easeOutQuad' });

  const m = $('metaBox');
  m.classList.remove('hidden');
  m.innerHTML = '<b>Slug:</b> /' + esc(d.meta.slug) + '<br><b>Meta title:</b> ' + esc(d.meta.metaTitle) +
    '<br><b>Meta description:</b> ' + esc(d.meta.metaDescription) + '<br><b>Tone:</b> ' + esc(d.toneLabel) + ' &middot; <b>' + d.wordCount + '</b> words';

  // SEO meter
  const ring = $('meterRing');
  const target = 314 - (314 * d.seo.score) / 100;
  anime({ targets: ring, strokeDashoffset: [314, target], duration: 1400, easing: 'easeOutExpo' });
  const counter = { v: 0 };
  anime({ targets: counter, v: d.seo.score, round: 1, duration: 1400, easing: 'easeOutExpo', update: () => { $('meterText').textContent = counter.v; } });

  $('seoStats').innerHTML =
    '<div class="flex justify-between"><span>Keyword difficulty</span><b>' + d.seo.keywordDifficulty + '/100</b></div>' +
    '<div class="flex justify-between"><span>Search intent</span><b class="text-cyan">' + esc(d.seo.searchIntent) + '</b></div>' +
    '<div class="flex justify-between"><span>Primary keyword</span><b class="text-neonpink text-right">' + esc(d.seo.primaryKeyword) + '</b></div>' +
    '<p class="text-xs text-slate-500 pt-2">Target keywords</p>' +
    d.seo.keywords.map((k) => '<div><div class="flex justify-between text-xs"><span>' + esc(k.term) + '</span><span>' + k.volume + '/mo</span></div><div class="bar"><div data-w="' + Math.max(10, 100 - k.difficulty) + '"></div></div></div>').join('') +
    '<p class="text-xs text-slate-500 pt-2">Top competitors</p>' +
    d.seo.competitors.map((c) => '<div class="flex justify-between text-xs"><span>#' + c.rank + ' ' + esc(c.domain) + '</span><span>' + c.words + ' words</span></div>').join('');
  document.querySelectorAll('#seoStats .bar > div').forEach((b) => anime({ targets: b, width: b.dataset.w + '%', duration: 1000, easing: 'easeOutQuad' }));

  injectLinks(d.internalLinks);
  ['copyBtn', 'downloadBtn', 'publishBtn', 'reinjectBtn'].forEach((id) => ($(id).disabled = false));
  lucide.createIcons();
}

function injectLinks(links) {
  const hub = $('linkHub');
  hub.innerHTML = links.map((l) => '<li class="link-item"><span>' + esc(l.anchor) + '</span><code>' + esc(l.url) + '</code></li>').join('');
  anime({ targets: '#linkHub .link-item', opacity: [0, 1], translateX: [20, 0], delay: anime.stagger(150), duration: 500 });
  anime({ targets: '#output a.injected', backgroundColor: ['rgba(255,46,159,.6)', 'rgba(34,211,238,.12)'], delay: anime.stagger(150), duration: 1200 });
}

/* ---------- Pipeline run ---------- */
function fallbackData(url) {
  return {
    ok: true, tone: state.tone, toneLabel: 'Fallback', wordCount: 40,
    title: 'Draft unavailable',
    markdown: '# Draft unavailable\n\nThe server could not be reached. Check that npm start is running, then try again.',
    meta: { slug: 'draft', metaTitle: 'Draft', metaDescription: 'Fallback content shown because the server did not respond.' },
    seo: { score: 0, keywordDifficulty: 0, searchIntent: 'n/a', primaryKeyword: 'n/a', competitors: [], keywords: [] },
    internalLinks: []
  };
}

async function run() {
  if (state.busy) return;
  const url = $('videoUrl').value.trim();
  if (!url) return toast('Paste a video URL first.');
  state.busy = true;
  targetSpeed = 0.06;
  $('generateBtn').disabled = true;
  $('statusText').textContent = 'Core processing...';
  document.querySelector('.dot').classList.add('busy');
  $('loader').classList.remove('hidden');
  buildKinetic();

  let data = null;
  const req = fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, tone: state.tone })
  }).then((r) => r.json()).then((j) => { data = j; }).catch(() => { data = null; });

  for (let i = 0; i < STEPS.length; i++) {
    renderPipeline(i);
    $('stageText').textContent = STEPS[i] + '...';
    $('progressBar').style.width = Math.round(((i + 1) / STEPS.length) * 100) + '%';
    await new Promise((r) => setTimeout(r, 750));
  }
  await req;
  renderPipeline(STEPS.length);

  if (!data || !data.ok) {
    toast((data && data.error) || 'Server unreachable, showing fallback.');
    data = fallbackData(url);
  }
  renderResult(data);

  $('loader').classList.add('hidden');
  $('progressBar').style.width = '0';
  anime.remove('#kinetic span');
  state.busy = false;
  targetSpeed = 0.004;
  $('generateBtn').disabled = false;
  $('statusText').textContent = 'Core idle';
  document.querySelector('.dot').classList.remove('busy');
}

/* ---------- CMS actions ---------- */
function copyMd() {
  if (!state.data) return;
  navigator.clipboard.writeText(state.data.markdown).then(() => toast('Markdown copied.'), () => toast('Copy blocked by browser.'));
}
function downloadMd() {
  if (!state.data) return;
  const blob = new Blob([state.data.markdown], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.data.meta.slug + '.md';
  a.click();
  URL.revokeObjectURL(a.href);
}
function pushCms() {
  if (!state.data) return;
  const b = $('publishBtn');
  b.disabled = true;
  b.innerHTML = 'Pushing...';
  setTimeout(() => {
    b.innerHTML = '<i data-lucide="check"></i> Pushed';
    lucide.createIcons();
    toast('Mock CMS: draft "' + state.data.meta.slug + '" created.');
    setTimeout(() => { b.innerHTML = '<i data-lucide="send"></i> Push to CMS'; b.disabled = false; lucide.createIcons(); }, 2500);
  }, 1400);
}

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initThree();
  renderPipeline(-1);
  document.querySelectorAll('.tone').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tone').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.tone = btn.dataset.tone;
      anime({ targets: btn, scale: [0.96, 1], duration: 300, easing: 'easeOutBack' });
    });
  });
  $('generateBtn').addEventListener('click', run);
  $('copyBtn').addEventListener('click', copyMd);
  $('downloadBtn').addEventListener('click', downloadMd);
  $('publishBtn').addEventListener('click', pushCms);
  $('reinjectBtn').addEventListener('click', () => { if (state.data) { injectLinks(state.data.internalLinks); toast('Links re-injected.'); } });
});

// Front-end Click Event Controllers for Document and CMS Integration
document.getElementById('download-pdf')?.addEventListener('click', async () => {
    const articleText = document.getElementById('output')?.innerText || "";
    if(!articleText) return alert("Please generate a blog draft first!");

    const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: document.querySelector('h1')?.innerText, content: articleText })
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "VidScribe_Article.pdf";
    a.click();
});

document.getElementById('download-docs')?.addEventListener('click', async () => {
    const articleText = document.getElementById('output')?.innerText || "";
    if(!articleText) return alert("Please generate a blog draft first!");

    const response = await fetch('/api/export/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: document.querySelector('h1')?.innerText, content: articleText })
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "VidScribe_Article.docx";
    a.click();
});

document.getElementById('connect-wordpress')?.addEventListener('click', () => {
    // Front-end notification for the CMS module link setup
    alert("WordPress configuration node activated! This draft is being formatted for your CMS endpoint.");
});

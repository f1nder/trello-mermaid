/* global TrelloPowerUp */
let t; // initialized after Trello client is available
let diagramApis = [];

function loadTrelloClient() {
  return new Promise((resolve, reject) => {
    if (window.TrelloPowerUp) return resolve(window.TrelloPowerUp);
    const existing = document.querySelector('script[data-tpu]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.TrelloPowerUp));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://p.trellocdn.com/power-up.min.js';
    s.async = false;
    s.setAttribute('data-tpu', '');
    s.onload = () => resolve(window.TrelloPowerUp);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function sizeToBody() {
  try {
    if (t && typeof t.sizeTo === 'function') {
      return t.sizeTo(document.body).catch(() => { });
    }
  } catch (_) { }
  return Promise.resolve();
}

const mermaidBlockRegex = /```\s*mermaid\n([\s\S]*?)```/gim;

function extractMermaidBlocksWithTitles(desc) {
  if (!desc) return [];
  const results = [];
  let match;
  while ((match = mermaidBlockRegex.exec(desc)) !== null) {
    const code = (match[1] || '').trim();
    if (!code) continue;
    const startIdx = match.index;
    // Look backwards from startIdx for the nearest non-empty line (potential heading)
    const before = desc.slice(0, startIdx).trimEnd();
    const lines = before.split(/\r?\n/);
    let titleMd = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.length === 0) continue; // skip blank lines right above
      // Heading: up to 3 leading spaces then 1-6 # and a space
      const m = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*$/);
      if (m) {
        titleMd = line; // keep original heading markup
      }
      break;
    }
    results.push({ code, titleMd });
  }
  return results;
}

function renderTitleHtml(titleMd) {
  if (!titleMd) return '';
  const m = titleMd.match(/^ {0,3}(#{1,6})\s+(.+?)\s*$/);
  if (m) {
    const level = Math.min(6, m[1].length);
    const text = m[2];
    return `<h${level} class="diagram-title">${escapeHtml(text)}</h${level}>`;
  }
  return `<div class="diagram-title">${escapeHtml(titleMd)}</div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleMdToText(titleMd) {
  if (!titleMd) return '';
  const m = titleMd.match(/^ {0,3}(#{1,6})\s+(.+?)\s*$/);
  if (m) return m[2];
  return titleMd.trim();
}

function loadMermaid() {
  return new Promise((resolve, reject) => {
    if (window.mermaid) return resolve(window.mermaid);
    const src = window.MERMAID_CDN || 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(window.mermaid);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function createDiagramEl(code, idx, titleMd) {
  const wrapper = document.createElement('div');
  wrapper.className = 'diagram-wrapper';

  // Header row: Title (left) + Show Source (right)
  const header = document.createElement('div');
  header.className = 'diagram-header';
  if (titleMd) {
    const title = document.createElement('div');
    title.innerHTML = renderTitleHtml(titleMd);
    header.appendChild(title.firstChild);
  }
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  header.appendChild(spacer);

  const pre = document.createElement('pre');
  pre.className = 'diagram-source';
  pre.textContent = code;

  const toggle = document.createElement('button');
  toggle.className = 'toggle-src';
  toggle.textContent = 'Show source';
  pre.classList.add('anim-collapsible');
  toggle.addEventListener('click', async () => {
    const isHidden = window.getComputedStyle(pre).display === 'none';
    if (window.MermaidDiagram && typeof window.MermaidDiagram.animateToggle === 'function') {
      await window.MermaidDiagram.animateToggle(pre);
    } else {
      pre.style.display = isHidden ? 'block' : 'none';
    }
    toggle.textContent = isHidden ? 'Hide source' : 'Show source';
    sizeToBody();
  });
  header.appendChild(toggle);

  const out = document.createElement('div');
  out.className = 'diagram-out';
  out.id = `mermaid-diagram-${idx}`;

  wrapper.appendChild(header);
  wrapper.appendChild(pre);
  wrapper.appendChild(out);
  return { wrapper, out, pre };
}

function renderAll(mermaid, items) {
  const list = document.getElementById('diagrams');
  list.innerHTML = '';
  diagramApis = [];
  items.forEach(async ({ code, titleMd }, i) => {
    const { wrapper, out, pre } = createDiagramEl(code, i, titleMd);
    list.appendChild(wrapper);
    pre.style.display = 'none';
    out.classList.add('diagram-stage');
    try {
      const api = await window.MermaidDiagram.render(out, code, {
        ariaRoleDescription: 'flowchart-v2',
        attachResize: false,
      });
      // attach overlay controls (expand + fullscreen)
      if (window.MermaidDiagram && typeof window.MermaidDiagram.attachOverlay === 'function') {
        window.MermaidDiagram.attachOverlay(out, api, { code, modal: { title: titleMdToText(titleMd) || 'Mermaid Diagram View' } });
      }
      diagramApis.push(api);
      sizeToBody();
    } catch (e) {
      out.innerHTML = `<div class=\"diagram-error\">Mermaid render error: ${String(e)}</div>`;
    }
  });
}

function isCollapsedFromUrl() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get('collapsed') === '1';
  } catch (_) {
    return false;
  }
}

function showShimmer() {
  const list = document.getElementById('diagrams');
  if (!list) return;
  list.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'diagram-wrapper';
  const stage = document.createElement('div');
  stage.className = 'diagram-stage shimmer';
  const block1 = document.createElement('div');
  block1.className = 'shimmer-block';
  const block2 = document.createElement('div');
  block2.className = 'shimmer-block';
  stage.appendChild(block1);
  stage.appendChild(block2);
  card.appendChild(stage);
  list.appendChild(card);
}

function clearContent() {
  const list = document.getElementById('diagrams');
  if (list) list.innerHTML = '';
  diagramApis = [];
}

async function init() {
  try {
    // If collapsed, clear DOM and exit (iframe is effectively closed)
    if (isCollapsedFromUrl()) {
      try {
        document.body.classList.add('collapsed-frame');
        document.documentElement.classList.add('collapsed-frame');
      } catch (_) {}
      clearContent();
      await sizeToBody();
      return;
    }

    // Show shimmer immediately while loading Trello client + Mermaid
    showShimmer();
    await sizeToBody();

    const TP = await loadTrelloClient();
    t = TP.iframe();

    const [{ desc }, cdnOverride] = await Promise.all([
      t.card('desc'),
      t.get('board', 'shared', 'mermaidCdn')
    ]);
    if (cdnOverride) {
      window.MERMAID_CDN = cdnOverride;
    }
    const blocks = extractMermaidBlocksWithTitles(desc);

    if (!blocks.length) {
      document.getElementById('diagrams').innerHTML = '<div class="empty">No ```mermaid``` code blocks found in the description.</div>';
      await sizeToBody();
      return;
    }

    await window.MermaidDiagram.load({ mermaidCdn: window.MERMAID_CDN });
    const mermaid = window.mermaid;
    if (!mermaid || typeof mermaid.initialize !== 'function') {
      throw new Error('Mermaid failed to load or has no initialize()');
    }
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'dark',
      themeVariables: { background: 'transparent' }
    });
    renderAll(mermaid, blocks);

    // Re-render when Trello triggers a render (e.g., description updates)
    t.render(async () => {
      try {
        const { desc: latestDesc } = await t.card('desc');
        const latestBlocks = extractMermaidBlocksWithTitles(latestDesc);
        if (latestBlocks.length) {
          renderAll(mermaid, latestBlocks);
        } else {
          document.getElementById('diagrams').innerHTML = '<div class="empty">No ```mermaid``` code blocks found in the description.</div>';
        }
      } finally {
        sizeToBody();
      }
    });
  } catch (err) {
    const el = document.getElementById('diagrams');
    const msg = (err && (err.message || err.type)) ? (err.message || `Event: ${err.type}`) : String(err);
    try { console.error('Mermaid section init error:', err); } catch (e) { }
    el.innerHTML = `<div class="diagram-error">Failed to initialize: ${msg}</div>`;
  } finally {
    sizeToBody();
  }
}

init();

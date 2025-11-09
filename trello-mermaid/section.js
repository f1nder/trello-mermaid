/* global TrelloPowerUp */
const t = TrelloPowerUp.iframe();

const mermaidBlockRegex = /```\s*mermaid\n([\s\S]*?)```/gim;

function extractMermaidBlocks(desc) {
  if (!desc) return [];
  const blocks = [];
  let match;
  while ((match = mermaidBlockRegex.exec(desc)) !== null) {
    const code = match[1].trim();
    if (code) blocks.push(code);
  }
  return blocks;
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

function createDiagramEl(code, idx) {
  const wrapper = document.createElement('div');
  wrapper.className = 'diagram-wrapper';

  const pre = document.createElement('pre');
  pre.className = 'diagram-source';
  pre.textContent = code;

  const toggle = document.createElement('button');
  toggle.className = 'toggle-src';
  toggle.textContent = 'Show source';
  toggle.addEventListener('click', () => {
    const visible = pre.style.display !== 'none';
    pre.style.display = visible ? 'none' : 'block';
    toggle.textContent = visible ? 'Show source' : 'Hide source';
    TrelloPowerUp.sizeTo(document.body).catch(() => {});
  });

  const out = document.createElement('div');
  out.className = 'diagram-out';
  out.id = `mermaid-diagram-${idx}`;

  wrapper.appendChild(toggle);
  wrapper.appendChild(pre);
  wrapper.appendChild(out);
  return { wrapper, out, pre };
}

function renderAll(mermaid, blocks) {
  const list = document.getElementById('diagrams');
  list.innerHTML = '';
  blocks.forEach((code, i) => {
    const { wrapper, out, pre } = createDiagramEl(code, i);
    list.appendChild(wrapper);
    pre.style.display = 'none';
    try {
      mermaid.render(`m-${i}`, code).then(({ svg }) => {
        out.innerHTML = svg;
        TrelloPowerUp.sizeTo(document.body).catch(() => {});
      }).catch((err) => {
        out.innerHTML = `<div class="diagram-error">Mermaid render error: ${String(err)}</div>`;
      });
    } catch (e) {
      out.innerHTML = `<div class="diagram-error">Mermaid exception: ${String(e)}</div>`;
    }
  });
}

async function init() {
  try {
    const [{ desc }, cdnOverride, collapsed] = await Promise.all([
      t.card('desc'),
      t.get('board', 'shared', 'mermaidCdn'),
      t.get('card', 'shared', 'mermaidCollapsed')
    ]);
    if (cdnOverride) {
      window.MERMAID_CDN = cdnOverride;
    }
    const blocks = extractMermaidBlocks(desc);

    if (!blocks.length) {
      document.getElementById('diagrams').innerHTML = '<div class="empty">No ```mermaid``` code blocks found in the description.</div>';
      await TrelloPowerUp.sizeTo(document.body);
      return;
    }

    const toggleBtn = document.getElementById('toggle-collapse');
    const diagramsEl = document.getElementById('diagrams');

    let isCollapsed = Boolean(collapsed);
    function applyCollapsedUi() {
      if (isCollapsed) {
        diagramsEl.style.display = 'none';
        toggleBtn.textContent = 'Expand';
      } else {
        diagramsEl.style.display = 'block';
        toggleBtn.textContent = 'Collapse';
      }
      TrelloPowerUp.sizeTo(document.body).catch(() => {});
    }

    toggleBtn.addEventListener('click', async () => {
      isCollapsed = !isCollapsed;
      applyCollapsedUi();
      await t.set('card', 'shared', { mermaidCollapsed: isCollapsed });
    });

    const mermaid = await loadMermaid();
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    renderAll(mermaid, blocks);
    applyCollapsedUi();
  } catch (err) {
    const el = document.getElementById('diagrams');
    el.innerHTML = `<div class="diagram-error">Failed to initialize: ${String(err)}</div>`;
  } finally {
    TrelloPowerUp.sizeTo(document.body).catch(() => {});
  }
}

init();

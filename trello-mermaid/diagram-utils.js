// Shared Mermaid + Pan/Zoom utilities
// Exposes window.MermaidDiagram with: load, render, createControls, bindControls
(function () {
  function ensureScript(src, testFn) {
    return new Promise((resolve, reject) => {
      try {
        if (testFn && testFn()) return resolve();
        const existing = Array.from(document.scripts).find(s => s.src === src);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', reject);
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  }

  async function loadLibraries(opts = {}) {
    const mermaidCdn = opts.mermaidCdn || (window.MERMAID_CDN || 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js');
    const panZoomCdn = opts.panZoomCdn || 'https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js';
    await ensureScript(mermaidCdn, () => !!window.mermaid);
    await ensureScript(panZoomCdn, () => !!window.svgPanZoom);
    return { mermaid: window.mermaid, svgPanZoom: window.svgPanZoom };
  }

  function applySvgAttributes(svgEl, opts = {}) {
    if (!svgEl) return;
    const role = opts.role || 'graphics-document document';
    const ariaRoleDescription = opts.ariaRoleDescription || 'flowchart-v2';
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', '100%');
    svgEl.setAttribute('role', role);
    svgEl.setAttribute('aria-roledescription', ariaRoleDescription);
    svgEl.style.overflow = 'hidden';
    svgEl.style.maxWidth = '100%';
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
  }

  function initPanZoom(svgEl, options = {}) {
    if (!window.svgPanZoom || !svgEl) return null;
    const pz = window.svgPanZoom(svgEl, Object.assign({
      zoomEnabled: true,
      controlIconsEnabled: false,
      fit: true,
      center: true,
      minZoom: 0.1,
      maxZoom: 10,
      zoomScaleSensitivity: 0.2,
      panEnabled: true,
      contain: false,
      dblClickZoomEnabled: true,
    }, options));
    try {
      pz.resize(); pz.fit(); pz.center();
    } catch (_) { }
    return pz;
  }

  function createControls() {
    const wrap = document.createElement('div');
    wrap.className = 'zoom-controls';
    const mkBtn = (id, text) => { const b = document.createElement('button'); b.id = id; b.className = 'toggle-src'; b.type = 'button'; b.textContent = text; return b; };
    wrap.appendChild(mkBtn('z-in', 'Zoom In'));
    wrap.appendChild(mkBtn('z-out', 'Zoom Out'));
    wrap.appendChild(mkBtn('z-reset', 'Reset'));
    wrap.appendChild(mkBtn('z-fit', 'Fit'));
    return wrap;
  }

  function bindControls(rootEl, api) {
    if (!rootEl || !api) return;
    const q = sel => rootEl.querySelector(sel);
    const zin = q('#z-in');
    const zout = q('#z-out');
    const zreset = q('#z-reset');
    const zfit = q('#z-fit');
    if (zin) zin.addEventListener('click', () => api.zoomIn());
    if (zout) zout.addEventListener('click', () => api.zoomOut());
    if (zreset) zreset.addEventListener('click', () => api.reset());
    if (zfit) zfit.addEventListener('click', () => api.fit());
  }

  // Create and attach overlay controls (expand/collapse and fullscreen) to a stage
  function attachOverlay(stageEl, api, options = {}) {
    if (!stageEl) return null;
    let overlay = stageEl.querySelector('.diagram-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'diagram-overlay';
    const makeBtn = (cls, icon, tip) => {
      const b = document.createElement('button');
      b.type='button';
      b.className = `diagram-btn ${cls}`;
      b.textContent = icon;
      if (tip) { b.title = tip; b.setAttribute('aria-label', tip); }
      return b;
    };
    // Zoom controls (column)
    const zoomWrap = document.createElement('div');
    zoomWrap.className = 'overlay-zoom';
    const zIn = makeBtn('z-in', '+', 'Zoom In');
    const zOut = makeBtn('z-out', '−', 'Zoom Out');
    const zReset = makeBtn('z-reset', '⟲', 'Reset');
    zoomWrap.appendChild(zIn);
    zoomWrap.appendChild(zOut);
    zoomWrap.appendChild(zReset);

    overlay.appendChild(zoomWrap);
    stageEl.appendChild(overlay);
    // Fullscreen button in bottom-right corner
    const fullBtn = makeBtn('fullscreen-open', '⛶', 'Fullscreen');
    fullBtn.classList.add('diagram-fullscreen-btn');
    stageEl.appendChild(fullBtn);

    fullBtn.addEventListener('click', () => {
      openModal(options.code || '', options.modal || {});
    });

    // Bind zoom buttons to api if available
    try {
      if (api) {
        if (api.zoomIn && zIn) zIn.addEventListener('click', () => api.zoomIn());
        if (api.zoomOut && zOut) zOut.addEventListener('click', () => api.zoomOut());
        if (api.reset && zReset) zReset.addEventListener('click', () => api.reset());
      }
    } catch (_) { }

    return overlay;
  }

  // Ensure a simple fullscreen modal exists
  function ensureModalRoot() {
    let root = document.getElementById('md-modal-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'md-modal-root';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.display = 'none';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.background = 'rgba(0,0,0,0.75)';
    root.style.zIndex = '9999';

    const content = document.createElement('div');
    content.className = 'md-modal-content';
    content.style.background = 'var(--panel, #242528)';
    content.style.width = '90vw';
    content.style.height = '90vh';
    content.style.border = '1px solid var(--border, #393a3f)';
    content.style.borderRadius = '8px';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const header = document.createElement('div');
    header.style.position = 'absolute';
    header.style.top = '8px';
    header.style.right = '8px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '4px 8px';
    header.style.background = 'rgba(0,0,0,0.35)';
    header.style.borderRadius = '6px';
    const title = document.createElement('div');
    title.textContent = 'Diagram';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.style.cursor = 'pointer';
    header.appendChild(title);
    header.appendChild(close);

    const body = document.createElement('div');
    body.style.flex = '1';
    body.style.padding = '0';
    const stage = document.createElement('div');
    stage.id = 'md-modal-stage';
    stage.style.width = '100%';
    stage.style.height = '100%';
    stage.className = 'diagram-stage';
    stage.classList.add('fullscreen', 'expanded');
    body.appendChild(stage);

    content.appendChild(header);
    content.appendChild(body);
    root.appendChild(content);
    document.body.appendChild(root);

    function hide() { root.style.display = 'none'; body.setAttribute('data-open', ''); stage.innerHTML = ''; }
    close.addEventListener('click', hide);
    root.addEventListener('click', (e) => { if (e.target === root) hide(); });
    return root;
  }

  async function openModal(code, opts = {}) {
    const root = ensureModalRoot();
    root.style.display = 'flex';
    const stage = root.querySelector('#md-modal-stage');
    stage.innerHTML = '';
    await loadLibraries({ mermaidCdn: opts.mermaidCdn, panZoomCdn: opts.panZoomCdn });
    if (window.mermaid && typeof window.mermaid.initialize === 'function') {
      try { window.mermaid.initialize({ startOnLoad: false, theme: 'dark' }); } catch (_) {}
    }
    const api = await render(stage, code, { ariaRoleDescription: 'flowchart-v2', attachResize: true });
    return api;
  }

  async function render(stageEl, code, opts = {}) {
    if (!stageEl) throw new Error('render: stage element is required');
    const { mermaid } = await loadLibraries({ mermaidCdn: opts.mermaidCdn, panZoomCdn: opts.panZoomCdn });
    if (!mermaid || typeof mermaid.render !== 'function') throw new Error('Mermaid is not available');

    // Stage styling (caller can override via CSS); ensure it can host pan/zoom
    if (opts.ensureStageStyle !== false) {
      stageEl.style.position = stageEl.style.position || 'relative';
      stageEl.style.overflow = stageEl.style.overflow || 'hidden';
      stageEl.style.display = stageEl.style.display || 'flex';
      stageEl.style.alignItems = stageEl.style.alignItems || 'center';
      stageEl.style.justifyContent = stageEl.style.justifyContent || 'center';
      if (opts.stageHeight) stageEl.style.height = opts.stageHeight;
      stageEl.classList.add('diagram-stage');
    }

    const id = 'm-' + Math.random().toString(36).slice(2);
    const { svg } = await mermaid.render(id, code);
    stageEl.innerHTML = svg;
    const svgEl = stageEl.querySelector('svg');
    if (!svgEl) throw new Error('Mermaid render returned no SVG');
    applySvgAttributes(svgEl, { ariaRoleDescription: opts.ariaRoleDescription });

    const pz = initPanZoom(svgEl, opts.panZoomOptions);

    function resize() { try { pz && pz.resize(); pz && pz.fit(); pz && pz.center(); } catch (_) {} }
    let onResize = null;
    if (opts.attachResize !== false) {
      onResize = () => resize();
      window.addEventListener('resize', onResize);
    }

    return {
      svg: svgEl,
      panZoom: pz,
      zoomIn: () => { if (pz) pz.zoomBy(1.2); },
      zoomOut: () => { if (pz) pz.zoomBy(1/1.2); },
      reset: () => { if (pz) { pz.reset(); pz.center(); pz.fit(); } },
      fit: () => { if (pz) pz.fit(); },
      resize,
      destroy: () => { try { onResize && window.removeEventListener('resize', onResize); pz && pz.destroy(); } catch (_) {} },
    };
  }

  window.MermaidDiagram = {
    load: loadLibraries,
    render,
    createControls,
    bindControls,
    attachOverlay,
    openModal,
  };
})();

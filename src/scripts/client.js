/* global TrelloPowerUp */
const tpu = window.TrelloPowerUp;

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

const ICON = {
  light: './assets/icon.svg',
  dark: './assets/icon.svg'
};

tpu.initialize({
  'card-badges': function (t) {
    return t.card('desc').then(({ desc }) => {
      const blocks = extractMermaidBlocks(desc);
      if (!blocks.length) return [];
      return [
        {
          title: 'Mermaid',
          text: String(blocks.length),
          color: 'blue',
          icon: ICON.light,
        },
      ];
    });
  },

  'card-back-section': function (t) {
    return Promise.all([
      t.card('desc'),
      t.get('card', 'shared', 'mermaidCollapsed')
    ]).then(([{ desc }, collapsed]) => {
      const blocks = extractMermaidBlocks(desc);
      if (!blocks.length) return [];
      const count = blocks.length;
      const expandedHeight = Math.min(800, 200 + count * 260);
      const collapsedHeight = 1; // effectively collapse iframe content area
      return [
        {
          title: `Mermaid Diagrams (${count})`,
          icon: ICON.light,
          content: {
            type: 'iframe',
            // Pass collapsed state to force iframe reload and allow lazy init
            url: t.signUrl(`./section.html?collapsed=${collapsed ? '1' : '0'}`),
            height: collapsed ? collapsedHeight : expandedHeight,
          },
          action: {
            text: collapsed ? 'Show' : 'Hide',
            callback: function (t) {
              return t.set('card', 'shared', { mermaidCollapsed: !collapsed });
            },
          },
        },
      ];
    });
  },

  'show-settings': function (t) {
    return t.modal({
      title: 'Mermaid Renderer',
      url: './settings.html',
      height: 280,
      accentColor: '#242528',
    });
  },
});

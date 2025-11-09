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

const ICON = 'https://f1nder.github.io/trello-mermaid/src/assets/icon-gray.svg'

tpu.initialize({


  'card-back-section': function (t) {
    return Promise.all([
      t.card('desc'),
      t.get('card', 'shared', 'mermaidCollapsed')
    ]).then(([{ desc }, collapsed]) => {
      const blocks = extractMermaidBlocks(desc);
      if (!blocks.length) return [];
      const count = blocks.length;
      // Compute height based on CSS layout estimates so initial iframe fits content
      // - Each diagram stage (collapsed) ~200px + header/padding ~40-60px
      // - Gap between wrappers: 16px
      // - Container vertical padding: 28px (12 top + 16 bottom)
      const perDiagramCollapsed = 240; // approx collapsed diagram block height
      const gapBetween = 16;
      const containerVPad = 28;
      const expandedHeight = containerVPad + (count * perDiagramCollapsed) + Math.max(0, count - 1) * gapBetween;
      const collapsedHeight = 1; // effectively collapse iframe content area
      return [
        {
          title: `Diagrams (${count})`,
          icon: ICON,
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
  }
});

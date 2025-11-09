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
  light: './icon.svg',
  dark: './icon.svg'
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
    return t.card('desc').then(({ desc }) => {
      const blocks = extractMermaidBlocks(desc);
      if (!blocks.length) return [];
      return [
        {
          title: 'Mermaid Diagrams',
          icon: ICON.light,
          content: {
            type: 'iframe',
            url: t.signUrl('./section.html'),
            height: Math.min(800, 200 + blocks.length * 260),
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
    });
  },
});


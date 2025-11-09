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

const ICON = 'data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OTAuMTYgNDkwLjE2Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzMyMzIzMkZGO30uY2xzLTJ7ZmlsbDojRkRGREZERkY7fTwvc3R5bGU+PC9kZWZzPjxyZWN0IGNsYXNzPSJjbHMtMSIgd2lkdGg9IjQ5MC4xNiIgaGVpZ2h0PSI0OTAuMTYiIHJ4PSI4NC42MSIvPjxwYXRoIGNsYXNzPSJjbHMtMiIgZD0iTTQwNy40OCwxMTEuMThBMTY1LjIsMTY1LjIsMCwwLDAsMjQ1LjA4LDIyMCwxNjUuMiwxNjUuMiwwLDAsMCw4Mi42OCwxMTEuMThhMTY1LjUsMTY1LjUsMCwwLDAsNzIuMDYsMTQzLjY0LDg4LjgxLDg4LjgxLDAsMCwxLDM4LjUzLDczLjQ1djUwLjg2SDI5Ni45VjMyOC4yN2E4OC44LDg4LjgsMCwwLDEsMzguNTItNzMuNDUsMTY1LjQxLDE2NS40MSwwLDAsMCw3Mi4wNi0xNDMuNjRaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMTYwLjYzLDMyOC4yN2E1Ni4wOSw1Ni4wOSwwLDAsMC0yNC4yNy00Ni40OSwxOTguNzQsMTk4Ljc0LDAsMCwxLTI4LjU0LTIzLjY2QTE5Ni44NywxOTYuODcsMCwwLDEsODIuNTMsMjI3VjM3OS4xM2g3OC4xWiIvPjxwYXRoIGNsYXNzPSJjbHMtMiIgZD0iTTMyOS41MywzMjguMjdhNTYuMDksNTYuMDksMCwwLDEsMjQuMjctNDYuNDksMTk4Ljc0LDE5OC43NCwwLDAsMCwyOC41NC0yMy42NkExOTYuODcsMTk2Ljg3LDAsMCwwLDQwNy42MywyMjdWMzc5LjEzaC03OC4xWiIvPjwvc3ZnPgoK'

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

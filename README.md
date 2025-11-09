# Trello Mermaid Renderer

## Overview

- Trello Power-Up that detects `mermaid` fenced code blocks (`mermaid ...`) in card descriptions and renders them as SVG diagrams.
- Provides a card-back section with per-diagram controls, zoom/pan, a right-aligned "Show source" toggle, and a fullscreen view using Trello’s modal when available.
- Includes optional settings to override the Mermaid CDN URL.

## Features

- Card badges show the number of Mermaid blocks on a card.
- Card-back section renders all Mermaid diagrams with titles parsed from Markdown headings.
- Zoom/pan controls on each diagram; scrollable source view with themed background.
- Fullscreen modal: uses Trello’s native modal (fullscreen) with a fallback custom overlay.
- Settings modal to override Mermaid CDN per board.

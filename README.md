# Treebox

A client-side web tool for creating, editing, comparing, and animating hierarchical tree documents.

## What it does

Treebox lets you quickly describe tree structures using a simple text DSL, instantly see them as an interactive visual explorer, compare versions with diff, build step-by-step timelines, and create animated transitions between states.

Works entirely in the browser — no backend, no account, no installation.

## Modes

- **Edit** — write a tree in text, see it rendered live in a split view
- **Diff** — compare two trees side by side with added/removed/moved highlighting
- **Timeline** — step through multiple tree states
- **Animate** — keyframe-based animation editor with timeline, labels, easing, and GIF export

## Text DSL

```
Workspace [Workspace]
├── Players [Players]
│   └── Player1 [Player] { Team = "Blue", #active }
└── Lighting [Lighting] // scene lighting
    └── Sun [DirectionalLight] { Brightness = 2.5 }
```

Syntax elements:
- `Name [ClassName]` — node with class
- `{ key = value, key2 = "string" }` — properties block
- `#tag` — tags
- `@attribute = value` — attributes
- `<id>` — explicit node identity (for stable diffs/animations)
- `// comment` — inline comment
- `/* note */` — multiline note

## Sharing

Generate a share URL that encodes the full document (including animation state) in the URL hash — no server needed. Recipients see the tree/animation immediately.

## Animation features

- Keyframe editor with per-keyframe easing (linear, ease-in, ease-out, ease-in-out)
- Independent timeline labels with drag/resize
- Interpolated transitions: position, opacity, typewriter text effects
- GIF export with progress indicator
- Fullscreen playback mode with auto-hiding controls
- Full export/import in text and JSON formats

## Tech stack

- React + TypeScript
- Zustand (state management)
- CodeMirror (text editor with custom syntax highlighting)
- Vite (build)
- html-to-image + modern-gif (GIF export)
- lz-string (URL payload compression)
- No backend dependencies

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploy to GitHub Pages

```bash
npx vite build --base /<repo-name>/
npx gh-pages -d dist
```

## License

MIT

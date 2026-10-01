# Three.js slide presentation

Full-screen WebGL scenes with HTML/CSS overlays. Use **← →** (or ↑ ↓) to move between slides. Each slide defines camera keyframes (lerped), overlay copy, and hooks for spawn/animation.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Extending

- Add slides in `src/demoSlides.ts` (or split into separate files).
- Load GLTF models with `THREE.GLTFLoader` inside `setup` / `onEnter`.
- For richer transitions, drive `transitionT` in `SlidePresentation` to run custom timelines (GSAP, custom springs, etc.).

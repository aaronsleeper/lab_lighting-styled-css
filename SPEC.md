# Light Source UI Library — Product & Technical Spec (Draft v0.2)

> Goal: A small UI library that lets a page define a **global light source** (via CSS variables) and lets **opt‑in elements** (class `.lit`) adjust their appearance in CSS based on that light.
>
> Bias: Prefer CSS variables/functions; use minimal JS only for values CSS cannot compute (element centers, cross‑element vectors, angles) and to update on **load / scroll / resize**.

---

## 1) Problem Statement

We want a consistent, global light model that:

* Defines light properties once at `:root`.
* Propagates to any element that opts in.
* Enables shading, highlights, and shadows to respond to **position** of the light relative to each element.
* Remains lightweight, accessible, and easy to theme.

## 2) Non‑Goals

* True PBR fidelity or WebGL.
* Multiple lights (future extension).
* Per‑pixel normal maps.

## 3) Core Concepts & Glossary

* **Global Light Source**: Single virtual light with position and LCH-defined color, composed of three separate CSS variables (`--ls-L`, `--ls-C`, `--ls-H`) so elements can selectively transform luminance, chroma, or hue without applying the full color.
* **Lit Element**: Any element with `.lit` class; receives per‑element CSS vars from runtime.
* **Element Center**: 2D midpoint of element’s bounding box in viewport.
* **Elevation**: Concept used to scale shadow softness/offset and highlight intensity.

## 4) Public API Surface

### 4.1 CSS Custom Properties (Global)

```css
:root {
  /* Position */
  --ls-x: 50vw;
  --ls-y: 10vh;
  --ls-z: 600px;

  /* Photometric feel */
  --ls-intensity: 1;
  --ls-ambient: 0.10;
  --ls-softness: 0.35;
  --ls-range: 1400px;

  /* Light color — LCH channels */
  --ls-L: 96%;        /* Luminance */
  --ls-C: 12;         /* Chroma */
  --ls-H: 85deg;      /* Hue */
  --ls-color: lch(var(--ls-L) var(--ls-C) var(--ls-H));

  /* Shadow color — LCH channels */
  --ls-shadow-L: 22%;
  --ls-shadow-C: 4;
  --ls-shadow-H: 230deg;
  --ls-shadow-color: lch(var(--ls-shadow-L) var(--ls-shadow-C) var(--ls-shadow-H) / 0.35);
}
```

### 4.2 CSS Custom Properties (Per‑Element, set by runtime)

```css
.lit {
  --el-cx: 0px;
  --el-cy: 0px;
  --el-dx: 0px;
  --el-dy: 0px;
  --el-distance: 0px;
  --el-angle-deg: 0deg;
  --el-falloff: 1;
  --el-lightness: 1;
}
```

### 4.3 CSS Custom Properties (Per‑Element authoring knobs)

```css
.lit {
  --elevation: 2;
  --roughness: 0.5;
  --metallic: 0.0;
  --base: var(--surface, Canvas);
}
```

## 5) Visual Model

All color operations use `in lch` for perceptual accuracy.

## 6) CSS Rendering Primitives

Example highlight overlay:

```css
.lit::after {
  background:
    radial-gradient(
      80% 60% at calc(50% - 20% * cos(var(--el-angle-deg)))
                    calc(50% - 20% * sin(var(--el-angle-deg))),
      color-mix(in lch, var(--ls-color) calc((1 - var(--roughness)) * 40%), transparent),
      transparent 60%
    );
}
```

## 7) JavaScript Runtime

The runtime supplies geometry and lighting values that CSS cannot calculate:

* Read light properties from `:root` custom properties.
* On `load`, `scroll`, and `resize`, compute each `.lit` element’s center using `getBoundingClientRect()`.
* Derive vector and distance from the light source to the element, storing results in `--el-dx`, `--el-dy`, and `--el-distance`.
* Calculate `--el-angle-deg` using `Math.atan2` and normalize to `0deg–360deg`.
* Compute `--el-falloff` as a clamped value from 0–1 based on distance vs `--ls-range`.
* Set all computed values via `element.style.setProperty`.
* Use `requestAnimationFrame` to throttle updates and `IntersectionObserver` to skip off‑screen elements.
* Watch for DOM mutations to attach `.lit` behavior to dynamically added nodes.

## 8) Channel‑specific Transforms

### 8.1 L‑only dimming

```css
.lit {
  --L-dim: calc(var(--ls-L) * (0.85 + 0.15 * var(--el-falloff)));
  background-color: lch(var(--L-dim) var(--ls-C) var(--ls-H));
}
```

### 8.2 Specular pop via chroma

```css
.lit::after {
  --C-spec: calc(var(--ls-C) + (1 - var(--roughness)) * var(--el-falloff) * 6);
  background: radial-gradient(
    80% 60% at calc(50% - 20% * cos(var(--el-angle-deg)))
                  calc(50% - 20% * sin(var(--el-angle-deg))),
    lch(var(--ls-L) var(--C-spec) var(--ls-H) / 0.35),
    transparent 60%
  );
}
```

### 8.3 Hue‑only ambiance

```css
.lit {
  --H-amb: calc(var(--ls-H) + (1 - var(--el-falloff)) * 10deg);
  outline-color: lch(var(--ls-L) var(--ls-C) var(--H-amb));
}
```

## 9) Demo Page Specification

To validate scrolling behavior and property updates:

* Create a standalone `demo.html` with:
  * A fixed header with a light position control UI.
  * At least 2000px of vertical content to allow ample scrolling.
  * Multiple `.lit` elements placed at different positions (cards, buttons, images) interspersed through the page.
  * Visual indicators (e.g., text overlays) showing live `--el-distance` and `--el-angle-deg` values for debugging.
  * A footer to mark the end of scrollable content.
* The demo should clearly show dynamic shadow/highlight changes as elements move relative to the light source.

## 10) Accessibility Considerations

* Ensure sufficient color contrast between lit surfaces and their surroundings.
* Respect `prefers-reduced-motion`; when set, suppress animated transitions.
* Provide semantic HTML so the visual effects do not convey essential information.

## 11) Performance & Fallback Strategy

* Batch DOM reads/writes and throttle calculations with `requestAnimationFrame`.
* Ignore off‑screen elements to reduce work.
* When JavaScript is disabled or unsupported, elements fall back to static styles using baseline CSS.

## 12) Theming & Customization

* Authors can override global light variables to create dark, warm, or high‑contrast themes.
* Additional per‑element knobs such as `--elevation` and `--roughness` enable component‑level customization.
* Provide optional utility classes for common themes.

## 13) Browser Support and Progressive Enhancement

* Targets modern browsers supporting CSS Custom Properties and the `lch()` color space.
* Uses only standard Web APIs; if `lch()` is unavailable, authors may supply `--ls-color-srgb` fallbacks.
* The library operates as a progressive enhancement; unsupported browsers simply render without dynamic lighting.

## 14) Testing Strategy

* Unit tests for runtime geometry calculations (distance, angle, falloff).
* Visual regression tests on the demo page across major browsers.
* Manual QA for accessibility features such as reduced motion and high contrast modes.

## 15) Packaging and Distribution

* Distributed as a small ES module (`light-source.js`) plus an optional CSS helper file.
* Provide both ESM and UMD builds and publish to npm as `light-source-ui`.
* Documentation and the demo page live in the repository’s `docs/` directory.

## 16) Roadmap & Future Work

* Multiple light sources with additive blending.
* Per‑element normal maps for richer shading.
* Integration hooks for popular frameworks (React, Vue, Svelte).

## 17) License

MIT License.


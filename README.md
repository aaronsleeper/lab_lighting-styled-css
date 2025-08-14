# Light Source UI

A tiny experiment that exposes a global light source via CSS custom properties and lets opt‑in elements respond to that light.

## Usage

```html
<link rel="stylesheet" href="light-source-ui.css">
<script type="module">
  import LightSourceUI from './light-source-ui.mjs';
  const ls = new LightSourceUI();
  ls.start();
</script>
```

Add the `.lit` class to any element that should react to the light.  Optional authoring knobs can be set with `data-*` attributes:

```html
<div class="lit" data-roughness="0.2" data-elevation="4"></div>
```

Global light properties live on `:root` and can be themed:

```css
:root {
  --ls-x: 20vw;
  --ls-y: 15vh;
  --ls-color: lch(96% 12 85deg);
}
```

See `demo.html` for a complete example with interactive controls.

## Browser Support

Designed for modern browsers that support CSS Custom Properties and the `lch()` color space.  Browsers lacking these features will simply render the unlit fallback styles.

## License

MIT

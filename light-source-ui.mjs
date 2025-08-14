export default class LightSourceUI {
  constructor() {
    this.root = document.documentElement;
    this.elements = new Set();
    this.pending = false;

    this.intersector = new IntersectionObserver(this._onIntersect.bind(this), {
      root: null,
      rootMargin: '200px'
    });

    this.mutationObserver = new MutationObserver(this._onMutate.bind(this));

    this._boundSchedule = this.schedule.bind(this);
  }

  start() {
    this._collectInitial();
    window.addEventListener('scroll', this._boundSchedule, { passive: true });
    window.addEventListener('resize', this._boundSchedule);
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    this.schedule();
  }

  _collectInitial() {
    document.querySelectorAll('.lit').forEach(el => this._addElement(el));
  }

  _addElement(el) {
    if (this.elements.has(el)) return;
    this.elements.add(el);
    this.intersector.observe(el);
    this._applyDataset(el);
  }

  _applyDataset(el) {
    ['elevation', 'roughness', 'metallic'].forEach(name => {
      const val = el.dataset[name];
      if (val != null) {
        el.style.setProperty(`--${name}`, val);
      }
    });
  }

  _onMutate(mutations) {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('.lit')) this._addElement(node);
        node.querySelectorAll && node.querySelectorAll('.lit').forEach(el => this._addElement(el));
      });
      m.removedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (this.elements.has(node)) {
          this.intersector.unobserve(node);
          this.elements.delete(node);
        }
        node.querySelectorAll && node.querySelectorAll('.lit').forEach(el => {
          if (this.elements.has(el)) {
            this.intersector.unobserve(el);
            this.elements.delete(el);
          }
        });
      });
    });
  }

  _onIntersect(entries) {
    entries.forEach(entry => {
      entry.target.__ls_visible = entry.isIntersecting;
    });
    this.schedule();
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.update();
    });
  }

  update() {
    const cs = getComputedStyle(this.root);
    const lsx = parseFloat(cs.getPropertyValue('--ls-x'));
    const lsy = parseFloat(cs.getPropertyValue('--ls-y'));
    const range = parseFloat(cs.getPropertyValue('--ls-range'));
    const intensity = parseFloat(cs.getPropertyValue('--ls-intensity'));
    const ambient = parseFloat(cs.getPropertyValue('--ls-ambient'));

    const visible = [];
    this.elements.forEach(el => {
      if (el.__ls_visible) visible.push(el);
    });

    const measurements = visible.map(el => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - lsx;
      const dy = cy - lsy;
      const distance = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const falloff = Math.max(0, 1 - distance / range);
      const lightness = Math.min(1, ambient + intensity * falloff);
      return { el, cx, cy, dx, dy, distance, angle, falloff, lightness };
    });

    measurements.forEach(m => {
      const style = m.el.style;
      style.setProperty('--el-cx', m.cx.toFixed(2) + 'px');
      style.setProperty('--el-cy', m.cy.toFixed(2) + 'px');
      style.setProperty('--el-dx', m.dx.toFixed(2) + 'px');
      style.setProperty('--el-dy', m.dy.toFixed(2) + 'px');
      style.setProperty('--el-distance', m.distance.toFixed(2) + 'px');
      style.setProperty('--el-angle-deg', m.angle.toFixed(2) + 'deg');
      style.setProperty('--el-falloff', m.falloff.toFixed(4));
      style.setProperty('--el-lightness', m.lightness.toFixed(4));
    });
  }
}

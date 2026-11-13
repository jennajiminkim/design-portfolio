const stage = document.querySelector('.type-stage');
const selection = stage.querySelector('.type-selection');
const handles = [...stage.querySelectorAll('.type-handle')];
const toggle = document.querySelector('.motion-toggle');
const reset = document.querySelector('.type-reset');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const mix = (a, b, t) => a + (b - a) * t;
const blend = (a, b, t) => a.map((n, i) => mix(n, b[i], t));
const smooth = t => t * t * (3 - 2 * t);

// Each pose specifies the width and height within the padded stage, from 0 to 1.
const poses = [[.68, .65], [.06, .95], [.98, .22], [.68, .65]];
const segmentMs = 2600;
const holdMs = 1600;
const gutter = 24;
let limits, box, home;
let animationOn = !reducedMotion.matches;
let hovered = false;
let drag = null;
let spring = null;
let restartAt = null;
let bridge = null;
let autoStart = null;
let raf = 0;

function centered(width, height) {
  return [(limits.width - width) / 2, (limits.height - height) / 2, width, height];
}

function pose([w, h]) {
  return centered(mix(limits.minW, limits.maxW, w), mix(limits.minH, limits.maxH, h));
}

function constrain([x, y, w, h]) {
  w = clamp(w, limits.minW, limits.maxW);
  h = clamp(h, limits.minH, limits.maxH);
  return [clamp(x, gutter, limits.width - gutter - w), clamp(y, gutter, limits.height - gutter - h), w, h];
}

function measure() {
  const previous = limits;
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (previous?.width === width && previous.height === height) return;
  limits = {width, height, maxW: Math.max(1, width - 2 * gutter), maxH: Math.max(1, height - 2 * gutter)};
  limits.minW = Math.min(limits.maxW, Math.max(100, width * .34));
  limits.minH = Math.min(limits.maxH, 94);
  home = pose(poses[0]);

  if (previous) {
    if (drag) release(true, false);
    box = constrain(box.map((number, index) =>
      number * (index % 2 ? height / previous.height : width / previous.width)));
    spring = null;
    autoStart = null;
    bridge = null;
  } else {
    box = home;
  }
  queueRender();
}

function render() {
  const [x, y, w, h] = box;
  const width = (w - limits.minW) / (limits.maxW - limits.minW || 1);
  const height = (h - limits.minH) / (limits.maxH - limits.minH || 1);
  const values = {
    left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px',
    'type-size': Math.min(w * .306, h * .55, 115) + 'px',
    'form-width': mix(28, 148, width),
    'flow-width': mix(39, 151, width),
    'form-weight': mix(420, 1000, height),
    'flow-weight': mix(160, 820, height),
    optical: mix(18, 110, height),
    'flow-spacing': mix(-.045, .015, width) + 'em',
  };
  for (const [key, value] of Object.entries(values)) selection.style.setProperty('--' + key, value);
}

function autoAllowed() {
  return animationOn && !reducedMotion.matches && !hovered && !drag;
}

function frame(now) {
  raf = 0;
  if (spring) {
    const t = (now - spring.start) / 430;
    if (t >= 1) {
      box = spring.target;
      spring = null;
    } else {
      // One small overshoot, damped to rest without moving the anchored edges.
      const rest = .115 * Math.sin(t * Math.PI * 2) * (1 - t) ** 3;
      box = resizeEdges(spring.target, spring.edge, spring.dx * rest, spring.dy * rest);
    }
  } else if (autoAllowed() && (restartAt === null || now >= restartAt)) {
    if (!bridge && autoStart === null) bridge = {start: now, from: box};
    if (bridge) {
      const t = clamp((now - bridge.start) / 740, 0, 1);
      box = blend(bridge.from, home, smooth(t));
      if (t === 1) {
        bridge = null;
        autoStart = now;
      }
    } else {
      const phase = ((now - autoStart) / segmentMs) % (poses.length - 1);
      const i = Math.floor(phase);
      box = pose(blend(poses[i], poses[i + 1], smooth(phase - i)));
    }
  }
  render();
  if (spring || autoAllowed()) queueRender();
}

function queueRender() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function interrupt() {
  bridge = null;
  autoStart = null;
  spring = null;
}

// Move only the edges named by the selected handle. The opposite edges stay fixed.
function resizeEdges([x, y, w, h], edge, dx, dy) {
  let right = x + w;
  let bottom = y + h;
  if (edge.includes('e')) right = clamp(right + dx, x + limits.minW, limits.width - gutter);
  if (edge.includes('w')) x = clamp(x + dx, gutter, right - limits.minW);
  if (edge.includes('s')) bottom = clamp(bottom + dy, y + limits.minH, limits.height - gutter);
  if (edge.includes('n')) y = clamp(y + dy, gutter, bottom - limits.minH);
  return [x, y, right - x, bottom - y];
}

function release(cancelled = false, animate = true) {
  if (!drag) return;
  const {handle, pointer, edge, vx, vy, last} = drag;
  drag = null;
  delete handle.dataset.active;
  if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
  const now = performance.now();
  restartAt = now + holdMs;
  if (!cancelled && animate && !reducedMotion.matches && now - last < 110) {
    spring = {start: now, target: box, edge, dx: clamp(vx * 82, -52, 52), dy: clamp(vy * 82, -52, 52)};
  }
  queueRender();
}

for (const handle of handles) {
  const edge = handle.dataset.edge;
  handle.hidden = false;
  handle.addEventListener('pointerdown', event => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    interrupt();
    drag = {handle, pointer: event.pointerId, edge, origin: box, x: event.clientX, y: event.clientY,
      lastX: event.clientX, lastY: event.clientY, last: performance.now(), vx: 0, vy: 0};
    handle.dataset.active = '';
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (drag?.pointer !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(8, now - drag.last);
    drag.vx = (event.clientX - drag.lastX) / elapsed;
    drag.vy = (event.clientY - drag.lastY) / elapsed;
    Object.assign(drag, {last: now, lastX: event.clientX, lastY: event.clientY});
    box = resizeEdges(drag.origin, edge, event.clientX - drag.x, event.clientY - drag.y);
    queueRender();
  });
  handle.addEventListener('pointerup', event => {
    if (drag?.pointer === event.pointerId) release();
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    handle.addEventListener(name, event => {
      if (drag?.pointer === event.pointerId) release(true);
    });
  }
  handle.addEventListener('keydown', event => {
    const arrows = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
    if (!arrows[event.key] || drag) return;
    event.preventDefault();
    interrupt();
    const [dx, dy] = arrows[event.key];
    const step = event.shiftKey ? 15 : 5;
    box = resizeEdges(box, edge, dx * step, dy * step);
    restartAt = performance.now() + holdMs;
    queueRender();
  });
}

stage.addEventListener('pointerenter', event => {
  if (event.pointerType !== 'mouse') return;
  hovered = true;
  bridge = null;
  autoStart = null;
});
stage.addEventListener('pointerleave', event => {
  if (event.pointerType !== 'mouse') return;
  hovered = false;
  queueRender();
});

function updateToggle() {
  toggle.hidden = reducedMotion.matches;
  toggle.textContent = animationOn ? '모션 중지' : '모션 재생';
}

toggle.addEventListener('click', () => {
  animationOn = !animationOn;
  restartAt = null;
  interrupt();
  updateToggle();
  queueRender();
});
reset.addEventListener('click', () => {
  if (drag) release(true);
  interrupt();
  box = home;
  restartAt = performance.now() + holdMs;
  queueRender();
});

reducedMotion.addEventListener('change', () => {
  if (drag) release(true);
  interrupt();
  animationOn = !reducedMotion.matches;
  box = home;
  updateToggle();
  queueRender();
});

updateToggle();
reset.hidden = false;
measure();
new ResizeObserver(measure).observe(stage);

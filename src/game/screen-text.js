/** Project world anchors into CSS pixels; device pixel density only affects raster resolution. */
export const worldToScreen = (x, y, camera, scale, dpr) => ({
  x: ((x - camera.x) * scale) / dpr,
  y: ((y - camera.y) * scale) / dpr,
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlaps = (a, b) =>
  a.x < b.x + b.width + 3 &&
  a.x + a.width + 3 > b.x &&
  a.y < b.y + b.height + 3 &&
  a.y + a.height + 3 > b.y;
/** Place measured labels in free screen space, preferring an upward stack near each anchor. */
export function placeFloatingTexts(labels, viewport) {
  const placed = [],
    pad = 4;
  for (const label of labels) {
    const width = Math.min(label.width, viewport.width - pad * 2),
      height = label.height;
    const x = clamp(label.x - width / 2, pad, viewport.width - pad - width),
      y = clamp(label.y - height, pad, viewport.height - pad - height);
    const columns = [x, pad, viewport.width - pad - width];
    let box = null;
    for (const cx of columns) {
      const candidates = [y];
      for (let offset = height + 4; offset < viewport.height; offset += height + 4)
        candidates.push(y - offset, y + offset);
      for (const cy of candidates) {
        if (cy < pad || cy + height > viewport.height - pad) continue;
        const candidate = { ...label, x: cx, y: cy, width, height };
        if (!placed.some((p) => overlaps(p, candidate))) {
          box = candidate;
          break;
        }
      }
      if (box) break;
    }
    // A saturated viewport omits excess popups rather than drawing unreadable overlaps.
    if (box) placed.push(box);
  }
  return placed;
}

const intersects = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export { intersects };
/** Keep labels below feet, moving sideways around controls before moving further down. */
export function placeNameplate(anchor, width, height, viewport, blocked = []) {
  const pad = 4,
    preferredX = Math.max(pad, Math.min(viewport.width - pad - width, anchor.x - width / 2));
  const preferredY = anchor.y + 4;
  const xs = [
    preferredX,
    pad,
    viewport.width - pad - width,
    ...blocked.flatMap((b) => [b.x - width - pad, b.x + b.width + pad]),
  ];
  const ys = [preferredY, ...blocked.map((b) => b.y + b.height + pad)];
  const candidates = [];
  for (const y of ys)
    for (const x of xs) {
      if (
        x < pad ||
        y < preferredY ||
        x + width > viewport.width - pad ||
        y + height > viewport.height - pad
      )
        continue;
      const rect = { x, y, width, height };
      if (!blocked.some((b) => intersects(rect, b))) candidates.push(rect);
    }
  return (
    candidates.sort(
      (a, b) =>
        Math.abs(a.x - preferredX) +
        Math.abs(a.y - preferredY) * 1.5 -
        (Math.abs(b.x - preferredX) + Math.abs(b.y - preferredY) * 1.5),
    )[0] || null
  );
}
/** Reserve a top HUD band for upper ledges when player and ledge can both fit on screen. */
export function clearUpperPlatformCamera(
  desiredY,
  playerFeet,
  platforms,
  enemies,
  cameraX,
  worldViewWidth,
  viewport,
  cssScale,
  headerBottom,
) {
  if (!headerBottom) return desiredY;
  const highs = platforms.filter(
    (p) => p.id.endsWith('-high') && p.x + p.w > cameraX && p.x < cameraX + worldViewWidth,
  );
  if (!highs.length) return desiredY;
  const top = Math.min(
    ...highs.map((p) => {
      const sizes = enemies
        .filter((e) => e.platformId === p.id)
        .map((e) => Math.max(e.w + 16, e.h * 1.5) * (e.isElite ? 1.3 : 1));
      return p.y - Math.max(80, ...sizes) - 10;
    }),
  );
  const limit = top - (headerBottom + 8) / cssScale;
  const minimum = Math.max(0, playerFeet - (viewport.height - 24) / cssScale);
  return limit >= minimum ? Math.max(0, Math.min(desiredY, limit)) : desiredY;
}

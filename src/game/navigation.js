import { GRAVITY, JUMP_SPEED, MOVE_SPEED } from './world.js';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
/** Directed platform graph. Edges include concrete launch/landing positions. */
export function buildNavigationGraph(world) {
  const graph = Object.fromEntries(world.platforms.map((p) => [p.id, []]));
  for (const rope of world.ropes) {
    const top = world.platforms.find(
      (p) => Math.abs(p.y - rope.y1) < 2 && rope.x >= p.x && rope.x <= p.x + p.w,
    );
    const bottom = world.platforms.find(
      (p) => Math.abs(p.y - rope.y2) < 2 && rope.x >= p.x && rope.x <= p.x + p.w,
    );
    if (top && bottom) {
      graph[bottom.id].push({
        from: bottom.id,
        to: top.id,
        type: 'rope',
        ropeId: rope.id,
        x: rope.x,
        direction: -1,
        cost: (rope.y2 - rope.y1) / 185 + 1,
      });
      graph[top.id].push({
        from: top.id,
        to: bottom.id,
        type: 'rope',
        ropeId: rope.id,
        x: rope.x,
        direction: 1,
        cost: (rope.y2 - rope.y1) / 185 + 1,
      });
    }
  }
  for (const from of world.platforms)
    for (const to of world.platforms) {
      if (from === to) continue;
      const rise = from.y - to.y;
      const overlapLeft = Math.max(from.x + 22, to.x + 22),
        overlapRight = Math.min(from.x + from.w - 22, to.x + to.w - 22);
      if (rise < 0 && overlapLeft <= overlapRight) {
        const x = (overlapLeft + overlapRight) / 2;
        const blocked = world.platforms.some(
          (p) => p !== from && p !== to && p.y > from.y && p.y < to.y && x >= p.x && x <= p.x + p.w,
        );
        if (!blocked)
          graph[from.id].push({
            from: from.id,
            to: to.id,
            type: 'drop',
            x,
            cost: 1 + Math.abs(rise) / 400,
          });
      }
      if (rise < 0 || rise > (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY) - 5) continue;
      const discriminant = JUMP_SPEED * JUMP_SPEED - 2 * GRAVITY * rise;
      if (discriminant < 0) continue;
      const flight = (JUMP_SPEED + Math.sqrt(discriminant)) / GRAVITY;
      let launchX, landX;
      if (to.x + 24 > from.x + from.w - 24) {
        launchX = from.x + from.w - 24;
        landX = to.x + 24;
      } else if (from.x + 24 > to.x + to.w - 24) {
        launchX = from.x + 24;
        landX = to.x + to.w - 24;
      } else {
        const left = Math.max(from.x + 24, to.x + 24),
          right = Math.min(from.x + from.w - 24, to.x + to.w - 24);
        launchX = landX = (left + right) / 2;
      }
      const distance = Math.abs(landX - launchX);
      if (distance <= MOVE_SPEED * flight - 15) {
        graph[from.id].push({
          from: from.id,
          to: to.id,
          type:
            rise === 0 && Math.max(to.x - (from.x + from.w), from.x - (to.x + to.w)) <= 0
              ? 'walk'
              : 'jump',
          x: launchX,
          landX,
          cost: 1 + flight + distance / MOVE_SPEED,
        });
      }
    }
  return graph;
}
export function findRoute(graph, from, to) {
  if (from === to) return [];
  if (!graph[from] || !graph[to]) return null;
  const distance = new Map([[from, 0]]),
    previous = new Map(),
    queue = new Set(Object.keys(graph));
  while (queue.size) {
    let node = null,
      best = Infinity;
    for (const id of queue)
      if ((distance.get(id) ?? Infinity) < best) {
        best = distance.get(id);
        node = id;
      }
    if (node === null) break;
    queue.delete(node);
    if (node === to) break;
    for (const edge of graph[node]) {
      const next = best + edge.cost;
      if (next < (distance.get(edge.to) ?? Infinity)) {
        distance.set(edge.to, next);
        previous.set(edge.to, edge);
      }
    }
  }
  if (!previous.has(to)) return null;
  const path = [];
  let at = to;
  while (at !== from) {
    const edge = previous.get(at);
    if (!edge) return null;
    path.unshift(edge);
    at = edge.from;
  }
  return path;
}

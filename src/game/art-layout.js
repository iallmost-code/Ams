/** Isolate integer source bounds; each runtime frame gets transparent sampling gutters. */
export function atlasCellBounds(width, height, columns, rows, col, row, gutter = 12) {
  const sx = Math.ceil((col * width) / columns) + 1,
    sy = Math.ceil((row * height) / rows) + 1;
  const sw = Math.floor(((col + 1) * width) / columns) - 1 - sx,
    sh = Math.floor(((row + 1) * height) / rows) - 1 - sy;
  return { sx, sy, sw, sh, gutter, width: sw + gutter * 2, height: sh + gutter * 2 };
}

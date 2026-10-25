import guardianUrl from '../assets/aurel.webp';
import motionUrl from '../assets/vanguard-motion.webp';
export const vanguardArt = { frames: [], image: null };
export function loadChapterArt() {
  if (vanguardArt.ready) return vanguardArt.ready;
  const image = new Image();
  vanguardArt.image = image;
  vanguardArt.ready = new Promise((resolve) => {
    image.onload = () => {
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 5; col++) {
          const sx = Math.ceil((col * image.width) / 5) + 2,
            sy = (row * image.height) / 4 + 2,
            sw = Math.floor(((col + 1) * image.width) / 5) - sx - 2,
            sh = image.height / 4 - 4;
          const tile = document.createElement('canvas');
          tile.width = sw;
          tile.height = sh;
          const t = tile.getContext('2d');
          t.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
          const data = t.getImageData(0, 0, sw, sh).data;
          let left = sw,
            right = 0,
            top = sh,
            bottom = 0;
          for (let y = 0; y < sh; y++)
            for (let x = 0; x < sw; x++)
              if (data[(y * sw + x) * 4 + 3] > 24) {
                left = Math.min(left, x);
                right = Math.max(right, x);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
              }
          const frame = document.createElement('canvas');
          frame.width = 330;
          frame.height = 280;
          if (right > left)
            frame
              .getContext('2d')
              .drawImage(
                tile,
                left,
                top,
                right - left + 1,
                bottom - top + 1,
                (330 - (right - left + 1)) / 2,
                266 - (bottom - top + 1),
                right - left + 1,
                bottom - top + 1,
              );
          vanguardArt.frames.push(frame);
        }
      resolve(true);
    };
    image.onerror = () => resolve(false);
  });
  image.src = motionUrl;
  return vanguardArt.ready;
}

export const guardianArt = new Image();
guardianArt.src = guardianUrl;

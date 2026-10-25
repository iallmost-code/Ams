import valleyUrl from './assets/mushroom-valley.webp';
import heroesUrl from './assets/adventurers.webp';
import creaturesUrl from './assets/creatures.webp';
import cavernUrl from './assets/crystal-cavern.webp';
import altarUrl from './assets/ember-altar.webp';
import pipUrl from './assets/pip.webp';
import skillsUrl from './assets/skills.png';
import { atlasCellBounds } from './game/art-layout.js';

function load(url, columns = 0, rows = 0, centered = false) {
  const image = new Image(),
    asset = { image, frames: [], gutter: 12 };
  asset.ready = new Promise((resolve) => {
    image.onload = () => {
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const b = atlasCellBounds(
            image.width,
            image.height,
            columns,
            rows,
            col,
            row,
            asset.gutter,
          );
          const frame = document.createElement('canvas');
          frame.width = b.width;
          frame.height = b.height;
          const c = frame.getContext('2d');
          c.imageSmoothingEnabled = false;
          c.drawImage(image, b.sx, b.sy, b.sw, b.sh, b.gutter, b.gutter, b.sw, b.sh);
          if (centered) {
            // Source files stay untouched. Align texture content once at load time.
            const rgba = c.getImageData(0, 0, frame.width, frame.height).data;
            let left = frame.width,
              top = frame.height,
              right = -1,
              bottom = -1;
            for (let y = 0; y < frame.height; y++)
              for (let x = 0; x < frame.width; x++)
                if (rgba[(y * frame.width + x) * 4 + 3] > 8) {
                  left = Math.min(left, x);
                  right = Math.max(right, x);
                  top = Math.min(top, y);
                  bottom = Math.max(bottom, y);
                }
            if (right >= left) {
              const aligned = document.createElement('canvas');
              aligned.width = frame.width;
              aligned.height = frame.height;
              const ac = aligned.getContext('2d'),
                w = right - left + 1,
                h = bottom - top + 1,
                scale = 0.8;
              ac.drawImage(
                frame,
                left,
                top,
                w,
                h,
                (frame.width - w * scale) / 2,
                (frame.height - h * scale) / 2,
                w * scale,
                h * scale,
              );
              asset.frames.push(aligned);
            } else asset.frames.push(frame);
          } else asset.frames.push(frame);
        }
      resolve(image);
    };
    image.onerror = () => resolve(null);
  });
  image.src = url;
  return asset;
}
export const valleyArt = load(valleyUrl),
  heroArt = load(heroesUrl, 4, 4),
  creatureArt = load(creaturesUrl, 4, 4),
  cavernArt = load(cavernUrl),
  altarArt = load(altarUrl),
  pipArt = load(pipUrl, 2, 2),
  skillArt = load(skillsUrl, 5, 4, true);
const assets = {
  background: valleyArt,
  heroes: heroArt,
  creatures: creatureArt,
  cavern: cavernArt,
  altar: altarArt,
  pip: pipArt,
  skills: skillArt,
};
export const artReady = Promise.all(Object.values(assets).map((asset) => asset.ready));
export function artStatus() {
  return Object.fromEntries(
    Object.entries(assets).map(([key, asset]) => [
      key,
      asset.image.complete && asset.image.naturalWidth > 0,
    ]),
  );
}

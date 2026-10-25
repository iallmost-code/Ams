import valleyUrl from './assets/mushroom-valley.webp';
import heroesUrl from './assets/adventurers.webp';
import creaturesUrl from './assets/creatures.webp';
import cavernUrl from './assets/crystal-cavern.webp';
import altarUrl from './assets/ember-altar.webp';
import pipUrl from './assets/pip.webp';
import skillsUrl from './assets/skills.webp';
import skillAtlas from './assets/skills.atlas.json';
import { atlasCellBounds } from './game/art-layout.js';

function load(url, columns = 0, rows = 0, grid = null) {
  const image = new Image(),
    asset = { image, frames: [], gutter: 12 };
  asset.ready = new Promise((resolve) => {
    image.onload = () => {
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const b = atlasCellBounds(
            grid ? grid.cellWidth * columns : image.width,
            grid ? grid.cellHeight * rows : image.height,
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
          c.drawImage(
            image,
            b.sx + (grid?.origin.x || 0),
            b.sy + (grid?.origin.y || 0),
            b.sw,
            b.sh,
            b.gutter,
            b.gutter,
            b.sw,
            b.sh,
          );
          asset.frames.push(frame);
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
  skillArt = load(skillsUrl, 5, 4, skillAtlas);
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

import valleyUrl from './assets/mushroom-valley.webp';
import heroesUrl from './assets/adventurers.webp';
import creaturesUrl from './assets/creatures.webp';

function load(url) {
  const image = new Image();
  const ready = new Promise((resolve) => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
  });
  image.src = url;
  return { image, ready };
}
export const valleyArt = load(valleyUrl);
export const heroArt = load(heroesUrl);
export const creatureArt = load(creaturesUrl);
export const artReady = Promise.all([valleyArt.ready, heroArt.ready, creatureArt.ready]);

export function artStatus() {
  return Object.fromEntries(
    Object.entries({ background: valleyArt, heroes: heroArt, creatures: creatureArt }).map(
      ([key, asset]) => [key, asset.image.complete && asset.image.naturalWidth > 0],
    ),
  );
}

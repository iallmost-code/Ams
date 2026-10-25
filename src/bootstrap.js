import { startLegacy } from './main.js';
import { startChapter } from './chapter/main.js';
if (new URLSearchParams(location.search).get('chapter') === 'vanguard') startChapter();
else startLegacy();

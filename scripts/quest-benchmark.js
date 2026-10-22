import {
  createGame,
  updateGame,
  toggleAutoQuest,
  getStoryView,
  getDailyView,
} from '../src/game/engine.js';
/** Unassisted starter-gear story run. No purchases, stat edits, clock jumps or death restarts. */
export function simulateQuestTrail(seconds = 2100) {
  const s = createGame();
  toggleAutoQuest(s);
  let gap = 0,
    maxObjectiveGap = 0,
    timeTo10 = null,
    firstThreeAt = null;
  const milestones = [];
  let lastCompleted = 0;
  for (let second = 1; second <= seconds; second++) {
    updateGame(s, {}, 1);
    const story = getStoryView(s),
      daily = getDailyView(s);
    gap =
      ['available', 'active', 'ready'].includes(story.status) || daily.status !== 'finished'
        ? 0
        : gap + 1;
    maxObjectiveGap = Math.max(maxObjectiveGap, gap);
    if (s.story.completed.length !== lastCompleted) {
      milestones.push({ second, quest: s.story.completed.at(-1), level: s.player.level });
      lastCompleted = s.story.completed.length;
    }
    if (firstThreeAt === null && lastCompleted >= 3) firstThreeAt = second;
    if (s.player.level >= 10) {
      timeTo10 = second;
      break;
    }
  }
  return {
    timeTo10,
    firstThreeAt,
    maxObjectiveGap,
    deaths: s.deaths,
    level: s.player.level,
    gladeCompleted: s.story.completed.filter((id) => id.startsWith('glade-')).length,
    dailyClaims: s.daily.claimed.length,
    dailyProgress: s.daily.progress,
    dailyStatus: getDailyView(s).status,
    storyStatus: s.story.status,
    milestones,
  };
}

const EDGES = ['jump', 'skill', 'skill2', 'skill3', 'skill4', 'interact', 'buff'];

/** A render clock that preserves tap edges while advancing stable physics steps. */
export function createFixedStepper(step, { stepSeconds = 1 / 120, maxFrameSeconds = 0.1 } = {}) {
  let accumulator = 0;
  let pending = {};
  return {
    advance(elapsed, input = {}) {
      for (const key of EDGES) if (input[key]) pending[key] = true;
      if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
      accumulator += Math.min(elapsed, maxFrameSeconds);
      let count = 0;
      while (accumulator + 1e-10 >= stepSeconds) {
        const sampled = { ...input };
        for (const key of EDGES) sampled[key] = Boolean(pending[key]);
        step(sampled, stepSeconds);
        pending = {};
        accumulator -= stepSeconds;
        count++;
      }
      return count;
    },
    reset() {
      accumulator = 0;
      pending = {};
    },
  };
}

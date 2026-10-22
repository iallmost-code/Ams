# Balance, mobile HUD and artwork revision

Implement the user's supplied checklist on a new branch into main. Bring forward the existing joystick, Pip and artwork commits because they are live but have not yet been merged into main. Never push this branch or build artifacts to gh-pages. Add a Pages workflow that publishes production artifacts only after a push to main; PR checks only validate.

1. Record the current production 844×390 and 390×844 layout and run a deterministic headless AUTO baseline. Add failing progression, boss danger, healing and economy regressions.
2. Centralize progression/rewards and balance values. Tune the XP curve against measured time to levels 10/25; raise area damage and mitigation needs, reduce Pip healing and add meaningful shop/upgrade sinks. Implement and validate boss warning/dodge windows, starter deaths and a 2–4 minute geared fight. Keep offline estimates aligned with actual rewards.
3. Move utility controls to a short-screen edge dock, compact skills and identity, add a persistent minimap toggle, ensure readable AUTO state and fit the complete forge interaction in short viewports. Cover actual pointer actions and geometry in browser checks.
4. Add original painted cavern/altar backgrounds and Pip sprites. Desaturate/soften scenery behind sharp terrain; render atlas cells with isolated padded sampling. Make damage, healing and gold text use contrasting colors and outlines.
5. Run all unit tests, build, production browser tests and standalone HTML check. Capture before/after screenshots for both phone orientations, commit screenshots and measured balance data, update README/QA. Push only the new source branch and open a PR to main with screenshots. No direct publishing.

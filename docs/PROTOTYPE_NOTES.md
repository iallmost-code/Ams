# Supplied prototypes and implementation decisions

The first complete HTML prototype establishes a side-scrolling character, slimes and mushrooms on grassy platforms, one rope, directional touch buttons, jump/attack and AUTO. Its screen-height-relative positions, first-match floor lookup, frame-based motion, random jumping and delayed multi-hit callbacks are replaced with world-space simulation and explicit entity lifecycle.

The second supplied reference is titled **AetherStory M: Chronicles of Aetheria**. It adds a minimap, quest tracker, class selection, four skill slots, six equipment slots, damage skins, a timing-based forge and several hunting grounds. Its source ends inside a function declaration, so a complete running engine is not present in that reference. The implemented game retains these product concepts, while using original art and names and shipping all dependencies locally.

External Tailwind, Font Awesome and Google Fonts calls are removed. Game physics and AI do not depend on canvas size, DOM state, browser frame rate or delayed timeout damage. Combat hit numbers represent actual HP changes. AUTO input is derived separately from manual held input, and cancelled pointers cannot leave movement held.

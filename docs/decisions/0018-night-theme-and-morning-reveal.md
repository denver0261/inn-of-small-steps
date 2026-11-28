# 0018: Night theme and the morning reveal

Date: 2026-11-28
Status: accepted (the flagged values are open for the players to change)

## Context

After M4 the game ran underneath, but the app still looked like a habit tracker: system fonts, white cards, and levels that arrived as a line of grey text. Kyle asked for the app to feel more like a game, loosely following the look of the serial's website (wanderinginn.com: a near-black slate-blue page, gold headings, an orange-gold accent, a Merriweather serif). Waking up is the game's reward moment (design pillar 2), and nothing on screen marked it.

## Decisions

**One night palette.** `src/ui.tsx` now has a single dark theme: slate-blue background `#171c26`, raised cards, candle gold `#f7a71b` for actions and progress, pale gold `#fcdca4` for titles, cream text, coral for errors. It's always dark, whatever the phone's setting: the game is set at night at the inn, and one palette is half the upkeep. The colors are borrowed loosely, and no logo, art or text from the site is used.

**Type.** Merriweather (SIL Open Font License, from `@expo-google-fonts/merriweather`) for titles, headings, System messages and the house's story. Everything you scan quickly (habits, buttons, numbers) stays in the system font. If the fonts fail to load, the app carries on in the system font.

**The System's window.** System messages sit in a blue-edged window with a soft glow. Level and class lines are gold, Skill lines pale gold, the rest the window's own color.

**Shared pieces.** `Title` gets a gold ornament rule, `Heading` is serif small caps with a rule, cards and buttons are squarer, and the scene text uses a new `Prose` component. Screens kept their structure; this PR changes how they look, not what they do.

**The morning reveal** (`app/morning.tsx`, a full-screen modal). The first time this phone sees a new morning (`shouldReveal`: the morning is dated yesterday or today, and is newer than the last one shown here), the tabs open it. The house name and date come first, then the System's lines type in one at a time. Each finished line gets a light haptic, Skills a medium one, and levels and classes a success haptic with a small swell. Then the class card appears and the level bar fills, then the scene fades in, then "Begin the day". Tapping anywhere shows everything at once. The last morning shown is kept in AsyncStorage per player, so each phone plays it once. Today has a "Replay the morning" button.

**New dependencies.** `expo-font`, `expo-haptics` (native, so `ios/` needs a fresh `expo prebuild`) and `@expo-google-fonts/merriweather`, all at SDK 58 versions past the 14-day release-age rule.

## Flagged values

| Value | Default | Why |
| --- | --- | --- |
| Theme | always dark | the game is set at night; a light mode can come back if you want one |
| Typing speed | 2 characters every 22 ms, 450 ms between lines | about 4 seconds for a typical 3-line morning |
| Reveal plays | once per phone per morning | your partner's phone plays it separately |

## Checked

In the iPhone 18 Pro Simulator: sign-in, setup's first step, Today, the System tab and the reveal (typing mid-line, the finished screen, "Begin the day", not reopening afterwards, and replay). The haptics can't be felt in the Simulator and are unverified until a phone build.

## Next

The Inn as the home screen (an illustrated house scene with upgrades and visitors in it), then feedback on logging a habit.

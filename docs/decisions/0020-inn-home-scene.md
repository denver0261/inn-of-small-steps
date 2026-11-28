# 0020: The Inn as the home screen

Date: 2026-11-28
Status: accepted

## Context

After the night theme (0018) and pixel characters (0019), the app still opened on Today, a list of habits. Design pillar 5 says the house is the meta-game, so it should be the first thing you see, and it should look like a place.

## Decisions

**The Inn tab comes first and is where the app opens.** Tabs are now Inn, Today, System, Habits and Chores. The old House tab became `/house`, a page pushed from the Inn ("Manage the house", or by tapping a visitor or the next upgrade), with a back button. That keeps five tabs instead of six, and the long house page (orders, rooms, crafting, invites) stays one tap away rather than being the home screen. After setup and after the morning, the app lands on the Inn.

**The scene.** An 80×60 pixel grid in the same style as the characters, composed by `composeInn(upgrades)`:
- **Background:** a night sky with stars and a moon, and a cobbled street.
- **The house:** you start with a run-down one (dark and boarded windows, one dim lamp upstairs).
- **Upgrades:** each adds its own pieces, drawn in ladder order.

| Upgrade | Adds |
| --- | --- |
| Working kitchen | a stone chimney with smoke, and the kitchen window lit |
| Training yard | a straw dummy |
| Supply shed | a shed by the house |
| Garden | plants in front of the shed |
| Guest room and the door | the upstairs and second downstairs window lit, and the front door framed in the Wandering Inn's blue |

The art is data in `packages/content/src/innArt.ts`, either rectangles or small text drawings with its own palette, so new upgrades or scenes are content.

**People.** The two of you stand on either side of the door (you on the left). If anyone is waiting with an offer, a hooded traveler stands at the right. Everyone bobs gently.

**Pixel size.** The scene scales to the card's width in whole device pixels (rounded down, then centered), so rows meet without seams on any phone.

**Below the scene:**
- the house's coins, supplies, mana and goodwill
- today's work (your habits logged today, glowing until they're all done)
- visitors at the door
- an outing, once you have a class
- the next upgrade, marked "Ready" when the house can afford it

## Checked

In the Simulator, with a run-down house plus kitchen and yard and a visitor waiting, and with every upgrade built. Tapping the visitor opens the house page, and the back button returns to the Inn. Tests check that every upgrade has art, that the full grid composes with valid colors, that the kitchen lights its window and the guest room turns the door blue, and the visitor's size.

## Next

Feedback when you log a habit (a stamp and an XP pop with a haptic). Later: recruits standing in the scene, and the house at different times of day.

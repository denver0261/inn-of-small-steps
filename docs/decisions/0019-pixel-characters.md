# 0019: Pixel characters

Date: 2026-11-28
Status: accepted (the flagged values are open for the players to change)

## Context

Kyle asked for sprites, with armor in mind ("if we get armor"). The design puts gear (padded armor, a crossbow, better packs) at Tier 2, in M5 after the playtest, and art was "not yet" in the MVP. Characters on screen make the two of you present in the game now, and whatever we pick has to take armor later.

## Decisions

**Original art, drawn as text.** Each character is a 16×20 grid written as rows of characters in `packages/content/src/sprites.ts`, one palette key per pixel. I chose this over a downloaded pack:
- **LPC** (Liberated Pixel Cup) has layered armor but is CC-BY-SA/GPL, which means credits and share-alike in a public repo.
- **Kenney's packs** are CC0 but bake gear into whole sprites, so armor can't be swapped.

Drawing our own needs no download or license, matches the night palette, and is content (a data file), as CLAUDE.md asks.

**Paper doll.** A character is the base body, recolored by the class outfit (cloth, belt, legs, boots), with the outfit's overlay rows on top. Gear will be more overlays drawn in order (armor, then helmet, then weapon), so armor needs no change to the renderer. `composeCharacter` throws on an unknown palette key, and tests compose every class, so a typo in the art fails CI.

**Outfits.** One per class path, plus plain clothes for an Earther before the first night:

| Class | Outfit |
| --- | --- |
| [Warrior] | red-brown, steel pauldrons, gold buckle |
| [Rider] | blue, red scarf |
| [Housekeeper] | sage, kerchief, apron |
| [Chef] | whites, toque, red neckerchief |
| [Monk] | saffron, prayer beads |
| [Mage] | purple robe, pointed hat |
| [Artisan] | tan, leather apron, hammer |
| [Bard] | red, feathered cap |
| [Druid] | green robe, leaf crown |

Evolved classes keep their base path's outfit for now.

**Rendering.** `PixelSprite` merges each row into runs of one color, about 5 views a row, with a ground shadow and a gentle idle bob (each character a beat apart). Characters stand on a `Stage`: a lamplit wall over floorboards, because a dark outline disappears on the near-black page.

**Where they show.**
- Today: the house's party (you first, then your housemate) under the title.
- The System tab: your character, larger, above your level bar.

## Flagged values

| Value | Default | Why |
| --- | --- | --- |
| Hair color | picked from 5 by player id | stable across phones until players can choose a look |
| Skin tone | one default | needs a player choice, not a guess; comes with a look picker |
| Evolved classes | wear the base outfit | evolutions are named by the System at night; outfits for them can follow |

## Checked

In the Simulator: Today with two characters (a [Rider] and a [Chef]) and the System tab at 6× scale. The other seven outfits are checked by tests (size and palette), not by eye.

## Next

The Inn as the home screen: a house scene where these characters stand, with built upgrades and visitors in it. Gear overlays come with M5.

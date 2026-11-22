import { ClassPath } from "@inn/schema";
import { z } from "zod";

/** The 9 base paths from docs/design.md, "Class paths". Everything past these is evolved. */
export const CLASS_PATHS: readonly ClassPath[] = z.array(ClassPath).parse([
  { id: "warrior", name: "[Warrior]", focusDomains: ["strength", "recovery"], blurb: "Lifting and the work of mending." },
  { id: "rider", name: "[Rider]", focusDomains: ["endurance"], blurb: "Long roads, early rides, steady miles." },
  { id: "housekeeper", name: "[Housekeeper]", focusDomains: ["home"], blurb: "Rooms set right, one chore at a time." },
  { id: "chef", name: "[Chef]", focusDomains: ["nourish"], blurb: "Good food, cooked at home." },
  { id: "monk", name: "[Monk]", focusDomains: ["recovery", "spirit"], blurb: "Patience, mobility, a quiet mind." },
  { id: "mage", name: "[Mage]", focusDomains: ["mind"], blurb: "Study, practice, dusty shelves." },
  { id: "artisan", name: "[Artisan]", focusDomains: ["craft"], blurb: "Building, fixing, making." },
  { id: "bard", name: "[Bard]", focusDomains: ["craft", "bonds"], blurb: "Songs, stories and shared tables." },
  { id: "druid", name: "[Druid]", focusDomains: ["spirit", "rest"], blurb: "Gardens, rest and quiet mornings." },
]);

export function classPath(id: string): ClassPath {
  const path = CLASS_PATHS.find((p) => p.id === id);
  if (!path) throw new Error(`unknown class path: ${id}`);
  return path;
}

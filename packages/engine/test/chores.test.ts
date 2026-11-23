import { describe, expect, it } from "vitest";
import type { Chore } from "@inn/schema";
import { checkOffChore, dueChores, dueDate, isDue, overdueDays } from "../src/index.ts";
import { MON } from "./fixtures.ts";

const chore = (over: Partial<Chore> = {}): Chore => ({
  id: "dishes",
  title: "Dishes",
  roomId: "kitchen",
  size: "normal",
  createdOn: MON,
  ...over,
});

describe("chore due dates", () => {
  it("a one-off chore is due from the day it was added until done", () => {
    expect(dueDate(chore())).toBe(MON);
    expect(dueDate(chore({ lastDoneOn: "2024-01-03" }))).toBeUndefined();
  });

  it("an every-N chore comes back N days after it was done", () => {
    const c = chore({ repeat: { kind: "every", days: 3 }, lastDoneOn: "2024-01-02" });
    expect(dueDate(c)).toBe("2024-01-05");
    expect(isDue(c, "2024-01-04")).toBe(false);
    expect(isDue(c, "2024-01-05")).toBe(true);
    expect(overdueDays(c, "2024-01-08")).toBe(3);
  });

  it("a weekly chore comes back on its next set day", () => {
    // Mondays and Thursdays.
    const c = chore({ repeat: { kind: "weekly", days: [0, 3] } });
    expect(dueDate(c)).toBe(MON);
    expect(dueDate({ ...c, lastDoneOn: MON })).toBe("2024-01-04");
    expect(dueDate({ ...c, lastDoneOn: "2024-01-05" })).toBe("2024-01-08");
  });

  it("is not overdue before or on its due day", () => {
    expect(overdueDays(chore(), MON)).toBe(0);
    expect(overdueDays(chore({ repeat: { kind: "every", days: 7 }, lastDoneOn: MON }), "2024-01-03")).toBe(0);
  });
});

describe("the chore list", () => {
  it("groups by room, most overdue first", () => {
    const chores = [
      chore({ id: "a", title: "Wipe counters", createdOn: "2024-01-05" }),
      chore({ id: "b", title: "Vacuum", roomId: "living", createdOn: "2024-01-01" }),
      chore({ id: "c", title: "Mop", createdOn: "2024-01-02" }),
      chore({ id: "d", title: "Not yet", repeat: { kind: "every", days: 7 }, lastDoneOn: "2024-01-05" }),
      chore({ id: "e", title: "Done", lastDoneOn: "2024-01-04" }),
    ];
    expect(dueChores(chores, "2024-01-06", ["living", "kitchen"]).map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(dueChores(chores, "2024-01-06").map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("checking off logs the chore at its size for whoever did it", () => {
    const { chore: done, log } = checkOffChore(chore({ size: "big", repeat: { kind: "every", days: 7 } }), "p2", "2024-01-03", "tidy");
    expect(done).toMatchObject({ lastDoneOn: "2024-01-03", lastDoneBy: "p2" });
    expect(dueDate(done)).toBe("2024-01-10");
    expect(log).toEqual({ habitId: "tidy", date: "2024-01-03", kind: "full", tier: "big", source: "tap", choreId: "dishes" });
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING as T } from "@inn/engine";
import type { Goal } from "@inn/schema";
import { buildBoard, canAddHabit, describeGoal, logWindowStart, percent } from "../src/game/board.ts";
import type { HabitInfo, LogInfo } from "../src/data/rows.ts";

const MON = "2024-01-01";
const habit = (id: string, extra: Partial<HabitInfo> = {}): HabitInfo => ({
  id,
  name: id,
  domain: "home",
  tier: "normal",
  tinyVersion: "a little",
  playerId: "p1",
  allowTap: true,
  ...extra,
});
const log = (habitId: string, date: string, id = `${habitId}-${date}`): LogInfo => ({
  id,
  playerId: "p1",
  habitId,
  date,
  kind: "full",
  source: "tap",
});
const daily = (habitId: string, extra: Partial<Goal> = {}): Goal => ({ habitId, period: "day", target: 1, startDate: MON, prescribed: false, ...extra });

describe("the Today board", () => {
  it("shows today's logs, consistency and weekly pace per habit", () => {
    const goals: Goal[] = [daily("tidy"), { habitId: "pt", period: "week", target: 3, startDate: MON, prescribed: true }];
    const logs = [log("tidy", MON), log("tidy", "2024-01-03"), log("pt", "2024-01-02"), log("pt", "2024-01-03")];
    const [tidy, pt] = buildBoard("2024-01-03", [habit("tidy"), habit("pt")], goals, [], logs, T);
    expect(tidy?.todaysLogs.map((l) => l.id)).toEqual(["tidy-2024-01-03"]);
    expect(tidy?.rate).toBeCloseTo(2 / 3);
    expect(tidy?.week).toBeUndefined();
    expect(pt?.week).toEqual({ done: 2, target: 3, daysLeft: 4, met: false });
  });

  it("marks a day goal done for today once its target is reached", () => {
    const goals: Goal[] = [daily("tidy"), daily("water", { target: 2 }), { habitId: "pt", period: "week", target: 1, startDate: MON, prescribed: false }];
    const logs = [log("tidy", MON), log("water", MON), log("pt", MON)];
    const [tidy, water, pt, eat] = buildBoard(MON, [habit("tidy"), habit("water"), habit("pt"), habit("eat")], [...goals, daily("eat")], [], logs, T);
    expect(tidy?.doneForToday).toBe(true);
    expect(water?.doneForToday).toBe(false);
    expect(pt?.doneForToday).toBe(false);
    expect(eat?.doneForToday).toBe(false);
  });

  it("marks rest days and paused days", () => {
    const weekdays = daily("tidy", { days: [0, 1, 2, 3, 4] });
    const [sat] = buildBoard("2024-01-06", [habit("tidy")], [weekdays], [], [], T);
    expect(sat?.scheduledToday).toBe(false);
    const [paused] = buildBoard(MON, [habit("tidy")], [daily("tidy")], [{ startDate: MON, endDate: MON }], [], T);
    expect(paused?.paused).toBe(true);
    expect(paused?.rate).toBeUndefined();
  });

  it("loads logs back to the window start or the week start, whichever is earlier", () => {
    expect(logWindowStart("2024-01-14", T)).toBe(MON);
    expect(logWindowStart("2024-01-21", T)).toBe("2024-01-08");
  });
});

describe("labels", () => {
  it("describes goals and rates", () => {
    expect(describeGoal(daily("x"))).toBe("every day");
    expect(describeGoal(daily("x", { days: [0, 2, 4] }))).toBe("Mon, Wed, Fri");
    expect(describeGoal({ habitId: "pt", period: "week", target: 3, startDate: MON, prescribed: true })).toBe("3x a week (prescribed)");
    expect(percent(undefined)).toBe("–");
    expect(percent(0.666)).toBe("67%");
  });

  it("limits habits to the open slots", () => {
    expect(canAddHabit(4, MON, MON, T)).toBe(true);
    expect(canAddHabit(5, MON, MON, T)).toBe(false);
    expect(canAddHabit(5, MON, "2024-01-15", T)).toBe(true);
  });
});

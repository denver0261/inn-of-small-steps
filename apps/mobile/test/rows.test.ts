import { describe, expect, it } from "vitest";
import { choreFromRow, choreToInsert, goalFromRow, goalToInsert, logFromRow, logToInsert, type Row } from "../src/data/rows.ts";

describe("row mapping", () => {
  it("round-trips a weekly chore", () => {
    const row: Row<"chores"> = {
      id: "c1",
      household_id: "h1",
      title: "Vacuum",
      room_id: "r1",
      size: "big",
      repeat_kind: "weekly",
      repeat_every_days: null,
      repeat_weekdays: [5],
      assignee: null,
      created_on: "2024-01-01",
      last_done_on: null,
      last_done_by: null,
      created_at: "2024-01-01T00:00:00Z",
    };
    const chore = choreFromRow(row);
    expect(chore).toEqual({ id: "c1", title: "Vacuum", roomId: "r1", size: "big", repeat: { kind: "weekly", days: [5] }, createdOn: "2024-01-01" });
    const { id: _, ...rest } = chore;
    expect(choreToInsert(rest)).toMatchObject({ repeat_kind: "weekly", repeat_weekdays: [5], repeat_every_days: null, assignee: null });
  });

  it("round-trips goals and logs, dropping nulls", () => {
    const goal = goalFromRow({
      id: "g1",
      habit_id: "h1",
      period: "day",
      target: 1,
      days: null,
      start_date: "2024-01-01",
      end_date: null,
      prescribed: false,
      created_at: "",
    });
    expect(goal).toEqual({ habitId: "h1", period: "day", target: 1, startDate: "2024-01-01", prescribed: false });
    expect(goalToInsert(goal)).toMatchObject({ days: null, end_date: null });

    const log = logFromRow({
      id: "l1",
      player_id: "p1",
      habit_id: "h1",
      date: "2024-01-02",
      kind: "full",
      tier: "big",
      source: "apple_health",
      health_workout_id: "w1",
      chore_id: null,
      performed_on: "2024-01-01",
      created_at: "",
    });
    expect(log).toEqual({ id: "l1", playerId: "p1", habitId: "h1", date: "2024-01-02", kind: "full", tier: "big", source: "apple_health", healthWorkoutId: "w1", performedOn: "2024-01-01" });
    expect(logToInsert(log)).toMatchObject({ chore_id: null, health_workout_id: "w1" });
  });

  it("rejects a row the schema doesn't allow", () => {
    expect(() =>
      goalFromRow({ id: "g", habit_id: "h", period: "month", target: 1, days: null, start_date: "2024-01-01", end_date: null, prescribed: false, created_at: "" }),
    ).toThrow();
  });
});

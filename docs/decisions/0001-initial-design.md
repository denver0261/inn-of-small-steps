# 0001: Initial design decisions

Date: 2026-11-22
Status: accepted

## Context
Starting the build from docs/design.md. These choices were made while designing and shape the first milestones.

## Decisions
- Standalone game, separate from Crossroads Inn. Two players first (Kyle and his wife); may open to friends later.
- Native iPhone app with Expo + TypeScript, Supabase backend. Both players use iPhone and Garmin watches.
- Workouts, steps and sleep come from Garmin Connect via Apple Health. Rides and lifting are never entered manually.
- Players are new Earthers in Liscor, sharing one house. Erin's inn is the hub.
- Each player picks a class path on day one; Kyle's wife has chosen [Chef]. Habits and chores flavor Skills; evolutions are generated from history.
- Rules engine computes all numbers; Claude only writes names, messages and story.
- Scope is Levels 1-10. Build M0-M2 and playtest for two weeks before anything else.

## Consequences
- packages/engine must be pure and fully tested; the simulator is the main balance check.
- Anything past Level 10 is parked in the design's "Later" section.

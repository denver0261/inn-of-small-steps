import {
  AuthorizationRequestStatus,
  getRequestStatusForAuthorization,
  isHealthDataAvailable,
  queryCategorySamples,
  queryWorkoutSamples,
  requestAuthorization,
  saveWorkoutSample,
  WorkoutActivityType,
} from "@kingstinct/react-native-healthkit";
import type { RawSleep, RawWorkout } from "./map.ts";

/** Workouts and sleep, read only. The app never asks for heart rate or other samples. */
const READ = ["HKWorkoutTypeIdentifier", "HKCategoryTypeIdentifierSleepAnalysis"] as const;
/** Development builds may also write a test ride, so the import can be tried in the Simulator. */
const SHARE = __DEV__ ? (["HKWorkoutTypeIdentifier"] as const) : ([] as const);

export function healthAvailable(): boolean {
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

/** Whether iOS still needs to show its permission sheet. */
export async function needsPermission(): Promise<boolean> {
  return (await getRequestStatusForAuthorization({ toRead: READ, toShare: SHARE })) === AuthorizationRequestStatus.shouldRequest;
}

/** Shows iOS's permission sheet. iOS never says whether reading was allowed; a denied read just returns nothing. */
export async function askPermission(): Promise<void> {
  await requestAuthorization({ toRead: READ, toShare: SHARE });
}

/** Everything since `since`: rides, lifts and sleep stages, as plain objects. */
export async function readSince(since: Date): Promise<{ workouts: RawWorkout[]; sleep: RawSleep[] }> {
  const date = { startDate: since, endDate: new Date() };
  const [w, s] = await Promise.all([
    queryWorkoutSamples({ limit: 0, filter: { date } }),
    queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", { limit: 0, filter: { date } }),
  ]);
  return {
    workouts: w.map((x) => ({
      uuid: x.uuid,
      workoutActivityType: x.workoutActivityType,
      startDate: x.startDate,
      endDate: x.endDate,
      duration: x.duration,
      totalDistance: x.totalDistance,
      sourceRevision: { source: { bundleIdentifier: x.sourceRevision.source.bundleIdentifier, name: x.sourceRevision.source.name } },
    })),
    sleep: s.map((x) => ({ startDate: x.startDate, endDate: x.endDate, value: Number(x.value) })),
  };
}

/** Development only: saves a ride of `minutes` ending now, to try the import in the Simulator. */
export async function saveTestRide(minutes: number): Promise<void> {
  if (!__DEV__) return;
  const end = new Date();
  await saveWorkoutSample(WorkoutActivityType.cycling, [], new Date(end.getTime() - minutes * 60_000), end);
}

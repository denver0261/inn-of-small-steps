import { Redirect } from "expo-router";
import { useSession } from "../src/session.tsx";
import { Loading } from "../src/ui.tsx";

/** Sends each player to the next step of day one, or to Today once set up. */
export default function Gate() {
  const { ready, session, player, household } = useSession();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!player) return <Redirect href="/setup/profile" />;
  if (!household) return <Redirect href="/setup/house" />;
  if (!player.class_path_id) return <Redirect href="/setup/path" />;
  return <Redirect href="/today" />;
}

import { Redirect, useLocalSearchParams } from "expo-router";

/** Invite links (innofsmallsteps://join?code=…) open the house step with the code filled in. */
export default function Join() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <Redirect href={{ pathname: "/setup/house", params: code ? { code } : {} }} />;
}

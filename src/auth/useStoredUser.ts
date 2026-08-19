import { useSyncExternalStore } from "react";
import {
  getStoredUserSnapshot,
  readStoredUser,
  subscribeToSession,
} from "./session";

export function useStoredUser() {
  const snapshot = useSyncExternalStore(
    subscribeToSession,
    getStoredUserSnapshot,
    getStoredUserSnapshot,
  );

  return readStoredUser(snapshot);
}

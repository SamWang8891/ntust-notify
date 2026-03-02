import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const DEFAULT_NOTIFY_PREFS = {
  email: false,
  discord: false,
  discordWebhook: "",
  discordTagMe: false,
  discordUserId: "",
  pollInterval: 60_000, // ms; enforced server-side (min 30 s for normal users, 1 s for auth)
};

/**
 * Reads and writes the user-level notification preferences stored at
 * users/{uid}.notifyPrefs in Firestore.
 */
export function useNotifyPrefs(uid) {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFY_PREFS);

  useEffect(() => {
    if (!uid) {
      setPrefs(DEFAULT_NOTIFY_PREFS);
      return;
    }

    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(ref, (snap) => {
      setPrefs({
        ...DEFAULT_NOTIFY_PREFS,
        ...(snap.data()?.notifyPrefs ?? {}),
      });
    });

    return unsub;
  }, [uid]);

  const savePrefs = useCallback(
    async (newPrefs) => {
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), { notifyPrefs: newPrefs });
    },
    [uid],
  );

  return { prefs, savePrefs };
}

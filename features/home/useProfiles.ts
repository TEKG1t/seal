import { useCallback, useState } from "react";
import { listProfiles, type JournalProfile } from "../repo/journal-repo";

export function useProfiles() {
  const [profiles, setProfiles] = useState<JournalProfile[]>([]);

  const loadProfiles = useCallback(async () => {
    setProfiles(await listProfiles());
  }, []);

  return { profiles, setProfiles, loadProfiles };
}

export default useProfiles;

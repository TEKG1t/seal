import { useCallback, useState } from "react";
import { listEvents, type JournalEvent } from "../repo/journal-repo";

export function useEvents(profileName: string | null) {
  const [events, setEvents] = useState<JournalEvent[]>([]);

  const loadEvents = useCallback(async () => {
    if (!profileName) {
      setEvents([]);
      return;
    }

    setEvents(await listEvents(profileName));
  }, [profileName]);

  return { events, setEvents, loadEvents };
}

export default useEvents;

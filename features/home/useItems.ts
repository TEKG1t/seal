import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useState } from "react";
import { getItemVideoUri } from "../items/journal-item-utils";
import {
    getEventStoragePaths,
    listItems,
    type JournalItem,
} from "../repo/journal-repo";

export function useItems(
  profileName: string | null,
  eventId: string | null,
  groupPath: string[],
) {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [selectedEventPath, setSelectedEventPath] = useState<string | null>(
    null,
  );
  const [videoThumbnailUris, setVideoThumbnailUris] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (profileName && eventId) {
      return;
    }

    setItems([]);
    setSelectedEventPath(null);
    setVideoThumbnailUris({});
  }, [eventId, profileName]);

  const loadItems = useCallback(async () => {
    if (!profileName || !eventId) {
      setItems([]);
      setSelectedEventPath(null);
      return;
    }

    const [nextItems, paths] = await Promise.all([
      listItems(profileName, eventId, groupPath),
      getEventStoragePaths(profileName, eventId),
    ]);

    setSelectedEventPath(paths.eventPath);
    setItems(nextItems);
  }, [eventId, groupPath, profileName]);

  useEffect(() => {
    let cancelled = false;

    const videoUris = Array.from(
      new Set(
        items
          .map((item) => getItemVideoUri(item, selectedEventPath))
          .filter((uri): uri is string => Boolean(uri)),
      ),
    );

    const missingUris = videoUris.filter((uri) => !videoThumbnailUris[uri]);

    if (missingUris.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const nextThumbnails: Record<string, string> = {};

      for (const uri of missingUris) {
        try {
          const result = await VideoThumbnails.getThumbnailAsync(uri, {
            time: 0,
          });
          nextThumbnails[uri] = result.uri;
        } catch {
          // keep a placeholder when thumbnail generation fails
        }
      }

      if (cancelled) {
        return;
      }

      if (Object.keys(nextThumbnails).length > 0) {
        setVideoThumbnailUris((current) => ({
          ...current,
          ...nextThumbnails,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, selectedEventPath, videoThumbnailUris]);

  return {
    items,
    setItems,
    selectedEventPath,
    videoThumbnailUris,
    loadItems,
  };
}

export default useItems;

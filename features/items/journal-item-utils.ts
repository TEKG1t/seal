import { type JournalItem } from "../repo/journal-repo";

export function itemCardLabel(item: JournalItem) {
  if (item.kind === "text") {
    return item.title?.trim() || item.text?.slice(0, 32) || "Text";
  }

  if (item.kind === "group") {
    return item.title?.trim() || "Group";
  }

  if (item.kind === "location") {
    return item.title?.trim() || "Location";
  }

  return item.title?.trim() || describeItemKind(item.media?.kind ?? item.kind);
}

export function describeItemKind(
  kind: JournalItem["kind"] | "image" | "video",
) {
  if (kind === "media") return "Media";
  if (kind === "media-with-comment") return "Media";
  if (kind === "image") return "Media";
  if (kind === "video") return "Media";
  if (kind === "group") return "Group";
  if (kind === "location") return "Location";
  return "Text";
}

export function getItemImageUris(
  item: JournalItem,
  selectedEventPath: string | null,
) {
  if (!selectedEventPath) {
    return [] as string[];
  }

  if (item.mediaFiles?.length) {
    return item.mediaFiles
      .filter((media) => media.kind === "image")
      .map((media) => `${selectedEventPath}/${media.fileName}`);
  }

  if (item.kind === "group") {
    return (
      item.groupItems
        ?.filter((entry) => entry.media?.kind === "image")
        .map((entry) => `${selectedEventPath}/${entry.media!.fileName}`) ?? []
    );
  }

  if (item.media?.kind === "image") {
    return [`${selectedEventPath}/${item.media.fileName}`];
  }

  return [] as string[];
}

export function getItemVideoUri(
  item: JournalItem,
  selectedEventPath: string | null,
) {
  if (!selectedEventPath) {
    return null;
  }

  if (item.kind === "group") {
    const nested = item.groupItems?.find(
      (entry) => entry.media?.kind === "video",
    );
    return nested?.media
      ? `${selectedEventPath}/${nested.media.fileName}`
      : null;
  }

  if (item.media?.kind === "video") {
    return `${selectedEventPath}/${item.media.fileName}`;
  }

  return null;
}

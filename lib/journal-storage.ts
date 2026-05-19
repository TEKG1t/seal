import * as FileSystem from "expo-file-system/legacy";

const APP_FOLDER_NAME = "photojournal";
const PROFILE_MANIFEST_NAME = "profile.json";
const EVENT_MANIFEST_NAME = "Items.json";

export type MediaKind = "image" | "video";
export type JournalItemKind =
  | "text"
  | "media"
  | "media-with-comment"
  | "group"
  | "location";

export type JournalProfile = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type JournalEvent = {
  id: string;
  profileId: string;
  profileName: string;
  title: string;
  date: string;
  folderName: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type JournalMediaRef = {
  fileName: string;
  kind: MediaKind;
  mimeType?: string;
};

export type LocationData = {
  latitude: number;
  longitude: number;
  zoom?: number;
  address?: string;
  title?: string;
  comment?: string;
};

export type JournalItem = {
  id: string;
  kind: JournalItemKind;
  order: number;
  createdAt: string;
  updatedAt: string;
  title?: string;
  text?: string;
  comment?: string;
  media?: JournalMediaRef;
  mediaFiles?: JournalMediaRef[];
  groupItems?: JournalItem[];
  location?: LocationData;
};

type JournalEventDocument = JournalEvent & {
  items: JournalItem[];
};

export type CreateProfileInput = {
  name: string;
};

export type CreateEventInput = {
  title: string;
  date: string;
};

export type AddTextItemInput = {
  title?: string;
  text: string;
  comment?: string;
};

export type AddMediaItemInput = {
  sourceUri?: string;
  sourceUris?: string[];
  kind: MediaKind;
  mimeType?: string;
  title?: string;
  comment?: string;
};

export type UpdateItemInput = {
  title?: string;
  text?: string;
  comment?: string;
  location?: LocationData;
};

export function getJournalRootPath() {
  return joinPath(FileSystem.documentDirectory ?? "", APP_FOLDER_NAME);
}

export function profileFolderName(name: string) {
  return slugify(name);
}

export function formatEventDisplayLabel(date: string, title: string) {
  return `${formatDateForDisplay(date)}: ${title}`;
}

export async function ensureJournalRoot() {
  await ensureDirectory(getJournalRootPath());
}

export async function createProfile(input: CreateProfileInput) {
  await ensureJournalRoot();

  const name = input.name.trim();
  if (!name) {
    throw new Error("Profile name is required.");
  }

  const slug = profileFolderName(name);
  const profilePath = getProfilePath(slug);
  await ensureDirectory(profilePath);

  const existing = await readJsonFile<JournalProfile | null>(
    joinPath(profilePath, PROFILE_MANIFEST_NAME),
    null,
  );
  const now = isoNow();
  const profile: JournalProfile = existing ?? {
    id: slug,
    name,
    slug,
    createdAt: now,
    updatedAt: now,
  };

  profile.name = name;
  profile.updatedAt = now;

  await writeJsonFile(joinPath(profilePath, PROFILE_MANIFEST_NAME), profile);
  return profile;
}

export async function listProfiles() {
  await ensureJournalRoot();

  const rootEntries = await readDirectorySafe(getJournalRootPath());
  const profiles: JournalProfile[] = [];

  for (const entry of rootEntries) {
    const profilePath = getProfilePath(entry);
    const profile = await readJsonFile<JournalProfile | null>(
      joinPath(profilePath, PROFILE_MANIFEST_NAME),
      null,
    );

    if (profile) {
      profiles.push(profile);
    }
  }

  return profiles.sort((left, right) => left.name.localeCompare(right.name));
}

export async function deleteProfile(profileName: string) {
  const profile = await createProfile({ name: profileName });
  const profilePath = getProfilePath(profile.slug);
  const info = await FileSystem.getInfoAsync(profilePath);

  if (info.exists) {
    await FileSystem.deleteAsync(profilePath, { idempotent: true });
  }
}

export async function renameProfile(profileName: string, nextName: string) {
  const profile = await createProfile({ name: profileName });
  const trimmedName = nextName.trim();

  if (!trimmedName) {
    throw new Error("Profile name is required.");
  }

  const nextSlug = profileFolderName(trimmedName);
  const currentProfilePath = getProfilePath(profile.slug);
  const nextProfilePath = getProfilePath(nextSlug);
  const now = isoNow();

  if (currentProfilePath !== nextProfilePath) {
    const nextExists = await pathExists(nextProfilePath);
    if (nextExists) {
      throw new Error("A profile with that name already exists.");
    }

    await FileSystem.moveAsync({
      from: currentProfilePath,
      to: nextProfilePath,
    });
  }

  const updatedProfile: JournalProfile = {
    ...profile,
    id: nextSlug,
    name: trimmedName,
    slug: nextSlug,
    updatedAt: now,
  };

  await writeJsonFile(
    joinPath(nextProfilePath, PROFILE_MANIFEST_NAME),
    updatedProfile,
  );

  const entries = await readDirectorySafe(nextProfilePath);
  for (const entry of entries) {
    if (entry === PROFILE_MANIFEST_NAME) {
      continue;
    }

    const eventManifestPath = getEventManifestPath(nextSlug, entry);
    const eventManifest = await readJsonFile<JournalEventDocument | null>(
      eventManifestPath,
      null,
    );

    if (!eventManifest) {
      continue;
    }

    await writeJsonFile(eventManifestPath, {
      ...eventManifest,
      profileId: updatedProfile.id,
      profileName: updatedProfile.name,
    });
  }

  return updatedProfile;
}

export async function deleteEvent(profileName: string, eventId: string) {
  const profile = await createProfile({ name: profileName });
  const eventPath = getEventPath(profile.slug, eventId);
  const info = await FileSystem.getInfoAsync(eventPath);

  if (info.exists) {
    await FileSystem.deleteAsync(eventPath, { idempotent: true });
  }
}

export async function exportProfile(profileName: string) {
  const profile = await createProfile({ name: profileName });
  const profilePath = getProfilePath(profile.slug);

  // Create ZIP in cache directory
  const cacheDir = FileSystem.cacheDirectory ?? "";
  const exportFileName = `${profile.slug}-${isoNow().replace(/[:.]/g, "-")}.zip`;
  const exportPath = joinPath(cacheDir, exportFileName);
  const zip = new SimpleZipArchive();

  await addFolderToZip(zip, profilePath, profile.slug);

  const zipData = (await zip.generateAsync({ type: "base64" })) as string;
  await FileSystem.writeAsStringAsync(exportPath, zipData, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Try StorageAccessFramework to save to user-chosen location (best for Android 11+)
  try {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        exportFileName,
        "application/zip",
      );

      await FileSystem.writeAsStringAsync(fileUri, zipData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return fileUri;
    }
  } catch {
    // StorageAccessFramework not available, return cache path
    console.warn("StorageAccessFramework not available");
  }

  return exportPath;
}

async function addFolderToZip(
  zip: SimpleZipArchive,
  folderPath: string,
  zipPrefix: string,
) {
  const entries = await readDirectorySafe(folderPath);

  for (const entry of entries) {
    const sourcePath = joinPath(folderPath, entry);
    const info = await FileSystem.getInfoAsync(sourcePath);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry}` : entry;

    if (info.isDirectory) {
      await addFolderToZip(zip, sourcePath, zipPath);
      continue;
    }

    const fileData = await FileSystem.readAsStringAsync(sourcePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    zip.file(zipPath, fileData, { base64: true });
  }
}

type SimpleZipFileInput = {
  base64?: boolean;
};

type SimpleZipGenerateOptions = {
  type: "base64" | "uint8array";
};

type SimpleZipEntry = {
  name: string;
  data: Uint8Array;
  crc32: number;
  localHeaderOffset: number;
  compressedSize: number;
  uncompressedSize: number;
};

class SimpleZipArchive {
  private entries: SimpleZipEntry[] = [];

  file(name: string, content: string, options?: SimpleZipFileInput) {
    const data = options?.base64
      ? base64ToBytes(content)
      : new TextEncoder().encode(content);

    this.entries.push({
      name: normalizeZipPath(name),
      data,
      crc32: crc32(data),
      localHeaderOffset: 0,
      compressedSize: data.length,
      uncompressedSize: data.length,
    });
  }

  async generateAsync(options: SimpleZipGenerateOptions) {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      entry.localHeaderOffset = offset;

      const nameBytes = encoder.encode(entry.name);
      const localHeader = new ArrayBuffer(30 + nameBytes.length);
      const localView = new DataView(localHeader);

      writeUint32(localView, 0, 0x04034b50);
      writeUint16(localView, 4, 20);
      writeUint16(localView, 6, 0);
      writeUint16(localView, 8, 0);
      writeUint16(localView, 10, 0);
      writeUint16(localView, 12, 0);
      writeUint32(localView, 14, entry.crc32);
      writeUint32(localView, 18, entry.compressedSize);
      writeUint32(localView, 22, entry.uncompressedSize);
      writeUint16(localView, 26, nameBytes.length);
      writeUint16(localView, 28, 0);

      const localHeaderBytes = new Uint8Array(localHeader);
      localHeaderBytes.set(nameBytes, 30);
      localParts.push(localHeaderBytes, entry.data);
      offset += localHeaderBytes.length + entry.data.length;
    }

    const centralDirectoryOffset = offset;

    for (const entry of this.entries) {
      const nameBytes = encoder.encode(entry.name);
      const centralHeader = new ArrayBuffer(46 + nameBytes.length);
      const centralView = new DataView(centralHeader);

      writeUint32(centralView, 0, 0x02014b50);
      writeUint16(centralView, 4, 20);
      writeUint16(centralView, 6, 20);
      writeUint16(centralView, 8, 0);
      writeUint16(centralView, 10, 0);
      writeUint16(centralView, 12, 0);
      writeUint16(centralView, 14, 0);
      writeUint32(centralView, 16, entry.crc32);
      writeUint32(centralView, 20, entry.compressedSize);
      writeUint32(centralView, 24, entry.uncompressedSize);
      writeUint16(centralView, 28, nameBytes.length);
      writeUint16(centralView, 30, 0);
      writeUint16(centralView, 32, 0);
      writeUint16(centralView, 34, 0);
      writeUint16(centralView, 36, 0);
      writeUint32(centralView, 38, 0);
      writeUint32(centralView, 42, entry.localHeaderOffset);

      const centralHeaderBytes = new Uint8Array(centralHeader);
      centralHeaderBytes.set(nameBytes, 46);
      centralParts.push(centralHeaderBytes);
      offset += centralHeaderBytes.length;
    }

    const centralDirectorySize = offset - centralDirectoryOffset;
    const endRecord = new ArrayBuffer(22);
    const endView = new DataView(endRecord);

    writeUint32(endView, 0, 0x06054b50);
    writeUint16(endView, 4, 0);
    writeUint16(endView, 6, 0);
    writeUint16(endView, 8, this.entries.length);
    writeUint16(endView, 10, this.entries.length);
    writeUint32(endView, 12, centralDirectorySize);
    writeUint32(endView, 16, centralDirectoryOffset);
    writeUint16(endView, 20, 0);

    const archive = concatBytes([
      ...localParts,
      ...centralParts,
      new Uint8Array(endRecord),
    ]);

    if (options.type === "uint8array") {
      return archive;
    }

    return bytesToBase64(archive);
  }
}

function normalizeZipPath(value: string) {
  return value.replace(/\\/g, "/");
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function base64ToBytes(input: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, "");
  const output: number[] = [];

  for (let index = 0; index < clean.length; index += 4) {
    const char1 = alphabet.indexOf(clean[index]);
    const char2 = alphabet.indexOf(clean[index + 1]);
    const char3 = alphabet.indexOf(clean[index + 2] ?? "=");
    const char4 = alphabet.indexOf(clean[index + 3] ?? "=");

    const byte1 = (char1 << 2) | (char2 >> 4);
    output.push(byte1 & 0xff);

    if (clean[index + 2] !== "=") {
      const byte2 = ((char2 & 15) << 4) | (char3 >> 2);
      output.push(byte2 & 0xff);
    }

    if (clean[index + 3] !== "=") {
      const byte3 = ((char3 & 3) << 6) | char4;
      output.push(byte3 & 0xff);
    }
  }

  return new Uint8Array(output);
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const byte3 = index + 2 < bytes.length ? bytes[index + 2] : 0;

    output += alphabet[byte1 >> 2];
    output += alphabet[((byte1 & 3) << 4) | (byte2 >> 4)];
    output +=
      index + 1 < bytes.length
        ? alphabet[((byte2 & 15) << 2) | (byte3 >> 6)]
        : "=";
    output += index + 2 < bytes.length ? alphabet[byte3 & 63] : "=";
  }

  return output;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

export async function createEvent(
  profileName: string,
  input: CreateEventInput,
) {
  const profile = await createProfile({ name: profileName });
  const title = input.title.trim();

  if (!title) {
    throw new Error("Event title is required.");
  }

  if (!isLocalDateString(input.date)) {
    throw new Error("Event date must use the YYYY-MM-DD format.");
  }

  const profilePath = getProfilePath(profile.slug);
  const folderBaseName = buildEventFolderName(input.date, title);
  const eventFolderName = await ensureUniqueFolderName(
    profilePath,
    folderBaseName,
  );
  const eventPath = joinPath(profilePath, eventFolderName);
  await ensureDirectory(eventPath);

  const now = isoNow();
  const event: JournalEventDocument = {
    id: eventFolderName,
    profileId: profile.id,
    profileName: profile.name,
    title,
    date: input.date,
    folderName: eventFolderName,
    createdAt: now,
    updatedAt: now,
    itemCount: 0,
    items: [],
  };

  await writeJsonFile(
    getEventManifestPath(profile.slug, eventFolderName),
    event,
  );
  return eventSummary(event);
}

export async function updateEvent(
  profileName: string,
  eventId: string,
  input: CreateEventInput,
) {
  const profile = await createProfile({ name: profileName });
  const manifest = await readJsonFile<JournalEventDocument | null>(
    getEventManifestPath(profile.slug, eventId),
    null,
  );

  if (!manifest) {
    throw new Error(
      `Event ${eventId} was not found for profile ${profile.name}.`,
    );
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Event title is required.");
  }

  if (!isLocalDateString(input.date)) {
    throw new Error("Event date must use the YYYY-MM-DD format.");
  }

  const currentEventPath = getEventPath(profile.slug, eventId);
  const nextBaseName = buildEventFolderName(input.date, title);
  const nextEventId =
    nextBaseName === eventId
      ? eventId
      : await ensureUniqueFolderName(
          getProfilePath(profile.slug),
          nextBaseName,
        );
  const nextEventPath = getEventPath(profile.slug, nextEventId);

  if (nextEventId !== eventId) {
    const nextExists = await pathExists(nextEventPath);
    if (nextExists) {
      throw new Error("An event with that name already exists.");
    }

    await FileSystem.moveAsync({
      from: currentEventPath,
      to: nextEventPath,
    });
  }

  const now = isoNow();
  const updatedManifest: JournalEventDocument = {
    ...manifest,
    id: nextEventId,
    folderName: nextEventId,
    title,
    date: input.date,
    profileId: profile.id,
    profileName: profile.name,
    updatedAt: now,
  };

  await writeJsonFile(
    getEventManifestPath(profile.slug, nextEventId),
    updatedManifest,
  );
  return eventSummary(updatedManifest);
}

export async function listEvents(profileName: string) {
  const profile = await createProfile({ name: profileName });
  const entries = await readDirectorySafe(getProfilePath(profile.slug));
  const events: JournalEvent[] = [];

  for (const entry of entries) {
    if (entry === PROFILE_MANIFEST_NAME) {
      continue;
    }

    const eventManifest = await readJsonFile<JournalEventDocument | null>(
      getEventManifestPath(profile.slug, entry),
      null,
    );
    if (eventManifest) {
      events.push(eventSummary(eventManifest));
    }
  }

  return events.sort((left, right) => {
    if (left.date === right.date) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return right.date.localeCompare(left.date);
  });
}

function getContainerItemsRef(
  manifest: JournalEventDocument,
  containerPath?: string[],
) {
  if (!containerPath || containerPath.length === 0)
    return { items: manifest.items };

  let refItems: JournalItem[] | undefined = manifest.items;
  for (const id of containerPath) {
    const found = refItems?.find(
      (it) => it.id === id && it.kind === "group",
    ) as JournalItem | undefined;
    if (!found) return null;
    if (!found.groupItems) found.groupItems = [];
    refItems = found.groupItems;
  }

  return { items: refItems! } as { items: JournalItem[] };
}

export async function listItems(
  profileName: string,
  eventId: string,
  containerPath?: string[],
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");
  return ref.items.sort((a, b) => a.order - b.order);
}

export async function addTextItem(
  profileName: string,
  eventId: string,
  containerPath: string[] | undefined,
  input: AddTextItemInput,
) {
  const manifest = await readEventManifest(profileName, eventId);
  const text = input.text.trim();

  if (!text) {
    throw new Error("Text item content is required.");
  }

  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const now = isoNow();
  const item: JournalItem = {
    id: createId("text"),
    kind: "text",
    order: ref.items.length,
    createdAt: now,
    updatedAt: now,
    title: input.title?.trim() || undefined,
    text,
    comment: input.comment?.trim() || undefined,
  };

  ref.items.push(item);
  await saveEventManifest(profileName, eventId, manifest);
  return item;
}

export async function addMediaItem(
  profileName: string,
  eventId: string,
  containerPath: string[] | undefined,
  input: AddMediaItemInput,
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const created: JournalItem[] = [];
  const now = isoNow();

  if (input.sourceUris && input.sourceUris.length) {
    for (const src of input.sourceUris) {
      const copiedFileName = await copyMediaIntoEventFolder(
        profileName,
        eventId,
        src,
        input.kind,
        input.mimeType,
      );
      const item: JournalItem = {
        id: createId(input.kind),
        kind: input.comment?.trim() ? "media-with-comment" : "media",
        order: ref.items.length + created.length,
        createdAt: now,
        updatedAt: now,
        title: input.title?.trim() || undefined,
        comment: input.comment?.trim() || undefined,
        media: {
          fileName: copiedFileName,
          kind: input.kind,
          mimeType: input.mimeType,
        },
      };
      created.push(item);
      ref.items.push(item);
    }
  } else if (input.sourceUri) {
    const copiedFileName = await copyMediaIntoEventFolder(
      profileName,
      eventId,
      input.sourceUri,
      input.kind,
      input.mimeType,
    );
    const item: JournalItem = {
      id: createId(input.kind),
      kind: input.comment?.trim() ? "media-with-comment" : "media",
      order: ref.items.length,
      createdAt: now,
      updatedAt: now,
      title: input.title?.trim() || undefined,
      comment: input.comment?.trim() || undefined,
      media: {
        fileName: copiedFileName,
        kind: input.kind,
        mimeType: input.mimeType,
      },
    };
    created.push(item);
    ref.items.push(item);
  }

  await saveEventManifest(profileName, eventId, manifest);
  return created[0];
}

export async function reorderItems(
  profileName: string,
  eventId: string,
  orderedItemIds: string[],
  containerPath?: string[],
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const itemMap = new Map(ref.items.map((item) => [item.id, item]));
  const reordered: JournalItem[] = [];

  for (const itemId of orderedItemIds) {
    const item = itemMap.get(itemId);
    if (item) {
      reordered.push(item);
      itemMap.delete(itemId);
    }
  }

  for (const item of ref.items) {
    if (itemMap.has(item.id)) {
      reordered.push(item);
    }
  }

  const now = isoNow();
  ref.items.splice(
    0,
    ref.items.length,
    ...reordered.map((item, index) => ({
      ...item,
      order: index,
      updatedAt: now,
    })),
  );

  manifest.updatedAt = now;
  manifest.itemCount = manifest.items.length;

  await saveEventManifest(profileName, eventId, manifest);
  return ref.items;
}

export async function deleteItem(
  profileName: string,
  eventId: string,
  itemId: string,
  containerPath?: string[],
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const item = ref.items.find((entry) => entry.id === itemId);
  if (!item) return ref.items;

  ref.items.splice(
    ref.items.findIndex((e) => e.id === itemId),
    1,
  );
  // reindex
  ref.items.forEach((entry, idx) => (entry.order = idx));

  // cleanup media files if present
  if (item.media) {
    await deleteFileIfExists(
      joinPath(getEventPath(profileName, eventId), item.media.fileName),
    );
  }

  await saveEventManifest(profileName, eventId, manifest);
  return ref.items;
}

export async function updateItem(
  profileName: string,
  eventId: string,
  itemId: string,
  containerPath: string[] | undefined,
  input: UpdateItemInput,
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const item = ref.items.find((entry) => entry.id === itemId);
  if (!item)
    throw new Error(`Item ${itemId} was not found for event ${eventId}.`);

  const now = isoNow();
  const nextTitle = input.title?.trim() || undefined;
  const nextText = input.text?.trim() || item.text || "";
  const nextComment = input.comment?.trim() || undefined;

  ref.items = ref.items.map((entry) => {
    if (entry.id !== itemId) return entry;

    if (entry.kind === "text") {
      return {
        ...entry,
        title: nextTitle,
        text: nextText,
        comment: nextComment,
        updatedAt: now,
      };
    }

    if (entry.kind === "location") {
      return {
        ...entry,
        title: nextTitle,
        comment: nextComment,
        location: input.location ?? entry.location,
        updatedAt: now,
      };
    }

    // media or media-with-comment
    return {
      ...entry,
      title: nextTitle,
      comment: nextComment,
      kind: nextComment ? "media-with-comment" : "media",
      updatedAt: now,
    };
  });

  await saveEventManifest(profileName, eventId, manifest);
  return ref.items;
}

export async function addGroupItem(
  profileName: string,
  eventId: string,
  containerPath: string[] | undefined,
  input: { title?: string; comment?: string },
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const now = isoNow();
  const item: JournalItem = {
    id: createId("group"),
    kind: "group",
    order: ref.items.length,
    createdAt: now,
    updatedAt: now,
    title: input.title?.trim() || undefined,
    comment: input.comment?.trim() || undefined,
    groupItems: [],
  };

  ref.items.push(item);
  await saveEventManifest(profileName, eventId, manifest);
  return item;
}

export async function addLocationItem(
  profileName: string,
  eventId: string,
  containerPath: string[] | undefined,
  input: LocationData,
) {
  const manifest = await readEventManifest(profileName, eventId);
  const ref = getContainerItemsRef(manifest, containerPath);
  if (!ref) throw new Error("Container path not found.");

  const now = isoNow();
  const item: JournalItem = {
    id: createId("location"),
    kind: "location",
    order: ref.items.length,
    createdAt: now,
    updatedAt: now,
    title: input.title || undefined,
    comment: input.comment || undefined,
    location: input,
  };

  ref.items.push(item);
  await saveEventManifest(profileName, eventId, manifest);
  return item;
}

export async function moveItem(
  profileName: string,
  eventId: string,
  itemId: string,
  fromPath: string[] | undefined,
  toPath: string[] | undefined,
) {
  const manifest = await readEventManifest(profileName, eventId);
  const fromRef = getContainerItemsRef(manifest, fromPath);
  const toRef = getContainerItemsRef(manifest, toPath);
  if (!fromRef || !toRef) throw new Error("Container path not found.");

  const idx = fromRef.items.findIndex((it) => it.id === itemId);
  if (idx === -1) throw new Error("Item not found in source container.");
  const [item] = fromRef.items.splice(idx, 1);
  item.order = toRef.items.length;
  toRef.items.push(item);

  await saveEventManifest(profileName, eventId, manifest);
  return item;
}

export async function getEventStoragePaths(
  profileName: string,
  eventId: string,
) {
  const profile = await createProfile({ name: profileName });
  const eventPath = getEventPath(profile.slug, eventId);

  return {
    profilePath: getProfilePath(profile.slug),
    eventPath,
    itemsPath: joinPath(eventPath, EVENT_MANIFEST_NAME),
  };
}

async function readEventManifest(profileName: string, eventId: string) {
  const profile = await createProfile({ name: profileName });
  const manifest = await readJsonFile<JournalEventDocument | null>(
    getEventManifestPath(profile.slug, eventId),
    null,
  );

  if (!manifest) {
    throw new Error(
      `Event ${eventId} was not found for profile ${profile.name}.`,
    );
  }

  manifest.items.sort((left, right) => left.order - right.order);
  return manifest;
}

async function saveEventManifest(
  profileName: string,
  eventId: string,
  manifest: JournalEventDocument,
) {
  const profile = await createProfile({ name: profileName });
  const now = isoNow();
  const normalizedItems = manifest.items
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({
      ...item,
      order: index,
    }));

  const nextManifest: JournalEventDocument = {
    ...manifest,
    profileId: profile.id,
    profileName: profile.name,
    id: eventId,
    folderName: eventId,
    itemCount: normalizedItems.length,
    updatedAt: now,
    items: normalizedItems,
  };

  await writeJsonFile(
    getEventManifestPath(profile.slug, eventId),
    nextManifest,
  );
}

async function copyMediaIntoEventFolder(
  profileName: string,
  eventId: string,
  sourceUri: string,
  kind: MediaKind,
  mimeType?: string,
) {
  const profile = await createProfile({ name: profileName });
  const eventPath = getEventPath(profile.slug, eventId);
  await ensureDirectory(eventPath);

  const extension = extensionFromSource(sourceUri, mimeType, kind);
  const fileName = `${createId(kind)}.${extension}`;
  await FileSystem.copyAsync({
    from: sourceUri,
    to: joinPath(eventPath, fileName),
  });
  return fileName;
}

async function ensureDirectory(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function ensureUniqueFolderName(parentPath: string, folderName: string) {
  let candidate = folderName;
  let counter = 2;

  while (await pathExists(joinPath(parentPath, candidate))) {
    candidate = `${folderName}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function readDirectorySafe(path: string) {
  try {
    return await FileSystem.readDirectoryAsync(path);
  } catch {
    return [] as string[];
  }
}

async function deleteFileIfExists(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

async function pathExists(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

async function readJsonFile<T>(path: string, fallback: T) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    return fallback;
  }

  const raw = await FileSystem.readAsStringAsync(path);
  return JSON.parse(raw) as T;
}

async function writeJsonFile(path: string, value: unknown) {
  await ensureDirectory(path.slice(0, path.lastIndexOf("/")));
  await FileSystem.writeAsStringAsync(path, JSON.stringify(value, null, 2));
}

function getProfilePath(profileSlug: string) {
  return joinPath(getJournalRootPath(), profileSlug);
}

function getEventPath(profileSlug: string, eventId: string) {
  return joinPath(getProfilePath(profileSlug), eventId);
}

function getEventManifestPath(profileSlug: string, eventId: string) {
  return joinPath(getEventPath(profileSlug, eventId), EVENT_MANIFEST_NAME);
}

function eventSummary(manifest: JournalEventDocument): JournalEvent {
  return {
    id: manifest.id,
    profileId: manifest.profileId,
    profileName: manifest.profileName,
    title: manifest.title,
    date: manifest.date,
    folderName: manifest.folderName,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    itemCount: manifest.items.length,
  };
}

function joinPath(...parts: string[]) {
  return parts.filter(Boolean).reduce((accumulator, part) => {
    if (!accumulator) {
      return part.replace(/\/+$/, "");
    }

    return `${accumulator.replace(/\/+$/, "")}/${part.replace(/^\/+/, "")}`;
  }, "");
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "profile"
  );
}

function buildEventFolderName(date: string, title: string) {
  return `${compactDateKey(date)}${slugify(title).replace(/-/g, "")}`;
}

function compactDateKey(date: string) {
  const [year, month, day] = date.split("-");
  return `${year.slice(2)}${month}${day}`;
}

function formatDateForDisplay(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year.slice(2)}`;
}

function isLocalDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function extensionFromSource(
  sourceUri: string,
  mimeType: string | undefined,
  kind: MediaKind,
) {
  const fileName = sourceUri.split("/").pop() ?? "";
  const extensionFromName = fileName.includes(".")
    ? fileName.split(".").pop()
    : "";

  if (extensionFromName) {
    return extensionFromName.toLowerCase();
  }

  if (mimeType) {
    const [, subtype] = mimeType.split("/");
    if (subtype) {
      return subtype.toLowerCase().replace("jpeg", "jpg");
    }
  }

  return kind === "video" ? "mp4" : "jpg";
}

function isoNow() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

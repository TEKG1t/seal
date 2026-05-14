import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";

import {
  addMediaItem,
  addTextItem,
  createEvent,
  createProfile,
  deleteEvent,
  deleteItem,
  deleteProfile,
  exportProfile,
  getEventStoragePaths,
  JournalEvent,
  JournalItem,
  JournalProfile,
  listEvents,
  listItems,
  listProfiles,
  renameProfile,
  reorderItems,
  updateEvent,
  updateItem,
} from "@/lib/journal-storage";

type ScreenLevel = "home" | "profile" | "event";
type ItemCreateKind = "text" | "image" | "video";

type Palette = {
  bg: string;
  card: string;
  cardMuted: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  danger: string;
  overlay: string;
};

const palette: Palette = {
  bg: "#10141b",
  card: "#1b2332",
  cardMuted: "#242f42",
  border: "#334155",
  text: "#f3f6fb",
  textMuted: "#9caac0",
  accent: "#4dd2c4",
  danger: "#f87171",
  overlay: "rgba(2, 6, 12, 0.82)",
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const contentWidth = Math.min(width - 24, 940);

  const [screen, setScreen] = useState<ScreenLevel>("home");
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<JournalProfile[]>([]);
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [items, setItems] = useState<JournalItem[]>([]);

  const [selectedProfile, setSelectedProfile] = useState<JournalProfile | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<JournalEvent | null>(null);
  const [selectedEventPath, setSelectedEventPath] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportPlaceholder, setShowImportPlaceholder] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [newProfileName, setNewProfileName] = useState("");
  const [profileBeingEdited, setProfileBeingEdited] = useState<JournalProfile | null>(null);
  const [eventBeingEdited, setEventBeingEdited] = useState<JournalEvent | null>(null);
  const [itemBeingEdited, setItemBeingEdited] = useState<JournalItem | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(todayIsoDate());

  const [newItemKind, setNewItemKind] = useState<ItemCreateKind>("text");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [newItemComment, setNewItemComment] = useState("");

  const [profileToDelete, setProfileToDelete] = useState<JournalProfile | null>(null);
  const [eventToDelete, setEventToDelete] = useState<JournalEvent | null>(null);
  const [itemToDelete, setItemToDelete] = useState<JournalItem | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const screenLabel = useMemo(() => {
    if (screen === "home") {
      return { title: "Home" };
    }

    if (screen === "profile" && selectedProfile) {
      return { title: selectedProfile.name };
    }

    if (screen === "event" && selectedEvent) {
      return { title: selectedEvent.title, subtitle: formatDate(selectedEvent.date) };
    }

    return { title: "Home" };
  }, [screen, selectedEvent, selectedProfile]);

  const loadProfiles = useCallback(async () => {
    setProfiles(await listProfiles());
  }, []);

  const loadEvents = useCallback(async () => {
    if (!selectedProfile) {
      setEvents([]);
      return;
    }

    setEvents(await listEvents(selectedProfile.name));
  }, [selectedProfile]);

  const loadItems = useCallback(async () => {
    if (!selectedProfile || !selectedEvent) {
      setItems([]);
      return;
    }

    const [nextItems, paths] = await Promise.all([
      listItems(selectedProfile.name, selectedEvent.id),
      getEventStoragePaths(selectedProfile.name, selectedEvent.id),
    ]);

    setSelectedEventPath(paths.eventPath);
    setItems(nextItems);
  }, [selectedEvent, selectedProfile]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadProfiles();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadProfiles]);

  useEffect(() => {
    if (screen === "profile") {
      loadEvents().catch(() => undefined);
    }
  }, [loadEvents, screen]);

  useEffect(() => {
    if (screen === "event") {
      loadItems().catch(() => undefined);
    }
  }, [loadItems, screen]);

  const onBack = () => {
    if (screen === "event") {
      setScreen("profile");
      setSelectedEvent(null);
      setSelectedEventPath(null);
      return;
    }

    if (screen === "profile") {
      setScreen("home");
      setSelectedProfile(null);
      setSelectedEvent(null);
      setSelectedEventPath(null);
    }
  };

  const openCreateModal = () => setShowCreateModal(true);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setProfileBeingEdited(null);
    setEventBeingEdited(null);
    setItemBeingEdited(null);
    setShowImportPlaceholder(false);
    setNewProfileName("");
    setNewEventName("");
    setNewEventDate(todayIsoDate());
    setNewItemKind("text");
    setNewItemTitle("");
    setNewItemText("");
    setNewItemComment("");
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProfileToDelete(null);
    setEventToDelete(null);
    setItemToDelete(null);
    setDeleteConfirmName("");
  };

  const submitCreate = async () => {
    if (screen === "home") {
      const name = newProfileName.trim();
      if (!name) return;

      if (profileBeingEdited) {
        await renameProfile(profileBeingEdited.name, name);
      } else {
        await createProfile({ name });
      }

      await loadProfiles();
      closeCreateModal();
      return;
    }

    if (screen === "profile" && selectedProfile) {
      const title = newEventName.trim();
      if (!title || !isValidLocalDate(newEventDate)) return;

      if (eventBeingEdited) {
        await updateEvent(selectedProfile.name, eventBeingEdited.id, { title, date: newEventDate });
      } else {
        await createEvent(selectedProfile.name, { title, date: newEventDate });
      }

      await loadEvents();
      closeCreateModal();
      return;
    }

    if (screen === "event" && selectedProfile && selectedEvent) {
      if (itemBeingEdited) {
        const title = newItemTitle.trim() || undefined;

        if (itemBeingEdited.kind === "text") {
          const text = newItemText.trim();
          if (!text) return;

          await updateItem(selectedProfile.name, selectedEvent.id, itemBeingEdited.id, {
            title,
            text,
            comment: newItemComment.trim() || undefined,
          });
        } else {
          await updateItem(selectedProfile.name, selectedEvent.id, itemBeingEdited.id, {
            title,
            comment: newItemComment.trim() || undefined,
          });
        }

        await loadItems();
        closeCreateModal();
        return;
      }

      if (newItemKind === "text") {
        const text = newItemText.trim();
        if (!text) return;

        await addTextItem(selectedProfile.name, selectedEvent.id, {
          title: newItemTitle.trim() || undefined,
          text,
          comment: newItemComment.trim() || undefined,
        });
        await loadItems();
        closeCreateModal();
        return;
      }

      const mediaResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          newItemKind === "image" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (mediaResult.canceled || !mediaResult.assets[0]) return;

      const asset = mediaResult.assets[0];
      await addMediaItem(selectedProfile.name, selectedEvent.id, {
        sourceUri: asset.uri,
        kind: newItemKind,
        mimeType: asset.mimeType,
        title: newItemTitle.trim() || undefined,
        comment: newItemComment.trim() || undefined,
      });
      await loadItems();
      closeCreateModal();
    }
  };

  const startDeleteProfile = (profile: JournalProfile) => {
    setProfileToDelete(profile);
    setDeleteConfirmName("");
    setShowDeleteModal(true);
  };

  const startEditProfile = (profile: JournalProfile) => {
    setProfileBeingEdited(profile);
    setNewProfileName(profile.name);
    setShowCreateModal(true);
  };

  const handleExportProfile = async (profile: JournalProfile) => {
    const path = await exportProfile(profile.name);
    setExportNotice(`Export saved to ${path}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const submitDeleteProfile = async () => {
    if (!profileToDelete || deleteConfirmName.trim() !== profileToDelete.name) return;

    await deleteProfile(profileToDelete.name);
    await loadProfiles();
    setSelectedProfile(null);
    setSelectedEvent(null);
    setSelectedEventPath(null);
    closeDeleteModal();
  };

  const startDeleteEvent = (event: JournalEvent) => {
    setEventToDelete(event);
    setDeleteConfirmName("");
    setShowDeleteModal(true);
  };

  const startEditEvent = (event: JournalEvent) => {
    setEventBeingEdited(event);
    setNewEventName(event.title);
    setNewEventDate(event.date);
    setShowCreateModal(true);
  };

  const submitDeleteEvent = async () => {
    if (!eventToDelete || !selectedProfile || deleteConfirmName.trim() !== eventToDelete.title) return;

    await deleteEvent(selectedProfile.name, eventToDelete.id);
    await loadEvents();
    setSelectedEvent(null);
    setSelectedEventPath(null);
    setScreen("profile");
    closeDeleteModal();
  };

  const startDeleteItem = (item: JournalItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const startEditItem = (item: JournalItem) => {
    setItemBeingEdited(item);
    setNewItemKind(item.kind === "text" ? "text" : item.media?.kind ?? "text");
    setNewItemTitle(item.title ?? "");
    setNewItemText(item.text ?? "");
    setNewItemComment(item.comment ?? "");
    setShowCreateModal(true);
  };

  const submitDeleteItem = async () => {
    if (!itemToDelete || !selectedProfile || !selectedEvent) return;

    await deleteItem(selectedProfile.name, selectedEvent.id, itemToDelete.id);
    await loadItems();
    closeDeleteModal();
  };

  const openProfile = (profile: JournalProfile) => {
    setSelectedProfile(profile);
    setScreen("profile");
  };

  const openEvent = (event: JournalEvent) => {
    setSelectedEvent(event);
    setScreen("event");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}> 
      <View style={[styles.topGlow, { backgroundColor: "#0f2f3a" }]} />

      <View style={[styles.header, { borderBottomColor: palette.border, paddingTop: statusBarHeight + 8 }]}> 
        <View style={styles.headerSide}>
          {screen === "home" ? null : (
            <Pressable onPress={onBack} style={({ pressed }) => [styles.iconButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
              <MaterialIcons name="arrow-back" size={20} color={palette.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.headerCenter}>
          {screenLabel.subtitle ? (
            <>
              <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>{screenLabel.subtitle}</Text>
              <Text style={[styles.headerTitleEvent, { color: palette.text }]} numberOfLines={1}>{screenLabel.title}</Text>
            </>
          ) : (
            <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>{screenLabel.title}</Text>
          )}
        </View>

        <View style={styles.headerSide}>
          <Pressable onPress={openCreateModal} style={({ pressed }) => [styles.iconButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
            <MaterialIcons name="add" size={22} color={palette.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {exportNotice ? (
          <View style={styles.exportToast}>
            <Text style={{ color: palette.text }}>{exportNotice}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>Loading...</Text>
          </View>
        ) : (
          <View style={{ width: contentWidth, flex: 1 }}>
            {screen === "home" ? (
              <FlatList
                data={profiles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={[styles.profileCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
                    <Pressable onPress={() => openProfile(item)} style={({ pressed }) => [styles.profileMain, pressed && styles.pressed]} hitSlop={6}>
                      <Text style={[styles.profileName, { color: palette.text }]}>{item.name}</Text>
                      <Text style={[styles.profileDate, { color: palette.textMuted }]}>created {formatDate(item.createdAt.slice(0, 10))}</Text>
                    </Pressable>

                    <View style={styles.profileActions}>
                      <Pressable onPress={() => handleExportProfile(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                        <MaterialIcons name="archive" size={20} color={palette.text} />
                      </Pressable>
                      <Pressable onPress={() => startEditProfile(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                        <MaterialIcons name="edit" size={20} color={palette.accent} />
                      </Pressable>
                      <Pressable onPress={() => startDeleteProfile(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                        <MaterialIcons name="delete-outline" size={22} color={palette.danger} />
                      </Pressable>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: palette.textMuted }]}>No profiles yet. Press + to create one.</Text></View>}
              />
            ) : null}

            {screen === "profile" ? (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={[styles.eventCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
                    <Pressable onPress={() => openEvent(item)} style={({ pressed }) => [styles.eventMain, pressed && styles.pressed]}>
                      <Text style={[styles.eventDate, { color: palette.textMuted }]}>{formatDate(item.date)}</Text>
                      <Text style={[styles.eventTitle, { color: palette.text }]}>{item.title}</Text>
                      <Text style={[styles.eventMeta, { color: palette.textMuted }]}>{item.itemCount} items</Text>
                    </Pressable>

                    <View style={styles.profileActions}>
                      <Pressable onPress={() => startEditEvent(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                        <MaterialIcons name="edit" size={20} color={palette.accent} />
                      </Pressable>
                      <Pressable onPress={() => startDeleteEvent(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                        <MaterialIcons name="delete-outline" size={22} color={palette.danger} />
                      </Pressable>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: palette.textMuted }]}>No events yet. Press + to create one.</Text></View>}
              />
            ) : null}

            {screen === "event" ? (
              <DraggableFlatList<JournalItem>
                data={[...items].sort((left, right) => left.order - right.order)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                activationDistance={8}
                onDragEnd={({ data }) => {
                  if (!selectedProfile || !selectedEvent) return;

                  const normalized = data.map((entry, index) => ({ ...entry, order: index }));
                  setItems(normalized);
                  reorderItems(selectedProfile.name, selectedEvent.id, normalized.map((entry) => entry.id)).catch(() => undefined);
                }}
                renderItem={({ item, drag, isActive }) => (
                  <View style={[styles.itemCard, { backgroundColor: palette.card, borderColor: palette.border, opacity: isActive ? 0.9 : 1 }]}>
                    <Pressable onLongPress={drag} delayLongPress={120} style={styles.itemTopRow}>
                      <Text style={[styles.itemTitle, { color: palette.text }]}>{itemCardLabel(item)}</Text>
                      <View style={styles.profileActions}>
                        <Pressable onPress={() => startEditItem(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                          <MaterialIcons name="edit" size={20} color={palette.accent} />
                        </Pressable>
                        <Pressable onPress={() => startDeleteItem(item)} style={({ pressed }) => [styles.trashButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                          <MaterialIcons name="delete-outline" size={18} color={palette.danger} />
                        </Pressable>
                      </View>
                    </Pressable>

                    {item.text ? <Text style={[styles.itemBody, { color: palette.text }]}>{item.text}</Text> : null}
                    {item.comment ? <Text style={[styles.itemComment, { color: palette.textMuted }]}>{item.comment}</Text> : null}

                    {item.media?.kind === "image" && selectedEventPath ? (
                      <Image source={{ uri: `${selectedEventPath}/${item.media.fileName}` }} style={styles.itemImage} contentFit="cover" />
                    ) : null}

                    {item.media?.kind === "video" ? (
                      <View style={[styles.videoBadge, { borderColor: palette.border, backgroundColor: palette.cardMuted }]}>
                        <MaterialIcons name="videocam" size={18} color={palette.textMuted} />
                        <Text style={[styles.videoBadgeText, { color: palette.textMuted }]}>{item.media.fileName}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
                ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: palette.textMuted }]}>No items yet. Press + to add one.</Text></View>}
              />
            ) : null}
          </View>
        )}
      </View>

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={closeCreateModal}>
        <View style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}> 
              {screen === "home"
                ? profileBeingEdited
                  ? "Edit Profile"
                  : "Create Profile"
                : screen === "profile"
                  ? eventBeingEdited
                    ? "Edit Event"
                    : "Create Event"
                  : itemBeingEdited
                    ? "Edit Item"
                    : "Create Item"}
            </Text>

            {screen === "home" ? (
              <>
                <TextInput value={newProfileName} onChangeText={setNewProfileName} placeholder="Profile name (e.g. Trips)" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />

                <Pressable onPress={() => setShowImportPlaceholder((value) => !value)} style={({ pressed }) => [styles.modalButton, { borderColor: palette.border, backgroundColor: palette.cardMuted, alignSelf: "flex-start" }, pressed && styles.pressed]}>
                  <Text style={{ color: palette.text, fontWeight: "700" }}>Import Profile</Text>
                </Pressable>

                {showImportPlaceholder ? <Text style={[styles.helperText, { color: palette.textMuted }]}>Import is not implemented yet.</Text> : null}
              </>
            ) : null}

            {screen === "profile" ? (
              <>
                <TextInput value={newEventName} onChangeText={setNewEventName} placeholder="Event name (e.g. Norway)" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
                <TextInput value={newEventDate} onChangeText={setNewEventDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
              </>
            ) : null}

            {screen === "event" && !itemBeingEdited ? (
              <>
                <TextInput value={newItemTitle} onChangeText={setNewItemTitle} placeholder="Optional item title" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />

                <View style={styles.itemTypeRow}>
                  {(["text", "image", "video"] as ItemCreateKind[]).map((kind) => (
                    <Pressable key={kind} onPress={() => setNewItemKind(kind)} style={({ pressed }) => [styles.itemTypeButton, { borderColor: palette.border, backgroundColor: newItemKind === kind ? palette.accent : palette.cardMuted }, pressed && styles.pressed]}>
                      <Text style={{ color: newItemKind === kind ? "#03221d" : palette.text, fontWeight: "700", textTransform: "capitalize" }}>{kind}</Text>
                    </Pressable>
                  ))}
                </View>

                {newItemKind === "text" ? (
                  <TextInput value={newItemText} onChangeText={setNewItemText} placeholder="Text content" placeholderTextColor={palette.textMuted} multiline style={[styles.input, styles.multilineInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
                ) : (
                  <Text style={[styles.helperText, { color: palette.textMuted }]}>Press save to pick a {newItemKind} from your gallery.</Text>
                )}

                <TextInput value={newItemComment} onChangeText={setNewItemComment} placeholder="Optional comment" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
              </>
            ) : null}

            {screen === "event" && itemBeingEdited ? (
              <>
                <TextInput value={newItemTitle} onChangeText={setNewItemTitle} placeholder="Optional item title" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />

                {itemBeingEdited.kind === "text" ? (
                  <TextInput value={newItemText} onChangeText={setNewItemText} placeholder="Text content" placeholderTextColor={palette.textMuted} multiline style={[styles.input, styles.multilineInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
                ) : (
                  <Text style={[styles.helperText, { color: palette.textMuted }]}>You can update the title and comment for this item.</Text>
                )}

                <TextInput value={newItemComment} onChangeText={setNewItemComment} placeholder="Optional comment" placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable onPress={closeCreateModal} style={({ pressed }) => [styles.modalButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                <Text style={{ color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitCreate} style={({ pressed }) => [styles.modalButton, { borderColor: palette.accent, backgroundColor: palette.accent }, pressed && styles.pressed]}>
                <Text style={{ color: "#03221d", fontWeight: "800" }}>
                  {screen === "home" && profileBeingEdited
                    ? "Update"
                    : screen === "profile" && eventBeingEdited
                      ? "Update"
                      : screen === "event" && itemBeingEdited
                        ? "Update"
                        : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {itemToDelete ? (
              <>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Delete Item</Text>
                <Text style={[styles.helperText, { color: palette.textMuted }]}>Delete this item from the event?</Text>
                <View style={styles.modalActions}>
                  <Pressable onPress={closeDeleteModal} style={({ pressed }) => [styles.modalButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                    <Text style={{ color: palette.text }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={submitDeleteItem} style={({ pressed }) => [styles.modalButton, { borderColor: palette.danger, backgroundColor: palette.danger }, pressed && styles.pressed]}>
                    <Text style={{ color: "#2a0000", fontWeight: "800" }}>Delete</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: palette.text }]}>{profileToDelete ? "Delete Profile" : "Delete Event"}</Text>
                <Text style={[styles.helperText, { color: palette.textMuted }]}>{profileToDelete ? `Type ${profileToDelete.name} to confirm deletion.` : eventToDelete ? `Type ${eventToDelete.title} to confirm deletion.` : ""}</Text>
                <TextInput value={deleteConfirmName} onChangeText={setDeleteConfirmName} placeholder={profileToDelete ? "Enter profile name" : "Enter event title"} placeholderTextColor={palette.textMuted} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.cardMuted }]} />
                <View style={styles.modalActions}>
                  <Pressable onPress={closeDeleteModal} style={({ pressed }) => [styles.modalButton, { borderColor: palette.border, backgroundColor: palette.cardMuted }, pressed && styles.pressed]}>
                    <Text style={{ color: palette.text }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={profileToDelete ? submitDeleteProfile : submitDeleteEvent} disabled={deleteConfirmName.trim() !== (profileToDelete?.name ?? eventToDelete?.title ?? "")} style={({ pressed }) => [styles.modalButton, { borderColor: palette.danger, backgroundColor: palette.danger, opacity: deleteConfirmName.trim() !== (profileToDelete?.name ?? eventToDelete?.title ?? "") ? 0.35 : 1 }, pressed && styles.pressed]}>
                    <Text style={{ color: "#2a0000", fontWeight: "800" }}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function itemCardLabel(item: JournalItem) {
  return item.title?.trim() || describeItemKind(item.kind);
}

function formatDate(value: string) {
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}.${parts[1]}.${parts[0].slice(2)}`;
}

function describeItemKind(kind: JournalItem["kind"]) {
  if (kind === "text") return "Text Item";
  if (kind === "media-with-comment") return "Media + Comment";
  return "Media Item";
}

function isValidLocalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topGlow: { position: "absolute", width: 320, height: 320, borderRadius: 160, top: -170, left: -90, opacity: 0.18 },
  header: { minHeight: 80, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, zIndex: 30 },
  headerSide: { width: 56, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerTitleEvent: { fontSize: 20, fontWeight: "800" },
  headerSubtitle: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  iconButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, alignItems: "center" },
  exportToast: { position: "absolute", top: 110, left: 12, right: 12, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", zIndex: 50, backgroundColor: "rgba(27,35,50,0.96)" },
  listContent: { paddingTop: 16, paddingBottom: 32, gap: 12 },
  profileCard: { borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 96, padding: 12, gap: 12 },
  trashButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  profileMain: { flex: 1, alignItems: "flex-start", justifyContent: "center", paddingRight: 8 },
  profileName: { fontSize: 24, fontWeight: "800", textAlign: "left" },
  profileDate: { marginTop: 4, textAlign: "left", fontSize: 12, fontWeight: "500" },
  eventCard: { borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 98, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  eventMain: { flex: 1, alignItems: "flex-start", justifyContent: "center" },
  eventDate: { fontSize: 12, fontWeight: "500", textAlign: "left" },
  eventTitle: { marginTop: 2, fontSize: 22, fontWeight: "800", textAlign: "left" },
  eventMeta: { marginTop: 6, fontSize: 12, textAlign: "left" },
  itemCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  itemTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontSize: 15, fontWeight: "700" },
  itemBody: { fontSize: 16, lineHeight: 23 },
  itemComment: { fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  itemImage: { width: "100%", height: 180, borderRadius: 10 },
  videoBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
  videoBadgeText: { flex: 1, fontSize: 13 },
  emptyWrap: { paddingTop: 36, paddingHorizontal: 6 },
  emptyText: { fontSize: 15, textAlign: "center" },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 460, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  helperText: { fontSize: 13, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multilineInput: { minHeight: 110, textAlignVertical: "top" },
  itemTypeRow: { flexDirection: "row", gap: 8 },
  itemTypeButton: { flex: 1, borderWidth: 1, borderRadius: 10, minHeight: 38, alignItems: "center", justifyContent: "center" },
  profileActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  modalActions: { marginTop: 4, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  modalButton: { minWidth: 92, borderRadius: 10, borderWidth: 1, minHeight: 38, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});

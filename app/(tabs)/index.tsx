import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Audio, ResizeMode, Video } from "expo-av";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Image as RNImage,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import ImageZoom from "react-native-image-pan-zoom";
import {
  ItemKindSelector,
  type ItemKind as ItemCreateKind,
} from "../../components/item-kind-selector";
import { LocationPickerModal } from "../../components/location-picker-modal";
import { IconButton } from "../../components/ui/icon-button";
import { useEvents } from "../../features/home/useEvents";
import { useItems } from "../../features/home/useItems";
import { useProfiles } from "../../features/home/useProfiles";
import { getItemVideoUri } from "../../features/items/journal-item-utils";
import { JournalItemCard } from "../../features/items/JournalItemCard";
import { LocationEditor } from "../../features/items/location/LocationEditor";
import {
  addGroupItem,
  addLocationItem,
  addMediaItem,
  addTextItem,
  createEvent,
  createProfile,
  deleteEvent,
  deleteItem,
  deleteProfile,
  exportProfile,
  JournalEvent,
  JournalItem,
  JournalProfile,
  listItems,
  LocationData,
  moveItem,
  renameProfile,
  reorderItems,
  updateEvent,
  updateItem,
} from "../../features/repo/journal-repo";

type ScreenLevel = "home" | "profile" | "event" | "group";

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
  const { width, height } = useWindowDimensions();
  const statusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const contentWidth = Math.min(width - 24, 940);

  const [screen, setScreen] = useState<ScreenLevel>("home");
  const [loading, setLoading] = useState(true);

  const { profiles, loadProfiles } = useProfiles();

  const [selectedProfile, setSelectedProfile] = useState<JournalProfile | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<JournalEvent | null>(null);
  const [selectedGroupPath, setSelectedGroupPath] = useState<string[]>([]);
  const [selectedGroupTitles, setSelectedGroupTitles] = useState<string[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportPlaceholder, setShowImportPlaceholder] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const previewListRef = useRef<FlatList<string> | null>(null);
  const [previewImageUris, setPreviewImageUris] = useState<string[] | null>(
    null,
  );
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState<string | null>(
    null,
  );

  const [newProfileName, setNewProfileName] = useState("");
  const [profileBeingEdited, setProfileBeingEdited] =
    useState<JournalProfile | null>(null);
  const [eventBeingEdited, setEventBeingEdited] = useState<JournalEvent | null>(
    null,
  );
  const [itemBeingEdited, setItemBeingEdited] = useState<JournalItem | null>(
    null,
  );
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(todayIsoDate());

  const [newItemKind, setNewItemKind] = useState<ItemCreateKind>("text");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [newItemComment, setNewItemComment] = useState("");

  const [profileToDelete, setProfileToDelete] = useState<JournalProfile | null>(
    null,
  );
  const [eventToDelete, setEventToDelete] = useState<JournalEvent | null>(null);
  const [itemToDelete, setItemToDelete] = useState<JournalItem | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingItem, setMovingItem] = useState<JournalItem | null>(null);
  const [moveTargets, setMoveTargets] = useState<
    {
      title: string;
      pathDisplay: string;
      path: string[];
    }[]
  >([]);
  const [selectedMovePath, setSelectedMovePath] = useState<string[] | null>(
    null,
  );
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null,
  );

  const { events, loadEvents } = useEvents(selectedProfile?.name ?? null);

  const { items, setItems, selectedEventPath, videoThumbnailUris, loadItems } =
    useItems(
      selectedProfile?.name ?? null,
      selectedEvent?.id ?? null,
      selectedGroupPath,
    );

  const screenLabel = useMemo(() => {
    if (screen === "home") {
      return { title: "Home" };
    }

    if (screen === "profile" && selectedProfile) {
      return { title: selectedProfile.name };
    }

    if (screen === "event" && selectedEvent) {
      return {
        title: selectedEvent.title,
        subtitle: formatDate(selectedEvent.date),
      };
    }

    if (screen === "group") {
      return {
        title: selectedGroupTitles[selectedGroupTitles.length - 1] ?? "Group",
        subtitle: selectedEvent ? formatDate(selectedEvent.date) : undefined,
      };
    }

    return { title: "Home" };
  }, [screen, selectedEvent, selectedGroupTitles, selectedProfile]);

  // `loadProfiles` is provided by `useProfiles` hook

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
    if (screen === "event" || screen === "group") {
      loadItems().catch(() => undefined);
    }
  }, [loadItems, screen]);

  const onBack = () => {
    if (screen === "group") {
      const nextPath = selectedGroupPath.slice(0, -1);
      const nextTitles = selectedGroupTitles.slice(0, -1);
      setSelectedGroupPath(nextPath);
      setSelectedGroupTitles(nextTitles);

      if (nextPath.length === 0) {
        setScreen("event");
      }
      return;
    }

    if (screen === "event") {
      setScreen("profile");
      setSelectedEvent(null);
      setSelectedGroupPath([]);
      setSelectedGroupTitles([]);
      return;
    }

    if (screen === "profile") {
      setScreen("home");
      setSelectedProfile(null);
      setSelectedEvent(null);
      setSelectedGroupPath([]);
      setSelectedGroupTitles([]);
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

  const closePreviewImage = () => {
    setPreviewImageUris(null);
    setPreviewImageIndex(0);
    setPreviewZoomed(false);
  };

  const openPreviewImages = (imageUris: string[], startIndex = 0) => {
    setPreviewVideoUri(null);
    setPreviewVideoTitle(null);
    // start prefetching neighbors to avoid flicker when swiping
    try {
      imageUris.forEach((u) => {
        if (u) RNImage.prefetch(u);
      });
    } catch {
      // prefetch best-effort
    }

    setPreviewImageUris(imageUris);
    setPreviewImageIndex(startIndex);
  };

  const closePreviewVideo = () => {
    setPreviewVideoUri(null);
    setPreviewVideoTitle(null);
  };

  const openPreviewVideo = (videoUri: string, title?: string) => {
    setPreviewImageUris(null);
    setPreviewImageIndex(0);
    setPreviewZoomed(false);
    setPreviewVideoUri(videoUri);
    setPreviewVideoTitle(title ?? null);
  };

  useEffect(() => {
    if (!previewImageUris) return;
    // ensure list scrolls to the requested index after mount
    setTimeout(() => {
      try {
        previewListRef.current?.scrollToIndex({
          index: previewImageIndex,
          animated: false,
        });
      } catch {
        // ignore if index not available yet
      }
    }, 50);
  }, [previewImageUris, previewImageIndex]);

  useEffect(() => {
    if (!previewVideoUri) {
      return;
    }

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => undefined);
  }, [previewVideoUri]);

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
        await updateEvent(selectedProfile.name, eventBeingEdited.id, {
          title,
          date: newEventDate,
        });
      } else {
        await createEvent(selectedProfile.name, { title, date: newEventDate });
      }

      await loadEvents();
      closeCreateModal();
      return;
    }

    if (
      (screen === "event" || screen === "group") &&
      selectedProfile &&
      selectedEvent
    ) {
      if (itemBeingEdited) {
        const title = newItemTitle.trim() || undefined;

        if (itemBeingEdited.kind === "text") {
          const text = newItemText.trim();
          if (!text) return;

          await updateItem(
            selectedProfile.name,
            selectedEvent.id,
            itemBeingEdited.id,
            selectedGroupPath,
            {
              title,
              text,
              comment: newItemComment.trim() || undefined,
            },
          );
        } else {
          await updateItem(
            selectedProfile.name,
            selectedEvent.id,
            itemBeingEdited.id,
            selectedGroupPath,
            {
              title,
              comment: newItemComment.trim() || undefined,
            },
          );
        }

        await loadItems();
        closeCreateModal();
        return;
      }

      if (newItemKind === "text") {
        const text = newItemText.trim();
        if (!text) return;

        await addTextItem(
          selectedProfile.name,
          selectedEvent.id,
          selectedGroupPath,
          {
            title: newItemTitle.trim() || undefined,
            text,
            comment: newItemComment.trim() || undefined,
          },
        );
        await loadItems();
        closeCreateModal();
        return;
      }

      if (newItemKind === "group") {
        await addGroupItem(
          selectedProfile.name,
          selectedEvent.id,
          selectedGroupPath,
          {
            title: newItemTitle.trim() || undefined,
            comment: newItemComment.trim() || undefined,
          },
        );
        await loadItems();
        closeCreateModal();
        return;
      }

      if (newItemKind === "location") {
        await openLocationPicker();
        return;
      }

      const mediaResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          newItemKind === "image"
            ? ImagePicker.MediaTypeOptions.Images
            : ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        allowsMultipleSelection: newItemKind === "image",
        selectionLimit: newItemKind === "image" ? 0 : 1,
      });

      if (mediaResult.canceled || !mediaResult.assets.length) return;

      const assets = mediaResult.assets;
      await addMediaItem(
        selectedProfile.name,
        selectedEvent.id,
        selectedGroupPath,
        {
          kind: newItemKind,
          sourceUris:
            newItemKind === "image"
              ? assets.map((asset) => asset.uri)
              : undefined,
          sourceUri: newItemKind === "video" ? assets[0].uri : undefined,
          mimeType: assets[0].mimeType,
          title: newItemTitle.trim() || undefined,
          comment: newItemComment.trim() || undefined,
        },
      );
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
    if (!profileToDelete || deleteConfirmName.trim() !== profileToDelete.name)
      return;

    await deleteProfile(profileToDelete.name);
    await loadProfiles();
    setSelectedProfile(null);
    setSelectedEvent(null);
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
    if (
      !eventToDelete ||
      !selectedProfile ||
      deleteConfirmName.trim() !== eventToDelete.title
    )
      return;

    await deleteEvent(selectedProfile.name, eventToDelete.id);
    await loadEvents();
    setSelectedEvent(null);
    setScreen("profile");
    closeDeleteModal();
  };

  const startDeleteItem = (item: JournalItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const startEditItem = (item: JournalItem) => {
    setItemBeingEdited(item);
    setNewItemKind(
      item.kind === "text"
        ? "text"
        : item.kind === "group"
          ? "group"
          : item.kind === "location"
            ? "location"
            : (item.media?.kind ?? "text"),
    );
    setNewItemTitle(item.title ?? "");
    setNewItemText(item.text ?? "");
    setNewItemComment(item.comment ?? "");
    if (item.kind === "location") {
      setSelectedLocation(item.location ?? null);
    }
    setShowCreateModal(true);
  };

  const openMoveModalForItem = async (item: JournalItem) => {
    if (!selectedProfile || !selectedEvent) return;
    setMovingItem(item);
    setShowMoveModal(true);

    // load possible targets (event root + all groups)
    try {
      const top = await listItems(selectedProfile.name, selectedEvent.id, []);
      const targets: { title: string; pathDisplay: string; path: string[] }[] =
        [{ title: "Event root", pathDisplay: "", path: [] }];

      function collect(
        groups: JournalItem[],
        path: string[],
        breadcrumbs: string[],
      ) {
        for (const g of groups) {
          if (g.kind === "group") {
            const label = g.title?.trim() || "Group";
            const nextBreadcrumbs = [...breadcrumbs, label];
            targets.push({
              title: `${label} (${g.groupItems?.length ?? 0})`,
              pathDisplay: nextBreadcrumbs.join("/"),
              path: [...path, g.id],
            });
            if (g.groupItems && g.groupItems.length) {
              collect(g.groupItems, [...path, g.id], nextBreadcrumbs);
            }
          }
        }
      }

      collect(top, [], []);
      setMoveTargets(targets);
      // default select event root
      setSelectedMovePath([]);
    } catch {
      setMoveTargets([{ title: "Event root", pathDisplay: "", path: [] }]);
      setSelectedMovePath([]);
    }
  };

  const submitMove = async () => {
    if (!movingItem || !selectedProfile || !selectedEvent) return;
    const toPath = selectedMovePath ?? [];
    try {
      await moveItem(
        selectedProfile.name,
        selectedEvent.id,
        movingItem.id,
        selectedGroupPath,
        toPath,
      );
    } catch {
      // swallow for now
    }
    setShowMoveModal(false);
    setMovingItem(null);
    setSelectedMovePath(null);
    await loadItems();
  };

  const submitDeleteItem = async () => {
    if (!itemToDelete || !selectedProfile || !selectedEvent) return;

    await deleteItem(selectedProfile.name, selectedEvent.id, itemToDelete.id);
    await loadItems();
    closeDeleteModal();
  };

  const openLocationPicker = async () => {
    setShowLocationPicker(true);
    // Try to get user's current location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setSelectedLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          zoom: 15,
        });
      } else {
        // Default to San Francisco if permission denied
        setSelectedLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          zoom: 15,
        });
      }
    } catch {
      // Default fallback
      setSelectedLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 15,
      });
    }
  };

  const closeLocationPicker = () => {
    setShowLocationPicker(false);
    setSelectedLocation(null);
    closeCreateModal();
  };

  const confirmLocationSelection = async () => {
    if (!selectedLocation) return;
    if (!selectedProfile || !selectedEvent) return;

    try {
      if (itemBeingEdited && itemBeingEdited.kind === "location") {
        await updateItem(
          selectedProfile.name,
          selectedEvent.id,
          itemBeingEdited.id,
          selectedGroupPath,
          {
            title: newItemTitle.trim() || undefined,
            comment: newItemComment.trim() || undefined,
            location: {
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              zoom: selectedLocation.zoom,
              address: selectedLocation.address,
              title: newItemTitle.trim() || undefined,
              comment: newItemComment.trim() || undefined,
            },
          },
        );
      } else {
        await addLocationItem(
          selectedProfile.name,
          selectedEvent.id,
          selectedGroupPath,
          {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            zoom: selectedLocation.zoom,
            address: selectedLocation.address,
            title: newItemTitle.trim() || undefined,
            comment: newItemComment.trim() || undefined,
          },
        );
      }
      await loadItems();
      closeLocationPicker();
    } catch {
      // swallow for now
    }
  };

  const openProfile = (profile: JournalProfile) => {
    setSelectedProfile(profile);
    setScreen("profile");
  };

  const openEvent = (event: JournalEvent) => {
    setSelectedEvent(event);
    setSelectedGroupPath([]);
    setSelectedGroupTitles([]);
    setScreen("event");
  };

  const openGroup = (item: JournalItem) => {
    setSelectedGroupPath((current) => [...current, item.id]);
    setSelectedGroupTitles((current) => [...current, itemCardLabel(item)]);
    setScreen("group");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
      <View style={[styles.topGlow, { backgroundColor: "#0f2f3a" }]} />

      <View
        style={[
          styles.header,
          {
            borderBottomColor: palette.border,
            paddingTop: statusBarHeight + 8,
          },
        ]}
      >
        <View style={styles.headerSide}>
          {screen === "home" ? null : (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.cardMuted,
                },
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="arrow-back" size={20} color={palette.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.headerCenter}>
          {screenLabel.subtitle ? (
            <>
              <Text
                style={[styles.headerSubtitle, { color: palette.textMuted }]}
              >
                {screenLabel.subtitle}
              </Text>
              <Text
                style={[styles.headerTitleEvent, { color: palette.text }]}
                numberOfLines={1}
              >
                {screenLabel.title}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.headerTitle, { color: palette.text }]}
              numberOfLines={1}
            >
              {screenLabel.title}
            </Text>
          )}
        </View>

        <View style={styles.headerSide}>
          <Pressable
            onPress={openCreateModal}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.cardMuted,
              },
              pressed && styles.pressed,
            ]}
          >
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
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Loading...
            </Text>
          </View>
        ) : (
          <View style={{ width: contentWidth, flex: 1 }}>
            {screen === "home" ? (
              <FlatList
                data={profiles}
                keyExtractor={(item) => item.name}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.profileCard,
                      {
                        backgroundColor: palette.card,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => openProfile(item)}
                      style={({ pressed }) => [
                        styles.profileMain,
                        pressed && styles.pressed,
                      ]}
                      hitSlop={6}
                    >
                      <Text
                        style={[styles.profileName, { color: palette.text }]}
                      >
                        {" "}
                        {item.name}{" "}
                      </Text>
                      <Text
                        style={[
                          styles.profileDate,
                          { color: palette.textMuted },
                        ]}
                      >
                        created {formatDate(item.createdAt.slice(0, 10))}
                      </Text>
                    </Pressable>

                    <View style={styles.profileActions}>
                      <IconButton
                        onPress={() => handleExportProfile(item)}
                        iconName="archive"
                        size={20}
                        color={palette.text}
                        borderColor={palette.border}
                        backgroundColor={palette.cardMuted}
                      />
                      <IconButton
                        onPress={() => startEditProfile(item)}
                        iconName="edit"
                        size={20}
                        color={palette.accent}
                        borderColor={palette.border}
                        backgroundColor={palette.cardMuted}
                      />
                      <IconButton
                        onPress={() => startDeleteProfile(item)}
                        iconName="delete-outline"
                        size={22}
                        color={palette.danger}
                        borderColor={palette.border}
                        backgroundColor={palette.cardMuted}
                      />
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text
                      style={[styles.emptyText, { color: palette.textMuted }]}
                    >
                      No profiles yet. Press + to create one.
                    </Text>
                  </View>
                }
              />
            ) : null}

            {screen === "profile" ? (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.eventCard,
                      {
                        backgroundColor: palette.card,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => openEvent(item)}
                      style={({ pressed }) => [
                        styles.eventMain,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[styles.eventDate, { color: palette.textMuted }]}
                      >
                        {formatDate(item.date)}
                      </Text>
                      <Text
                        style={[styles.eventTitle, { color: palette.text }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.eventMeta, { color: palette.textMuted }]}
                      >
                        {item.itemCount} items
                      </Text>
                    </Pressable>

                    <View style={styles.profileActions}>
                      <IconButton
                        onPress={() => startEditEvent(item)}
                        iconName="edit"
                        size={20}
                        color={palette.accent}
                        borderColor={palette.border}
                        backgroundColor={palette.cardMuted}
                      />
                      <IconButton
                        onPress={() => startDeleteEvent(item)}
                        iconName="delete-outline"
                        size={22}
                        color={palette.danger}
                        borderColor={palette.border}
                        backgroundColor={palette.cardMuted}
                      />
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text
                      style={[styles.emptyText, { color: palette.textMuted }]}
                    >
                      No events yet. Press + to create one.
                    </Text>
                  </View>
                }
              />
            ) : null}

            {screen === "event" ? (
              <DraggableFlatList<JournalItem>
                data={[...items].sort(
                  (left, right) => left.order - right.order,
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                activationDistance={8}
                onDragEnd={({ data }) => {
                  if (!selectedProfile || !selectedEvent) return;

                  const normalized = data.map((entry, index) => ({
                    ...entry,
                    order: index,
                  }));
                  setItems(normalized);
                  reorderItems(
                    selectedProfile.name,
                    selectedEvent.id,
                    normalized.map((entry) => entry.id),
                  ).catch(() => undefined);
                }}
                renderItem={({ item, drag, isActive }) => {
                  const videoUri = getItemVideoUri(item, selectedEventPath);

                  return (
                    <JournalItemCard
                      item={item}
                      selectedEventPath={selectedEventPath}
                      videoThumbnailUri={
                        videoUri ? videoThumbnailUris[videoUri] : undefined
                      }
                      isActive={isActive}
                      palette={palette}
                      onLongPress={drag}
                      onEdit={startEditItem}
                      onMove={openMoveModalForItem}
                      onDelete={startDeleteItem}
                      onOpenGroup={openGroup}
                      onOpenPreviewImages={openPreviewImages}
                      onOpenPreviewVideo={openPreviewVideo}
                      onEditLocation={(currentItem) => {
                        setItemBeingEdited(currentItem);
                        setSelectedLocation(currentItem.location ?? null);
                        setShowLocationPicker(true);
                      }}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text
                      style={[styles.emptyText, { color: palette.textMuted }]}
                    >
                      No items yet. Press + to add one.
                    </Text>
                  </View>
                }
              />
            ) : null}

            {screen === "group" ? (
              <DraggableFlatList<JournalItem>
                data={[...items].sort(
                  (left, right) => left.order - right.order,
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                activationDistance={8}
                onDragEnd={({ data }) => {
                  if (!selectedProfile || !selectedEvent) return;

                  const normalized = data.map((entry, index) => ({
                    ...entry,
                    order: index,
                  }));
                  setItems(normalized);
                  reorderItems(
                    selectedProfile.name,
                    selectedEvent.id,
                    normalized.map((entry) => entry.id),
                    selectedGroupPath,
                  ).catch(() => undefined);
                }}
                renderItem={({ item, drag, isActive }) => {
                  const videoUri = getItemVideoUri(item, selectedEventPath);

                  return (
                    <JournalItemCard
                      item={item}
                      selectedEventPath={selectedEventPath}
                      videoThumbnailUri={
                        videoUri ? videoThumbnailUris[videoUri] : undefined
                      }
                      isActive={isActive}
                      palette={palette}
                      onLongPress={drag}
                      onEdit={startEditItem}
                      onMove={openMoveModalForItem}
                      onDelete={startDeleteItem}
                      onOpenGroup={openGroup}
                      onOpenPreviewImages={openPreviewImages}
                      onOpenPreviewVideo={openPreviewVideo}
                      onEditLocation={(currentItem) => {
                        setItemBeingEdited(currentItem);
                        setSelectedLocation(currentItem.location ?? null);
                        setShowLocationPicker(true);
                      }}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text
                      style={[styles.emptyText, { color: palette.textMuted }]}
                    >
                      No items in this group yet. Press + to add one.
                    </Text>
                  </View>
                }
              />
            ) : null}
          </View>
        )}
      </View>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
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
                <TextInput
                  value={newProfileName}
                  onChangeText={setNewProfileName}
                  placeholder="Profile name (e.g. Trips)"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />

                <Pressable
                  onPress={() => setShowImportPlaceholder((value) => !value)}
                  style={({ pressed }) => [
                    styles.modalButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                      alignSelf: "flex-start",
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={{ color: palette.text, fontWeight: "700" }}>
                    Import Profile
                  </Text>
                </Pressable>

                {showImportPlaceholder ? (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    Import is not implemented yet.
                  </Text>
                ) : null}
              </>
            ) : null}

            {screen === "profile" ? (
              <>
                <TextInput
                  value={newEventName}
                  onChangeText={setNewEventName}
                  placeholder="Event name (e.g. Norway)"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
                <TextInput
                  value={newEventDate}
                  onChangeText={setNewEventDate}
                  placeholder="Date YYYY-MM-DD"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
              </>
            ) : null}

            {screen === "event" && !itemBeingEdited ? (
              <>
                <TextInput
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  placeholder="Optional item title"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />

                <ItemKindSelector
                  kinds={["text", "image", "video", "group", "location"]}
                  selectedKind={newItemKind}
                  borderColor={palette.border}
                  cardMutedColor={palette.cardMuted}
                  accentColor={palette.accent}
                  textColor={palette.text}
                  onSelectKind={setNewItemKind}
                />

                {newItemKind === "text" ? (
                  <TextInput
                    value={newItemText}
                    onChangeText={setNewItemText}
                    placeholder="Text content"
                    placeholderTextColor={palette.textMuted}
                    multiline
                    style={[
                      styles.input,
                      styles.multilineInput,
                      {
                        borderColor: palette.border,
                        color: palette.text,
                        backgroundColor: palette.cardMuted,
                      },
                    ]}
                  />
                ) : newItemKind === "group" ? (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    Create a folder-like group here. You can move items into it
                    later.
                  </Text>
                ) : (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    Press save to pick a {newItemKind} from your gallery.
                  </Text>
                )}

                <TextInput
                  value={newItemComment}
                  onChangeText={setNewItemComment}
                  placeholder="Optional comment"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
              </>
            ) : null}

            {screen === "event" && itemBeingEdited ? (
              <>
                <TextInput
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  placeholder="Optional item title"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />

                {itemBeingEdited.kind === "text" ? (
                  <TextInput
                    value={newItemText}
                    onChangeText={setNewItemText}
                    placeholder="Text content"
                    placeholderTextColor={palette.textMuted}
                    multiline
                    style={[
                      styles.input,
                      styles.multilineInput,
                      {
                        borderColor: palette.border,
                        color: palette.text,
                        backgroundColor: palette.cardMuted,
                      },
                    ]}
                  />
                ) : itemBeingEdited.kind === "location" ? (
                  <LocationEditor
                    location={itemBeingEdited.location ?? null}
                    onOpenPicker={() => {
                      setItemBeingEdited(itemBeingEdited);
                      setSelectedLocation(itemBeingEdited.location ?? null);
                      setShowLocationPicker(true);
                    }}
                    previewWrapperStyle={[
                      styles.itemImageCell,
                      styles.itemImageCellSingle,
                    ]}
                    previewImageStyle={styles.itemImage}
                    buttonStyle={styles.modalButton}
                    buttonTextColor={palette.text}
                  />
                ) : (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    You can update the title and comment for this item.
                  </Text>
                )}

                <TextInput
                  value={newItemComment}
                  onChangeText={setNewItemComment}
                  placeholder="Optional comment"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
              </>
            ) : null}

            {screen === "group" && !itemBeingEdited ? (
              <>
                <TextInput
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  placeholder="Optional item title"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />

                <ItemKindSelector
                  kinds={["text", "image", "video", "group", "location"]}
                  selectedKind={newItemKind}
                  borderColor={palette.border}
                  cardMutedColor={palette.cardMuted}
                  accentColor={palette.accent}
                  textColor={palette.text}
                  onSelectKind={setNewItemKind}
                />

                {newItemKind === "text" ? (
                  <TextInput
                    value={newItemText}
                    onChangeText={setNewItemText}
                    placeholder="Text content"
                    placeholderTextColor={palette.textMuted}
                    multiline
                    style={[
                      styles.input,
                      styles.multilineInput,
                      {
                        borderColor: palette.border,
                        color: palette.text,
                        backgroundColor: palette.cardMuted,
                      },
                    ]}
                  />
                ) : newItemKind === "group" ? (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    Create a folder-like group here. You can move items into it
                    later.
                  </Text>
                ) : (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    Press save to pick a {newItemKind} from your gallery.
                  </Text>
                )}

                <TextInput
                  value={newItemComment}
                  onChangeText={setNewItemComment}
                  placeholder="Optional comment"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
              </>
            ) : null}

            {screen === "group" && itemBeingEdited ? (
              <>
                <TextInput
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  placeholder="Optional item title"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />

                {itemBeingEdited.kind === "text" ? (
                  <TextInput
                    value={newItemText}
                    onChangeText={setNewItemText}
                    placeholder="Text content"
                    placeholderTextColor={palette.textMuted}
                    multiline
                    style={[
                      styles.input,
                      styles.multilineInput,
                      {
                        borderColor: palette.border,
                        color: palette.text,
                        backgroundColor: palette.cardMuted,
                      },
                    ]}
                  />
                ) : itemBeingEdited.kind === "location" ? (
                  <LocationEditor
                    location={itemBeingEdited.location ?? null}
                    onOpenPicker={() => {
                      setItemBeingEdited(itemBeingEdited);
                      setSelectedLocation(itemBeingEdited.location ?? null);
                      setShowLocationPicker(true);
                    }}
                    previewWrapperStyle={[
                      styles.itemImageCell,
                      styles.itemImageCellSingle,
                    ]}
                    previewImageStyle={styles.itemImage}
                    buttonStyle={styles.modalButton}
                    buttonTextColor={palette.text}
                  />
                ) : (
                  <Text
                    style={[styles.helperText, { color: palette.textMuted }]}
                  >
                    You can update the title and comment for this item.
                  </Text>
                )}

                <TextInput
                  value={newItemComment}
                  onChangeText={setNewItemComment}
                  placeholder="Optional comment"
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeCreateModal}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.cardMuted,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitCreate}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    borderColor: palette.accent,
                    backgroundColor: palette.accent,
                  },
                  pressed && styles.pressed,
                ]}
              >
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

      <Modal
        visible={showMoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoveModal(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Move Item
            </Text>
            <Text style={[styles.helperText, { color: palette.textMuted }]}>
              Choose destination container
            </Text>
            <View style={{ maxHeight: 320, marginTop: 8 }}>
              {moveTargets.map((t, idx) => {
                const disabled = arraysEqual(t.path, selectedGroupPath || []);
                return (
                  <Pressable
                    key={`move-target-${idx}`}
                    onPress={() => setSelectedMovePath(t.path)}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        marginBottom: 8,
                        borderColor: palette.border,
                        backgroundColor:
                          selectedMovePath &&
                          arraysEqual(selectedMovePath, t.path)
                            ? palette.cardMuted
                            : palette.card,
                        opacity: disabled ? 0.45 : 1,
                      },
                      pressed && styles.pressed,
                    ]}
                    disabled={disabled}
                  >
                    <Text style={{ color: palette.text }}>{t.title}</Text>
                    <Text
                      style={{
                        color: palette.textMuted,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {t.path.length === 0 ? "Event root" : t.pathDisplay}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setShowMoveModal(false);
                  setMovingItem(null);
                  setSelectedMovePath(null);
                }}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.cardMuted,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitMove}
                disabled={!movingItem}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    borderColor: palette.accent,
                    backgroundColor: palette.accent,
                    opacity: movingItem ? 1 : 0.5,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: "#002425", fontWeight: "800" }}>
                  Move
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={previewVideoUri !== null}
        transparent
        animationType="fade"
        onRequestClose={closePreviewVideo}
      >
        <View
          style={[
            styles.previewOverlay,
            { backgroundColor: "rgba(2, 6, 12, 0.95)" },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closePreviewVideo}
          />
          <View
            style={[
              styles.previewFrame,
              {
                maxWidth: Math.min(width - 24, 760),
                height: Math.min(height - 80, 920),
              },
            ]}
          >
            {previewVideoUri ? (
              <Video
                key={previewVideoUri}
                source={{ uri: previewVideoUri }}
                style={styles.previewVideoPlayer}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
                isLooping={false}
              />
            ) : null}
            {previewVideoTitle ? (
              <Text style={[styles.previewCounter, { color: palette.text }]}>
                {previewVideoTitle}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            {itemToDelete ? (
              <>
                <Text style={[styles.modalTitle, { color: palette.text }]}>
                  Delete Item
                </Text>
                <Text style={[styles.helperText, { color: palette.textMuted }]}>
                  Delete this item from the event?
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={closeDeleteModal}
                    style={({ pressed }) => [
                      styles.modalButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.cardMuted,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={{ color: palette.text }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={submitDeleteItem}
                    style={({ pressed }) => [
                      styles.modalButton,
                      {
                        borderColor: palette.danger,
                        backgroundColor: palette.danger,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={{ color: "#2a0000", fontWeight: "800" }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: palette.text }]}>
                  {profileToDelete ? "Delete Profile" : "Delete Event"}
                </Text>
                <Text style={[styles.helperText, { color: palette.textMuted }]}>
                  {profileToDelete
                    ? `Type ${profileToDelete.name} to confirm deletion.`
                    : eventToDelete
                      ? `Type ${eventToDelete.title} to confirm deletion.`
                      : ""}
                </Text>
                <TextInput
                  value={deleteConfirmName}
                  onChangeText={setDeleteConfirmName}
                  placeholder={
                    profileToDelete ? "Enter profile name" : "Enter event title"
                  }
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.cardMuted,
                    },
                  ]}
                />
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={closeDeleteModal}
                    style={({ pressed }) => [
                      styles.modalButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.cardMuted,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={{ color: palette.text }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={
                      profileToDelete ? submitDeleteProfile : submitDeleteEvent
                    }
                    disabled={
                      deleteConfirmName.trim() !==
                      (profileToDelete?.name ?? eventToDelete?.title ?? "")
                    }
                    style={({ pressed }) => [
                      styles.modalButton,
                      {
                        borderColor: palette.danger,
                        backgroundColor: palette.danger,
                        opacity:
                          deleteConfirmName.trim() !==
                          (profileToDelete?.name ?? eventToDelete?.title ?? "")
                            ? 0.35
                            : 1,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={{ color: "#2a0000", fontWeight: "800" }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={previewImageUris !== null}
        transparent
        animationType="fade"
        onRequestClose={closePreviewImage}
      >
        <View
          style={[
            styles.previewOverlay,
            { backgroundColor: "rgba(2, 6, 12, 0.92)" },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closePreviewImage}
          />
          <View
            style={[
              styles.previewFrame,
              {
                maxWidth: Math.min(width - 24, 760),
                height: Math.min(height - 80, 920),
              },
            ]}
          >
            {previewImageUris ? (
              <>
                <FlatList
                  data={previewImageUris}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  ref={previewListRef}
                  scrollEnabled={!previewZoomed}
                  initialScrollIndex={previewImageIndex}
                  keyExtractor={(uri, index) => `${uri}-${index}`}
                  removeClippedSubviews={false}
                  windowSize={3}
                  initialNumToRender={3}
                  maxToRenderPerBatch={3}
                  getItemLayout={(_, index) => ({
                    length: Math.min(width - 48, 760),
                    offset: Math.min(width - 48, 760) * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const pageWidth = Math.min(width - 48, 760);
                    const nextIndex = Math.round(
                      event.nativeEvent.contentOffset.x / pageWidth,
                    );
                    setPreviewImageIndex(nextIndex);
                  }}
                  renderItem={({ item: uri, index }) => (
                    <View
                      style={[
                        styles.previewSlide,
                        {
                          width: Math.min(width - 48, 760),
                          height: Math.min(height - 80, 920),
                        },
                      ]}
                    >
                      <ZoomablePreviewImage
                        uri={uri}
                        onZoomChange={(zoomed) => {
                          if (index === previewImageIndex)
                            setPreviewZoomed(zoomed);
                        }}
                        onTapClose={closePreviewImage}
                        slideWidth={Math.min(width - 48, 760)}
                        slideHeight={Math.min(height - 80, 920)}
                      />
                    </View>
                  )}
                />
                <Text style={[styles.previewCounter, { color: palette.text }]}>
                  {previewImageIndex + 1} / {previewImageUris.length}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <LocationPickerModal
        visible={showLocationPicker}
        selectedLocation={selectedLocation}
        palette={{
          border: palette.border,
          text: palette.text,
          textMuted: palette.textMuted,
          accent: palette.accent,
          cardMuted: palette.cardMuted,
        }}
        onClose={closeLocationPicker}
        onConfirm={confirmLocationSelection}
        onUseCurrentLocation={openLocationPicker}
        onChangeLocation={setSelectedLocation}
      />
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

function arraysEqual(
  a: string[] | undefined | null,
  b: string[] | undefined | null,
) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isValidLocalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type ZoomablePreviewImageProps = {
  uri: string;
  slideWidth: number;
  slideHeight: number;
  onTapClose: () => void;
  onZoomChange?: (zoomed: boolean) => void;
};

function ZoomablePreviewImage({
  uri,
  slideWidth,
  slideHeight,
  onTapClose,
  onZoomChange,
}: ZoomablePreviewImageProps) {
  const imageZoomRef = useRef<any>(null);
  const [zoomed, setZoomed] = useState(false);

  const handleMove = (position: any) => {
    // react-native-image-pan-zoom provides a scale in the move payload
    const scale = (position && (position.scale ?? position.scaleX ?? 1)) || 1;
    const isZoom = scale > 1.02;
    if (isZoom !== zoomed) {
      setZoomed(isZoom);
      onZoomChange?.(isZoom);
    }
  };

  const handleClick = () => {
    if (zoomed) {
      imageZoomRef.current?.resetScale?.();
      setZoomed(false);
      onZoomChange?.(false);
      return;
    }

    onTapClose();
  };

  const handleDoubleClick = () => {
    if (zoomed) {
      return;
    }

    imageZoomRef.current?.centerOn?.({
      x: slideWidth / 2,
      y: slideHeight / 2,
      scale: 2,
      duration: 180,
    });
    setZoomed(true);
    onZoomChange?.(true);
  };

  return (
    <ImageZoom
      ref={imageZoomRef}
      cropWidth={slideWidth}
      cropHeight={slideHeight}
      imageWidth={slideWidth}
      imageHeight={slideHeight}
      minScale={1}
      maxScale={4}
      clickDistance={6}
      pinchToZoom={true}
      panToMove={zoomed}
      enableCenterFocus={false}
      onStartShouldSetPanResponder={() => zoomed}
      onMoveShouldSetPanResponder={() => zoomed}
      onMove={handleMove}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Image
        source={{ uri }}
        style={{ width: slideWidth, height: slideHeight }}
        contentFit="contain"
      />
    </ImageZoom>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -170,
    left: -90,
    opacity: 0.18,
  },
  header: {
    minHeight: 80,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 30,
  },
  headerSide: { width: 56, alignItems: "center", justifyContent: "center" },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerTitleEvent: { fontSize: 20, fontWeight: "800" },
  headerSubtitle: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, alignItems: "center" },
  exportToast: {
    position: "absolute",
    top: 110,
    left: 12,
    right: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    backgroundColor: "rgba(27,35,50,0.96)",
  },
  listContent: { paddingTop: 16, paddingBottom: 32, gap: 12 },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 96,
    padding: 12,
    gap: 12,
  },
  trashButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMain: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingRight: 8,
  },
  profileName: { fontSize: 24, fontWeight: "800", textAlign: "left" },
  profileDate: {
    marginTop: 4,
    textAlign: "left",
    fontSize: 12,
    fontWeight: "500",
  },
  eventCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 98,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  eventMain: { flex: 1, alignItems: "flex-start", justifyContent: "center" },
  eventDate: { fontSize: 12, fontWeight: "500", textAlign: "left" },
  eventTitle: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "left",
  },
  eventMeta: { marginTop: 6, fontSize: 12, textAlign: "left" },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: { fontSize: 15, fontWeight: "700" },
  itemBody: { fontSize: 16, lineHeight: 23 },
  itemComment: { fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  itemImageGrid: { marginTop: 10, overflow: "hidden", borderRadius: 12 },
  itemImageGridSingle: { minHeight: 180 },
  itemImageGridMulti: {
    backgroundColor: "#0c111a",
  },
  itemImageRow: {
    flexDirection: "row",
    gap: 2,
  },
  itemImageCell: {
    flex: 1,
    minHeight: 180,
    position: "relative",
    overflow: "hidden",
  },
  itemImageCellSingle: { height: 180, minHeight: 180 },
  itemImageCellMulti: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 120,
  },
  itemImage: { width: "100%", height: "100%", minHeight: 180 },
  itemImageOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 12, 0.72)",
  },
  itemImageOverlayText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  groupCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  videoPreview: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  videoPreviewThumbWrap: {
    position: "relative",
    width: "100%",
    height: 180,
    backgroundColor: "#0c111a",
  },
  videoPreviewThumb: {
    width: "100%",
    height: "100%",
  },
  videoPreviewThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 12, 0.18)",
  },
  videoBadgeRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  videoBadgeText: { flex: 1, fontSize: 13 },
  emptyWrap: { paddingTop: 36, paddingHorizontal: 6 },
  emptyText: { fontSize: 15, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  helperText: { fontSize: 13, lineHeight: 18 },
  previewOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  previewFrame: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#05080f",
  },
  previewSlide: {
    justifyContent: "center",
    alignItems: "center",
  },
  previewImageWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: { width: "100%", height: "100%", minHeight: 280 },
  previewVideoPlayer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  previewCounter: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 12, 0.72)",
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multilineInput: { minHeight: 110, textAlignVertical: "top" },
  itemTypeRow: { flexDirection: "row", gap: 8 },
  itemTypeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  profileActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  modalActions: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  locationControlRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalButton: {
    minWidth: 92,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});

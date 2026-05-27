import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { IconButton } from "../../components/ui/icon-button";
import { countJournalItems, type JournalItem } from "../repo/journal-repo";
import {
    getItemImageUris,
    getItemVideoUri,
    itemCardLabel,
} from "./journal-item-utils";
import { LocationPreviewCard } from "./location/LocationPreviewCard";

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

type Props = {
  item: JournalItem;
  selectedEventPath: string | null;
  videoThumbnailUri?: string;
  isActive: boolean;
  palette: Palette;
  onLongPress: () => void;
  onEdit: (item: JournalItem) => void;
  onMove: (item: JournalItem) => void;
  onDelete: (item: JournalItem) => void;
  onOpenGroup: (item: JournalItem) => void;
  onOpenPreviewImages: (imageUris: string[], startIndex?: number) => void;
  onOpenPreviewVideo: (videoUri: string, title?: string) => void;
  onEditLocation: (item: JournalItem) => void;
};

export function JournalItemCard({
  item,
  selectedEventPath,
  videoThumbnailUri,
  isActive,
  palette,
  onLongPress,
  onEdit,
  onMove,
  onDelete,
  onOpenGroup,
  onOpenPreviewImages,
  onOpenPreviewVideo,
  onEditLocation,
}: Props) {
  const imageUris = getItemImageUris(item, selectedEventPath);
  const visibleImageUris = imageUris.slice(0, 4);
  const extraImageCount = imageUris.length - visibleImageUris.length;
  const videoUri = getItemVideoUri(item, selectedEventPath);

  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderColor: palette.border,
        opacity: isActive ? 0.9 : 1,
        borderWidth: 1,
        borderRadius: 20,
        padding: 14,
        gap: 10,
      }}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={120}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
      >
        <Text
          style={{
            color: palette.text,
            fontSize: 16,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {itemCardLabel(item)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton
            onPress={() => onEdit(item)}
            iconName="edit"
            size={20}
            color={palette.accent}
            borderColor={palette.border}
            backgroundColor={palette.cardMuted}
          />
          <IconButton
            onPress={() => onMove(item)}
            iconName="drive-file-move"
            size={20}
            color={palette.text}
            borderColor={palette.border}
            backgroundColor={palette.cardMuted}
          />
          <IconButton
            onPress={() => onDelete(item)}
            iconName="delete-outline"
            size={18}
            color={palette.danger}
            borderColor={palette.border}
            backgroundColor={palette.cardMuted}
          />
        </View>
      </Pressable>

      {item.text ? (
        <Text style={{ color: palette.text, lineHeight: 20 }}>{item.text}</Text>
      ) : null}

      {item.comment ? (
        <Text style={{ color: palette.textMuted, lineHeight: 18 }}>
          {item.comment}
        </Text>
      ) : null}

      {item.kind === "group" ? (
        <Pressable
          onPress={() => onOpenGroup(item)}
          style={{
            marginTop: 2,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            gap: 12,
            flexDirection: "row",
            alignItems: "center",
            borderColor: palette.border,
            backgroundColor: palette.cardMuted,
          }}
        >
          <MaterialIcons name="folder" size={34} color={palette.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>
              {item.title?.trim() || "Group"}
            </Text>
            <Text style={{ color: palette.textMuted, marginTop: 2 }}>
              {countJournalItems(item.groupItems ?? [])} items
            </Text>
            {item.comment ? (
              <Text
                style={{
                  color: palette.textMuted,
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                {item.comment}
              </Text>
            ) : null}
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={palette.textMuted}
          />
        </Pressable>
      ) : imageUris.length > 0 ? (
        <View
          style={{
            marginTop: 2,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.cardMuted,
          }}
        >
          <View
            style={{
              flexDirection: imageUris.length === 1 ? "column" : "column",
              gap: 1,
            }}
          >
            {imageUris
              .slice(0, 4)
              .reduce<string[][]>((rows, uri, index) => {
                const rowIndex = Math.floor(index / 2);
                if (!rows[rowIndex]) rows[rowIndex] = [];
                rows[rowIndex].push(uri);
                return rows;
              }, [])
              .map((row, rowIndex) => (
                <View
                  key={`row-${rowIndex}`}
                  style={{ flexDirection: "row", gap: 1 }}
                >
                  {row.map((uri, cellIndex) => {
                    const imageIndex = rowIndex * 2 + cellIndex;
                    const isLastVisible = imageIndex === 3;
                    const isSingleCellRow = row.length === 1;
                    const cellAspectRatio =
                      imageUris.length === 1 ? 1.6 : isSingleCellRow ? 2 : 1;
                    return (
                      <Pressable
                        key={`${uri}-${imageIndex}`}
                        onPress={() =>
                          onOpenPreviewImages(imageUris, imageIndex)
                        }
                        style={{
                          flex: 1,
                          aspectRatio: cellAspectRatio,
                        }}
                      >
                        <Image
                          source={{ uri }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                        {isLastVisible && extraImageCount > 0 ? (
                          <View
                            style={{
                              position: "absolute",
                              inset: 0,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(2,6,12,0.58)",
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "800",
                                fontSize: 18,
                              }}
                            >
                              +{extraImageCount}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
          </View>
        </View>
      ) : item.location ? (
        <Pressable
          onPress={() => onEditLocation(item)}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <LocationPreviewCard location={item.location} contentFit="cover" />
        </Pressable>
      ) : null}

      {item.media?.kind === "video" ? (
        <Pressable
          onPress={() => {
            if (videoUri) {
              onOpenPreviewVideo(videoUri, itemCardLabel(item));
            }
          }}
          style={{
            borderWidth: 1,
            borderRadius: 16,
            overflow: "hidden",
            borderColor: palette.border,
            backgroundColor: palette.cardMuted,
          }}
        >
          <View style={{ aspectRatio: 16 / 9, position: "relative" }}>
            {videoThumbnailUri ? (
              <Image
                source={{ uri: videoThumbnailUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="movie"
                  size={36}
                  color={palette.textMuted}
                />
              </View>
            )}
            <View
              style={{
                position: "absolute",
                inset: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="play-circle-filled"
                size={48}
                color="#ffffff"
              />
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <MaterialIcons
              name="videocam"
              size={18}
              color={palette.textMuted}
            />
            <Text
              style={{ flex: 1, color: palette.textMuted }}
              numberOfLines={1}
            >
              {item.media.fileName}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export default JournalItemCard;

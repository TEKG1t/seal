import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Modal, Pressable, Text, View } from "react-native";

import { LocationData } from "../features/repo/journal-repo";
import { getLocationPreviewUri } from "../lib/location-preview";

type LocationPickerModalProps = {
  visible: boolean;
  selectedLocation: LocationData | null;
  palette: {
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    cardMuted: string;
  };
  onClose: () => void;
  onConfirm: () => void;
  onUseCurrentLocation: () => void;
  onChangeLocation: (next: LocationData) => void;
};

export function LocationPickerModal({
  visible,
  selectedLocation,
  palette,
  onClose,
  onConfirm,
  onUseCurrentLocation,
  onChangeLocation,
}: LocationPickerModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(2,6,12,0.95)",
          padding: 12,
        }}
      >
        <View style={{ flex: 1, padding: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}
            >
              Select Location
            </Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={palette.text} />
            </Pressable>
          </View>

          {selectedLocation ? (
            <View style={{ flex: 1, gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#0c111a",
                  position: "relative",
                  marginBottom: 4,
                }}
              >
                <Image
                  source={{
                    uri: getLocationPreviewUri(
                      selectedLocation.latitude,
                      selectedLocation.longitude,
                      selectedLocation.zoom ?? 15,
                    ),
                  }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 18,
                    height: 18,
                    marginLeft: -9,
                    marginTop: -18,
                    borderRadius: 999,
                    backgroundColor: "#ef4444",
                    borderWidth: 3,
                    borderColor: "#ffffff",
                  }}
                />
              </View>

              <Text style={{ color: palette.textMuted, fontSize: 13 }}>
                Lat {selectedLocation.latitude.toFixed(5)} · Lon{" "}
                {selectedLocation.longitude.toFixed(5)} · Zoom{" "}
                {selectedLocation.zoom ?? 15}
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={onUseCurrentLocation}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      minWidth: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>
                    Use Current Location
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onChangeLocation({
                      ...selectedLocation,
                      zoom: Math.min(19, (selectedLocation.zoom ?? 15) + 1),
                    })
                  }
                  style={({ pressed }) => [
                    {
                      width: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>Zoom +</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onChangeLocation({
                      ...selectedLocation,
                      zoom: Math.max(1, (selectedLocation.zoom ?? 15) - 1),
                    })
                  }
                  style={({ pressed }) => [
                    {
                      width: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>Zoom -</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() =>
                    onChangeLocation({
                      ...selectedLocation,
                      latitude: selectedLocation.latitude + 0.001,
                    })
                  }
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      minWidth: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>North</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onChangeLocation({
                      ...selectedLocation,
                      latitude: selectedLocation.latitude - 0.001,
                    })
                  }
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      minWidth: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>South</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onChangeLocation({
                      ...selectedLocation,
                      longitude: selectedLocation.longitude - 0.001,
                    })
                  }
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      minWidth: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>West</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    onChangeLocation({
                      ...selectedLocation,
                      longitude: selectedLocation.longitude + 0.001,
                    })
                  }
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      minWidth: 92,
                      borderRadius: 10,
                      borderWidth: 1,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderColor: palette.border,
                      backgroundColor: palette.cardMuted,
                    },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Text style={{ color: palette.text }}>East</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View
            style={{
              marginTop: 4,
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                {
                  minWidth: 92,
                  borderRadius: 10,
                  borderWidth: 1,
                  minHeight: 38,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 14,
                  borderColor: palette.border,
                  backgroundColor: palette.cardMuted,
                },
                pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={{ color: palette.text }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                {
                  minWidth: 92,
                  borderRadius: 10,
                  borderWidth: 1,
                  minHeight: 38,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 14,
                  borderColor: palette.accent,
                  backgroundColor: palette.accent,
                },
                pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={{ color: "#03221d", fontWeight: "800" }}>
                Use This Location
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import React from "react";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { LocationData } from "../../../lib/journal-storage";
import { LocationPreviewCard } from "./LocationPreviewCard";

type Props = {
  location: LocationData | null;
  onOpenPicker: () => void;
  previewWrapperStyle?: StyleProp<ViewStyle> | any;
  previewImageStyle?: StyleProp<ViewStyle> | any;
  buttonStyle?: StyleProp<ViewStyle> | any;
  buttonTextColor?: string;
};

export function LocationEditor({
  location,
  onOpenPicker,
  previewWrapperStyle,
  previewImageStyle,
  buttonStyle,
  buttonTextColor,
}: Props) {
  return (
    <View>
      {location ? (
        <Pressable
          onPress={onOpenPicker}
          style={({ pressed }) => [
            previewWrapperStyle,
            pressed && { opacity: 0.7 },
          ]}
        >
          <LocationPreviewCard
            location={location}
            style={previewImageStyle}
            contentFit="cover"
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onOpenPicker}
        style={({ pressed }) => [
          buttonStyle,
          { marginTop: 8 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={{ color: buttonTextColor }}>Edit Location</Text>
      </Pressable>
    </View>
  );
}

export default LocationEditor;

import { Image } from "expo-image";
import React from "react";
import { ImageStyle, StyleProp } from "react-native";
import { LocationData } from "../../../features/repo/journal-repo";
import { getLocationPreviewUri } from "../../../lib/location-preview";

type Props = {
  location: LocationData | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
};

export function LocationPreviewCard({
  location,
  style,
  contentFit = "cover",
}: Props) {
  if (!location) return null;

  const uri = getLocationPreviewUri(
    location.latitude,
    location.longitude,
    location.zoom ?? 15,
  );

  return <Image source={{ uri }} style={style} contentFit={contentFit} />;
}

export default LocationPreviewCard;

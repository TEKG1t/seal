import { Image } from "expo-image";
import React from "react";
import { ViewStyle } from "react-native";
import { LocationData } from "../../../lib/journal-storage";
import { getLocationPreviewUri } from "../../../lib/location-preview";

type Props = {
  location: LocationData | null;
  style?: ViewStyle | any;
  contentFit?: "cover" | "contain" | "cover";
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

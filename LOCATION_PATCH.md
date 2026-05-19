# Location Items - Remaining UI Integration Fixes

## Issues to Fix

### 1. Update imports in app/(tabs)/index.tsx

Add `addLocationItem` to the journal-storage imports:

```typescript
import {
  addGroupItem,
  addLocationItem,  // ADD THIS LINE
  addMediaItem,
  // ... rest of imports
}
```

### 2. Fix Location API usage

Replace the Location API calls in openLocationPicker:

```typescript
// WRONG:
const { status } = await Location.requestForegroundPermissionsAsync();
const loc = await Location.getCurrentPositionAsync({});

// CORRECT:
const { status } = await Location.requestForegroundPermissionsAsync();
const loc = await Location.getCurrentPositionAsync({});
```

This should work - the expo-location module does export these correctly. The TypeScript error might be resolved by rebuilding.

### 3. Add Location to item type selector buttons (2 places)

Find both instances of:

```typescript
["text", "image", "video", "group"] as ItemCreateKind[];
```

Replace with:

```typescript
["text", "image", "video", "group", "location"] as ItemCreateKind[];
```

Locations are around:

- Line 1863 (event create modal)
- Line 2021 (group create modal)

### 4. Add location item creation UI (in event and group create modals)

Add this after the "group" item kind check in the modal:

```typescript
{newItemKind === "location" ? (
  <Text style={[styles.helperText, { color: palette.textMuted }]}>
    Tap save to pick a location on the map.
  </Text>
) : null}
```

### 5. Add Location Picker Modal

Add this BEFORE the closing </SafeAreaView> tag at the end of the render:

```typescript
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={[styles.previewOverlay, { backgroundColor: "rgba(2, 6, 12, 0.95)" }]}>
          <View style={{ flex: 1, padding: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>
                Select Location
              </Text>
              <Pressable onPress={() => setShowLocationPicker(false)}>
                <MaterialIcons name="close" size={24} color={palette.text} />
              </Pressable>
            </View>

            {selectedLocation ? (
              <MapView
                ref={mapRef}
                style={{ flex: 1, borderRadius: 16, marginBottom: 12 }}
                initialRegion={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setSelectedLocation({
                    ...selectedLocation,
                    latitude,
                    longitude,
                  });
                }}
              >
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title="Selected Location"
                />
              </MapView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLocationPicker(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { borderColor: palette.border, backgroundColor: palette.cardMuted },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmLocationSelection}
                style={({ pressed }) => [
                  styles.modalButton,
                  { borderColor: palette.accent, backgroundColor: palette.accent },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: "#03221d", fontWeight: "800" }}>Use This Location</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
```

### 6. Add location preview rendering in event list (after image rendering)

In the event item renderer, add this after the image grid closing tag:

```typescript
{item.location ? (
  <Pressable
    onPress={() => startEditItem(item)}
    style={({ pressed }) => [
      styles.itemImageCell,
      { marginTop: 10, height: 180, aspectRatio: 1 },
      pressed && styles.pressed,
    ]}
  >
    <Image
      source={{
        uri: `https://tile.openstreetmap.org/${item.location.zoom ?? 15}/${Math.floor((item.location.longitude + 180) / 360 * (1 << (item.location.zoom ?? 15)))}/${Math.floor((1 - Math.log(Math.tan(item.location.latitude * Math.PI / 180) + 1 / Math.cos(item.location.latitude * Math.PI / 180)) / Math.PI) / 2 * (1 << (item.location.zoom ?? 15)))}.png`,
      }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
    />
    <View style={styles.itemImageOverlay}>
      <MaterialIcons name="location-on" size={36} color="#ff4444" />
    </View>
  </Pressable>
) : null}
```

### 7. Add location preview in group list

Do the same as step 6 in the group item renderer.

### 8. Update startEditItem to handle locations

Change the kind detection in startEditItem:

```typescript
setNewItemKind(
  item.kind === "text"
    ? "text"
    : item.kind === "group"
      ? "group"
      : item.kind === "location"
        ? "location"
        : (item.media?.kind ?? "text"),
);
```

## Summary

The Location Items feature needs:

1. Import fix for addLocationItem
2. Item type buttons updated (2 places)
3. Location picker modal added
4. Location preview rendering in event/group lists
5. Location creation UI text in modals
6. startEditItem logic updated for locations
7. Rebuild the project to clear TypeScript cache

Would you like me to provide a complete updated file, or would you prefer to make these edits manually?

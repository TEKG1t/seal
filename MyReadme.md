## Additional dep

This gives local storage access, Pick images/videos

```
npx expo install expo-file-system
npx expo install expo-image-picker
```

## Building and Installing APK

```
eas login
eas build:configure
eas build -p android --profile preview

```

## Android notes — Location item

- Interactive map uses `react-native-maps` (native module). To include it you must add the native module to the Android binary (prebuild or EAS) — otherwise the JS MapView will fail at runtime.

- Quick options to get the native maps module into your Android app:
  - Local dev build (prebuild + run):
    ```bash
    npm install react-native-maps
    npx expo prebuild
    npx expo run:android
    ```
  - EAS (recommended for CI/dev client):
    ```bash
    eas install react-native-maps
    eas build -p android --profile preview
    ```

- Required Android config (prebuild or manual edits):
  - Add runtime permissions to `AndroidManifest.xml`: `ACCESS_FINE_LOCATION` (and `ACCESS_COARSE_LOCATION` if needed).
  - If using Google Maps provider, add your API key in `AndroidManifest.xml` as meta-data `com.google.android.geo.API_KEY`.
  - Ensure `play-services-maps` is available (handled by prebuild/EAS when using the standard config plugin).

- Runtime behaviour in this project:
  - The app requests location permissions via `expo-location` when opening the picker.
  - A static preview tile (OpenStreetMap) is used for item thumbnails and does not require native modules or API keys.
  - The interactive `MapView` requires the native `react-native-maps` module — without rebuilding the native binary the app will throw a TurboModule error (`RNMapsAirModule` not found).

- Recommendation: for development, create a custom dev client (via `eas build` / `expo prebuild && expo run:android`) so you can use `MapView` interactively. If you prefer not to rebuild, keep the static OSM preview-only behavior.

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

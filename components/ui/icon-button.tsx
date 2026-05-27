import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, type PressableProps, StyleSheet } from "react-native";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

type IconButtonProps = {
  iconName: IconName;
  size?: number;
  color: string;
  borderColor: string;
  backgroundColor: string;
  onPress: PressableProps["onPress"];
};

export function IconButton({
  iconName,
  size = 20,
  color,
  borderColor,
  backgroundColor,
  onPress,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor, backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <MaterialIcons name={iconName} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 38,
    minWidth: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});

export default IconButton;

import { Pressable, Text, View } from "react-native";

type ItemKind = "text" | "image" | "video" | "group" | "location";

type ItemKindSelectorProps = {
  kinds: readonly ItemKind[];
  selectedKind: ItemKind;
  borderColor: string;
  cardMutedColor: string;
  accentColor: string;
  textColor: string;
  onSelectKind: (kind: ItemKind) => void;
};

export function ItemKindSelector({
  kinds,
  selectedKind,
  borderColor,
  cardMutedColor,
  accentColor,
  textColor,
  onSelectKind,
}: ItemKindSelectorProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {kinds.map((kind) => (
        <Pressable
          key={kind}
          onPress={() => onSelectKind(kind)}
          style={({ pressed }) => [
            {
              flex: 1,
              minWidth: 0,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderColor,
              backgroundColor:
                selectedKind === kind ? accentColor : cardMutedColor,
            },
            pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text
            style={{
              color: selectedKind === kind ? "#03221d" : textColor,
              fontWeight: "700",
              textTransform: "capitalize",
            }}
          >
            {kind}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export type { ItemKind };


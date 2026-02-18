import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../lib/theme"

interface Props {
  text: string
}

export function ReasoningBlock({ text }: Props) {
  const { colors, mode } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const isDark = mode === "dark"

  return (
    <TouchableOpacity
      style={{
        backgroundColor: colors["surface-warning-weak"],
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors["border-warning-base"],
      }}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={s.header}>
        <Ionicons name="bulb-outline" size={14} color={colors["icon-warning-base"]} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors["text-on-warning-base"], flex: 1 }}>
          Thinking
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors["text-weaker"]} />
      </View>
      {expanded && (
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors["text-on-warning-base"], marginTop: 8 }} selectable>
          {text}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
})

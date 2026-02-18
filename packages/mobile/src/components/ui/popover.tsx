/**
 * Popover Component
 *
 * Floating overlay for dropdowns and suggestions.
 *
 * @example
 * <Popover visible={atActive} maxHeight={200}>
 *   <Popover.Section title="Recent Files" />
 *   <Popover.Item icon="folder-outline" onPress={() => select("app.tsx")}>
 *     <View style={{ flex: 1 }}>
 *       <Text variant="body">app.tsx</Text>
 *       <Text variant="caption" color="text-weak">src/</Text>
 *     </View>
 *   </Popover.Item>
 * </Popover>
 */
import type { ComponentProps, ReactNode } from "react"
import { View, ViewStyle, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import type { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"
import { Icon } from "./icon"
import { Text } from "./text"

export interface PopoverProps {
  /** Visibility state */
  visible: boolean
  /** Maximum height of popover */
  maxHeight?: number
  /** Position relative to anchor (future support) */
  position?: "top" | "bottom"
  /** Popover content */
  children: ReactNode
  /** Additional styles */
  style?: ViewStyle
}

export interface PopoverItemProps {
  /** Optional icon */
  icon?: ComponentProps<typeof Ionicons>["name"]
  /** Icon color (theme token or hex) */
  iconColor?: string
  /** Disabled state */
  disabled?: boolean
  /** Press handler */
  onPress: () => void
  /** Item content */
  children: ReactNode
  /** Additional styles */
  style?: ViewStyle
}

export interface PopoverSectionProps {
  /** Section title */
  title: string
}

function PopoverSection({ title }: PopoverSectionProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.section, { backgroundColor: colors["surface-weak"] }]}>
      <Text variant="label" color="text-weak">
        {title}
      </Text>
    </View>
  )
}

function PopoverItem({ icon, iconColor = "text-weak", disabled = false, onPress, children, style }: PopoverItemProps) {
  const { colors } = useTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.item, { opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={styles.itemContent}>
        {icon && <Icon name={icon} size="sm" color={iconColor} />}
        {children}
      </View>
    </TouchableOpacity>
  )
}

export function Popover({ visible, maxHeight = 240, position = "bottom", children, style }: PopoverProps) {
  const { colors } = useTheme()

  if (!visible) return null

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors["surface-raised-base"],
          borderTopColor: colors["border-weak-base"],
          maxHeight,
        },
        style,
      ]}
    >
      <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator>
        {children}
      </ScrollView>
    </View>
  )
}

Popover.Section = PopoverSection
Popover.Item = PopoverItem

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  item: {
    width: "100%",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
})

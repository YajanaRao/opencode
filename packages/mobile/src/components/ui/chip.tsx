/**
 * Chip Component
 *
 * Removable pills for files, tags, filters.
 *
 * @example
 * <Chip icon="folder-outline" onRemove={() => removeFile(idx)}>
 *   src/app.tsx
 * </Chip>
 * <Chip variant="outline" selected onPress={() => selectTag("typescript")}>
 *   TypeScript
 * </Chip>
 */
import type { ComponentProps, ReactNode } from "react"
import { View, ViewStyle, TouchableOpacity, StyleSheet } from "react-native"
import type { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"
import { Icon } from "./icon"
import { Text } from "./text"

export interface ChipProps {
  /** Visual style variant */
  variant?: "filled" | "outline"
  /** Optional leading icon */
  icon?: ComponentProps<typeof Ionicons>["name"]
  /** Icon color (theme token or hex) */
  iconColor?: string
  /** Selected state styling */
  selected?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Press handler */
  onPress?: () => void
  /** Remove handler - shows close button when provided */
  onRemove?: () => void
  /** Chip content */
  children: ReactNode
  /** Additional styles */
  style?: ViewStyle
}

export function Chip({
  variant = "filled",
  icon,
  iconColor = "text-weak",
  selected = false,
  disabled = false,
  onPress,
  onRemove,
  children,
  style,
}: ChipProps) {
  const { colors } = useTheme()

  const baseStyles = {
    filled: {
      backgroundColor: colors["surface-base"],
      borderColor: colors["border-weak-base"],
      borderWidth: 1,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: colors["border-base"],
      borderWidth: 1,
    },
  } as const

  const selectedStyles = selected
    ? {
        borderColor: colors["border-interactive-base"],
        backgroundColor: colors["surface-interactive-weak"],
      }
    : {}

  const disabledStyles = disabled ? { opacity: 0.5 } : {}

  const content = (
    <View style={[styles.container, baseStyles[variant], selectedStyles, disabledStyles, style]}>
      {icon && <Icon name={icon} size="sm" color={iconColor} />}
      <Text variant="body" style={styles.label}>
        {children}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.closeCircle, { backgroundColor: colors["surface-weak"] }]}>
            <Icon name="close" size="xs" color="text-weak" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
  },
  label: {
    flexShrink: 1,
  },
  closeButton: {
    marginLeft: 2,
  },
  closeCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
})

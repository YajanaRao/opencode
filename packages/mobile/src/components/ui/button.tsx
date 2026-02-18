/**
 * Button Component
 *
 * Themed touchable button with variants and states.
 *
 * @example
 * <Button variant="primary" icon="send" onPress={handleSend}>
 *   Send
 * </Button>
 * <Button variant="ghost" size="sm" icon="close" onPress={onRemove} />
 * <Button loading>Processing...</Button>
 */
import type { ComponentProps, ReactNode } from "react"
import { View, ViewStyle, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native"
import type { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"
import { Icon } from "./icon"
import { Text } from "./text"

const SIZES = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 13, iconSize: 16, gap: 6 },
  md: { height: 40, paddingHorizontal: 16, fontSize: 14, iconSize: 20, gap: 8 },
  lg: { height: 48, paddingHorizontal: 20, fontSize: 16, iconSize: 24, gap: 10 },
} as const

export interface ButtonProps {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "outline" | "ghost"
  /** Button size */
  size?: keyof typeof SIZES
  /** Optional icon */
  icon?: ComponentProps<typeof Ionicons>["name"]
  /** Icon position relative to label */
  iconPosition?: "left" | "right"
  /** Disabled state */
  disabled?: boolean
  /** Loading state - shows spinner */
  loading?: boolean
  /** Press handler */
  onPress?: () => void
  /** Long press handler */
  onLongPress?: () => void
  /** Button content */
  children?: ReactNode
  /** Additional styles */
  style?: ViewStyle
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  onPress,
  onLongPress,
  children,
  style,
}: ButtonProps) {
  const { colors } = useTheme()
  const sizeConfig = SIZES[size]

  const variants = {
    primary: {
      backgroundColor: colors["surface-interactive-base"],
      textColor: colors["text-base"],
      borderColor: undefined,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors["surface-base"],
      textColor: colors["text-base"],
      borderColor: colors["border-base"],
      borderWidth: 1,
    },
    outline: {
      backgroundColor: "transparent",
      textColor: colors["text-base"],
      borderColor: colors["border-base"],
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: "transparent",
      textColor: colors["text-weak"],
      borderColor: undefined,
      borderWidth: 0,
    },
  } as const

  const variantStyle = variants[variant]

  const content = loading ? (
    <ActivityIndicator size="small" color={variantStyle.textColor} />
  ) : (
    <View
      style={[styles.content, { gap: sizeConfig.gap, flexDirection: iconPosition === "right" ? "row-reverse" : "row" }]}
    >
      {icon && <Icon name={icon} size={sizeConfig.iconSize} color={variant === "ghost" ? "text-weak" : "text-base"} />}
      {children && (
        <Text variant="body" weight="medium" color={variantStyle.textColor} style={{ fontSize: sizeConfig.fontSize }}>
          {children}
        </Text>
      )}
    </View>
  )

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderWidth: variantStyle.borderWidth,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
})

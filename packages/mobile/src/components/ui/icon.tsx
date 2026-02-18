/**
 * Icon Component
 *
 * Theme-aware Ionicons wrapper with size presets.
 *
 * @example
 * <Icon name="folder-outline" size="md" color="text-base" />
 * <Icon name="close" size={14} color="#ef4444" />
 */
import type { ComponentProps } from "react"
import { ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"

const SIZE_PRESETS = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

export interface IconProps {
  /** Ionicons name */
  name: ComponentProps<typeof Ionicons>["name"]
  /** Size preset or custom number */
  size?: keyof typeof SIZE_PRESETS | number
  /** Theme token key or hex color */
  color?: string
  /** Additional styles */
  style?: ViewStyle
}

export function Icon({ name, size = "md", color = "text-base", style }: IconProps) {
  const { colors } = useTheme()

  const resolvedSize = typeof size === "number" ? size : SIZE_PRESETS[size]
  const resolvedColor = color?.startsWith("#") ? color : (colors[color] ?? colors["text-base"])

  return <Ionicons name={name} size={resolvedSize} color={resolvedColor} style={style} />
}

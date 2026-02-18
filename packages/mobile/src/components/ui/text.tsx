/**
 * Text Component
 *
 * Themed text with semantic variants.
 *
 * @example
 * <Text variant="heading">Session Title</Text>
 * <Text variant="caption" color="text-weak">Updated 5 minutes ago</Text>
 */
import type { ComponentProps } from "react"
import { Platform, Text as RNText, TextStyle, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"

const VARIANTS = {
  heading: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
  label: { fontSize: 12, fontWeight: "600" as const },
  code: {
    fontSize: 13,
    fontWeight: "400" as const,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
} as const

const WEIGHTS = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
}

export interface TextProps extends Omit<ComponentProps<typeof RNText>, "style"> {
  /** Text variant for semantic styling */
  variant?: keyof typeof VARIANTS
  /** Theme token or hex color */
  color?: string
  /** Font weight override */
  weight?: keyof typeof WEIGHTS
  /** Additional styles */
  style?: TextStyle | TextStyle[]
}

export function Text({ variant = "body", color = "text-base", weight, style, children, ...props }: TextProps) {
  const { colors } = useTheme()

  const variantStyle = VARIANTS[variant]
  const resolvedColor = color?.startsWith("#") ? color : (colors[color] ?? colors["text-base"])
  const fontWeight = weight ? WEIGHTS[weight] : variantStyle.fontWeight

  return (
    <RNText style={[variantStyle, { color: resolvedColor, fontWeight }, style]} {...props}>
      {children}
    </RNText>
  )
}

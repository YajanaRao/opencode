import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react"
import { useColorScheme, View, ActivityIndicator } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { resolveTheme } from "@opencode-ai/ui/theme/resolve"
import { DEFAULT_THEMES } from "@opencode-ai/ui/theme/default-themes"
import type { DesktopTheme, HexColor } from "@opencode-ai/ui/theme/types"

export type ColorScheme = "light" | "dark" | "system"

const STORAGE_KEYS = {
  THEME_ID: "opencode-theme-id",
  COLOR_SCHEME: "opencode-color-scheme",
} as const

interface ThemeContextValue {
  themeId: string
  colorScheme: ColorScheme
  mode: "light" | "dark"
  themes: Record<string, DesktopTheme>
  colors: Record<string, string>
  setTheme: (id: string) => void
  setColorScheme: (scheme: ColorScheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

/**
 * Resolves CSS variable references in theme tokens to actual hex colors.
 * React Native doesn't support CSS variables, so we need to resolve them manually.
 *
 * Example: "var(--text-weak)" -> "#888888" (by looking up tokens["text-weak"])
 */
function resolveTokenReferences(tokens: Record<string, unknown>): Record<string, string> {
  const resolved: Record<string, string> = {}
  const maxPasses = 10 // Prevent infinite loops

  // Keep resolving until no more CSS variables remain
  for (let pass = 0; pass < maxPasses; pass++) {
    let hasUnresolved = false

    for (const [key, value] of Object.entries(tokens)) {
      // Skip if already resolved
      if (resolved[key]) continue

      // Not a string or undefined - skip
      if (typeof value !== "string") continue

      // If it's a CSS variable reference: var(--token-name)
      if (value.startsWith("var(--") && value.endsWith(")")) {
        const refName = value.slice(6, -1) // Extract "token-name" from "var(--token-name)"
        const refValue = resolved[refName] || tokens[refName]

        if (refValue && typeof refValue === "string" && !refValue.startsWith("var(")) {
          // Reference resolved to a hex color
          resolved[key] = refValue as HexColor
        } else {
          // Reference not yet resolved, will try again next pass
          hasUnresolved = true
        }
      } else {
        // Direct hex color value
        resolved[key] = value as HexColor
      }
    }

    // If no unresolved references remain, we're done
    if (!hasUnresolved) break
  }

  // Log any still-unresolved references for debugging
  const stillUnresolved: string[] = []
  for (const [key, value] of Object.entries(tokens)) {
    if (!resolved[key] && typeof value === "string") {
      stillUnresolved.push(`${key}: ${value}`)
      // Use a visible fallback color to make issues obvious
      resolved[key] = "#ff00ff"
    }
  }

  if (stillUnresolved.length > 0) {
    console.warn(`Theme: Failed to resolve ${stillUnresolved.length} CSS variables after ${maxPasses} passes:`)
    stillUnresolved.forEach((msg) => console.warn(`  - ${msg}`))
  }

  return resolved
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
}

export function ThemeProvider({ children, defaultTheme = "tokyonight" }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme()
  const [themeId, setThemeIdState] = useState(defaultTheme)
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("system")
  const [isReady, setIsReady] = useState(false)

  const mode: "light" | "dark" =
    colorScheme === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : colorScheme

  // Resolve theme tokens for both light and dark modes, memoized by themeId and mode
  const colors = useMemo(() => {
    const theme = DEFAULT_THEMES[themeId] || DEFAULT_THEMES["tokyonight"]
    const { light, dark } = resolveTheme(theme)
    const tokens = mode === "dark" ? dark : light
    return resolveTokenReferences(tokens as Record<string, unknown>)
  }, [themeId, mode])

  // Load persisted preferences on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [savedTheme, savedScheme] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.THEME_ID),
          AsyncStorage.getItem(STORAGE_KEYS.COLOR_SCHEME),
        ])

        if (savedTheme && DEFAULT_THEMES[savedTheme]) {
          setThemeIdState(savedTheme)
        }
        if (savedScheme && (savedScheme === "light" || savedScheme === "dark" || savedScheme === "system")) {
          setColorSchemeState(savedScheme)
        }
      } catch (error) {
        console.warn("Failed to load theme preferences:", error)
      } finally {
        setIsReady(true)
      }
    }
    load()
  }, [])

  const setTheme = useCallback((id: string) => {
    if (!DEFAULT_THEMES[id]) {
      console.warn(`Theme "${id}" not found`)
      return
    }
    setThemeIdState(id)
    AsyncStorage.setItem(STORAGE_KEYS.THEME_ID, id)
  }, [])

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme)
    AsyncStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, scheme)
  }, [])

  const value: ThemeContextValue = {
    themeId,
    colorScheme,
    mode,
    themes: DEFAULT_THEMES,
    colors,
    setTheme,
    setColorScheme,
  }

  if (!isReady) {
    // Show loading screen while theme is being loaded
    const tempMode = systemColorScheme === "dark" ? "dark" : "light"
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: tempMode === "dark" ? "#0a0a0a" : "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color={tempMode === "dark" ? "#ffffff" : "#0a0a0a"} />
      </View>
    )
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

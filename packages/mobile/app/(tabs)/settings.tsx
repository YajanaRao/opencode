import { useCallback, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Linking, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"
import type { ColorScheme } from "@/lib/theme"
import { useAuth } from "../../src/stores/auth"
import { useSettings } from "../../src/stores/settings"
import {
  categories,
  categoryMeta,
  setup as setupNotifications,
  granted as notificationsGranted,
} from "../../src/lib/notifications"
import type { Category } from "../../src/lib/notifications"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"

function SettingRow({
  icon,
  label,
  description,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  description?: string
  right?: React.ReactNode
  onPress?: () => void
}) {
  const { colors } = useTheme()
  const content = (
    <View style={[styles.settingRow, { borderBottomColor: colors["border-weak-base"] }]}>
      <View style={[styles.settingIcon, { backgroundColor: colors["surface-weak"] }]}>
        <Ionicons name={icon} size={22} color={colors["text-base"]} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors["text-base"] }]}>{label}</Text>
        {description && <Text style={[styles.settingDescription, { color: colors["text-weak"] }]}>{description}</Text>}
      </View>
      {right}
    </View>
  )

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>
  }

  return content
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors["text-weak"] }]}>{title}</Text>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: colors["surface-base"],
            borderColor: colors["border-weak-base"],
          },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

export default function SettingsScreen() {
  const { colors, themeId, colorScheme, themes, setTheme, setColorScheme } = useTheme()
  const { settings, hasBiometrics, updateSettings, lock } = useAuth()
  const { notifications, setNotification } = useSettings()
  const [osGranted, setOsGranted] = useState<boolean | null>(null)
  const [showThemeDialog, setShowThemeDialog] = useState(false)
  const [showSchemeDialog, setShowSchemeDialog] = useState(false)

  // Check OS permission state on first toggle attempt
  const handleToggle = useCallback(
    async (category: Category, enabled: boolean) => {
      if (enabled) {
        const ok = await setupNotifications()
        setOsGranted(ok)
        if (!ok) {
          Alert.alert(
            "Notifications Disabled",
            "Enable notifications for OpenCode in your device settings to receive alerts.",
          )
          return
        }
      }
      setNotification(category, enabled)
    },
    [setNotification],
  )

  // Lazy-check OS permission for status display
  if (osGranted === null) {
    notificationsGranted().then(setOsGranted)
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors["background-weak"] }]}
        contentContainerStyle={styles.content}
      >
        <SettingSection title="Appearance">
          <SettingRow
            icon="color-palette"
            label="Theme"
            description={themeId}
            onPress={() => setShowThemeDialog(true)}
            right={<Ionicons name="chevron-forward" size={20} color={colors["icon-weak-base"]} />}
          />
          <SettingRow
            icon={colorScheme === "dark" ? "moon" : colorScheme === "light" ? "sunny" : "sparkles"}
            label="Dark Mode"
            description={colorScheme === "system" ? "System Default" : colorScheme === "dark" ? "Dark" : "Light"}
            onPress={() => setShowSchemeDialog(true)}
            right={<Ionicons name="chevron-forward" size={20} color={colors["icon-weak-base"]} />}
          />
        </SettingSection>

        <SettingSection title="Security">
          <SettingRow
            icon="finger-print"
            label="Require Biometric to Open"
            description={
              hasBiometrics ? "Use Face ID or Touch ID to unlock the app" : "Biometric authentication not available"
            }
            right={
              <Switch
                value={settings.requireBiometric}
                onValueChange={(value) => updateSettings({ requireBiometric: value })}
                disabled={!hasBiometrics}
                trackColor={{ false: colors["border-weak-base"], true: colors["border-success-base"] }}
              />
            }
          />
          <SettingRow
            icon="lock-closed"
            label="Require Biometric to Send"
            description="Authenticate before sending messages"
            right={
              <Switch
                value={settings.requireBiometricForMessages}
                onValueChange={(value) => updateSettings({ requireBiometricForMessages: value })}
                disabled={!hasBiometrics || !settings.requireBiometric}
                trackColor={{ false: colors["border-weak-base"], true: colors["border-success-base"] }}
              />
            }
          />
          {settings.requireBiometric && (
            <SettingRow
              icon="exit"
              label="Lock App Now"
              description="Require authentication to reopen"
              onPress={lock}
              right={<Ionicons name="chevron-forward" size={20} color={colors["icon-weak-base"]} />}
            />
          )}
        </SettingSection>

        <SettingSection title="Notifications">
          {categories.map((category) => {
            const meta = categoryMeta[category]
            return (
              <SettingRow
                key={category}
                icon={meta.icon as keyof typeof Ionicons.glyphMap}
                label={meta.label}
                description={meta.description}
                right={
                  <Switch
                    value={notifications[category]}
                    onValueChange={(value) => handleToggle(category, value)}
                    trackColor={{ false: colors["border-weak-base"], true: colors["border-success-base"] }}
                  />
                }
              />
            )
          })}
          {osGranted === false && (
            <View style={[styles.settingRow, { borderBottomColor: colors["border-weak-base"] }]}>
              <Text style={[styles.settingDescription, { color: colors["text-on-critical-base"], paddingLeft: 48 }]}>
                Notifications are disabled at the system level. Enable them in Settings to receive alerts.
              </Text>
            </View>
          )}
        </SettingSection>

        <SettingSection title="About">
          <SettingRow icon="information-circle" label="Version" description="1.0.0" />
          <SettingRow
            icon="logo-github"
            label="GitHub"
            description="View source code"
            onPress={() => Linking.openURL("https://github.com/anomalyco/opencode")}
            right={<Ionicons name="open-outline" size={20} color={colors["icon-weak-base"]} />}
          />
          <SettingRow
            icon="document-text"
            label="Documentation"
            description="Learn how to use OpenCode"
            onPress={() => Linking.openURL("https://opencode.ai/docs")}
            right={<Ionicons name="open-outline" size={20} color={colors["icon-weak-base"]} />}
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors["text-weaker"] }]}>OpenCode Mobile</Text>
          <Text style={[styles.footerText, { color: colors["text-weaker"] }]}>
            Connect to your AI coding assistant from anywhere
          </Text>
        </View>
      </ScrollView>

      {/* Theme Selector Dialog */}
      <Dialog visible={showThemeDialog} onDismiss={() => setShowThemeDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Theme</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {Object.keys(themes)
              .sort()
              .map((id, index, array) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.themeItem,
                    { borderBottomColor: colors["border-weak-base"] },
                    index === array.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    setTheme(id)
                    setShowThemeDialog(false)
                  }}
                >
                  <Text style={[styles.themeName, { color: colors["text-base"] }]}>{id}</Text>
                  {themeId === id && <Ionicons name="checkmark-circle" size={20} color={colors["icon-success-base"]} />}
                </TouchableOpacity>
              ))}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Color Scheme Dialog */}
      <Dialog visible={showSchemeDialog} onDismiss={() => setShowSchemeDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
          </DialogHeader>
          <DialogBody scrollable={false}>
            {[
              { value: "system", label: "System Default", icon: "phone-portrait" },
              { value: "light", label: "Light", icon: "sunny" },
              { value: "dark", label: "Dark", icon: "moon" },
            ].map((scheme, index, array) => (
              <TouchableOpacity
                key={scheme.value}
                style={[
                  styles.schemeItem,
                  { borderBottomColor: colors["border-weak-base"] },
                  index === array.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => {
                  setColorScheme(scheme.value as ColorScheme)
                  setShowSchemeDialog(false)
                }}
              >
                <Ionicons name={scheme.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors["icon-base"]} />
                <Text style={[styles.schemeName, { color: colors["text-base"] }]}>{scheme.label}</Text>
                {colorScheme === scheme.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors["icon-success-base"]} />
                )}
              </TouchableOpacity>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    padding: 32,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
  },
  themeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  themeName: {
    fontSize: 15,
    flex: 1,
  },
  schemeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  schemeName: {
    fontSize: 15,
    flex: 1,
  },
})

import { useState, useCallback, useMemo } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet"
import { useTheme } from "@/lib/theme"

interface Props {
  sheetRef: React.RefObject<BottomSheet | null>
  current?: string
  recents: string[]
  serverHome: string | null
  onSwitch: (directory?: string) => void
}

export function DirectorySwitcher({ sheetRef, current, recents, serverHome, onSwitch }: Props) {
  const { colors, mode } = useTheme()
  const [custom, setCustom] = useState("")

  const handleSelect = useCallback(
    (dir?: string) => {
      onSwitch(dir)
      setCustom("")
      sheetRef.current?.close()
    },
    [onSwitch, sheetRef],
  )

  const handleCustomSubmit = useCallback(() => {
    const dir = custom.trim()
    if (!dir) return
    handleSelect(dir)
  }, [custom, handleSelect])

  // Build list: server default + recents (excluding current)
  const items = useMemo(() => {
    const list: Array<{ label: string; dir?: string; active: boolean }> = [
      { label: "Server Default", dir: undefined, active: !current },
    ]
    for (const dir of recents) {
      if (dir === current) continue
      const short = dir.split("/").filter(Boolean).pop() || dir
      list.push({ label: short, dir, active: false })
    }
    return list
  }, [recents, current])

  const shortCurrent = current ? current.split("/").filter(Boolean).pop() || current : null

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["45%", "70%"]}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: colors["background-strong"] }}
      handleIndicatorStyle={{ backgroundColor: colors["border-weak"] }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (idx === -1) setCustom("")
      }}
    >
      <View style={s.header}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors["text-base"] }}>Switch Project</Text>
        {shortCurrent && (
          <View style={s.current}>
            <Ionicons name="folder" size={14} color={colors["primary"]} />
            <Text style={s.currentText} numberOfLines={1}>
              {shortCurrent}
            </Text>
          </View>
        )}
      </View>

      {/* Custom directory input */}
      <View style={s.inputWrap}>
        <BottomSheetTextInput
          style={{
            flex: 1,
            backgroundColor: colors["background-base"],
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 15,
            color: colors["text-base"],
          }}
          placeholder={serverHome ? `${serverHome}/...` : "/path/to/project"}
          placeholderTextColor={colors["text-weak"]}
          value={custom}
          onChangeText={(text) => {
            if (serverHome && text === "~") setCustom(serverHome)
            else if (serverHome && text.startsWith("~/")) setCustom(serverHome + text.slice(1))
            else setCustom(text)
          }}
          onSubmitEditing={handleCustomSubmit}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {custom.trim() && (
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors["text-base"],
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleCustomSubmit}
          >
            <Ionicons name="arrow-forward" size={18} color={colors["text-base"]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick path chips */}
      {serverHome && (
        <View style={s.chips}>
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: mode === "dark" ? "#2a2040" : "#e8e5f0",
              borderRadius: 16,
            }}
            onPress={() => setCustom(serverHome)}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: mode === "dark" ? "#c4b5fd" : "#6d28d9" }}>~</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: mode === "dark" ? "#2a2040" : "#e8e5f0",
              borderRadius: 16,
            }}
            onPress={() => setCustom(serverHome + "/")}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: mode === "dark" ? "#c4b5fd" : "#6d28d9" }}>~/</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent directories */}
      <BottomSheetFlatList
        data={items}
        keyExtractor={(item: (typeof items)[number], i: number) => item.dir || `default-${i}`}
        renderItem={({ item }: { item: (typeof items)[number] }) => (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors["border-base"],
              gap: 12,
              backgroundColor: item.active ? (mode === "dark" ? "#1e1b2e" : "#f5f3ff") : "transparent",
            }}
            onPress={() => handleSelect(item.dir)}
          >
            <View style={s.rowIcon}>
              <Ionicons
                name={item.dir ? "folder-outline" : "server-outline"}
                size={20}
                color={item.active ? "#8b5cf6" : colors["text-weak"]}
              />
            </View>
            <View style={s.rowContent}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  color: item.active ? "#8b5cf6" : colors["text-base"],
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {item.dir && (
                <Text style={{ fontSize: 12, color: colors["text-weak"], marginTop: 1 }} numberOfLines={1}>
                  {item.dir}
                </Text>
              )}
              {!item.dir && (
                <Text style={{ fontSize: 12, color: colors["text-weak"] }}>Uses server's working directory</Text>
              )}
            </View>
            {item.active && <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />}
          </TouchableOpacity>
        )}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          items.length > 1 ? (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors["text-weak"],
                textTransform: "uppercase",
                letterSpacing: 0.5,
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: 8,
              }}
            >
              Recent Projects
            </Text>
          ) : null
        }
      />
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  current: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentText: {
    fontSize: 13,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  list: { paddingBottom: 40 },
  rowIcon: { width: 28, alignItems: "center" },
  rowContent: { flex: 1 },
})

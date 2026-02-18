import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useConnections } from "../../src/stores/connections"
import { useSettings } from "../../src/stores/settings"
import { useTheme } from "@/lib/theme"
import { Chip } from "@/components/ui/chip"
import type { ServerConnection } from "../../src/lib/types"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const

function ConnectionItem({
  connection,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  connection: ServerConnection
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { colors } = useTheme()
  const typeIcon = connection.type === "local" ? "wifi" : connection.type === "tunnel" ? "globe" : "cloud"

  const handleLongPress = () => {
    Alert.alert(connection.name, "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: onEdit },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ])
  }

  return (
    <TouchableOpacity
      style={[
        styles.connectionItem,
        { borderBottomColor: colors["border-weak-base"] },
        isActive && { backgroundColor: colors["surface-weak"] },
      ]}
      onPress={onSelect}
      onLongPress={handleLongPress}
    >
      <View style={[styles.connectionIcon, { backgroundColor: colors["surface-weak"] }]}>
        <Ionicons name={typeIcon} size={24} color={isActive ? colors["icon-success-base"] : colors["icon-weak-base"]} />
      </View>
      <View style={styles.connectionContent}>
        <View style={styles.connectionHeader}>
          <Text style={[styles.connectionName, { color: colors["text-base"] }]}>{connection.name}</Text>
          {isActive && (
            <Chip variant="filled" style={{ backgroundColor: colors["surface-success-strong"] }}>
              Active
            </Chip>
          )}
        </View>
        <Text style={[styles.connectionUrl, { color: colors["text-weak"] }]} numberOfLines={1}>
          {connection.url}
        </Text>
        {connection.lastConnected && (
          <Text style={[styles.connectionMeta, { color: colors["text-weak"] }]}>
            Last connected: {new Date(connection.lastConnected).toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors["text-base"]} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

export default function ConnectionsScreen() {
  const { colors } = useTheme()
  const { connections, activeConnection, setActiveConnection, removeConnection } = useConnections()
  const { pageSize, setPageSize } = useSettings()

  const handleDelete = (connection: ServerConnection) => {
    Alert.alert("Delete Connection", `Are you sure you want to delete "${connection.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeConnection(connection.id),
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors["background-base"] }]} edges={["top"]}>
      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConnectionItem
            connection={item}
            isActive={activeConnection?.id === item.id}
            onSelect={() => setActiveConnection(item.id)}
            onEdit={() => router.push(`/connection/${item.id}`)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="server-outline" size={64} color={colors["icon-disabled"]} />
            <Text style={[styles.emptyTitle, { color: colors["text-base"] }]}>No Connections</Text>
            <Text style={[styles.emptySubtitle, { color: colors["text-weak"] }]}>
              Add a connection to your OpenCode server
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={[styles.header, { borderBottomColor: colors["border-weak-base"] }]}>
            <Text style={[styles.headerText, { color: colors["text-weak"] }]}>
              Tap to switch, long press for options
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.settingsSection, { borderTopColor: colors["border-weak-base"] }]}>
            <Text style={[styles.settingsTitle, { color: colors["text-base"] }]}>Preferences</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Ionicons name="layers-outline" size={18} color={colors["icon-weak-base"]} />
                <Text style={[styles.settingText, { color: colors["text-base"] }]}>Messages per page</Text>
              </View>
              <View style={styles.pagePicker}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pageOption,
                      {
                        borderColor: colors["border-weak-base"],
                        backgroundColor: colors["surface-weak"],
                      },
                      pageSize === size && {
                        backgroundColor: colors["surface-interactive-base"],
                        borderColor: colors["border-interactive-base"],
                      },
                    ]}
                    onPress={() => setPageSize(size)}
                  >
                    <Text
                      style={[
                        styles.pageOptionText,
                        { color: colors["text-weak"] },
                        pageSize === size && { color: colors["text-on-interactive-base"] },
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={[styles.settingHint, { color: colors["text-weaker"] }]}>
              How many messages to load when opening a session. Lower = faster.
            </Text>
          </View>
        }
        contentContainerStyle={connections.length === 0 ? styles.emptyContent : undefined}
      />

      {/* FAB to add connection */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors["surface-interactive-base"] }]}
        onPress={() => router.push("/connection/add")}
      >
        <Ionicons name="add" size={28} color={colors["text-on-interactive-base"]} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 13,
  },
  connectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  connectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  connectionContent: {
    flex: 1,
  },
  connectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: "600",
  },
  connectionUrl: {
    fontSize: 13,
    marginTop: 2,
  },
  connectionMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  emptyContent: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  settingsSection: {
    padding: 16,
    borderTopWidth: 1,
    marginTop: 16,
    gap: 10,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingText: {
    fontSize: 14,
  },
  pagePicker: {
    flexDirection: "row",
    gap: 6,
  },
  pageOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageOptionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  settingHint: {
    fontSize: 12,
  },
})

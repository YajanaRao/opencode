import { useEffect, useCallback, useState, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSessions } from "../../src/stores/sessions"
import { useConnections } from "../../src/stores/connections"
import type BottomSheet from "@gorhom/bottom-sheet"
import type { Session } from "../../src/lib/sdk"
import { DirectorySwitcher } from "../../src/components/chat"
import { useTheme } from "@/lib/theme"

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`

  return date.toLocaleDateString()
}

function SessionItem({
  session,
  onRename,
  onDelete,
}: {
  session: Session
  onRename: () => void
  onDelete: () => void
}) {
  const { colors } = useTheme()
  const onPress = () => {
    router.push(`/session/${session.id}`)
  }

  const onLongPress = () => {
    Alert.alert(session.title || "Untitled Session", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Rename", onPress: onRename },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ])
  }

  // Extract short directory name from session
  const shortDir = session.directory ? session.directory.split("/").filter(Boolean).pop() : null

  return (
    <TouchableOpacity
      style={[styles.sessionItem, { backgroundColor: colors["surface-base"] }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionTitle, { color: colors["text-base"] }]} numberOfLines={1}>
            {session.title || "Untitled Session"}
          </Text>
        </View>
        <View style={styles.sessionMetaRow}>
          <Text style={[styles.sessionMeta, { color: colors["text-weak"] }]}>
            {formatTime(session.time.updated)}
            {session.summary && ` · ${session.summary.files} files`}
          </Text>
          {shortDir && (
            <View style={[styles.sessionDirBadge, { backgroundColor: colors["surface-weak"] }]}>
              <Ionicons name="folder-outline" size={12} color={colors["text-weak"]} />
              <Text style={[styles.sessionDirText, { color: colors["text-weak"] }]}>{shortDir}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors["icon-weak-base"]} />
    </TouchableOpacity>
  )
}

// Get short directory name (last folder or project name)
function getShortPath(
  project: { path?: { cwd?: string; root?: string; absolute?: string }; name?: string } | null | undefined,
): string {
  if (!project) return ""
  if (project.name) return project.name
  if (!project.path?.absolute) return ""
  const parts = project.path.absolute.split("/").filter(Boolean)
  return parts[parts.length - 1] || project.path.absolute
}

export default function SessionsScreen() {
  const { colors } = useTheme()
  const [showNewSession, setShowNewSession] = useState(false)
  const [customDir, setCustomDir] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [renaming, setRenaming] = useState<Session | null>(null)
  const [renameText, setRenameText] = useState("")

  const { sessions, isLoading, error, loadSessions, createSession, deleteSession } = useSessions()
  const {
    activeConnection,
    client,
    currentProject,
    serverHome,
    refreshProject,
    clientForDirectory,
    switchDirectory,
    addRecentDirectory,
    recentDirectories,
  } = useConnections()
  const dirSheetRef = useRef<BottomSheet>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleSwitchDirectory = useCallback(
    async (dir?: string) => {
      await switchDirectory(dir)
      loadSessions()
      refreshProject()
    },
    [switchDirectory, loadSessions, refreshProject],
  )

  useEffect(() => {
    if (client) {
      loadSessions()
      refreshProject()
    }
  }, [client])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadSessions(), refreshProject()])
    setRefreshing(false)
  }, [])

  const handleRename = useCallback((session: Session) => {
    setRenameText(session.title || "")
    setRenaming(session)
  }, [])

  const submitRename = useCallback(async () => {
    const title = renameText.trim()
    if (!title || !renaming || !client) return
    await client.session.update(renaming.id, { title })
    setRenaming(null)
    setRenameText("")
    loadSessions()
  }, [renaming, renameText, client, loadSessions])

  const handleDelete = useCallback(
    (session: Session) => {
      Alert.alert("Delete Session", `Delete "${session.title || "Untitled Session"}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSession(session.id)
          },
        },
      ])
    },
    [deleteSession],
  )

  const onCreateSession = async () => {
    const session = await createSession()
    if (session) {
      router.push(`/session/${session.id}`)
    }
  }

  const onCreateInDirectory = async (dir?: string) => {
    if (!activeConnection) return

    setIsCreating(true)

    // If a custom directory is specified, use a one-off client for that directory
    // so we don't mutate the connection's default project
    if (dir && dir.trim()) {
      const dirClient = clientForDirectory(dir.trim())
      if (!dirClient) {
        setIsCreating(false)
        return
      }
      try {
        const session = await dirClient.session.create({})
        addRecentDirectory(dir.trim())
        setIsCreating(false)
        setShowNewSession(false)
        setCustomDir("")
        if (session) {
          router.push({ pathname: `/session/[id]`, params: { id: session.id, directory: dir.trim() } })
        }
      } catch (error) {
        console.error("Failed to create session in directory:", error)
        Alert.alert("Error", "Failed to create session in that directory.")
        setIsCreating(false)
      }
      return
    }

    const session = await createSession()
    setIsCreating(false)
    setShowNewSession(false)
    setCustomDir("")
    if (session) {
      router.push(`/session/${session.id}`)
    }
  }

  const onFabPress = () => {
    // Quick create in current project
    onCreateSession()
  }

  const onFabLongPress = () => {
    // Show modal with more options
    setCustomDir("")
    setShowNewSession(true)
  }

  if (!activeConnection) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: colors["background-base"] }]} edges={["top"]}>
        <Ionicons name="server-outline" size={64} color={colors["icon-weak-base"]} />
        <Text style={[styles.emptyTitle, { color: colors["text-base"] }]}>No Connection</Text>
        <Text style={[styles.emptySubtitle, { color: colors["text-weak"] }]}>
          Add a server connection to get started
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors["surface-interactive-base"] }]}
          onPress={() => router.push("/connection/add")}
        >
          <Text style={[styles.addButtonText, { color: colors["text-on-interactive-base"] }]}>Add Connection</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const shortPath = getShortPath(currentProject)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors["background-base"] }]} edges={["top"]}>
      {/* Connection indicator — tap to switch project */}
      <TouchableOpacity
        style={[styles.connectionBar]}
        onPress={() => dirSheetRef.current?.expand()}
        onLongPress={() => router.push("/(tabs)/connections")}
        activeOpacity={0.7}
      >
        <View style={styles.connectionInfo}>
          <View style={[styles.connectionDot, { backgroundColor: colors["text-base"] }]} />
          <Text style={[styles.connectionName, { color: colors["text-strong"] }]} numberOfLines={1}>
            {activeConnection.name}
          </Text>
          {shortPath && (
            <>
              <Ionicons name="folder" size={14} color={colors["icon-base"]} />
              <Text style={[styles.projectPath, { color: colors["text-weak"] }]} numberOfLines={1}>
                {shortPath}
              </Text>
            </>
          )}
        </View>
        <Ionicons name="swap-horizontal-outline" size={16} color={colors["icon-weak-base"]} />
      </TouchableOpacity>

      {error && (
        <View
          style={[
            styles.errorBar,
            { backgroundColor: colors["surface-critical-weak"], borderBottomColor: colors["border-critical-base"] },
          ]}
        >
          <Text style={[styles.errorText, { color: colors["text-on-critical-base"] }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionItem session={item} onRename={() => handleRename(item)} onDelete={() => handleDelete(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors["icon-base"]} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors["icon-base"]} />
            </View>
          ) : (
            <View style={styles.emptyList}>
              <Text style={[styles.emptyListText, { color: colors["text-weak"] }]}>No sessions yet</Text>
            </View>
          )
        }
        contentContainerStyle={sessions.length === 0 ? styles.emptyContent : undefined}
      />

      {/* FAB to create new session */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors["surface-interactive-base"] }]}
        onPress={onFabPress}
        onLongPress={onFabLongPress}
        delayLongPress={500}
      >
        <Ionicons name="add" size={28} color={colors["text-on-interactive-base"]} />
      </TouchableOpacity>

      {/* New Session Info Modal */}
      <Modal visible={showNewSession} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowNewSession(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors["surface-base"] }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors["text-base"] }]}>New Session</Text>
              <TouchableOpacity onPress={() => setShowNewSession(false)}>
                <Ionicons name="close" size={24} color={colors["text-base"]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Current directory */}
              <Text style={[styles.modalLabel, { color: colors["text-weak"] }]}>Current Directory</Text>
              <View style={[styles.modalDirBox, { backgroundColor: colors["surface-weak"] }]}>
                <Ionicons name="folder" size={20} color={colors["icon-weak-base"]} />
                <Text style={[styles.modalDirText, { color: colors["text-base"] }]} numberOfLines={2}>
                  {currentProject?.path?.absolute || activeConnection?.directory || "Server default"}
                </Text>
              </View>

              {/* Custom directory input */}
              <Text style={[styles.modalLabel, { color: colors["text-weak"], marginTop: 16 }]}>
                Or use a different folder
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors["surface-weak"], color: colors["text-base"] }]}
                placeholder={serverHome ? `${serverHome}/...` : "/path/to/project"}
                placeholderTextColor={colors["text-weak"]}
                value={customDir}
                onChangeText={(text) => {
                  // Expand ~ to server home directory
                  if (serverHome && text.startsWith("~/")) {
                    setCustomDir(serverHome + text.slice(1))
                  } else if (serverHome && text === "~") {
                    setCustomDir(serverHome)
                  } else {
                    setCustomDir(text)
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {/* Quick path shortcuts */}
              {serverHome && (
                <View style={styles.pathChips}>
                  <TouchableOpacity
                    style={[styles.pathChip, { backgroundColor: colors["surface-interactive-weak"] }]}
                    onPress={() => setCustomDir(serverHome)}
                  >
                    <Text style={[styles.pathChipText, { color: colors["text-interactive-base"] }]}>~</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pathChip, { backgroundColor: colors["surface-interactive-weak"] }]}
                    onPress={() => setCustomDir(serverHome + "/")}
                  >
                    <Text style={[styles.pathChipText, { color: colors["text-interactive-base"] }]}>~/</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              {customDir.trim() ? (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    { backgroundColor: colors["surface-interactive-base"] },
                    styles.modalButtonFull,
                  ]}
                  onPress={() => onCreateInDirectory(customDir)}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color={colors["text-on-interactive-base"]} />
                  ) : (
                    <Text style={[styles.modalButtonTextPrimary, { color: colors["text-on-interactive-base"] }]}>
                      Create in {customDir.split("/").filter(Boolean).pop() || customDir}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    { backgroundColor: colors["surface-interactive-base"] },
                    styles.modalButtonFull,
                  ]}
                  onPress={() => onCreateInDirectory()}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color={colors["text-on-interactive-base"]} />
                  ) : (
                    <Text style={[styles.modalButtonTextPrimary, { color: colors["text-on-interactive-base"] }]}>
                      Create Session
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rename modal */}
      <Modal visible={!!renaming} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { justifyContent: "center" }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setRenaming(null)} />
          <View style={[styles.renameCard, { backgroundColor: colors["surface-base"] }]}>
            <Text style={[styles.renameTitle, { color: colors["text-base"] }]}>Rename Session</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors["surface-weak"], color: colors["text-base"] }]}
              value={renameText}
              onChangeText={setRenameText}
              onSubmitEditing={submitRename}
              returnKeyType="done"
              autoFocus
              selectTextOnFocus
              autoCapitalize="sentences"
              autoCorrect={false}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={[styles.renameBtn, styles.renameBtnCancel]} onPress={() => setRenaming(null)}>
                <Text style={[styles.renameBtnCancelText, { color: colors["text-weak"] }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.renameBtn,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors["surface-interactive-base"] },
                ]}
                onPress={submitRename}
                disabled={!renameText.trim()}
              >
                <Text style={[styles.modalButtonTextPrimary, { color: colors["text-on-interactive-base"] }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setRenaming(null)} />
        </KeyboardAvoidingView>
      </Modal>

      {/* Directory switcher bottom sheet */}
      <DirectorySwitcher
        sheetRef={dirSheetRef}
        current={activeConnection?.directory}
        recents={recentDirectories}
        serverHome={serverHome}
        onSwitch={handleSwitchDirectory}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionName: {
    fontSize: 14,
    fontWeight: "600",
  },
  projectPath: {
    fontSize: 13,
    flex: 1,
  },
  errorBar: {
    padding: 12,
    borderBottomWidth: 1,
  },
  errorText: {
    fontSize: 14,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 13,
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionDirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionDirText: {
    fontSize: 11,
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
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  addButtonText: {
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyListText: {
    fontSize: 16,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalBody: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalDirBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  modalDirText: {
    fontSize: 15,
    flex: 1,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  pathChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  pathChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pathChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  modalButtonPrimary: {},
  modalButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalButtonFull: {
    flex: 0,
    width: "100%",
  },
  // Rename modal
  renameCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 32,
    gap: 16,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  renameBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  renameBtnCancel: {
    backgroundColor: "transparent",
  },
  renameBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
})

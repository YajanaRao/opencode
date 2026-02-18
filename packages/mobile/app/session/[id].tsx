import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native"
import { useLocalSearchParams, Stack, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useKeyboardHandler } from "react-native-keyboard-controller"
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as Clipboard from "expo-clipboard"
import type BottomSheet from "@gorhom/bottom-sheet"
import {
  MessageBubble,
  PermissionPrompt,
  QuestionPrompt,
  StatusIndicator,
  SlashPopover,
  ModelPicker,
  ImageAttachments,
  SessionInfo,
  type SlashCommand,
  type Attachment,
} from "../../src/components/chat"
import { AtPopover, type FileItem } from "../../src/components/chat/AtPopover"
import { useSessions } from "../../src/stores/sessions"
import { useEvents, refreshPending } from "../../src/stores/events"
import { useConnections } from "../../src/stores/connections"
import { useAuth } from "../../src/stores/auth"
import { useCatalog } from "../../src/stores/catalog"
import { useSpeech } from "../../src/lib/speech"
import { useTheme } from "@/lib/theme"

// --- Builtin slash commands ---
const BUILTIN_COMMANDS: SlashCommand[] = [
  {
    trigger: "new",
    title: "New Session",
    description: "Start a new session",
    icon: "add-circle-outline",
    type: "builtin",
  },
  {
    trigger: "model",
    title: "Switch Model",
    description: "Choose a different model",
    icon: "hardware-chip-outline",
    type: "builtin",
  },
  {
    trigger: "agent",
    title: "Switch Agent",
    description: "Cycle to next agent",
    icon: "person-outline",
    type: "builtin",
  },
  {
    trigger: "compact",
    title: "Compact",
    description: "Summarize conversation",
    icon: "contract-outline",
    type: "builtin",
  },
  { trigger: "clear", title: "Clear", description: "Clear the session", icon: "trash-outline", type: "builtin" },
]

function getShortDir(dir?: string): string | null {
  if (!dir) return null
  const parts = dir.split("/").filter(Boolean)
  return parts[parts.length - 1] || null
}

// Custom hook for smooth keyboard animation
function useKeyboardAnimation() {
  const height = useSharedValue(0)

  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet"
        height.value = Math.max(event.height, 0)
      },
    },
    [],
  )

  return { height }
}

export default function SessionScreen() {
  const { id, directory } = useLocalSearchParams<{ id: string; directory?: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const insets = useSafeAreaInsets()
  const { height: keyboardHeight } = useKeyboardAnimation()

  const flatListRef = useRef<FlatList>(null)
  const modelSheetRef = useRef<BottomSheet>(null)
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showInfo, setShowInfo] = useState(false)

  const {
    currentSession,
    messages,
    parts,
    isLoading,
    loadingMore,
    hasMore,
    selectSession,
    sendMessage,
    abortSession,
    loadOlderMessages,
  } = useSessions()

  // Derive sending state for this specific session
  const isSending = useSessions((s) => !!(currentSession && s.sending[currentSession.id]))

  const { authenticateForMessage } = useAuth()
  const { client } = useConnections()

  // Catalog
  const catalog = useCatalog()
  const agents = Array.isArray(catalog.agents) ? catalog.agents : []
  const serverCommands = Array.isArray(catalog.commands) ? catalog.commands : []
  const providers = Array.isArray(catalog.providers) ? catalog.providers : []
  const agent = catalog.agent || ""
  const model = catalog.model
  const setModel = catalog.setModel
  const cycleAgent = catalog.cycleAgent

  // Permission & question state
  const sessionID = currentSession?.id
  const permissions = useEvents((s) => (sessionID ? s.permissions[sessionID] : undefined)) || []
  const questions = useEvents((s) => (sessionID ? s.questions[sessionID] : undefined)) || []

  const shortDir = getShortDir(currentSession?.directory)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Voice input — transcript appends to the text input on completion
  const speech = useSpeech(
    useCallback((text: string) => {
      setInput((prev) => (prev ? prev + " " + text : text))
    }, []),
  )

  // Slash command state
  const slashActive = input.startsWith("/") && !input.includes(" ")
  const slashQuery = slashActive ? input.slice(1) : ""

  // @ file mention state
  const [atActive, setAtActive] = useState(false)
  const [atQuery, setAtQuery] = useState("")
  const [atResults, setAtResults] = useState<FileItem[]>([])
  const [atLoading, setAtLoading] = useState(false)
  const atControllerRef = useRef<AbortController | null>(null)

  const allCommands = useMemo<SlashCommand[]>(() => {
    const custom: SlashCommand[] = serverCommands.map((cmd) => ({
      trigger: cmd.name,
      title: cmd.name,
      description: cmd.description,
      icon: "code-slash-outline",
      type: "custom",
    }))
    return [...custom, ...BUILTIN_COMMANDS]
  }, [serverCommands])

  // Inverted FlatList: data is reversed (newest first) so newest renders at bottom
  const messageData = useMemo(
    () =>
      (messages || [])
        .map((msg) => ({
          message: msg,
          parts: (parts && parts[msg.id]) || [],
        }))
        .reverse(),
    [messages, parts],
  )

  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated })
  }, [])

  useEffect(() => {
    if (!id) return
    selectSession(id, directory).then(() => {
      // Re-fetch pending permissions/questions from the server to recover from
      // missed SSE events or failed optimistic removals
      if (client) refreshPending(client, id)
    })
  }, [id])

  // Sync model chip from latest assistant message
  useEffect(() => {
    if (!messages || messages.length === 0) return
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "assistant" && msg.providerID && msg.modelID) {
        setModel({ providerID: msg.providerID, modelID: msg.modelID })
        return
      }
      if (msg.role === "user" && msg.model) {
        setModel(msg.model)
        return
      }
    }
  }, [currentSession?.id, messages?.length])

  // Slash command handler
  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.type === "builtin") {
        switch (cmd.trigger) {
          case "new":
            router.back()
            return
          case "model":
            setInput("")
            modelSheetRef.current?.expand()
            return
          case "agent":
            setInput("")
            cycleAgent()
            return
          case "compact":
            setInput("")
            return
          case "clear":
            setInput("")
            return
        }
      }
      setInput(`/${cmd.trigger} `)
    },
    [router, cycleAgent],
  )

  // @ file mention detection and search
  useEffect(() => {
    const atMatch = input.match(/@(\S*)$/)

    if (atMatch) {
      const query = atMatch[1]
      setAtQuery(query)
      setAtActive(true)

      // Cancel previous search
      atControllerRef.current?.abort()

      const controller = new AbortController()
      atControllerRef.current = controller

      // Debounce search
      const timeoutId = setTimeout(() => {
        if (!client) return

        setAtLoading(true)
        client.find
          .files({ query, dirs: "true", limit: 10 }, controller.signal)
          .then((paths) => {
            const items: FileItem[] = paths.map((path) => ({
              path,
              display: path,
            }))
            setAtResults(items)
            setAtLoading(false)
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.error("File search failed:", err)
              setAtLoading(false)
            }
          })
      }, 200)

      return () => {
        clearTimeout(timeoutId)
        controller.abort()
      }
    } else {
      setAtActive(false)
      setAtQuery("")
      setAtResults([])
    }
  }, [input, client])

  // @ file selection handler
  const handleAtSelect = useCallback(
    (file: FileItem) => {
      // Replace the @query with @filepath + space
      const newInput = input.replace(/@(\S*)$/, `@${file.display} `)
      setInput(newInput)

      // Close popover
      setAtActive(false)
    },
    [input],
  )

  // --- Image picking ---

  // Convert any image (including HEIC/HEIF from iOS) to guaranteed JPEG bytes
  const MAX_DIMENSION = 1568 // Anthropic recommended max
  async function toJpeg(uri: string, width: number, height: number): Promise<Attachment> {
    const actions: ImageManipulator.Action[] = []
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      actions.push({ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } })
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.8,
      base64: true,
    })
    return {
      uri: result.uri,
      mime: "image/jpeg",
      filename: "image.jpg",
      width: result.width,
      height: result.height,
      base64: result.base64 || undefined,
    }
  }

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1, // full quality - we compress in manipulator
    })
    if (result.canceled) return
    const items = await Promise.all(result.assets.map((a) => toJpeg(a.uri, a.width, a.height)))
    setAttachments((prev) => [...prev, ...items])
  }, [])

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera access is required to take photos.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 })
    if (result.canceled) return
    const a = result.assets[0]
    const item = await toJpeg(a.uri, a.width, a.height)
    setAttachments((prev) => [...prev, item])
  }, [])

  const pasteFromClipboard = useCallback(async () => {
    // Try image first
    const hasImage = await Clipboard.hasImageAsync()
    if (hasImage) {
      const img = await Clipboard.getImageAsync({ format: "png" })
      if (img?.data) {
        const uri = img.data.startsWith("data:") ? img.data : `data:image/png;base64,${img.data}`
        setAttachments((prev) => [
          ...prev,
          {
            uri,
            mime: "image/png",
            filename: "clipboard.png",
            width: img.size.width,
            height: img.size.height,
          },
        ])
        return
      }
    }
    // Fall back to text
    const hasText = await Clipboard.hasStringAsync()
    if (hasText) {
      const text = await Clipboard.getStringAsync()
      if (text) {
        setInput((prev) => prev + text)
        return
      }
    }
    Alert.alert("Empty clipboard", "Clipboard does not contain text or an image.")
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // --- Send ---
  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return
    const authenticated = await authenticateForMessage()
    if (!authenticated) return

    const text = input.trim()
    const files = [...attachments]

    // Parse @filepath mentions from input text
    const atMatches = text.match(/@(\S+)/g) || []
    const context = atMatches.map((match) => ({
      path: match.slice(1), // Remove @ prefix
      display: match.slice(1),
    }))

    setInput("")
    setAttachments([])

    // Server slash commands (no attachments for commands)
    if (text.startsWith("/") && files.length === 0 && context.length === 0) {
      const [cmdName, ...args] = text.split(" ")
      const name = cmdName.slice(1)
      const match = serverCommands.find((c) => c.name === name)
      if (match && client && currentSession) {
        client.session
          .command(currentSession.id, {
            command: name,
            arguments: args.join(" "),
            agent,
            model: model ? `${model.providerID}/${model.modelID}` : undefined,
          })
          .catch((err) => console.error("Command failed:", err))
        return
      }
    }

    // Messages are queued server-side when the session is busy.
    // No need to abort - just send and it will be processed after current response.
    await sendMessage(text, model || undefined, agent || undefined, files, context)
  }

  // In inverted mode, offset 0 = bottom. Show scroll button when scrolled away from bottom.
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent
    setShowScrollButton(contentOffset.y > 200)
  }, [])

  // Debounce: onEndReached can fire multiple times during a single scroll gesture
  const loadingTriggered = useRef(false)
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loadingTriggered.current) {
      loadingTriggered.current = true
      loadOlderMessages()
    }
  }, [hasMore, loadingMore, loadOlderMessages])

  // Reset trigger when loading finishes
  useEffect(() => {
    if (!loadingMore) loadingTriggered.current = false
  }, [loadingMore])

  const handlePermissionReply = async (requestID: string, reply: "once" | "always" | "reject") => {
    if (!client || !sessionID) return
    // Snapshot for rollback
    const snapshot = useEvents.getState().permissions[sessionID] || []
    // Optimistically remove from UI
    useEvents.setState((state) => ({
      permissions: {
        ...state.permissions,
        [sessionID]: snapshot.filter((p) => p.id !== requestID),
      },
    }))
    try {
      await client.permission.reply(requestID, reply)
    } catch (err) {
      console.error("Permission reply failed:", err)
      // Restore the prompt so the user can retry
      useEvents.setState((state) => ({
        permissions: { ...state.permissions, [sessionID]: snapshot },
      }))
      Alert.alert("Reply Failed", "Could not send your response. Please try again.")
    }
  }

  const handleQuestionReply = async (requestID: string, answers: string[][]) => {
    if (!client || !sessionID) return
    const snapshot = useEvents.getState().questions[sessionID] || []
    useEvents.setState((state) => ({
      questions: {
        ...state.questions,
        [sessionID]: snapshot.filter((q) => q.id !== requestID),
      },
    }))
    try {
      await client.question.reply(requestID, answers)
    } catch (err) {
      console.error("Question reply failed:", err)
      useEvents.setState((state) => ({
        questions: { ...state.questions, [sessionID]: snapshot },
      }))
      Alert.alert("Reply Failed", "Could not send your response. Please try again.")
    }
  }

  const handleQuestionReject = async (requestID: string) => {
    if (!client || !sessionID) return
    const snapshot = useEvents.getState().questions[sessionID] || []
    useEvents.setState((state) => ({
      questions: {
        ...state.questions,
        [sessionID]: snapshot.filter((q) => q.id !== requestID),
      },
    }))
    try {
      await client.question.reject(requestID)
    } catch (err) {
      console.error("Question reject failed:", err)
      useEvents.setState((state) => ({
        questions: { ...state.questions, [sessionID]: snapshot },
      }))
      Alert.alert("Reject Failed", "Could not send your response. Please try again.")
    }
  }

  const handleModelSelect = useCallback(
    (providerID: string, modelID: string) => {
      setModel({ providerID, modelID })
    },
    [setModel],
  )

  // Current agent display
  const currentAgent = agents.find((a) => a.name === agent)
  const agentColor = currentAgent?.color || colors["secondary"]
  const modelLabel = model?.modelID ? model.modelID.split("/").pop() || model.modelID : "default"

  // Animated style for keyboard spacer
  // Subtract the bottom safe area inset since input container already has padding for it
  const keyboardSpacerStyle = useAnimatedStyle(() => {
    return {
      height: Math.max(0, keyboardHeight.value - insets.bottom),
    }
  }, [insets.bottom])

  return (
    <>
      <Stack.Screen
        options={{
          title: currentSession?.title || "Session",
          headerRight: () => (
            <View style={s.headerRight}>
              {shortDir && (
                <View style={[s.dirBadge, { backgroundColor: colors["surface-base"] }]}>
                  <Ionicons name="folder-outline" size={14} color={colors["text-base"]} />
                  <Text style={[s.dirText, { color: colors["text-base"] }]}>{shortDir}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setShowInfo((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showInfo ? "stats-chart" : "stats-chart-outline"}
                  size={20}
                  color={showInfo ? colors["primary"] : colors["text-base"]}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={[s.container, { backgroundColor: colors["background-base"] }]}>
        {/* Session info pulldown */}
        <SessionInfo
          session={currentSession}
          messages={messages || []}
          providers={providers}
          visible={showInfo}
          isDark={isDark}
          hasMore={hasMore}
          loadingAll={loadingMore}
          onLoadAll={() => {
            if (hasMore && !loadingMore) loadOlderMessages()
          }}
          onScrollToTop={() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }}
          onClose={() => setShowInfo(false)}
        />

        {isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={colors["neutral"]} />
          </View>
        ) : (
          <View style={s.listWrap}>
            <FlatList
              ref={flatListRef}
              data={messageData}
              inverted
              keyExtractor={(item) => item.message.id}
              renderItem={({ item }) => <MessageBubble message={item.message} parts={item.parts} />}
              contentContainerStyle={s.messageList}
              onScroll={handleScroll}
              scrollEventThrottle={100}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              // Prevent jump when older messages are prepended
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              ListFooterComponent={
                loadingMore ? (
                  <View style={s.loadingMore}>
                    <ActivityIndicator size="small" color={colors["icon-base"]} />
                    <Text style={{ fontSize: 13, color: colors["text-weak"] }}>Loading older messages...</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={s.emptyInverted}>
                  <Ionicons name="chatbubble-outline" size={48} color={colors["icon-weak-base"]} />
                  <Text style={{ fontSize: 16, color: colors["text-weak"], marginTop: 12 }}>Start a conversation</Text>
                  <Text style={{ fontSize: 13, color: colors["text-weaker"], marginTop: 4 }}>Type / for commands</Text>
                </View>
              }
            />
            {showScrollButton && (
              <TouchableOpacity
                style={[s.scrollBtn, { backgroundColor: colors["surface-raised-base"] }]}
                onPress={() => scrollToBottom(true)}
              >
                <Ionicons name="chevron-down" size={24} color={colors["text-base"]} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Status */}
        {currentSession && <StatusIndicator sessionID={currentSession.id} isDark={isDark} />}

        {/* Permissions */}
        {permissions.map((perm) => (
          <PermissionPrompt
            key={perm.id}
            permission={perm}
            isDark={isDark}
            onReply={(reply) => handlePermissionReply(perm.id, reply)}
          />
        ))}

        {/* Questions */}
        {questions.map((q) => (
          <QuestionPrompt
            key={q.id}
            request={q}
            isDark={isDark}
            onReply={(answers) => handleQuestionReply(q.id, answers)}
            onReject={() => handleQuestionReject(q.id)}
          />
        ))}

        {/* Slash popover */}
        {slashActive && (
          <SlashPopover query={slashQuery} commands={allCommands} isDark={isDark} onSelect={handleSlashSelect} />
        )}

        {/* @ file mention popover */}
        <AtPopover visible={atActive} query={atQuery} files={atResults} loading={atLoading} onSelect={handleAtSelect} />

        {/* Agent/model toolbar */}
        <View
          style={[s.toolbar, { backgroundColor: colors["surface-raised-base"], borderTopColor: colors["surface"] }]}
        >
          <TouchableOpacity
            style={[s.agentChip, { backgroundColor: colors["background-base"], borderColor: agentColor }]}
            onPress={() => cycleAgent()}
            onLongPress={() => cycleAgent(-1)}
          >
            <View style={[s.agentDot, { backgroundColor: agentColor }]} />
            <Text style={[s.agentLabel, { color: colors["text-base"] }]}>{agent || "build"}</Text>
            <Ionicons name="swap-horizontal-outline" size={12} color={colors["icon-weak-base"]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modelChip, { backgroundColor: colors["background-base"] }]}
            onPress={() => modelSheetRef.current?.expand()}
          >
            <Ionicons name="hardware-chip-outline" size={14} color={colors["text-base"]} />
            <Text style={[s.modelLabel, { color: colors["text-base"] }]} numberOfLines={1}>
              {modelLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attachment preview */}
        <ImageAttachments attachments={attachments} isDark={isDark} onRemove={removeAttachment} />

        {/* Input */}
        <View
          style={[
            s.inputContainer,
            { paddingBottom: Math.max(12, insets.bottom), backgroundColor: colors["surface-raised-base"] },
          ]}
        >
          <View style={s.inputRow}>
            {/* Attach button */}
            <TouchableOpacity style={s.attachBtn} onPress={pickFromLibrary} onLongPress={pickFromCamera}>
              <Ionicons name="add-circle-outline" size={26} color={colors["text-weak"]} />
            </TouchableOpacity>

            {/* Clipboard paste button */}
            <TouchableOpacity style={s.attachBtn} onPress={pasteFromClipboard}>
              <Ionicons name="clipboard-outline" size={22} color={colors["text-weak"]} />
            </TouchableOpacity>

            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors["surface-weak"],
                  color: colors["text-base"],
                },
                speech.listening && { borderWidth: 1, borderColor: colors["border-weak-base"] },
              ]}
              placeholder={speech.listening ? "Listening..." : isSending ? "Send a follow-up..." : "Type a message..."}
              placeholderTextColor={speech.listening ? colors["text-base"] : colors["text-weak"]}
              value={speech.listening ? speech.transcript : input}
              onChangeText={speech.listening ? undefined : setInput}
              editable={!speech.listening}
              multiline
              maxLength={10000}
            />
            {/* Stop button: only when busy and no input */}
            {isSending && !input.trim() && attachments.length === 0 && !speech.listening && (
              <TouchableOpacity style={[s.stopBtn, { backgroundColor: colors["surface-base"] }]} onPress={abortSession}>
                <Ionicons name="stop" size={20} color={colors["text-base"]} />
              </TouchableOpacity>
            )}
            {/* Mic button: when no input, not sending, and not listening */}
            {!isSending && !input.trim() && attachments.length === 0 && !speech.listening && (
              <TouchableOpacity style={s.micBtn} onPress={speech.start}>
                <Ionicons name="mic" size={22} color={colors["text-weak"]} />
              </TouchableOpacity>
            )}
            {/* Listening indicator: tap to stop */}
            {speech.listening && (
              <TouchableOpacity
                style={[s.micBtnActive, { backgroundColor: colors["surface-base"] }]}
                onPress={speech.stop}
              >
                <Ionicons name="mic" size={22} color={colors["text-base"]} />
              </TouchableOpacity>
            )}
            {/* Send button: when there's input */}
            {!speech.listening && (input.trim() || attachments.length > 0) && (
              <TouchableOpacity
                style={[s.sendBtn, { backgroundColor: colors["surface-interactive-base"] }]}
                onPress={handleSend}
              >
                <Ionicons name="send" size={20} color={colors["text-base"]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Animated keyboard spacer - pushes content up smoothly */}
        <Animated.View style={keyboardSpacerStyle} />
      </View>

      {/* Model picker bottom sheet */}
      <ModelPicker
        sheetRef={modelSheetRef}
        providers={providers}
        selected={model}
        isDark={isDark}
        onSelect={handleModelSelect}
      />
    </>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  listWrap: { flex: 1, position: "relative" },

  // Messages
  messageList: { padding: 16, paddingBottom: 8 },

  // Scroll button
  scrollBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Loading more (appears at top in inverted list = ListFooterComponent)
  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },

  // Empty (inverted list flips content, so use transform to un-flip)
  emptyInverted: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    transform: [{ scaleY: -1 }],
  },

  // Empty
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 64 },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  agentLabel: { fontSize: 12, fontWeight: "600" },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modelLabel: { fontSize: 12, maxWidth: 160 },

  // Input
  inputContainer: {
    padding: 12,
    marginBottom: 8,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  attachBtn: {
    width: 36,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  micBtnActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Header
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dirText: { fontSize: 12, fontWeight: "500" },
})

import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/lib/theme"
import type { Part } from "../../lib/sdk"
import { DiffView } from "./DiffView"

const TOOL_ICONS: Record<string, string> = {
  read: "glasses-outline",
  list: "list-outline",
  glob: "search-outline",
  grep: "search-outline",
  webfetch: "globe-outline",
  edit: "code-slash-outline",
  write: "create-outline",
  apply_patch: "git-merge-outline",
  bash: "terminal-outline",
  task: "git-branch-outline",
  todowrite: "checkbox-outline",
  todoread: "checkbox-outline",
  question: "chatbubble-ellipses-outline",
  codesearch: "search-outline",
  websearch: "globe-outline",
}

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

function getStatusColor(status: string, colors: Record<string, string>): string {
  if (status === "completed") return colors["icon-success-base"]
  if (status === "error") return colors["icon-critical-base"]
  if (status === "running") return colors["icon-warning-base"]
  return colors["icon-weak-base"]
}

// --- Tool-specific detail renderers ---

function BashDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const cmd = typeof input === "object" && input !== null ? (input as Record<string, unknown>).command : undefined
  const out = typeof output === "string" ? output : undefined
  return (
    <View style={s.detailSection}>
      {typeof cmd === "string" && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"] }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable>
            <Text style={[s.codePrompt, { color: colors["text-interactive-base"] }]}>$ </Text>
            {cmd}
          </Text>
        </View>
      )}
      {out !== undefined && out.length > 0 && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"], marginTop: 6 }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={80}>
            {out}
          </Text>
        </View>
      )}
    </View>
  )
}

function ReadDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  const offset = typeof input === "object" && input !== null ? (input as Record<string, unknown>).offset : undefined
  const limit = typeof input === "object" && input !== null ? (input as Record<string, unknown>).limit : undefined
  const range = offset || limit ? ` (${offset || 0}..${limit || "end"})` : ""
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text
          style={[
            s.detailFile,
            { color: colors["text-interactive-base"], backgroundColor: colors["surface-interactive-weak"] },
          ]}
          selectable
          numberOfLines={2}
        >
          {file}
          {range}
        </Text>
      )}
    </View>
  )
}

function WriteDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  const content = typeof input === "object" && input !== null ? (input as Record<string, unknown>).content : undefined
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text
          style={[
            s.detailFile,
            { color: colors["text-interactive-base"], backgroundColor: colors["surface-interactive-weak"] },
          ]}
          selectable
          numberOfLines={2}
        >
          {file}
        </Text>
      )}
      {typeof content === "string" && content.length > 0 && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"], marginTop: 6 }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={40}>
            {content}
          </Text>
        </View>
      )}
    </View>
  )
}

function EditDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const file = typeof input === "object" && input !== null ? (input as Record<string, unknown>).filePath : undefined
  const old = typeof input === "object" && input !== null ? (input as Record<string, unknown>).oldString : undefined
  const replacement =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>).newString : undefined

  // If we have old/new strings, show as diff
  if (typeof old === "string" && typeof replacement === "string") {
    return (
      <View style={s.detailSection}>
        {typeof file === "string" && (
          <Text
            style={[
              s.detailFile,
              { color: colors["text-interactive-base"], backgroundColor: colors["surface-interactive-weak"] },
            ]}
            selectable
            numberOfLines={2}
          >
            {file}
          </Text>
        )}
        <DiffView before={old} after={replacement} isDark={isDark} />
      </View>
    )
  }

  // Fallback: show raw output
  const text = typeof output === "string" ? output : JSON.stringify(output, null, 2)
  return (
    <View style={s.detailSection}>
      {typeof file === "string" && (
        <Text
          style={[
            s.detailFile,
            { color: colors["text-interactive-base"], backgroundColor: colors["surface-interactive-weak"] },
          ]}
          selectable
          numberOfLines={2}
        >
          {file}
        </Text>
      )}
      {text && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"], marginTop: 6 }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={40}>
            {text}
          </Text>
        </View>
      )}
    </View>
  )
}

function PatchDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const patch = typeof input === "object" && input !== null ? (input as Record<string, unknown>).patch : undefined
  return (
    <View style={s.detailSection}>
      {typeof patch === "string" && patch.length > 0 && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"] }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={60}>
            {patch}
          </Text>
        </View>
      )}
    </View>
  )
}

function GlobGrepDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const pattern = typeof input === "object" && input !== null ? (input as Record<string, unknown>).pattern : undefined
  const path = typeof input === "object" && input !== null ? (input as Record<string, unknown>).path : undefined
  const results = typeof output === "string" ? output : undefined
  return (
    <View style={s.detailSection}>
      {typeof pattern === "string" && (
        <Text style={[s.detailMeta, { color: colors["text-weak"] }]}>
          Pattern: {pattern}
          {typeof path === "string" ? ` in ${path}` : ""}
        </Text>
      )}
      {results && results.length > 0 && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"], marginTop: 6 }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={30}>
            {results}
          </Text>
        </View>
      )}
    </View>
  )
}

function WebfetchDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const url = typeof input === "object" && input !== null ? (input as Record<string, unknown>).url : undefined
  return (
    <View style={s.detailSection}>
      {typeof url === "string" && (
        <Text
          style={[
            s.detailFile,
            { color: colors["text-interactive-base"], backgroundColor: colors["surface-interactive-weak"] },
          ]}
          selectable
          numberOfLines={3}
        >
          {url}
        </Text>
      )}
    </View>
  )
}

function TaskDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const description =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>).description : undefined
  const prompt = typeof input === "object" && input !== null ? (input as Record<string, unknown>).prompt : undefined
  return (
    <View style={s.detailSection}>
      {typeof description === "string" && (
        <Text style={[s.detailMeta, { color: colors["text-weak"] }]}>{description}</Text>
      )}
      {typeof prompt === "string" && prompt.length > 0 && (
        <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"], marginTop: 6 }]}>
          <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={20}>
            {prompt}
          </Text>
        </View>
      )}
    </View>
  )
}

function TodoDetail({ input, isDark }: { input: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const todos = typeof input === "object" && input !== null ? (input as Record<string, unknown>).todos : undefined
  if (!Array.isArray(todos)) return null
  return (
    <View style={s.detailSection}>
      {todos.map((t, i) => {
        const item = t as Record<string, unknown>
        const done = item.status === "completed"
        return (
          <View key={String(item.id || i)} style={s.todoRow}>
            <Ionicons
              name={done ? "checkbox" : "square-outline"}
              size={16}
              color={done ? colors["icon-success-base"] : colors["icon-weak-base"]}
            />
            <Text
              style={[
                s.todoText,
                { color: colors["text-base"] },
                done && { textDecorationLine: "line-through", color: colors["text-weaker"] },
              ]}
              numberOfLines={2}
            >
              {String(item.content || item.title || "")}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function GenericDetail({ input, output, isDark }: { input: unknown; output: unknown; isDark: boolean }) {
  const { colors } = useTheme()
  const text =
    typeof output === "string"
      ? output
      : output !== undefined && output !== null
        ? JSON.stringify(output, null, 2)
        : typeof input === "object" && input !== null
          ? JSON.stringify(input, null, 2)
          : undefined
  if (!text || text.length === 0) return null
  return (
    <View style={s.detailSection}>
      <View style={[s.codeBlock, { backgroundColor: colors["surface-raised-base"] }]}>
        <Text style={[s.codePre, { color: colors["text-base"] }]} selectable numberOfLines={30}>
          {text}
        </Text>
      </View>
    </View>
  )
}

function ToolDetail({ tool, isDark }: { tool: Part; isDark: boolean }) {
  const name = tool.tool || ""
  const input = tool.state?.input
  const output = tool.state?.output

  switch (name) {
    case "bash":
      return <BashDetail input={input} output={output} isDark={isDark} />
    case "read":
      return <ReadDetail input={input} isDark={isDark} />
    case "write":
      return <WriteDetail input={input} isDark={isDark} />
    case "edit":
      return <EditDetail input={input} output={output} isDark={isDark} />
    case "apply_patch":
      return <PatchDetail input={input} isDark={isDark} />
    case "glob":
    case "grep":
    case "list":
    case "codesearch":
      return <GlobGrepDetail input={input} output={output} isDark={isDark} />
    case "webfetch":
    case "websearch":
      return <WebfetchDetail input={input} isDark={isDark} />
    case "task":
      return <TaskDetail input={input} isDark={isDark} />
    case "todowrite":
      return <TodoDetail input={input} isDark={isDark} />
    default:
      return <GenericDetail input={input} output={output} isDark={isDark} />
  }
}

// --- Error display ---
function ErrorBanner({ message, isDark }: { message: string; isDark: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[s.errorBanner, { backgroundColor: colors["surface-critical-weak"] }]}>
      <Ionicons name="alert-circle" size={14} color={colors["icon-critical-base"]} />
      <Text style={[s.errorText, { color: colors["text-on-critical-base"] }]} numberOfLines={3} selectable>
        {message}
      </Text>
    </View>
  )
}

// --- Duration display ---
function duration(start?: number, end?: number): string | null {
  if (!start || !end) return null
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// --- Main component ---
interface Props {
  tool: Part
  isDark: boolean
}

export function ToolCallCard({ tool, isDark }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const icon = (tool.tool && TOOL_ICONS[tool.tool]) || "extension-puzzle-outline"
  const status = tool.state?.status || "pending"
  const color = getStatusColor(status, colors)
  const error = tool.state?.error?.message
  const elapsed = duration(tool.state?.time?.start, tool.state?.time?.end)
  const hasDetail = tool.state?.input !== undefined || tool.state?.output !== undefined || error

  const toggle = useCallback(() => {
    if (hasDetail) setExpanded((v) => !v)
  }, [hasDetail])

  const borderColor = status === "error" ? colors["border-critical-base"] : colors["border-weak-base"]

  return (
    <TouchableOpacity
      style={[
        s.card,
        {
          backgroundColor: colors["surface-base"],
          borderColor,
        },
      ]}
      onPress={toggle}
      activeOpacity={hasDetail ? 0.7 : 1}
    >
      {/* Header row */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name={icon as any} size={16} color={color} />
          <Text style={[s.name, { color: colors["text-base"] }]} numberOfLines={1}>
            {tool.state?.title || tool.tool || "Tool"}
          </Text>
          {elapsed && <Text style={[s.elapsed, { color: colors["text-weaker"] }]}>{elapsed}</Text>}
        </View>
        <View style={s.headerRight}>
          {status === "running" && <ActivityIndicator size="small" color={color} />}
          {status === "completed" && <Ionicons name="checkmark-circle" size={16} color={colors["icon-success-base"]} />}
          {status === "error" && <Ionicons name="close-circle" size={16} color={colors["icon-critical-base"]} />}
          {hasDetail && (
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors["icon-weak-base"]} />
          )}
        </View>
      </View>

      {/* Error banner */}
      {error && !expanded && <ErrorBanner message={error} isDark={isDark} />}

      {/* Expanded detail */}
      {expanded && (
        <ScrollView style={s.detailScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {error && <ErrorBanner message={error} isDark={isDark} />}
          <ToolDetail tool={tool} isDark={isDark} />
        </ScrollView>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 13, fontWeight: "500", flex: 1 },
  elapsed: { fontSize: 11 },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  errorText: { fontSize: 12, flex: 1, lineHeight: 18 },

  // Detail
  detailScroll: { maxHeight: 300, marginTop: 8 },
  detailSection: { gap: 4 },
  detailFile: {
    fontSize: 12,
    fontFamily: mono,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  detailMeta: { fontSize: 12, lineHeight: 18 },

  // Code block
  codeBlock: {
    borderRadius: 6,
    padding: 10,
  },
  codePre: {
    fontSize: 12,
    fontFamily: mono,
    lineHeight: 18,
  },
  codePrompt: { fontWeight: "700" },

  // Todo
  todoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 3,
  },
  todoText: { fontSize: 13, flex: 1, lineHeight: 20 },
})

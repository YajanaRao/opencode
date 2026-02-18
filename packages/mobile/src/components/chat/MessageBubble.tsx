import { memo } from "react"
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Markdown } from "../markdown"
import { ToolCallCard } from "./ToolCallCard"
import { ReasoningBlock } from "./ReasoningBlock"
import { useTheme } from "../../lib/theme"
import type { Message, Part } from "../../lib/sdk"

const SCREEN_WIDTH = Dimensions.get("window").width

function isImageMime(mime?: string): boolean {
  return !!mime && mime.startsWith("image/")
}

interface Props {
  message: Message
  parts: Part[]
}

// TODO: Replace with streamdown-rn once React 19 types PR lands - it has
// built-in block-level memoization that eliminates re-renders for stable blocks
export const MessageBubble = memo(
  function MessageBubble({ message, parts }: Props) {
    const { colors, mode } = useTheme()
    const isDark = mode === "dark"
    const isUser = message.role === "user"

    const textParts = parts.filter((p) => p.type === "text")
    const reasoningParts = parts.filter((p) => p.type === "reasoning")
    const toolParts = parts.filter((p) => p.type === "tool")
    const fileParts = parts.filter((p) => p.type === "file" && isImageMime(p.mime))
    const text = textParts.map((p) => p.text).join("\n") || ""
    const reasoning = reasoningParts.map((p) => p.text).join("\n") || ""

    return (
      <View
        style={[
          s.wrapper,
          !isUser && { backgroundColor: colors["background-base"], marginHorizontal: -16, paddingHorizontal: 16 },
        ]}
      >
        <View
          style={[
            s.bubble,
            isUser && {
              alignSelf: "flex-end",
              backgroundColor: colors["surface-base"],
              marginLeft: 48,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors["border-base"],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 2,
              elevation: 1,
            },
            !isUser && s.assistant,
          ]}
        >
          {/* Image attachments */}
          {fileParts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.imageRow}
              style={s.imageScroll}
            >
              {fileParts.map((fp) => (
                <View key={fp.id} style={s.imageWrap}>
                  <Image
                    source={{ uri: fp.url }}
                    style={[s.attachedImage, { backgroundColor: colors["surface-weak"] }]}
                    resizeMode="cover"
                  />
                  {fp.filename && (
                    <Text
                      style={{ fontSize: 10, color: colors["text-weaker"], marginTop: 2, maxWidth: 200 }}
                      numberOfLines={1}
                    >
                      {fp.filename}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Reasoning (collapsible) */}
          {reasoning.length > 0 && <ReasoningBlock text={reasoning} />}

          {/* Message text */}
          {text.length > 0 &&
            (isUser ? (
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors["text-base"] }} selectable>
                {text}
              </Text>
            ) : (
              <View style={s.markdownWrap}>
                <Markdown>{text}</Markdown>
              </View>
            ))}

          {/* Tool calls */}
          {toolParts.map((tool) => (
            <ToolCallCard key={tool.id} tool={tool} isDark={isDark} />
          ))}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {!isUser && message.model && (
              <Text
                style={{
                  fontSize: 11,
                  color: colors["text-weaker"],
                  backgroundColor: colors["surface-weak"],
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                {message.model.modelID}
              </Text>
            )}
            {!isUser && message.modelID && (
              <Text
                style={{
                  fontSize: 11,
                  color: colors["text-weaker"],
                  backgroundColor: colors["surface-weak"],
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                {message.modelID}
              </Text>
            )}
            {/* Tokens/cost for assistant messages */}
            {!isUser && message.tokens && (
              <Text style={{ fontSize: 11, color: colors["text-weaker"] }}>
                {message.tokens.input + message.tokens.output} tokens
                {message.cost ? ` · $${message.cost.toFixed(4)}` : ""}
              </Text>
            )}
          </View>
        </View>
      </View>
    )
  },
  (prev, next) => {
    // Only re-render if message content actually changed
    // This prevents completed messages from re-rendering during streaming
    if (prev.message.id !== next.message.id) return false
    if (prev.parts.length !== next.parts.length) return false
    // Compare the last part's text content - this is what changes during streaming
    const prevLast = prev.parts[prev.parts.length - 1]
    const nextLast = next.parts[next.parts.length - 1]
    if (!prevLast && !nextLast) return true
    if (!prevLast || !nextLast) return false
    return prevLast.type === nextLast.type && prevLast.text === nextLast.text
  },
)

const s = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  bubble: { maxWidth: "100%" },
  assistant: { paddingVertical: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  markdownWrap: { marginHorizontal: -4 },
  imageScroll: { marginBottom: 8 },
  imageRow: { gap: 8 },
  imageWrap: { alignItems: "center" },
  attachedImage: {
    width: Math.min(200, SCREEN_WIDTH * 0.5),
    height: Math.min(200, SCREEN_WIDTH * 0.5),
    borderRadius: 8,
  },
})

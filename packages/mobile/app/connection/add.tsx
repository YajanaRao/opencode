import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useConnections } from "../../src/stores/connections"
import type { ConnectionType } from "../../src/lib/types"

export default function AddConnectionScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const { addConnection, testConnection } = useConnections()

  const [mode, setMode] = useState<"quick" | "advanced">("quick")
  const [type, setType] = useState<ConnectionType>("local")
  const [name, setName] = useState("")
  const [serverAddress, setServerAddress] = useState("")
  const [port, setPort] = useState("4096")
  const [url, setUrl] = useState("")
  const [directory, setDirectory] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  const buildUrl = () => {
    if (mode === "advanced") return url.trim()

    const address = serverAddress.trim()
    if (!address) return ""

    // If it looks like a full URL (starts with http:// or https://), use it as-is
    if (address.startsWith("http://") || address.startsWith("https://")) {
      return address
    }

    // Otherwise treat it as IP:port or domain:port
    const hasPort = address.includes(":")
    if (hasPort) {
      // If they included port in the address, use it
      return address.startsWith("http") ? address : `http://${address}`
    }

    // Default: add http:// and port
    return `http://${address}:${port || "4096"}`
  }

  const handleQuickConnect = async () => {
    const serverUrl = buildUrl()
    if (!serverUrl) {
      Alert.alert("Error", "Please enter your server address (IP, domain, or URL)")
      return
    }

    setIsConnecting(true)

    // Test connection first
    const success = await testConnection(
      {
        id: "",
        name: name || "My Server",
        type: "local",
        url: serverUrl,
        username: username.trim() || undefined,
      },
      password || undefined,
    )

    if (success) {
      // Save and go back
      await addConnection(
        {
          name: name.trim() || "My Server",
          type: "local",
          url: serverUrl,
          username: username.trim() || undefined,
        },
        password || undefined,
      )
      setIsConnecting(false)
      router.back()
    } else {
      setIsConnecting(false)
      Alert.alert(
        "Connection Failed",
        "Could not connect to the server.\n\nFor local networks:\n1. OpenCode is running: opencode serve --hostname 0.0.0.0\n2. You're on the same WiFi network\n3. The IP address is correct\n\nFor hosted servers:\n1. Check the URL is accessible\n2. Server is running and reachable",
        [{ text: "OK" }],
      )
    }
  }

  const handleAdvancedSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a connection name")
      return
    }
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a server URL")
      return
    }

    setIsConnecting(true)
    await addConnection(
      {
        name: name.trim(),
        type,
        url: url.trim(),
        directory: directory.trim() || undefined,
        username: username.trim() || undefined,
      },
      password || undefined,
    )
    setIsConnecting(false)
    router.back()
  }

  // Quick connect mode - simplified
  if (mode === "quick") {
    return (
      <ScrollView
        style={[styles.container, isDark && styles.containerDark]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.quickHeader}>
          <Ionicons name="wifi" size={48} color={isDark ? "#ffffff" : "#0a0a0a"} />
          <Text style={[styles.quickTitle, isDark && styles.textDark]}>Connect to OpenCode</Text>
          <Text style={[styles.quickSubtitle, isDark && styles.hintDark]}>
            Enter your server address (IP, domain, or URL)
          </Text>
        </View>

        {/* Server Address */}
        <Text style={[styles.label, isDark && styles.labelDark]}>Server Address</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="opencode.yajana.in or 192.168.1.100:4096"
          placeholderTextColor={isDark ? "#666666" : "#999999"}
          value={serverAddress}
          onChangeText={setServerAddress}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={[styles.hint, isDark && styles.hintDark]}>
          Enter a domain (opencode.yajana.in), IP address (192.168.1.100), or full URL (https://opencode.yajana.in)
        </Text>

        {/* Optional name */}
        <Text style={[styles.label, isDark && styles.labelDark]}>Name (optional)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="My Mac"
          placeholderTextColor={isDark ? "#666666" : "#999999"}
          value={name}
          onChangeText={setName}
        />

        {/* Password if needed */}
        <Text style={[styles.label, isDark && styles.labelDark]}>Password (if set on server)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Leave empty if none"
          placeholderTextColor={isDark ? "#666666" : "#999999"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Connect button */}
        <TouchableOpacity
          style={[styles.connectButton, isDark && styles.connectButtonDark]}
          onPress={handleQuickConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color={isDark ? "#0a0a0a" : "#ffffff"} />
          ) : (
            <>
              <Ionicons name="flash" size={20} color={isDark ? "#0a0a0a" : "#ffffff"} />
              <Text style={[styles.connectButtonText, isDark && styles.connectButtonTextDark]}>Connect</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help text */}
        <View style={[styles.helpBox, isDark && styles.helpBoxDark]}>
          <Text style={[styles.helpTitle, isDark && styles.textDark]}>Connection examples:</Text>
          <Text style={[styles.helpText, isDark && styles.hintDark]}>
            • Domain: <Text style={styles.code}>opencode.yajana.in</Text>
          </Text>
          <Text style={[styles.helpText, isDark && styles.hintDark]}>
            • Local IP: <Text style={styles.code}>192.168.1.100:4096</Text>
          </Text>
          <Text style={[styles.helpText, isDark && styles.hintDark]}>
            • Full URL: <Text style={styles.code}>https://opencode.yajana.in</Text>
          </Text>
          <Text style={[styles.helpText, isDark && styles.hintDark, { marginTop: 12 }]}>
            For local connections, find your IP:{"\n"}
            <Text style={styles.code}>ipconfig getifaddr en0</Text>
          </Text>
          <Text style={[styles.helpText, isDark && styles.hintDark, { marginTop: 8 }]}>
            Make sure OpenCode is running:{"\n"}
            <Text style={styles.code}>opencode serve --hostname 0.0.0.0</Text>
          </Text>
        </View>

        {/* Advanced mode link */}
        <TouchableOpacity style={styles.advancedLink} onPress={() => setMode("advanced")}>
          <Text style={[styles.advancedLinkText, isDark && styles.hintDark]}>
            Advanced options (tunnels, cloud, auth)
          </Text>
          <Ionicons name="chevron-forward" size={16} color={isDark ? "#888888" : "#666666"} />
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // Advanced mode - full options
  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backToQuick} onPress={() => setMode("quick")}>
        <Ionicons name="chevron-back" size={16} color={isDark ? "#888888" : "#666666"} />
        <Text style={[styles.backToQuickText, isDark && styles.hintDark]}>Simple mode</Text>
      </TouchableOpacity>

      {/* Connection Type */}
      <Text style={[styles.label, isDark && styles.labelDark]}>Connection Type</Text>
      <View style={styles.typeContainer}>
        {[
          { type: "local" as const, label: "Local", icon: "wifi" as const },
          { type: "tunnel" as const, label: "Tunnel", icon: "globe" as const },
          { type: "cloud" as const, label: "Cloud", icon: "cloud" as const },
        ].map((t) => (
          <TouchableOpacity
            key={t.type}
            style={[
              styles.typeOption,
              isDark && styles.typeOptionDark,
              type === t.type && styles.typeOptionSelected,
              type === t.type && isDark && styles.typeOptionSelectedDark,
            ]}
            onPress={() => setType(t.type)}
          >
            <Ionicons
              name={t.icon}
              size={20}
              color={type === t.type ? (isDark ? "#0a0a0a" : "#ffffff") : isDark ? "#888888" : "#666666"}
            />
            <Text
              style={[
                styles.typeLabel,
                isDark && styles.textDark,
                type === t.type && styles.typeLabelSelected,
                type === t.type && isDark && styles.typeLabelSelectedDark,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Name */}
      <Text style={[styles.label, isDark && styles.labelDark]}>Name</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="My Server"
        placeholderTextColor={isDark ? "#666666" : "#999999"}
        value={name}
        onChangeText={setName}
      />

      {/* URL */}
      <Text style={[styles.label, isDark && styles.labelDark]}>Server URL</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder={
          type === "local"
            ? "http://192.168.1.100:4096"
            : type === "tunnel"
              ? "https://your-tunnel.trycloudflare.com"
              : "https://api.opencode.ai"
        }
        placeholderTextColor={isDark ? "#666666" : "#999999"}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      {/* Directory */}
      <Text style={[styles.label, isDark && styles.labelDark]}>Project Directory (Optional)</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="/path/to/project"
        placeholderTextColor={isDark ? "#666666" : "#999999"}
        value={directory}
        onChangeText={setDirectory}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={[styles.hint, isDark && styles.hintDark]}>
        Leave empty to use the server's current directory, or specify a path to work in a different folder.
      </Text>

      {/* Auth */}
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Authentication</Text>

      <Text style={[styles.label, isDark && styles.labelDark]}>Username</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="admin"
        placeholderTextColor={isDark ? "#666666" : "#999999"}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={[styles.label, isDark && styles.labelDark]}>Password</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="password"
        placeholderTextColor={isDark ? "#666666" : "#999999"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Save */}
      <TouchableOpacity
        style={[styles.connectButton, isDark && styles.connectButtonDark, { marginTop: 32 }]}
        onPress={handleAdvancedSave}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color={isDark ? "#0a0a0a" : "#ffffff"} />
        ) : (
          <Text style={[styles.connectButtonText, isDark && styles.connectButtonTextDark]}>Save Connection</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#0a0a0a",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  // Quick connect styles
  quickHeader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  quickTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0a0a0a",
    marginTop: 16,
  },
  quickSubtitle: {
    fontSize: 15,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },
  ipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ipInput: {
    flex: 1,
  },
  ipColon: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  portInput: {
    width: 80,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    marginTop: 24,
  },
  connectButtonDark: {
    backgroundColor: "#ffffff",
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  connectButtonTextDark: {
    color: "#0a0a0a",
  },
  helpBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  helpBoxDark: {
    backgroundColor: "#1a1a1a",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 20,
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: "#e5e5e5",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  advancedLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 16,
    marginTop: 16,
  },
  advancedLinkText: {
    fontSize: 14,
    color: "#666666",
  },
  backToQuick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  backToQuickText: {
    fontSize: 14,
    color: "#666666",
  },
  // Original styles
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
    marginTop: 16,
    marginBottom: 8,
  },
  labelDark: {
    color: "#ffffff",
  },
  typeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    gap: 6,
  },
  typeOptionDark: {
    backgroundColor: "#1a1a1a",
  },
  typeOptionSelected: {
    backgroundColor: "#0a0a0a",
  },
  typeOptionSelectedDark: {
    backgroundColor: "#ffffff",
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666666",
  },
  textDark: {
    color: "#ffffff",
  },
  typeLabelSelected: {
    color: "#ffffff",
  },
  typeLabelSelectedDark: {
    color: "#0a0a0a",
  },
  hint: {
    fontSize: 13,
    color: "#666666",
    marginTop: 8,
  },
  hintDark: {
    color: "#888888",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0a0a0a",
  },
  inputDark: {
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0a0a0a",
    marginTop: 32,
    marginBottom: 8,
  },
})

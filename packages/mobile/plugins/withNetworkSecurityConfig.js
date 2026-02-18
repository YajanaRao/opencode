const { withDangerousMod } = require("@expo/config-plugins")
const path = require("path")
const fs = require("fs")

/**
 * Plugin to add network security config for cleartext traffic (HTTP).
 * Required for local development connections to opencode server.
 */
function withNetworkSecurityConfig(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot
      const manifestPath = path.join(projectRoot, "app", "src", "main", "AndroidManifest.xml")
      const resPath = path.join(projectRoot, "app", "src", "main", "res")
      const xmlPath = path.join(resPath, "xml")

      // Create xml directory if it doesn't exist
      if (!fs.existsSync(xmlPath)) {
        fs.mkdirSync(xmlPath, { recursive: true })
      }

      // Write network security config
      const configPath = path.join(xmlPath, "network_security_config.xml")
      const configContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext traffic for local network development -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.0.0</domain>
        <domain includeSubdomains="true">192.168.0.0</domain>
        <domain includeSubdomains="true">172.16.0.0</domain>
    </domain-config>
    <!-- Base config - allow cleartext for all traffic (development only) -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`
      fs.writeFileSync(configPath, configContent)

      // Update AndroidManifest.xml to reference the config
      let manifest = fs.readFileSync(manifestPath, "utf-8")

      // Add usesCleartextTraffic and networkSecurityConfig to application tag
      manifest = manifest.replace(
        /<application /,
        '<application android:usesCleartextTraffic="true" android:networkSecurityConfig="@xml/network_security_config" ',
      )

      // Add network permissions if not present
      const permissions = [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_WIFI_STATE",
      ]

      for (const permission of permissions) {
        if (!manifest.includes(permission)) {
          manifest = manifest
            .replace(
              /<manifest /,
              `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">\n  <uses-permission android:name="${permission}"/>`,
            )
            .replace(
              /<manifest[^>]*>/,
              '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">',
            )
        }
      }

      fs.writeFileSync(manifestPath, manifest)

      return config
    },
  ])
}

module.exports = withNetworkSecurityConfig

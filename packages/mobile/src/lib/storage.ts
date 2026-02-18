import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"

/**
 * Platform-agnostic storage wrapper.
 * Uses expo-secure-store on native platforms and localStorage on web.
 */
export const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    }
    return SecureStore.getItemAsync(key)
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value)
      } catch {
        // Ignore storage errors on web
      }
      return
    }
    return SecureStore.setItemAsync(key, value)
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore storage errors on web
      }
      return
    }
    return SecureStore.deleteItemAsync(key)
  },
}

import { View, ScrollView, StyleSheet } from "react-native"
import { Chip } from "../ui/chip"
import { useTheme } from "@/lib/theme"

export interface FileContextItem {
  path: string
  display: string
}

interface Props {
  files: FileContextItem[]
  onRemove: (index: number) => void
}

export function FileContextPills({ files, onRemove }: Props) {
  const { colors } = useTheme()

  if (files.length === 0) return null

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors["surface-raised-base"], borderTopColor: colors["border-weak-base"] },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {files.map((file, idx) => {
          // Extract filename from path
          const filename = file.display.split("/").pop() || file.display

          // Detect if this is a directory (ends with /)
          const isDirectory = file.display.endsWith("/")
          const icon = isDirectory ? "folder-outline" : "document-outline"

          return (
            <Chip key={`${file.path}-${idx}`} icon={icon} iconColor="text-weak" onRemove={() => onRemove(idx)}>
              {filename}
            </Chip>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  scroll: {
    gap: 8,
  },
})

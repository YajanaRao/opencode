import { View } from "react-native"
import { Popover } from "../ui/popover"
import { Text } from "../ui/text"

export interface FileItem {
  path: string
  display: string
}

interface Props {
  visible: boolean
  query: string
  files: FileItem[]
  loading: boolean
  onSelect: (file: FileItem) => void
}

export function AtPopover({ visible, query, files, loading, onSelect }: Props) {
  if (!visible || (!loading && files.length === 0)) return null

  return (
    <Popover visible={visible} maxHeight={240}>
      {loading && (
        <Popover.Item icon="search-outline" iconColor="text-weak" onPress={() => {}}>
          <Text variant="body" color="text-weak">
            Searching for "{query}"...
          </Text>
        </Popover.Item>
      )}

      {!loading && files.length > 0 && (
        <>
          {files.slice(0, 10).map((file) => {
            // Split path into directory and filename
            const parts = file.display.split("/")
            const filename = parts.pop() || file.display
            const directory = parts.length > 0 ? parts.join("/") + "/" : ""

            // Detect if this is a directory (ends with /)
            const isDirectory = file.display.endsWith("/")
            const icon = isDirectory ? "folder-outline" : "document-outline"

            return (
              <Popover.Item key={file.path} icon={icon} iconColor="text-weak" onPress={() => onSelect(file)}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" numberOfLines={1}>
                    {filename}
                  </Text>
                  {directory && (
                    <Text variant="caption" color="text-weak" numberOfLines={1}>
                      {directory}
                    </Text>
                  )}
                </View>
              </Popover.Item>
            )
          })}
        </>
      )}
    </Popover>
  )
}

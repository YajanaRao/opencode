import type { ReactNode } from "react"
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"

interface DialogProps {
  visible: boolean
  onDismiss: () => void
  children: ReactNode
}

interface DialogContentProps {
  children: ReactNode
}

interface DialogHeaderProps {
  children: ReactNode
}

interface DialogTitleProps {
  children: string
}

interface DialogBodyProps {
  children: ReactNode
  scrollable?: boolean
}

export function Dialog({ visible, onDismiss, children }: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />
        <View pointerEvents="box-none" style={styles.wrapper}>
          {children}
        </View>
      </View>
    </Modal>
  )
}

export function DialogContent({ children }: DialogContentProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.content,
        {
          backgroundColor: colors["surface-base"],
          borderColor: colors["border-weak-base"],
        },
      ]}
    >
      {children}
    </View>
  )
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <View style={styles.header}>{children}</View>
}

export function DialogTitle({ children }: DialogTitleProps) {
  const { colors } = useTheme()
  return <Text style={[styles.title, { color: colors["text-base"] }]}>{children}</Text>
}

export function DialogBody({ children, scrollable = true }: DialogBodyProps) {
  if (scrollable) {
    return (
      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator>
        {children}
      </ScrollView>
    )
  }
  return <View style={styles.body}>{children}</View>
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    borderRadius: 16,
    minWidth: 280,
    maxWidth: 400,
    width: "100%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  bodyScroll: {
    maxHeight: 400,
  },
  bodyContent: {
    paddingBottom: 20,
  },
  body: {
    paddingBottom: 16,
  },
})

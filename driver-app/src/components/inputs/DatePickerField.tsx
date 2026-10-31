import React, { useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, Typography } from "../../theme";

/** Reads YYYY-MM-DD as a local calendar date, so the day doesn't shift with the time zone. */
export function parseDateOnly(value?: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

type Props = {
  visible: boolean;
  value?: string | null;
  defaultDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export default function DatePickerField({ visible, value, defaultDate, minimumDate, maximumDate, onConfirm, onClose }: Props) {
  const [draft, setDraft] = useState<Date>(new Date());

  useEffect(() => {
    if (visible) setDraft(parseDateOnly(value) ?? defaultDate ?? new Date());
  }, [visible, value]);

  if (!visible) return null;

  // Android shows its own dialog with OK and Cancel
  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={draft}
        mode="date"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(event: any, selected?: Date) => {
          onClose();
          if (event.type === "set" && selected) onConfirm(formatDateOnly(selected));
        }}
      />
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onConfirm(formatDateOnly(draft));
                onClose();
              }}
              hitSlop={12}
            >
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            themeVariant="light"
            style={{ alignSelf: "center" }}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_event: any, selected?: Date) => {
              if (selected) setDraft(selected);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancel: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: "600" },
  done: { color: Colors.primary, fontSize: Typography.body, fontWeight: "800" },
});

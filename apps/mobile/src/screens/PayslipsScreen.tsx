import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { mobileFetch } from '../api/client';
import type { PayslipItem } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function PayslipsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<PayslipItem[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    mobileFetch<{ payslips: PayslipItem[] }>('/payslips/', token)
      .then((data) => setItems(data.payslips))
      .catch(() => undefined);
  }, [token]);

  const openPdf = async (id: number) => {
    if (!token) return;
    setBusyId(id);
    setMessage('');
    try {
      const data = await mobileFetch<{ filename: string; content_base64: string }>(
        `/payslips/${id}/pdf/?format=json`,
        token,
      );
      const path = `${FileSystem.cacheDirectory}${data.filename}`;
      await FileSystem.writeAsStringAsync(path, data.content_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/pdf' });
      } else {
        setMessage(`Saved to ${path}`);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not open payslip');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payslips</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No published payslips yet.</Text>
      ) : (
        items.map((p) => (
          <Pressable key={p.id} style={styles.card} onPress={() => openPdf(p.id)} disabled={busyId === p.id}>
            <Text style={styles.label}>{p.label}</Text>
            {busyId === p.id ? (
              <ActivityIndicator color={colors.orange} />
            ) : (
              <Text style={styles.net}>
                {p.net_pay != null ? `₹${p.net_pay.toLocaleString()}` : 'Open PDF'}
              </Text>
            )}
          </Pressable>
        ))
      )}
      {message ? <Text style={styles.hint}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 16 },
  empty: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontWeight: '700', fontSize: 16 },
  net: { color: colors.orange, fontWeight: '700' },
  hint: { marginTop: 16, color: colors.muted, fontSize: 13 },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mobileFetch } from '../api/client';
import type { LeaveRequest } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ApprovalsScreen() {
  const { token } = useAuth();
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    const data = await mobileFetch<{ pending: LeaveRequest[] }>('/approvals/leaves/', token);
    setPending(data.pending);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  const action = async (id: number, act: 'approve' | 'reject') => {
    if (!token) return;
    setBusyId(id);
    try {
      await mobileFetch(`/approvals/leaves/${id}/`, token, {
        method: 'POST',
        body: JSON.stringify({ action: act }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pending leave approvals</Text>
      {pending.length === 0 ? (
        <Text style={styles.empty}>No pending requests.</Text>
      ) : (
        pending.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.name}>{r.employee_name}</Text>
            <Text style={styles.detail}>
              {r.leave_type} · {r.from_date} → {r.to_date} ({r.total_days} days)
            </Text>
            <Text style={styles.reason}>{r.reason}</Text>
            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.approve]} onPress={() => action(r.id, 'approve')} disabled={busyId === r.id}>
                {busyId === r.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Approve</Text>}
              </Pressable>
              <Pressable style={[styles.btn, styles.reject]} onPress={() => action(r.id, 'reject')} disabled={busyId === r.id}>
                <Text style={styles.btnText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontWeight: '700', fontSize: 16 },
  detail: { marginTop: 4, color: colors.text },
  reason: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontWeight: '700' },
});

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { mobileFetch } from '../api/client';
import type { LeaveBalance, LeaveRequest } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function LeavesScreen() {
  const { token } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token) return;
    const [bal, req] = await Promise.all([
      mobileFetch<{ balances: LeaveBalance[] }>('/leaves/balances/', token),
      mobileFetch<{ requests: LeaveRequest[] }>('/leaves/requests/', token),
    ]);
    setBalances(bal.balances);
    setRequests(req.requests);
    if (!leaveTypeId && bal.balances[0]) setLeaveTypeId(bal.balances[0].leave_type_id);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  const submit = async () => {
    if (!token || !leaveTypeId) return;
    setBusy(true);
    setMessage('');
    try {
      await mobileFetch('/leaves/requests/create/', token, {
        method: 'POST',
        body: JSON.stringify({
          leave_type_id: leaveTypeId,
          from_date: fromDate,
          to_date: toDate,
          reason,
        }),
      });
      setMessage('Leave request submitted.');
      setFromDate('');
      setToDate('');
      setReason('');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to apply leave');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leave balances</Text>
      {balances.map((b) => (
        <Pressable
          key={b.leave_type_id}
          style={[styles.balanceRow, leaveTypeId === b.leave_type_id && styles.balanceActive]}
          onPress={() => setLeaveTypeId(b.leave_type_id)}
        >
          <Text style={styles.balanceName}>{b.leave_type}</Text>
          <Text style={styles.balanceVal}>{b.available} days left</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>Apply leave</Text>
      <TextInput style={styles.input} placeholder="From (YYYY-MM-DD)" value={fromDate} onChangeText={setFromDate} />
      <TextInput style={styles.input} placeholder="To (YYYY-MM-DD)" value={toDate} onChangeText={setToDate} />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
      />
      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit request</Text>}
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.section}>Recent requests</Text>
      {requests.map((r) => (
        <View key={r.id} style={styles.requestCard}>
          <Text style={styles.requestTitle}>
            {r.leave_type} · {r.from_date} → {r.to_date}
          </Text>
          <Text style={styles.requestStatus}>{r.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 12 },
  balanceRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceActive: { borderColor: colors.navy, borderWidth: 2 },
  balanceName: { fontWeight: '600' },
  balanceVal: { color: colors.muted },
  section: { marginTop: 24, marginBottom: 10, fontWeight: '700', color: colors.text, fontSize: 16 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  message: { marginTop: 12, color: colors.text },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestTitle: { fontWeight: '600' },
  requestStatus: { marginTop: 4, color: colors.muted, textTransform: 'capitalize' },
});

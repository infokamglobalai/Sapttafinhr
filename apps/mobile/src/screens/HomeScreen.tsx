import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mobileFetch } from '../api/client';
import type { PunchToday } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function HomeScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const { user, token, signOut } = useAuth();
  const [today, setToday] = useState<PunchToday | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await mobileFetch<PunchToday>('/attendance/today/', token);
    setToday(data);
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const hours = today ? (today.working_minutes / 60).toFixed(1) : '0.0';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.display_name || 'there'}</Text>
          <Text style={styles.meta}>
            {user?.tenant_name} · {user?.role_label}
          </Text>
        </View>
        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today</Text>
        <Text style={styles.status}>{today?.status?.replace('_', ' ') || 'Not punched'}</Text>
        <Text style={styles.hours}>{hours} hrs worked</Text>
        <Text style={styles.logs}>{today?.logs.length || 0} punch(es) logged</Text>
      </View>

      <View style={styles.grid}>
        {[
          { title: 'Punch', screen: 'Punch', desc: 'Check in / out' },
          { title: 'Leave', screen: 'Leaves', desc: 'Apply & track' },
          { title: 'Payslips', screen: 'Payslips', desc: 'Salary PDFs' },
          { title: 'Alerts', screen: 'Notifications', desc: 'Updates' },
        ].map((item) => (
          <Pressable key={item.screen} style={styles.tile} onPress={() => navigation.navigate(item.screen)}>
            <Text style={styles.tileTitle}>{item.title}</Text>
            <Text style={styles.tileDesc}>{item.desc}</Text>
          </Pressable>
        ))}
      </View>

      {user?.is_manager || user?.is_hr_admin ? (
        <Pressable style={styles.managerCard} onPress={() => navigation.navigate('Approvals')}>
          <Text style={styles.managerTitle}>Manager approvals</Text>
          <Text style={styles.managerDesc}>Pending leave requests from your team</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  meta: { marginTop: 4, color: colors.muted },
  signOut: { color: colors.orange, fontWeight: '600' },
  card: {
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardLabel: { color: '#c7d2fe', fontSize: 13, fontWeight: '600' },
  status: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 8, textTransform: 'capitalize' },
  hours: { color: '#e2e8f0', marginTop: 6, fontSize: 16 },
  logs: { color: '#94a3b8', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  tileDesc: { marginTop: 4, color: colors.muted, fontSize: 13 },
  managerCard: {
    marginTop: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  managerTitle: { fontWeight: '700', color: colors.orange, fontSize: 16 },
  managerDesc: { marginTop: 4, color: colors.muted },
});

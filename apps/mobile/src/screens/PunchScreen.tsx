import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { mobileFetch } from '../api/client';
import type { PunchToday } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function PunchScreen() {
  const { token } = useAuth();
  const [today, setToday] = useState<PunchToday | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    const data = await mobileFetch<PunchToday>('/attendance/today/', token);
    setToday(data);
  };

  useEffect(() => {
    load().catch(() => undefined);
    Location.requestForegroundPermissionsAsync().then((r) => setPermission(r.status));
  }, [token]);

  const punch = async (log_type: 'check_in' | 'check_out') => {
    if (!token) return;
    setBusy(true);
    setMessage('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage('Location permission is required for geofence punch.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const result = await mobileFetch<{
        is_within_fence: boolean | null;
        location: string | null;
        log_time: string;
      }>('/attendance/punch/', token, {
        method: 'POST',
        body: JSON.stringify({
          log_type,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_meters: pos.coords.accuracy,
          device_info: { platform: 'android' },
        }),
      });
      const fence =
        result.is_within_fence === false
          ? ' (outside geofence)'
          : result.location
            ? ` @ ${result.location}`
            : '';
      setMessage(`${log_type === 'check_in' ? 'Checked in' : 'Checked out'}${fence}`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Punch failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Geofence attendance</Text>
      <Text style={styles.subtitle}>
        GPS permission: {permission || 'checking…'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.status}>{today?.status?.replace('_', ' ') || 'No record yet'}</Text>
        <Text style={styles.meta}>{today?.logs.length || 0} punches today</Text>
      </View>

      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.in]} onPress={() => punch('check_in')} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check in</Text>}
        </Pressable>
        <Pressable style={[styles.btn, styles.out]} onPress={() => punch('check_out')} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Check out</Text>}
        </Pressable>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  status: { fontSize: 22, fontWeight: '700', textTransform: 'capitalize' },
  meta: { marginTop: 6, color: colors.muted },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  in: { backgroundColor: colors.success },
  out: { backgroundColor: colors.navy },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  message: { marginTop: 16, color: colors.text, lineHeight: 22 },
});

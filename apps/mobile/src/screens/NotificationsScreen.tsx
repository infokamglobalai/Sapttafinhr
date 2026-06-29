import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mobileFetch } from '../api/client';
import type { NotificationItem } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    if (!token) return;
    const data = await mobileFetch<{ notifications: NotificationItem[]; unread_count: number }>(
      '/notifications/',
      token,
    );
    setItems(data.notifications);
    setUnread(data.unread_count);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  const markRead = async (id: number) => {
    if (!token) return;
    await mobileFetch(`/notifications/${id}/read/`, token, { method: 'POST', body: '{}' });
    await load();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.unread}>{unread} unread</Text>
      {items.map((n) => (
        <Pressable key={n.id} style={[styles.card, !n.is_read && styles.unreadCard]} onPress={() => markRead(n.id)}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          {n.message ? <Text style={styles.message}>{n.message}</Text> : null}
          <Text style={styles.time}>{new Date(n.created_at).toLocaleString()}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  unread: { color: colors.muted, marginBottom: 16, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: { borderColor: colors.orange },
  cardTitle: { fontWeight: '700' },
  message: { marginTop: 6, color: colors.text, lineHeight: 20 },
  time: { marginTop: 8, color: colors.muted, fontSize: 12 },
});

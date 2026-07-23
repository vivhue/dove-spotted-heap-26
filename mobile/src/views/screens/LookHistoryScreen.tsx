import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenId } from '@/models/closet';
import { deleteTryOnResult, getTryOnHistory, TryOnResult, updateTryOnResult } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';

type HistoryFilter = 'all' | 'liked' | 'saved';

export function LookHistoryScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { currentUser } = useClosetStore();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [history, setHistory] = useState<TryOnResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<TryOnResult | null>(null);
  const visibleHistory = history.filter((look) => filter === 'all' || (filter === 'liked' ? look.liked : look.saved));

  async function toggleLook(look: TryOnResult, field: 'liked' | 'saved') {
    if (!currentUser) return;
    const value = !look[field];
    setHistory((current) => current.map((item) => item.id === look.id ? { ...item, [field]: value } : item));

    try {
      await updateTryOnResult(look.id, { [field]: value }, currentUser.id);
    } catch (error) {
      setHistory((current) => current.map((item) => item.id === look.id ? { ...item, [field]: !value } : item));
      setMessage(error instanceof Error ? error.message : 'Could not update this look.');
    }
  }

  async function deleteLook(look: TryOnResult) {
    if (!currentUser) return;
    setPendingDeleteId(null);
    setMessage('');
    setHistory((current) => current.filter((item) => item.id !== look.id));

    try {
      await deleteTryOnResult(look.id, currentUser.id);
    } catch (error) {
      setHistory((current) => [look, ...current]);
      setMessage(error instanceof Error ? error.message : 'Could not delete this look.');
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!currentUser) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const results = await getTryOnHistory(currentUser.id);
        if (isMounted) setHistory(results);
      } catch (error) {
        if (isMounted) setMessage(error instanceof Error ? error.message : 'Could not load your history.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHistory();
    return () => { isMounted = false; };
  }, [currentUser]);

  return (
    <AppScreen activeTab="account" onNavigate={onNavigate} showBottomNav={false} title="Try On History">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          {(['all', 'liked', 'saved'] as HistoryFilter[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, filter === tab && styles.tabSelected]}
              onPress={() => setFilter(tab)}>
              <Text style={[styles.tabText, filter === tab && styles.tabTextSelected]}>
                {tab === 'all' ? 'All' : tab === 'liked' ? '♡ Liked' : 'Saved'}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={closetTheme.camelDeep} style={styles.loading} />
        ) : message ? (
          <Text style={styles.message}>{message}</Text>
        ) : visibleHistory.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>No {filter === 'all' ? 'looks' : `${filter} looks`} yet</Text>
            <Text style={styles.message}>
              Your {filter === 'all' ? 'generated try-on looks' : `${filter} looks`} will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {visibleHistory.map((look) => (
              <View key={look.id} style={styles.card}>
                <Pressable accessibilityLabel={`Expand ${look.garmentName}`} onPress={() => setSelectedLook(look)}>
                  <Image source={{ uri: look.resultUrl }} style={styles.image} resizeMode="cover" />
                </Pressable>
                <View style={styles.meta}>
                  <Text numberOfLines={1} style={styles.name}>{look.garmentName}</Text>
                  <Text style={styles.date}>{new Date(look.createdAt).toLocaleDateString()}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityLabel={look.liked ? 'Unlike look' : 'Like look'}
                      style={[styles.action, look.liked && styles.actionSelected]}
                      onPress={() => toggleLook(look, 'liked')}>
                      <Text style={[styles.actionText, look.liked && styles.actionTextSelected]}>{look.liked ? '♥' : '♡'}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={look.saved ? 'Unsave look' : 'Save look'}
                      style={[styles.action, look.saved && styles.actionSelected]}
                      onPress={() => toggleLook(look, 'saved')}>
                      <Text style={[styles.actionText, look.saved && styles.actionTextSelected]}>Save</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={pendingDeleteId === look.id ? 'Confirm deleting look' : 'Delete look'}
                      style={[styles.action, styles.deleteAction, pendingDeleteId === look.id && styles.confirmDeleteAction]}
                      onPress={() => pendingDeleteId === look.id ? deleteLook(look) : setPendingDeleteId(look.id)}>
                      <Text style={[styles.deleteText, pendingDeleteId === look.id && styles.confirmDeleteText]}>
                        {pendingDeleteId === look.id ? 'Confirm' : 'Delete'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedLook && (
        <View style={styles.previewBackdrop}>
          <Pressable accessibilityLabel="Close image preview" style={styles.previewClose} onPress={() => setSelectedLook(null)}>
            <Text style={styles.previewCloseText}>×</Text>
          </Pressable>
          <Image source={{ uri: selectedLook.resultUrl }} style={styles.previewImage} resizeMode="contain" />
          <Text numberOfLines={1} style={styles.previewTitle}>{selectedLook.garmentName}</Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, paddingHorizontal: 18 },
  tabs: { backgroundColor: '#F4F3F3', borderRadius: 12, flexDirection: 'row', marginTop: 24, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 42 },
  tabSelected: { backgroundColor: closetTheme.white, elevation: 2, shadowColor: '#000', shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.12, shadowRadius: 3 },
  tabText: { color: closetTheme.muted, fontSize: 15, fontWeight: '800' },
  tabTextSelected: { color: closetTheme.ink },
  loading: { marginVertical: 40 },
  emptyPanel: { alignItems: 'center', borderColor: closetTheme.line, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', marginTop: 24, minHeight: 250, padding: 24 },
  emptyTitle: { color: closetTheme.ink, fontSize: 17, fontWeight: '900' },
  message: { color: closetTheme.muted, fontSize: 13, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  card: { backgroundColor: closetTheme.white, borderColor: closetTheme.line, borderRadius: 8, borderWidth: 1, overflow: 'hidden', width: '48%' },
  image: { aspectRatio: 0.72, backgroundColor: closetTheme.creamDeep, width: '100%' },
  meta: { padding: 10 },
  name: { color: closetTheme.ink, fontSize: 12, fontWeight: '900' },
  date: { color: closetTheme.muted, fontSize: 10, fontWeight: '800', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 5, marginTop: 9 },
  action: { alignItems: 'center', borderColor: closetTheme.line, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 28, paddingHorizontal: 4 },
  actionSelected: { backgroundColor: closetTheme.ink, borderColor: closetTheme.ink },
  actionText: { color: closetTheme.ink, fontSize: 9, fontWeight: '900' },
  actionTextSelected: { color: closetTheme.cream },
  deleteAction: { borderColor: '#C9685A' },
  deleteText: { color: '#A83F32', fontSize: 8, fontWeight: '900' },
  confirmDeleteAction: { backgroundColor: '#A83F32', borderColor: '#A83F32' },
  confirmDeleteText: { color: closetTheme.white },
  previewBackdrop: { ...StyleSheet.absoluteFillObject, alignItems: 'center', backgroundColor: 'rgba(8, 19, 36, 0.94)', justifyContent: 'center', padding: 18, zIndex: 20 },
  previewClose: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 22, height: 44, justifyContent: 'center', position: 'absolute', right: 18, top: 18, width: 44, zIndex: 2 },
  previewCloseText: { color: closetTheme.white, fontSize: 32, fontWeight: '500', lineHeight: 35 },
  previewImage: { height: '78%', width: '100%' },
  previewTitle: { color: closetTheme.white, fontSize: 15, fontWeight: '900', marginTop: 12 },
});

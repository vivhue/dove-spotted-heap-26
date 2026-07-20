import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { chatMessages, InventoryState, ScreenId, WardrobeItem } from '@/models/closet';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { ClosetIcon, LineIcon } from '@/views/components/closet-icons';
import { buildReply, buildStyleRecommendation, StyleRecommendation } from '@/services/stylist';

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  recommendation?: StyleRecommendation;
};

export function DiscoverScreen({
  inventory,
  onNavigate,
}: {
  inventory: InventoryState;
  onNavigate: (screen: ScreenId) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([...chatMessages]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function sendMessage(text = draft) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const recommendation = buildStyleRecommendation(trimmed, inventory);
    const nextMessages = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user' as const, text: trimmed },
      { id: `bot-${Date.now()}`, role: 'bot' as const, text: buildReply(trimmed, recommendation), recommendation },
    ];

    setMessages(nextMessages);
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  return (
    <AppScreen activeTab="discover" onNavigate={onNavigate} title="AI Chatbot">
      <ScrollView ref={scrollRef} contentContainerStyle={styles.chatLog}>
        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <View key={message.id} style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
              <Text style={[styles.bubbleText, isUser && styles.userText]}>{message.text}</Text>
              {message.recommendation && message.recommendation.showPanel !== false && (
                <RecommendationPanel recommendation={message.recommendation} />
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.suggestions}>
        {[
          'What should I wear for presentations?',
          'What should I wear for an interview?',
          'Make it more casual',
          'Show me something to buy',
        ].map((suggestion) => (
          <Pressable key={suggestion} style={styles.suggestionChip} onPress={() => sendMessage(suggestion)}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chatbar}>
        <TextInput
          placeholder="Ask what to wear..."
          placeholderTextColor={closetTheme.muted}
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <Pressable style={({ pressed }) => [styles.send, pressed && styles.sendPressed]} onPress={() => sendMessage()}>
          <LineIcon name="➤" color={closetTheme.camel} />
        </Pressable>
      </View>
    </AppScreen>
  );
}

function RecommendationPanel({ recommendation }: { recommendation: StyleRecommendation }) {
  return (
    <View style={styles.recommendation}>
      <View style={styles.recoHeader}>
        <Text style={styles.recoTitle}>{recommendation.title}</Text>
        <Text style={styles.recoMode}>{recommendation.mode}</Text>
      </View>
      <Text style={styles.recoSummary}>{recommendation.summary}</Text>
        {recommendation.outfit.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Wear from your closet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemRow}>
            {recommendation.outfit.map((item) => (
              <CompactItemCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </>
      )}
      {recommendation.fallback.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>If you need to buy</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemRow}>
            {recommendation.fallback.map((item) => (
              <CompactItemCard key={item.id} item={item} isWishlist />
            ))}
          </ScrollView>
        </>
      )}
      <View style={styles.tipStack}>
        {recommendation.tips.map((tip, index) => (
          <View key={`${tip}-${index}`} style={styles.tipPill}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CompactItemCard({ item, isWishlist = false }: { item: WardrobeItem; isWishlist?: boolean }) {
  const accent = item.accent ?? closetTheme.camel;
  const color = item.color ?? closetTheme.ink;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemThumb}>
        <View style={[styles.itemBackdrop, { backgroundColor: `${accent}22` }]} />
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <ClosetIcon category={item.category} color={color} accent={accent} size={28} />
        )}
      </View>
      <Text numberOfLines={2} style={styles.itemName}>
        {item.name}
      </Text>
      {isWishlist && <Text style={styles.itemMeta}>{item.price ?? item.category}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  chatLog: {
    gap: 10,
    padding: 18,
  },
  bubble: {
    borderRadius: 16,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: closetTheme.white,
    borderBottomLeftRadius: 4,
    borderColor: closetTheme.line,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: closetTheme.ink,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: closetTheme.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  userText: {
    color: closetTheme.cream,
  },
  recommendation: {
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderTopWidth: 1,
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
  },
  recoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recoTitle: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  recoMode: {
    color: closetTheme.camelDeep,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  recoSummary: {
    color: closetTheme.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  recoBasis: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  sectionLabel: {
    color: closetTheme.camelDeep,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  itemRow: {
    gap: 10,
    paddingRight: 4,
  },
  itemCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    width: 96,
  },
  itemThumb: {
    alignItems: 'center',
    borderRadius: 12,
    height: 68,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  itemBackdrop: {
    borderRadius: 20,
    height: 48,
    position: 'absolute',
    width: 48,
  },
  itemImage: {
    borderRadius: 12,
    height: 58,
    width: 58,
  },
  itemName: {
    color: closetTheme.ink,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
    minHeight: 24,
  },
  itemMeta: {
    color: closetTheme.muted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  tipStack: {
    gap: 6,
  },
  tipPill: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tipText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  suggestionChip: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  suggestionText: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
  },
  chatbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  input: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: closetTheme.muted,
    fontSize: 13,
  },
  send: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sendPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
});

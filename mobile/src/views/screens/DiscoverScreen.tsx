import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenId } from '@/models/closet';
import { getClosetChatReply } from '@/services/closet-chatbot';
import type { SelectedOutfit } from '@/stores/closet-store';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';

type ChatMessage = {
  id: string;
  outfit?: Partial<SelectedOutfit>;
  role: 'bot' | 'user';
  text: string;
};

export function DiscoverScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { applyOutfit, closetItems, currentUser, wishlistItems } = useClosetStore();
  const messageId = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'bot-intro',
      role: 'bot',
      text: 'Ask me what to wear, what colors you own most, or what style to try next.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function nextMessageId(prefix: string) {
    messageId.current += 1;
    return `${prefix}-${messageId.current}`;
  }

  async function sendMessage(text = draft) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = { id: nextMessageId('user'), role: 'user', text: trimmed };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraft('');
    setIsThinking(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    const reply = await getClosetChatReply({
      closetItems,
      currentUser,
      message: trimmed,
      wishlistItems,
    });

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextMessageId('bot'), outfit: reply.outfit, role: 'bot', text: reply.text },
    ]);
    setIsThinking(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  function useOutfit(outfit: Partial<SelectedOutfit>) {
    applyOutfit(outfit);
    onNavigate('try-on');
  }

  return (
    <AppScreen activeTab="discover" onNavigate={onNavigate} title="AI Chatbot">
      <ScrollView ref={scrollRef} contentContainerStyle={styles.chatLog}>
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const hasOutfit = message.role === 'bot' && message.outfit && Object.keys(message.outfit).length > 0;

          return (
            <View key={message.id} style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
              <Text style={[styles.bubbleText, isUser && styles.userText]}>{message.text}</Text>
              {hasOutfit && (
                <Pressable style={styles.useOutfitButton} onPress={() => useOutfit(message.outfit ?? {})}>
                  <Text style={styles.useOutfitText}>Try this outfit</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {isThinking && (
          <View style={[styles.bubble, styles.botBubble]}>
            <Text style={styles.bubbleText}>Checking your closet...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.suggestions}>
        {['What should I wear today?', 'What colors do I own most?', 'What style should I try?'].map((suggestion) => (
          <Pressable key={suggestion} style={styles.suggestionChip} onPress={() => sendMessage(suggestion)}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chatbar}>
        <TextInput
          editable={!isThinking}
          placeholder={currentUser ? 'Ask what to wear...' : 'Create an account first...'}
          placeholderTextColor={closetTheme.muted}
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <Pressable
          disabled={isThinking}
          style={({ pressed }) => [styles.send, pressed && styles.sendPressed, isThinking && styles.sendDisabled]}
          onPress={() => sendMessage()}>
          <LineIcon name="➤" color={closetTheme.camel} />
        </Pressable>
      </View>
    </AppScreen>
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
  useOutfitButton: {
    alignSelf: 'flex-start',
    backgroundColor: closetTheme.ink,
    borderRadius: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  useOutfitText: {
    color: closetTheme.cream,
    fontSize: 11,
    fontWeight: '900',
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
  sendDisabled: {
    opacity: 0.5,
  },
});

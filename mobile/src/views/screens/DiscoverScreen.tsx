import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { chatMessages, ScreenId } from '@/models/closet';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
};

export function DiscoverScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([...chatMessages]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function botReply(text: string) {
    const lower = text.toLowerCase();

    if (lower.includes('save')) {
      return 'Saved this as a polished interview look. You can find it from saved looks in the calendar.';
    }

    if (lower.includes('shop')) {
      return 'I found the closest wishlist match: the Wool Coat and Checkered Collar Shirt pairing.';
    }

    if (lower.includes('another') || lower.includes('try')) {
      return 'Try the checkered shirt, wide bottoms, and black ankle boots. It keeps the look neat but softer.';
    }

    return 'I would start with your beige trench coat, white polo, and black ankle boots. Want me to save it or try another?';
  }

  function sendMessage(text = draft) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const nextMessages = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user' as const, text: trimmed },
      { id: `bot-${Date.now()}`, role: 'bot' as const, text: botReply(trimmed) },
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
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.suggestions}>
        {['Save outfit', 'Try another', 'Shop similar'].map((suggestion) => (
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

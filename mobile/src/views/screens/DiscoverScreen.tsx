import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { BodyMeasurements, CategoryId, ScreenId, WardrobeItem, browseCategories } from '@/models/closet';
import {
  buildBodyProfile,
  ColorProfile,
  ContrastLevel,
  FitPreference,
  getClosetChatReply,
  StyleProfile,
  Undertone,
} from '@/services/closet-chatbot';
import { getTryOnHistory, TryOnResult, type WebStyleSuggestion } from '@/services/closet-api';
import { getWeatherOutfitRecommendation } from '@/services/weather-recommendation';
import type { SelectedOutfit } from '@/stores/closet-store';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme, closetTypography } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';

type ChatMessage = {
  actions?: ChatAction[];
  id: string;
  outfit?: Partial<SelectedOutfit>;
  previewImageUrl?: string;
  webSuggestion?: WebStyleSuggestion;
  role: 'bot' | 'user';
  text: string;
};

type ChatAction = {
  label: string;
  value: string;
};

type QuizState = {
  answers: string[];
  index: number;
  mode: 'color' | 'style';
};

const styleQuiz = [
  { text: 'Pick the outfit pair you would actually wear: fitted top + baggy jeans, or baggy top + fitted jeans?', actions: ['fitted top + baggy jeans', 'baggy top + fitted jeans'] },
  { text: 'For a casual day, which silhouette feels better?', actions: ['fitted + fitted', 'baggy + baggy'] },
  { text: 'For dinner, which would you choose?', actions: ['fitted top + straight pants', 'relaxed shirt + slim skirt'] },
  { text: 'For school or errands?', actions: ['baby tee + wide jeans', 'oversized tee + slim pants'] },
  { text: 'Which layering idea feels more you?', actions: ['tailored jacket + fitted base', 'oversized jacket + relaxed base'] },
  { text: 'Which aesthetic pair is closer?', actions: ['minimal', 'streetwear'] },
  { text: 'Last one: tailored or sporty?', actions: ['tailored', 'sporty'] },
];

const colorQuiz = [
  { text: 'Vein color on your wrist?', actions: ['greenish', 'bluish-purple', "can't tell"] },
  { text: 'Jewelry that looks best?', actions: ['gold', 'silver', 'both'] },
  { text: 'Sun reaction?', actions: ['tans easily', 'burns easily', 'mixed'] },
  { text: 'Which shirt looks better?', actions: ['cream', 'white', 'both fine'] },
  { text: 'Hair-to-skin contrast?', actions: ['close in tone', 'very different'] },
];

const plannerWeatherLocation = 'Singapore';

export function DiscoverScreen({
  measurements,
  onNavigate,
}: {
  measurements: BodyMeasurements;
  onNavigate: (screen: ScreenId) => void;
}) {
  const { applyOutfit, closetItems, currentUser, wishlistItems } = useClosetStore();
  const messageId = useRef(0);
  const [colorProfile, setColorProfile] = useState<ColorProfile>({
    avoidPalette: [],
    contrastLevel: null,
    recommendedPalette: [],
    undertone: null,
  });
  const [styleProfile, setStyleProfile] = useState<StyleProfile>({
    bottomFitPref: null,
    tags: [],
    topFitPref: null,
  });
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'bot-intro',
      role: 'bot',
      text: 'Ask me what to wear, what colors you own most, or what style to try next.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [attachedImageUri, setAttachedImageUri] = useState('');
  const [closetSearch, setClosetSearch] = useState('');
  const [closetSheetOpen, setClosetSheetOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedClosetItemIds, setSelectedClosetItemIds] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [tryOnHistory, setTryOnHistory] = useState<TryOnResult[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const visibleMessages = messages.filter((message) => message.id !== 'bot-intro');
  const isChatActive = visibleMessages.length > 0 || draft.trim().length > 0 || isThinking;
  const displayName = currentUser?.username || 'there';
  const greeting = greetingForTime(new Date());
  const selectedClosetItems = closetItems.filter((item) => selectedClosetItemIds.includes(item.id));
  const filteredClosetItems = closetItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = closetSearch.trim().toLowerCase();
    const matchesSearch = !query || [item.name, item.category, item.primaryColor, item.subcategory]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);

    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTryOnHistory() {
      if (!currentUser) {
        if (isMounted) {
          setTryOnHistory([]);
        }
        return;
      }

      try {
        const results = await getTryOnHistory(currentUser.id);
        if (isMounted) {
          setTryOnHistory(results);
        }
      } catch {
        if (isMounted) {
          setTryOnHistory([]);
        }
      }
    }

    loadTryOnHistory();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  function nextMessageId(prefix: string) {
    messageId.current += 1;
    return `${prefix}-${messageId.current}`;
  }

  function requireAccount() {
    if (currentUser) {
      return true;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextMessageId('bot'), role: 'bot', text: 'Sign in or create an account to use the stylist chat with your closet.' },
    ]);
    onNavigate('account');

    return false;
  }

  async function sendMessage(text = draft) {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    if (!requireAccount()) {
      return;
    }

    const modeContext = 'Use my closet as much as possible.';
    const selectedContext = selectedClosetItems.length
      ? ` Selected closet items: ${selectedClosetItems.map((item) => item.name).join(', ')}.`
      : '';
    const imageContext = attachedImageUri ? ' I attached a reference picture.' : '';
    const messageForReply = `${trimmed} ${modeContext}${selectedContext}${imageContext}`;
    const userMessage: ChatMessage = { id: nextMessageId('user'), role: 'user', text: trimmed };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraft('');
    setIsThinking(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    if (hasAny(trimmed.toLowerCase(), ['style quiz', 'fit quiz'])) {
      setIsThinking(false);
      startQuiz('style');
      return;
    }

    if (hasAny(trimmed.toLowerCase(), ['color quiz', 'colour quiz', 'undertone quiz'])) {
      setIsThinking(false);
      startQuiz('color');
      return;
    }

    const reply = await getClosetChatReply({
      bodyProfile: buildBodyProfile(measurements),
      colorProfile,
      closetItems,
      currentUser,
      hasAttachedImage: Boolean(attachedImageUri),
      message: messageForReply,
      selectedClosetItems,
      styleProfile,
      wishlistItems,
    });
    const previewImageUrl = findTryOnHistoryImage(reply.outfit, tryOnHistory);

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextMessageId('bot'), outfit: reply.outfit, previewImageUrl, role: 'bot', text: reply.text },
    ]);
    setClosetSheetOpen(false);
    setIsThinking(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  async function sendWeatherSuggestion() {
    if (!requireAccount()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: nextMessageId('user'),
      role: 'user',
      text: 'What should I wear for the current weather?',
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setIsThinking(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      const recommendation = await getWeatherOutfitRecommendation(plannerWeatherLocation, closetItems);
      const names = recommendation.selectedItems.map((item) => item.name).join(', ');
      const replyText = names
        ? `In ${recommendation.weather.locationName}, it is ${recommendation.weather.temperatureC}°C and ${recommendation.weather.conditionLabel}. Try ${names}.`
        : `In ${recommendation.weather.locationName}, it is ${recommendation.weather.temperatureC}°C and ${recommendation.weather.conditionLabel}, but I need at least a top, bottom, or shoes saved before I can build a weather outfit.`;
      const previewImageUrl = findTryOnHistoryImage(recommendation.outfit, tryOnHistory);

      setMessages((currentMessages) => [
        ...currentMessages,
        { id: nextMessageId('bot'), outfit: recommendation.outfit, previewImageUrl, role: 'bot', text: replyText },
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: nextMessageId('bot'), role: 'bot', text: 'I could not load live weather right now. Try again in a moment.' },
      ]);
    } finally {
      setIsThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  function applySuggestedOutfit(outfit: Partial<SelectedOutfit>) {
    applyOutfit(outfit);
    onNavigate('try-on');
  }

  async function pickReferenceImage() {
    if (!requireAccount()) {
      return;
    }
    setClosetSheetOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: nextMessageId('bot'), role: 'bot', text: 'Allow photo access first, then I can use your picture as outfit inspiration.' },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAttachedImageUri(result.assets[0].uri);
    }
  }

  function toggleClosetItem(item: WardrobeItem) {
    setSelectedClosetItemIds((currentIds) =>
      currentIds.includes(item.id)
        ? currentIds.filter((id) => id !== item.id)
        : [...currentIds, item.id]
    );
  }

  function toggleVoiceInput() {
    if (!requireAccount()) {
      return;
    }
    setClosetSheetOpen(false);
    setIsVoiceActive((isActive) => !isActive);
  }

  function openClosetSheet() {
    if (!requireAccount()) {
      return;
    }
    setClosetSheetOpen(true);
  }

  function startQuiz(mode: QuizState['mode']) {
    if (!requireAccount()) {
      return;
    }

    const question = mode === 'style' ? styleQuiz[0] : colorQuiz[0];
    setQuiz({ answers: [], index: 0, mode });
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        actions: question.actions.map((action) => ({ label: action, value: action })),
        id: nextMessageId('bot'),
        role: 'bot',
        text: question.text,
      },
    ]);
  }

  function chooseQuizAnswer(value: string) {
    if (!requireAccount()) {
      return;
    }

    if (!quiz) {
      return;
    }

    const userMessage: ChatMessage = { id: nextMessageId('user'), role: 'user', text: value };
    const answers = [...quiz.answers, value];
    const questions = quiz.mode === 'style' ? styleQuiz : colorQuiz;
    const nextIndex = quiz.index + 1;

    if (nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex];
      setQuiz({ ...quiz, answers, index: nextIndex });
      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        {
          actions: nextQuestion.actions.map((action) => ({ label: action, value: action })),
          id: nextMessageId('bot'),
          role: 'bot',
          text: nextQuestion.text,
        },
      ]);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      return;
    }

    setQuiz(null);
    const result = quiz.mode === 'style' ? finishStyleQuiz(answers) : finishColorQuiz(answers);
    setMessages((currentMessages) => [...currentMessages, userMessage, { id: nextMessageId('bot'), role: 'bot', text: result }]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  function finishStyleQuiz(answers: string[]) {
    const topFitPref = countMatches(answers, ['fitted top', 'fitted + fitted', 'baby tee', 'fitted base']) >= 3 ? 'fitted' : 'relaxed';
    const bottomFitPref = countMatches(answers, ['baggy jeans', 'wide jeans', 'baggy + baggy', 'relaxed base']) >= 3 ? 'relaxed' : 'fitted';
    const tags = [
      answers.includes('minimal') ? 'minimal' : '',
      answers.includes('streetwear') ? 'streetwear' : '',
      answers.includes('tailored') ? 'tailored' : '',
      answers.includes('sporty') ? 'sporty' : '',
    ].filter(Boolean);
    const nextProfile: StyleProfile = {
      bottomFitPref: bottomFitPref as FitPreference,
      tags: tags.length ? tags : ['balanced'],
      topFitPref: topFitPref as FitPreference,
    };

    setStyleProfile(nextProfile);

    return `Saved. You tend to go for ${nextProfile.topFitPref} tops with ${nextProfile.bottomFitPref} bottoms - that's a ${nextProfile.tags.join(', ')} look.`;
  }

  function finishColorQuiz(answers: string[]) {
    const warm = countMatches(answers, ['greenish', 'gold', 'tans easily', 'cream']);
    const cool = countMatches(answers, ['bluish-purple', 'silver', 'burns easily', 'white']);
    const undertone: Undertone = warm > cool ? 'warm' : cool > warm ? 'cool' : 'neutral';
    const contrastLevel: ContrastLevel = answers.includes('very different') ? 'high contrast' : 'low contrast';
    const palettes = paletteForUndertone(undertone);

    setColorProfile({
      avoidPalette: palettes.avoidPalette,
      contrastLevel,
      recommendedPalette: palettes.recommendedPalette,
      undertone,
    });

    return `Saved. You're a ${undertone} undertone with ${contrastLevel}. Colors worth buying: ${palettes.recommendedPalette.join(', ')}.`;
  }

  return (
    <AppScreen activeTab="discover" onNavigate={onNavigate}>
      <View style={styles.chatScreen}>
        {!isChatActive && (
          <View style={styles.chatHero}>
            <Text style={styles.heroGreeting}>{greeting}, {displayName}</Text>
            <Text style={styles.heroQuestion}>How can I style you?</Text>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.chatLogScroll}
          contentContainerStyle={styles.chatLog}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {visibleMessages.map((message) => {
            const isUser = message.role === 'user';
            const hasOutfit = message.role === 'bot' && message.outfit && Object.keys(message.outfit).length > 0;

            return (
              <View key={message.id} style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.bubbleText, isUser && styles.userText]}>{message.text}</Text>
                {!isUser && message.previewImageUrl && (
                  <View style={styles.previewCard}>
                    <Image source={{ uri: message.previewImageUrl }} style={styles.previewImage} resizeMode="cover" />
                  </View>
                )}
                {message.actions && (
                  <View style={styles.actionList}>
                    {message.actions.map((action) => (
                      <Pressable key={action.value} style={styles.quizAction} onPress={() => chooseQuizAnswer(action.value)}>
                        <Text style={styles.quizActionText}>{action.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {hasOutfit && !message.previewImageUrl && (
                  <Pressable style={styles.useOutfitButton} onPress={() => applySuggestedOutfit(message.outfit ?? {})}>
                    <Text style={styles.useOutfitText}>Try this outfit</Text>
                  </Pressable>
                )}
                {message.webSuggestion && (
                  <View style={styles.webPanel}>
                    <Text style={styles.webEyebrow}>WEB</Text>
                    <Text style={styles.webTitle}>{message.webSuggestion.title}</Text>
                    <Text style={styles.webSummary}>{message.webSuggestion.summary}</Text>
                    <View style={styles.webOutfitRow}>
                      {message.webSuggestion.outfit.map((step: string) => (
                        <View key={step} style={styles.webOutfitChip}>
                          <Text style={styles.webOutfitText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                    {message.webSuggestion.sources.slice(0, 2).map((source: WebStyleSuggestion['sources'][number]) => (
                      <Pressable key={source.url} style={styles.webSource} onPress={() => void Linking.openURL(source.url)}>
                        <Text numberOfLines={1} style={styles.webSourceTitle}>{source.title}</Text>
                        {source.snippet ? <Text numberOfLines={2} style={styles.webSourceSnippet}>{source.snippet}</Text> : null}
                      </Pressable>
                    ))}
                    <View style={styles.webStoreSection}>
                      <Text style={styles.webStoreLabel}>Where to buy</Text>
                      <View style={styles.webStoreRow}>
                        {message.webSuggestion.stores.slice(0, 4).map((store: WebStyleSuggestion['stores'][number]) => (
                          <Pressable key={`${store.name}:${store.query}`} style={styles.webStoreChip} onPress={() => void Linking.openURL(store.url)}>
                            <Text style={styles.webStoreName}>{store.name}</Text>
                            <Text numberOfLines={1} style={styles.webStoreQuery}>{store.query}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
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
          {[
            { label: 'Weather fit', prompt: '', weather: true },
            { label: 'Today outfit', prompt: 'What should I wear today?' },
            { label: 'Body fit', prompt: 'What suits my body?' },
            { label: 'Style quiz', prompt: 'Start style quiz' },
            { label: 'Undertone', prompt: 'Start undertone quiz' },
          ].map((suggestion) => (
            <Pressable
              key={suggestion.label}
              style={styles.suggestionChip}
              onPress={() => {
                if ('weather' in suggestion) {
                  void sendWeatherSuggestion();
                  return;
                }

                sendMessage(suggestion.prompt);
              }}>
              <Text style={styles.suggestionText}>{suggestion.label}</Text>
            </Pressable>
          ))}
        </View>

        {(attachedImageUri || selectedClosetItems.length > 0 || isVoiceActive) && (
          <View style={styles.contextTray}>
            {attachedImageUri ? (
              <View style={styles.contextImageWrap}>
                <Image source={{ uri: attachedImageUri }} style={styles.contextImage} />
                <Pressable style={styles.contextRemove} onPress={() => setAttachedImageUri('')}>
                  <LineIcon name="×" color={closetTheme.cream} />
                </Pressable>
              </View>
            ) : null}
            {selectedClosetItems.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.contextChip}>
                <Text numberOfLines={1} style={styles.contextChipText}>{item.name}</Text>
              </View>
            ))}
            {selectedClosetItems.length > 3 && (
              <Text style={styles.contextMore}>+{selectedClosetItems.length - 3}</Text>
            )}
            {isVoiceActive && <Text style={styles.voiceStatus}>Listening...</Text>}
          </View>
        )}

        <View style={styles.chatComposer}>
          <TextInput
            blurOnSubmit={false}
            editable={!isThinking}
            multiline
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Enter') {
                sendMessage();
              }
            }}
            placeholder={
              currentUser
                ? isVoiceActive
                  ? 'Listening... tell me what you want styled.'
                  : 'Help me style this from my closet.'
                : 'Create an account first...'
            }
            placeholderTextColor="#8A8A8A"
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            submitBehavior="submit"
          />
          <View style={styles.composerActions}>
            <Pressable style={[styles.composerIconButton, attachedImageUri && styles.composerIconButtonActive]} onPress={pickReferenceImage}>
              <LineIcon name="▧" color={closetTheme.ink} />
            </Pressable>
            <Pressable style={[styles.composerIconButton, selectedClosetItems.length > 0 && styles.composerIconButtonActive]} onPress={openClosetSheet}>
              <LineIcon name="♕" color={closetTheme.ink} />
            </Pressable>
            <Pressable style={[styles.composerIconButton, isVoiceActive && styles.composerIconButtonActive]} onPress={toggleVoiceInput}>
              <LineIcon name="♬" color={closetTheme.ink} />
            </Pressable>
            <Pressable
              disabled={isThinking}
              style={({ pressed }) => [styles.send, pressed && styles.sendPressed, isThinking && styles.sendDisabled]}
              onPress={() => sendMessage()}>
              <LineIcon name="→" color={closetTheme.cream} />
            </Pressable>
          </View>
        </View>

        {closetSheetOpen && (
          <View style={styles.closetSheetOverlay}>
            <Pressable style={styles.sheetScrim} onPress={() => setClosetSheetOpen(false)} />
            <View style={styles.closetSheet}>
              <View style={styles.sheetHandle} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setClosetSearch}
                placeholder="Search your closet..."
                placeholderTextColor="#8A8A8A"
                style={styles.closetSearch}
                value={closetSearch}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.closetFilters}>
                <Pressable
                  style={[styles.closetFilter, selectedCategory === 'all' && styles.closetFilterSelected]}
                  onPress={() => setSelectedCategory('all')}>
                  <Text style={[styles.closetFilterText, selectedCategory === 'all' && styles.closetFilterTextSelected]}>All</Text>
                </Pressable>
                {browseCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[styles.closetFilter, selectedCategory === category.id && styles.closetFilterSelected]}
                    onPress={() => setSelectedCategory(category.id)}>
                    <Text style={[styles.closetFilterText, selectedCategory === category.id && styles.closetFilterTextSelected]}>
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView contentContainerStyle={styles.closetGrid} showsVerticalScrollIndicator={false}>
                {filteredClosetItems.map((item) => {
                  const selected = selectedClosetItemIds.includes(item.id);

                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.closetTile, selected && styles.closetTileSelected]}
                      onPress={() => toggleClosetItem(item)}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.closetTileImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.closetTileFallback}>
                          <LineIcon name="♕" color={closetTheme.camelDeep} />
                        </View>
                      )}
                      <Text numberOfLines={1} style={styles.closetTileTitle}>{item.name}</Text>
                      <Text numberOfLines={1} style={styles.closetTileMeta}>{item.primaryColor || item.category}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable style={styles.sheetDoneButton} onPress={() => setClosetSheetOpen(false)}>
                <Text style={styles.sheetDoneText}>
                  {selectedClosetItemIds.length ? `Done · ${selectedClosetItemIds.length} selected` : 'Done'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

function findTryOnHistoryImage(outfit: Partial<SelectedOutfit> | undefined, history: TryOnResult[]) {
  if (!outfit) {
    return '';
  }

  const requestedIds = Object.values(outfit).filter((itemId): itemId is string => Boolean(itemId));
  if (requestedIds.length === 0) {
    return '';
  }

  const match = history.find((entry) => requestedIds.includes(entry.garmentId));
  return match?.resultUrl ?? '';
}

const styles = StyleSheet.create({
  chatScreen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 58,
  },
  chatHero: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    paddingBottom: 18,
    paddingTop: 34,
  },
  heroGreeting: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 30,
    maxWidth: 360,
    textAlign: 'center',
  },
  heroQuestion: {
    color: closetTheme.ink,
    ...closetTypography.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginTop: 4,
    maxWidth: 360,
    textAlign: 'center',
  },
  chatLog: {
    gap: 10,
    paddingBottom: 12,
  },
  chatLogScroll: {
    flex: 1,
  },
  actionList: {
    gap: 8,
    marginTop: 10,
  },
  quizAction: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quizActionText: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
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
  previewCard: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  previewImage: {
    aspectRatio: 0.72,
    width: '100%',
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
  webPanel: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 14,
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  webEyebrow: {
    color: closetTheme.camelDeep,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  webTitle: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  webSummary: {
    color: closetTheme.ink,
    fontSize: 12,
    lineHeight: 17,
  },
  webOutfitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  webOutfitChip: {
    backgroundColor: closetTheme.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  webOutfitText: {
    color: closetTheme.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  webSource: {
    backgroundColor: closetTheme.white,
    borderRadius: 12,
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  webSourceTitle: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  webSourceSnippet: {
    color: closetTheme.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  webStoreSection: {
    gap: 8,
  },
  webStoreLabel: {
    color: closetTheme.camelDeep,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  webStoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  webStoreChip: {
    backgroundColor: closetTheme.white,
    borderRadius: 12,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  webStoreName: {
    color: closetTheme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  webStoreQuery: {
    color: closetTheme.muted,
    fontSize: 10,
    lineHeight: 13,
    maxWidth: 120,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
  },
  suggestionChip: {
    backgroundColor: closetTheme.white,
    borderRadius: 14,
    borderColor: closetTheme.line,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  suggestionText: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
  },
  contextTray: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  contextImageWrap: {
    borderColor: closetTheme.line,
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    overflow: 'hidden',
    position: 'relative',
    width: 44,
  },
  contextImage: {
    height: '100%',
    width: '100%',
  },
  contextRemove: {
    alignItems: 'center',
    backgroundColor: closetTheme.ink,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    top: 2,
    width: 18,
  },
  contextChip: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 14,
    maxWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  contextChipText: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
  },
  contextMore: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  voiceStatus: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  chatComposer: {
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 28,
    gap: 12,
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    position: 'relative',
    zIndex: 4,
  },
  input: {
    color: closetTheme.ink,
    fontFamily: closetTypography.inputFont,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
    minHeight: 64,
    padding: 0,
    textAlignVertical: 'top',
  },
  composerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  composerIconButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  composerIconButtonActive: {
    backgroundColor: closetTheme.blueMist,
    borderColor: closetTheme.camelDeep,
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
  closetSheetOverlay: {
    bottom: 0,
    left: -18,
    position: 'absolute',
    right: -18,
    top: 0,
    zIndex: 10,
  },
  sheetScrim: {
    backgroundColor: 'rgba(47, 95, 143, 0.28)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  closetSheet: {
    backgroundColor: closetTheme.ink,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    left: 0,
    maxHeight: '82%',
    padding: 18,
    position: 'absolute',
    right: 0,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: closetTheme.muted,
    borderRadius: 3,
    height: 5,
    marginBottom: 16,
    width: 52,
  },
  closetSearch: {
    backgroundColor: '#0F0D0C',
    borderRadius: 22,
    color: closetTheme.cream,
    fontFamily: closetTypography.inputFont,
    fontSize: 15,
    fontWeight: '400',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  closetFilters: {
    gap: 8,
    paddingVertical: 14,
  },
  closetFilter: {
    backgroundColor: '#0F0D0C',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  closetFilterSelected: {
    backgroundColor: closetTheme.cream,
  },
  closetFilterText: {
    color: closetTheme.cream,
    fontSize: 13,
    fontWeight: '900',
  },
  closetFilterTextSelected: {
    color: closetTheme.ink,
  },
  closetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 18,
  },
  closetTile: {
    backgroundColor: closetTheme.white,
    borderColor: '#2F2F2F',
    borderWidth: 1,
    minHeight: 160,
    padding: 8,
    width: '33.333%',
  },
  closetTileSelected: {
    borderColor: closetTheme.camel,
    borderWidth: 3,
  },
  closetTileImage: {
    height: 100,
    width: '100%',
  },
  closetTileFallback: {
    alignItems: 'center',
    backgroundColor: closetTheme.cream,
    height: 100,
    justifyContent: 'center',
    width: '100%',
  },
  closetTileTitle: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  closetTileMeta: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  sheetDoneButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.cream,
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 50,
  },
  sheetDoneText: {
    color: closetTheme.ink,
    fontSize: 17,
    fontWeight: '900',
  },
});

function countMatches(values: string[], needles: string[]) {
  return values.filter((value) => hasAny(value.toLowerCase(), needles)).length;
}

function greetingForTime(date: Date) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function paletteForUndertone(undertone: Undertone) {
  if (undertone === 'warm') {
    return {
      avoidPalette: ['icy blue', 'blue-gray', 'stark white'],
      recommendedPalette: ['cream', 'camel', 'olive', 'warm brown', 'terracotta'],
    };
  }

  if (undertone === 'cool') {
    return {
      avoidPalette: ['mustard', 'orange', 'yellow beige'],
      recommendedPalette: ['white', 'navy', 'charcoal', 'cool pink', 'blue'],
    };
  }

  return {
    avoidPalette: ['overly neon tones'],
    recommendedPalette: ['soft white', 'taupe', 'denim blue', 'sage', 'balanced neutrals'],
  };
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

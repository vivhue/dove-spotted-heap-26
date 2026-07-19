import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ScreenId } from '@/models/closet';
import { createClosetItem } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';

export function AddItemScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [selectedTag, setSelectedTag] = useState('Tops');
  const [destination, setDestination] = useState<'Closet' | 'Wishlist'>('Closet');
  const [status, setStatus] = useState('Choose how to add your item.');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { addItem, currentUser } = useClosetStore();

  async function pickImage(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setStatus('Permission is needed to choose an item image.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.92,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.92,
          });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setSelectedImage(result.assets[0]);
    setStatus(`${result.assets[0].fileName ?? 'Image'} ready for ${destination}.`);
  }

  async function handleSave() {
    if (!selectedImage) {
      setStatus('Choose an image before saving.');
      return;
    }

    if (!currentUser) {
      setStatus('Create an account before saving clothes.');
      return;
    }

    try {
      setIsSaving(true);
      setStatus('Cleaning, classifying, and saving...');
      const item = await createClosetItem({
        destination: destination === 'Closet' ? 'closet' : 'wishlist',
        image: selectedImage,
        tag: selectedTag === '+ Add' ? 'Custom' : selectedTag,
        userId: currentUser.id,
      });

      addItem(item);
      setSelectedImage(null);
      setStatus(`${item.name} saved to ${destination}.`);
      onNavigate(destination === 'Closet' ? 'closet' : 'wishlist');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save this item.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppScreen activeTab="add" onNavigate={onNavigate} title="Add new">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Add a piece</Text>
        <OptionCard
          icon="◉"
          title="Take a photo"
          detail="Snap an item you own"
          onPress={() => pickImage('camera')}
        />
        <OptionCard
          icon="▧"
          title="Upload a picture"
          detail="Import from your gallery"
          onPress={() => pickImage('library')}
        />
        {selectedImage && <Image source={{ uri: selectedImage.uri }} style={styles.preview} resizeMode="contain" />}
        <Text style={styles.statusText}>{status}</Text>

        <Text style={styles.sectionLabel}>Tags</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {['Tops', 'Bottoms', 'Shoes', '+ Add'].map((tag) => (
            <Pressable
              key={tag}
              onPress={() => {
                setSelectedTag(tag);
                if (tag === '+ Add') {
                  setStatus('Custom tag input coming next.');
                }
              }}
              style={[styles.chip, selectedTag === tag && styles.chipSelected]}>
              <Text style={[styles.chipText, selectedTag === tag && styles.chipTextSelected]}>{tag}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Add to</Text>
        <View style={styles.addTo}>
          {(['Closet', 'Wishlist'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setDestination(option)}
              style={[styles.addToButton, destination === option && styles.addToSelected]}>
              <Text style={[styles.addToText, destination === option && styles.addToTextSelected]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={isSaving}
          style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}>
          {isSaving ? <ActivityIndicator color={closetTheme.cream} /> : <LineIcon name="+" color={closetTheme.cream} />}
          <Text style={styles.saveText}>{isSaving ? 'Saving' : 'Save item'}</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

function OptionCard({
  detail,
  icon,
  onPress,
  title,
}: {
  detail: string;
  icon: string;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.option, pressed && styles.optionPressed]} onPress={onPress}>
      <View style={styles.optionIcon}>
        <LineIcon name={icon} color={closetTheme.camelDeep} />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
    paddingTop: 4,
  },
  sectionLabel: {
    color: closetTheme.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginHorizontal: 22,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  option: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
    marginHorizontal: 22,
    padding: 16,
  },
  optionPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  statusText: {
    color: closetTheme.camelDeep,
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 22,
    marginTop: 2,
  },
  preview: {
    alignSelf: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 156,
    marginBottom: 8,
    marginTop: 4,
    width: 156,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: closetTheme.creamDeep,
    borderRadius: 13,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  optionDetail: {
    color: closetTheme.muted,
    fontSize: 12,
    marginTop: 3,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 22,
  },
  chip: {
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  chipText: {
    color: closetTheme.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  chipTextSelected: {
    color: closetTheme.cream,
  },
  addTo: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
  },
  addToButton: {
    alignItems: 'center',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  addToSelected: {
    backgroundColor: closetTheme.ink,
    borderColor: closetTheme.ink,
  },
  addToText: {
    color: closetTheme.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  addToTextSelected: {
    color: closetTheme.cream,
  },
  saveButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: closetTheme.ink,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginHorizontal: 22,
    marginTop: 22,
    paddingVertical: 14,
  },
  saveButtonDisabled: {
    opacity: 0.74,
  },
  saveButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  saveText: {
    color: closetTheme.cream,
    fontSize: 13,
    fontWeight: '900',
  },
});

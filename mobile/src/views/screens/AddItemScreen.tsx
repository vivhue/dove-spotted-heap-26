import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { browseCategories, CategoryId, ScreenId, WardrobeFit, wardrobeFitOptions } from '@/models/closet';
import { createGarment, updateGarment } from '@/services/closet-api';
import { useClosetStore } from '@/stores/closet-store';
import { AppScreen } from '@/views/components/app-chrome';
import { closetTheme } from '@/views/components/closet-theme';
import { LineIcon } from '@/views/components/closet-icons';

const addItemCategories = browseCategories
  .filter((category) => category.id !== 'dress')
  .map((category) => category.id === 'shirt' ? { ...category, label: 'Tops', shortLabel: 'Tops' } : category);

// Server-managed garment ids are sha256 hashes; client-local items (e.g. saved
// from the stylist chat) use readable prefixed ids and are edited locally.
function isServerItemId(id: string) {
  return /^[0-9a-f]{64}$/.test(id);
}

export function AddItemScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { addItem, currentUser, editingItem, setEditingItem, updateItem } = useClosetStore();
  // Frozen on mount so the form cannot flip modes mid-edit.
  const [editTarget] = useState(editingItem);
  const isEditing = Boolean(editTarget);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(editTarget?.category ?? 'shirt');
  const [destination, setDestination] = useState<'Closet' | 'Wishlist'>(
    editTarget?.destination === 'wishlist' ? 'Wishlist' : 'Closet'
  );
  const [status, setStatus] = useState(
    editTarget ? `Editing "${editTarget.name}". Adjust the details below.` : 'Choose how to add your item.'
  );
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemName, setItemName] = useState(editTarget?.name ?? '');
  const [primaryColor, setPrimaryColor] = useState(editTarget?.primaryColor ?? '');
  const [price, setPrice] = useState(editTarget?.price ?? '');
  const [source, setSource] = useState(editTarget?.source ?? '');
  const [fit, setFit] = useState<WardrobeFit | ''>(editTarget?.fit ?? '');
  const [notes, setNotes] = useState(editTarget?.notes ?? '');

  async function pickImage(source: 'camera' | 'library') {
    if (!currentUser) {
      setStatus('Sign in or create an account to upload clothes.');
      onNavigate('account');
      return;
    }

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
    if (isEditing) {
      await handleSaveEdit();
      return;
    }

    if (!selectedImage) {
      setStatus('Choose an image before saving.');
      return;
    }

    if (!currentUser) {
      setStatus('Sign in or create an account to save clothes.');
      onNavigate('account');
      return;
    }

    try {
      setIsSaving(true);
      setStatus('Uploading photo...');
      const itemPromise = createGarment({
        category: selectedCategory,
        destination: destination === 'Closet' ? 'closet' : 'wishlist',
        fit,
        image: selectedImage,
        name: itemName,
        notes,
        price,
        primaryColor,
        source,
        userId: currentUser.id,
      });
      setStatus('Cleaning garment...');
      const item = await itemPromise;

      addItem(item);
      resetForm();
      setStatus(`${item.name} saved to ${destination}.`);
      onNavigate(destination === 'Closet' ? 'closet' : 'wishlist');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save this item.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) {
      return;
    }

    if (!currentUser) {
      setStatus('Sign in to edit your items.');
      onNavigate('account');
      return;
    }

    if (!itemName.trim()) {
      setStatus('Give the item a name before saving.');
      return;
    }

    const nextDestination = destination === 'Closet' ? 'closet' : 'wishlist';

    try {
      setIsSaving(true);
      setStatus('Saving changes...');

      if (isServerItemId(editTarget.id)) {
        const item = await updateGarment(
          editTarget.id,
          {
            category: selectedCategory,
            destination: nextDestination,
            fit,
            name: itemName,
            notes,
            price,
            primaryColor,
            source,
          },
          currentUser.id
        );

        updateItem(item);
      } else {
        // Items that only exist client-side are edited locally.
        updateItem({
          ...editTarget,
          category: selectedCategory,
          destination: nextDestination,
          fit: fit || undefined,
          name: itemName.trim(),
          notes: notes.trim() || undefined,
          price: price.trim() || undefined,
          primaryColor: primaryColor.trim() || undefined,
          source: source.trim() || undefined,
        });
      }

      setEditingItem(null);
      setStatus(`${itemName.trim()} updated.`);
      onNavigate(nextDestination);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save these changes.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditingItem(null);
    onNavigate(editTarget?.destination === 'wishlist' ? 'wishlist' : 'closet');
  }

  function resetForm() {
    setSelectedImage(null);
    setItemName('');
    setPrimaryColor('');
    setPrice('');
    setSource('');
    setFit('');
    setNotes('');
  }

  return (
    <AppScreen
      activeTab="add"
      onNavigate={onNavigate}
      showStylist={false}
      title={isEditing ? 'Edit item' : 'Add new'}
      titleOffsetY={-48}>
      <ScrollView contentContainerStyle={styles.content}>
        {!isEditing && !selectedImage && (
          <>
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
          </>
        )}
        {!isEditing && selectedImage && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: selectedImage.uri }} style={styles.preview} resizeMode="contain" />
            <Pressable
              accessibilityLabel="Remove selected image"
              style={({ pressed }) => [styles.removeImageButton, pressed && styles.optionPressed]}
              onPress={() => {
                setSelectedImage(null);
                setStatus('Choose how to add your item.');
              }}>
              <Text style={styles.removeImageText}>×</Text>
            </Pressable>
          </View>
        )}
        {isEditing && editTarget?.imageUrl && (
          <Image source={{ uri: editTarget.imageUrl }} style={[styles.preview, styles.editPreview]} resizeMode="contain" />
        )}
        <Text style={styles.statusText}>{status}</Text>

        <Text style={styles.sectionLabel}>Category (required)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {addItemCategories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[styles.chip, selectedCategory === category.id && styles.chipSelected]}>
              <Text style={[styles.chipText, selectedCategory === category.id && styles.chipTextSelected]}>{category.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Details (optional)</Text>
        <View style={styles.detailFields}>
          <DetailField label="Name" placeholder="e.g. Linen camp shirt" value={itemName} onChangeText={setItemName} />
          <View style={styles.detailRow}>
            <DetailField compact label="Color" placeholder="e.g. Navy" value={primaryColor} onChangeText={setPrimaryColor} />
            <DetailField
              compact
              inputMode="decimal"
              label="Price"
              placeholder="e.g. $48"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <DetailField label="Store / brand" placeholder="e.g. Uniqlo" value={source} onChangeText={setSource} />

          <View style={styles.fitField}>
            <Text style={[styles.detailLabel, styles.fitLabel]}>Fit</Text>
            <View style={styles.fitChips}>
              {wardrobeFitOptions.map((option) => {
                const selected = fit === option.id;

                return (
                  <Pressable
                    key={option.id}
                    accessibilityLabel={selected ? `Clear ${option.label} fit` : `Set fit to ${option.label}`}
                    onPress={() => setFit(selected ? '' : option.id)}
                    style={({ pressed }) => [styles.chip, styles.fitChip, selected && styles.chipSelected, pressed && styles.chipPressed]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <DetailField
            label="Notes"
            multiline
            placeholder="Anything else — occasion, styling ideas, sizing..."
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <Text style={styles.sectionLabel}>{isEditing ? 'Keep in' : 'Add to'}</Text>
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
          {isSaving ? <ActivityIndicator color={closetTheme.cream} /> : <LineIcon name={isEditing ? '✓' : '+'} color={closetTheme.cream} />}
          <Text style={styles.saveText}>{isSaving ? 'Saving' : isEditing ? 'Save changes' : 'Save item'}</Text>
        </Pressable>

        {isEditing && (
          <Pressable
            disabled={isSaving}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.saveButtonPressed, isSaving && styles.saveButtonDisabled]}
            onPress={handleCancelEdit}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function DetailField({
  compact = false,
  inputMode,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  compact?: boolean;
  inputMode?: 'decimal' | 'text';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={[styles.detailField, compact && styles.detailFieldCompact]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <TextInput
        inputMode={inputMode}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={closetTheme.muted}
        style={[styles.detailInput, multiline && styles.detailInputMultiline]}
        value={value}
      />
    </View>
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
    backgroundColor: closetTheme.creamDeep,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 156,
    width: 156,
  },
  previewWrap: {
    alignSelf: 'center',
    marginBottom: 8,
    marginTop: 4,
    position: 'relative',
  },
  editPreview: {
    alignSelf: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  removeImageButton: {
    alignItems: 'center',
    backgroundColor: '#FFF3D7',
    borderColor: '#7A4328',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    top: -8,
    width: 28,
    zIndex: 3,
  },
  removeImageText: {
    color: '#7A4328',
    fontFamily: Platform.select({ android: 'sans-serif', ios: 'System', web: 'Arial' }),
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 22,
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
  chipPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.96 }],
  },
  detailFields: {
    gap: 10,
    paddingHorizontal: 22,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailField: {
    backgroundColor: closetTheme.cream,
    borderColor: closetTheme.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailFieldCompact: {
    flex: 1,
  },
  detailLabel: {
    color: closetTheme.camelDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailInput: {
    color: closetTheme.ink,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 30,
    padding: 0,
  },
  detailInputMultiline: {
    minHeight: 66,
    textAlignVertical: 'top',
  },
  fitField: {
    gap: 8,
  },
  fitLabel: {
    // Optically aligns with the labels inside the bordered fields.
    marginHorizontal: 12,
  },
  fitChips: {
    flexDirection: 'row',
    gap: 8,
  },
  fitChip: {
    alignItems: 'center',
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
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
  cancelButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: closetTheme.white,
    borderColor: closetTheme.line,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginHorizontal: 22,
    marginTop: 10,
    minHeight: 48,
  },
  cancelText: {
    color: closetTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
});

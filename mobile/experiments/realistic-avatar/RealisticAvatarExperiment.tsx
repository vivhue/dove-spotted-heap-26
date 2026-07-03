import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AvatarCreator } from './AvatarCreator';
import { AvatarViewer } from './AvatarViewer';

export function RealisticAvatarExperiment() {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [rpmSubdomain, setRpmSubdomain] = useState('demo');
  const [showCreator, setShowCreator] = useState(false);

  if (showCreator) {
    return (
      <AvatarCreator
        subdomain={rpmSubdomain.trim() || 'demo'}
        onAvatarCreated={(url) => {
          setAvatarUrl(url);
          setShowCreator(false);
        }}
      />
    );
  }

  if (avatarUrl) {
    return <AvatarViewer avatarUrl={avatarUrl} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.panel}>
        <Text style={styles.title}>Realistic Avatar Experiment</Text>
        <Text style={styles.copy}>
          Create a Ready Player Me avatar from selfie/manual customization, then render the exported GLB.
        </Text>

        <Text style={styles.label}>Ready Player Me subdomain</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setRpmSubdomain}
          placeholder="your-subdomain"
          placeholderTextColor="#A89A85"
          style={styles.input}
          value={rpmSubdomain}
        />

        <Pressable style={styles.primaryButton} onPress={() => setShowCreator(true)}>
          <Text style={styles.primaryText}>Open avatar creator</Text>
        </Pressable>

        <Text style={styles.label}>Or paste an avatar .glb URL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setAvatarUrl}
          placeholder="https://models.readyplayer.me/..."
          placeholderTextColor="#A89A85"
          style={styles.input}
          value={avatarUrl}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F7F1E7',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  panel: {
    backgroundColor: '#FFFDF9',
    borderColor: '#E0D5C2',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  title: {
    color: '#2B2118',
    fontSize: 22,
    fontWeight: '900',
  },
  copy: {
    color: '#6E6256',
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    color: '#A97B4E',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F7F1E7',
    borderColor: '#E0D5C2',
    borderRadius: 12,
    borderWidth: 1,
    color: '#2B2118',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2B2118',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryText: {
    color: '#F7F1E7',
    fontSize: 13,
    fontWeight: '900',
  },
});

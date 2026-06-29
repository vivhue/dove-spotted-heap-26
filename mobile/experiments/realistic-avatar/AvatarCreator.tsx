import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

type AvatarCreatorProps = {
  onAvatarCreated: (avatarUrl: string) => void;
  subdomain: string;
};

type ReadyPlayerMeMessage = {
  data?: {
    url?: string;
  };
  eventName?: string;
  source?: string;
};

export function AvatarCreator({ onAvatarCreated, subdomain }: AvatarCreatorProps) {
  const webviewRef = useRef<WebView>(null);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as ReadyPlayerMeMessage;

      if (message.eventName === 'v1.avatar.exported' && message.data?.url) {
        onAvatarCreated(message.data.url);
      }
    } catch {
      // Ready Player Me can emit non-JSON browser events; ignore them.
    }
  }

  const injectedJavaScript = `
    window.addEventListener('message', (event) => {
      try {
        const json = JSON.parse(event.data);
        if (json?.source !== 'readyplayerme') return;
        window.ReactNativeWebView.postMessage(event.data);
      } catch (error) {}
    });
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: `https://${subdomain}.readyplayer.me/avatar?frameApi` }}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

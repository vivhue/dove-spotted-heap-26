import '@/views/components/app-font-defaults';

import { ClosetApp } from '@/views/ClosetApp';
import { ClosetStoreProvider } from '@/stores/closet-store';

export default function Home() {
  return (
    <ClosetStoreProvider>
      <ClosetApp />
    </ClosetStoreProvider>
  );
}

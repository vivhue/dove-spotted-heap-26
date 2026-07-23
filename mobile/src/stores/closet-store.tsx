import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { AvatarChoice, CategoryId, ClosetAccount, defaultPixelAvatar, PixelAvatarConfig, WardrobeItem } from '@/models/closet';
import { supabase } from '@/lib/supabase';
import { deleteGarment, getGarments } from '@/services/closet-api';

export type SelectedOutfit = Record<CategoryId, string | null>;
export type ScheduledOutfits = Record<string, string[]>;

type AuthResult = {
  ok: boolean;
  message: string;
};

type ClosetStoreValue = {
  addItem: (item: WardrobeItem) => void;
  applyOutfit: (outfit: Partial<SelectedOutfit>) => void;
  closetItems: WardrobeItem[];
  currentUser: ClosetAccount | null;
  // Item the add screen should edit instead of creating. Navigation cannot
  // carry params (screens are switched by id), so the store carries it.
  editingItem: WardrobeItem | null;
  guidedMode: boolean;
  setEditingItem: (item: WardrobeItem | null) => void;
  isLoadingItems: boolean;
  itemsError: string;
  isAuthReady: boolean;
  logIn: (username: string, password: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;
  refreshItems: () => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateItem: (item: WardrobeItem) => void;
  scheduledOutfits: ScheduledOutfits;
  scheduleOutfitForDate: (dateKey: string, itemIds: string[]) => void;
  selectedOutfit: SelectedOutfit;
  selfieImageUrl: string;
  setSelfieImageUrl: (url: string) => void;
  signUp: (username: string, password: string, gender: ClosetAccount['gender']) => Promise<AuthResult>;
  updateAccountAvatar: (avatar: AvatarChoice) => void;
  updateGuidedMode: (enabled: boolean) => void;
  updatePixelAvatar: (updates: Partial<PixelAvatarConfig>) => void;
  toggleWornItem: (item: WardrobeItem) => void;
  wishlistItems: WardrobeItem[];
};

const ClosetStoreContext = createContext<ClosetStoreValue | undefined>(undefined);
const closetItemsStoragePrefix = 'bove-closet-items';
const calendarOutfitsStoragePrefix = 'bove-calendar-outfits';

const initialSelectedOutfit: SelectedOutfit = {
  shirt: null,
  dress: null,
  shorts: null,
  pants: null,
};

function canUseLocalStorage() {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

function closetItemsStorageKey(userId: string) {
  return `${closetItemsStoragePrefix}:${userId}`;
}

function loadCachedClosetItems(userId: string) {
  if (!userId || !canUseLocalStorage()) {
    return [];
  }

  try {
    const cachedItems = globalThis.localStorage.getItem(closetItemsStorageKey(userId));

    return cachedItems ? (JSON.parse(cachedItems) as WardrobeItem[]) : [];
  } catch {
    return [];
  }
}

function saveCachedClosetItems(userId: string, items: WardrobeItem[]) {
  if (!userId || !canUseLocalStorage()) {
    return;
  }

  globalThis.localStorage.setItem(closetItemsStorageKey(userId), JSON.stringify(items));
}

function calendarOutfitsStorageKey(userId: string) {
  return `${calendarOutfitsStoragePrefix}:${userId}`;
}

function loadCachedScheduledOutfits(userId: string) {
  if (!userId || !canUseLocalStorage()) {
    return {};
  }

  try {
    const cachedOutfits = globalThis.localStorage.getItem(calendarOutfitsStorageKey(userId));

    return cachedOutfits ? (JSON.parse(cachedOutfits) as ScheduledOutfits) : {};
  } catch {
    return {};
  }
}

function saveCachedScheduledOutfits(userId: string, outfits: ScheduledOutfits) {
  if (!userId || !canUseLocalStorage()) {
    return;
  }

  globalThis.localStorage.setItem(calendarOutfitsStorageKey(userId), JSON.stringify(outfits));
}

function normalizeUsername(username: string) {
  return username.trim();
}

function usernameToAuthEmail(username: string) {
  const localPart = normalizeUsername(username)
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');

  return localPart ? `${localPart}@bovecloset.app` : '';
}

function accountFromSupabaseUser(user: User): ClosetAccount {
  const metadata = user.user_metadata ?? {};

  return {
    avatar: isAvatarChoice(metadata.avatar) ? metadata.avatar : 'shirt',
    createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : user.created_at ?? new Date().toISOString(),
    gender: metadata.gender === 'female' || metadata.gender === 'male' ? metadata.gender : undefined,
    guidedMode: typeof metadata.guidedMode === 'boolean' ? metadata.guidedMode : true,
    id: user.id,
    password: '',
    pixelAvatar: isPixelAvatarConfig(metadata.pixelAvatar) ? metadata.pixelAvatar : defaultPixelAvatar,
    username: typeof metadata.username === 'string' && metadata.username.trim() ? metadata.username.trim() : user.email?.split('@')[0] ?? 'closet-user',
  };
}

function isAvatarChoice(value: unknown): value is AvatarChoice {
  return ['initial', 'hanger', 'shirt', 'dress', 'shorts', 'pants'].includes(String(value));
}

function isPixelAvatarConfig(value: unknown): value is PixelAvatarConfig {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'body' in value &&
      'ears' in value &&
      'eyes' in value &&
      'face' in value &&
      'hair' in value &&
      'mouth' in value &&
      'nose' in value &&
      'outfitColor' in value &&
      'skinColor' in value
  );
}

export function ClosetStoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ClosetAccount | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<SelectedOutfit>(initialSelectedOutfit);
  const [scheduledOutfits, setScheduledOutfits] = useState<ScheduledOutfits>(() => loadCachedScheduledOutfits(currentUserId));
  const [selfieImageUrl, setSelfieImageUrl] = useState('');
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);

  const refreshItems = useCallback(async () => {
    if (!currentUserId) {
      setItems([]);
      setItemsError('');
      setIsLoadingItems(false);
      return;
    }

    const cachedItems = loadCachedClosetItems(currentUserId);

    if (cachedItems.length > 0) {
      setItems(cachedItems);
      setIsLoadingItems(false);
    } else {
      setIsLoadingItems(true);
    }

    setItemsError('');

    try {
      const freshItems = await getGarments(currentUserId);
      setItems(freshItems);
      saveCachedClosetItems(currentUserId, freshItems);
    } catch (error) {
      setItemsError(error instanceof Error ? error.message : 'Could not load saved items.');
    } finally {
      setIsLoadingItems(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    // Sync cached closet data whenever the signed-in account changes.
    refreshItems();
  }, [refreshItems]);

  useEffect(() => {
    // Reset account-scoped UI state when switching users.
    setSelectedOutfit(initialSelectedOutfit);
    setScheduledOutfits(loadCachedScheduledOutfits(currentUserId));
    setSelfieImageUrl('');
  }, [currentUserId]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setCurrentUser(null);
        setCurrentUserId('');
        setIsAuthReady(true);
        return;
      }

      setCurrentUser(data.session?.user ? accountFromSupabaseUser(data.session.user) : null);
      setCurrentUserId(data.session?.user?.id ?? '');
      setIsAuthReady(true);
    }

    bootstrapSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ? accountFromSupabaseUser(session.user) : null);
      setCurrentUserId(session?.user?.id ?? '');
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<ClosetStoreValue>(() => {
    const closetItems = items.filter((item) => (item.destination ?? 'closet') === 'closet');
    const wishlistItems = items.filter((item) => item.destination === 'wishlist');

    return {
      addItem: (item) => {
        if (!currentUserId) {
          return;
        }

        const itemForCurrentUser = {
          ...item,
          userId: item.userId ?? currentUserId,
        };

        setItems((currentItems) => {
          const nextItems = [
            itemForCurrentUser,
            ...currentItems.filter((current) => current.id !== itemForCurrentUser.id),
          ];

          saveCachedClosetItems(currentUserId, nextItems);

          return nextItems;
        });
      },
      applyOutfit: (outfit) => {
        setSelectedOutfit((currentOutfit) => ({
          ...currentOutfit,
          ...outfit,
        }));
      },
      closetItems,
      currentUser,
      editingItem,
      guidedMode: currentUser?.guidedMode ?? true,
      setEditingItem,
      isLoadingItems,
      itemsError,
      isAuthReady,
      logIn: async (username, password) => {
        const cleanedUsername = normalizeUsername(username);
        const email = usernameToAuthEmail(cleanedUsername);

        if (!cleanedUsername || !password) {
          return { ok: false, message: 'Enter your username and password.' };
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { ok: false, message: error.message || 'That username or password does not match.' };
        }

        return { ok: true, message: `Welcome back, ${cleanedUsername}.` };
      },
      logOut: async () => {
        await supabase.auth.signOut();
      },
      refreshItems,
      removeItem: async (itemId) => {
        if (!currentUserId) {
          return;
        }

        // Server first, so a failure never leaves the UI claiming the item is
        // gone. Items that only ever lived client-side come back
        // { deleted: false }, which is still success for removal.
        await deleteGarment(itemId, currentUserId);

        setItems((currentItems) => {
          const nextItems = currentItems.filter((item) => item.id !== itemId);

          saveCachedClosetItems(currentUserId, nextItems);

          return nextItems;
        });

        setSelectedOutfit((currentOutfit) => {
          const entries = Object.entries(currentOutfit) as [CategoryId, string | null][];

          if (!entries.some(([, wornId]) => wornId === itemId)) {
            return currentOutfit;
          }

          return Object.fromEntries(
            entries.map(([category, wornId]) => [category, wornId === itemId ? null : wornId])
          ) as SelectedOutfit;
        });

        setScheduledOutfits((currentOutfits) => {
          let hasChanged = false;
          const nextOutfits: ScheduledOutfits = {};

          for (const [dateKey, itemIds] of Object.entries(currentOutfits)) {
            const nextIds = itemIds.filter((id) => id !== itemId);

            hasChanged = hasChanged || nextIds.length !== itemIds.length;
            nextOutfits[dateKey] = nextIds;
          }

          if (!hasChanged) {
            return currentOutfits;
          }

          saveCachedScheduledOutfits(currentUserId, nextOutfits);

          return nextOutfits;
        });
      },
      scheduledOutfits,
      scheduleOutfitForDate: (dateKey, itemIds) => {
        if (!currentUserId) {
          return;
        }

        setScheduledOutfits((currentOutfits) => {
          const nextOutfits = {
            ...currentOutfits,
            [dateKey]: Array.from(new Set(itemIds)),
          };

          saveCachedScheduledOutfits(currentUserId, nextOutfits);

          return nextOutfits;
        });
      },
      selectedOutfit,
      selfieImageUrl,
      setSelfieImageUrl,
      updateItem: (item) => {
        if (!currentUserId) {
          return;
        }

        // Replace, don't merge: a cleared attribute is absent from the server
        // response and merging would resurrect its old value.
        setItems((currentItems) => {
          const nextItems = currentItems.map((current) => (current.id === item.id ? item : current));

          saveCachedClosetItems(currentUserId, nextItems);

          return nextItems;
        });
      },
      signUp: async (username, password, gender) => {
        const cleanedUsername = normalizeUsername(username);
        const email = usernameToAuthEmail(cleanedUsername);

        if (!gender) {
          return { ok: false, message: 'Choose male or female so recommendations fit better.' };
        }

        if (cleanedUsername.length < 3) {
          return { ok: false, message: 'Use at least 3 characters for your username.' };
        }

        if (password.length < 6) {
          return { ok: false, message: 'Use at least 6 characters for your password.' };
        }

        if (!email) {
          return { ok: false, message: 'Use a username with letters or numbers.' };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              avatar: 'shirt',
              createdAt: new Date().toISOString(),
              gender,
              guidedMode: true,
              pixelAvatar: defaultPixelAvatar,
              username: cleanedUsername,
            },
          },
        });

        if (error) {
          return { ok: false, message: error.message || 'Could not create your account.' };
        }

        if (data.user && !data.session) {
          return { ok: true, message: 'Account created. Turn off email confirmation in Supabase Auth for instant demo login.' };
        }

        return { ok: true, message: `Account created for ${cleanedUsername}.` };
      },
      updateAccountAvatar: (avatar) => {
        if (!currentUserId) {
          return;
        }

        setCurrentUser((current) => (current ? { ...current, avatar } : current));
        void supabase.auth.updateUser({
          data: {
            avatar,
            createdAt: currentUser?.createdAt ?? new Date().toISOString(),
            gender: currentUser?.gender,
            guidedMode: currentUser?.guidedMode ?? true,
            pixelAvatar: currentUser?.pixelAvatar ?? defaultPixelAvatar,
            username: currentUser?.username ?? 'closet-user',
          },
        });
      },
      updateGuidedMode: (enabled) => {
        if (!currentUserId) {
          return;
        }

        setCurrentUser((current) => (current ? { ...current, guidedMode: enabled } : current));
        void supabase.auth.updateUser({
          data: {
            avatar: currentUser?.avatar ?? 'shirt',
            createdAt: currentUser?.createdAt ?? new Date().toISOString(),
            gender: currentUser?.gender,
            guidedMode: enabled,
            pixelAvatar: currentUser?.pixelAvatar ?? defaultPixelAvatar,
            username: currentUser?.username ?? 'closet-user',
          },
        });
      },
      updatePixelAvatar: (updates) => {
        if (!currentUserId) {
          return;
        }

        const nextPixelAvatar = { ...defaultPixelAvatar, ...(currentUser?.pixelAvatar ?? {}), ...updates };

        setCurrentUser((current) => (current ? { ...current, pixelAvatar: nextPixelAvatar } : current));
        void supabase.auth.updateUser({
          data: {
            avatar: currentUser?.avatar ?? 'shirt',
            createdAt: currentUser?.createdAt ?? new Date().toISOString(),
            gender: currentUser?.gender,
            guidedMode: currentUser?.guidedMode ?? true,
            pixelAvatar: nextPixelAvatar,
            username: currentUser?.username ?? 'closet-user',
          },
        });
      },
      toggleWornItem: (item) => {
        setSelectedOutfit((currentOutfit) => ({
          ...currentOutfit,
          [item.category]: currentOutfit[item.category] === item.id ? null : item.id,
        }));
      },
      wishlistItems,
    };
  }, [currentUser, currentUserId, editingItem, isAuthReady, items, isLoadingItems, itemsError, refreshItems, scheduledOutfits, selectedOutfit, selfieImageUrl]);

  return <ClosetStoreContext.Provider value={value}>{children}</ClosetStoreContext.Provider>;
}

export function useClosetStore() {
  const context = useContext(ClosetStoreContext);

  if (!context) {
    throw new Error('useClosetStore must be used inside ClosetStoreProvider.');
  }

  return context;
}

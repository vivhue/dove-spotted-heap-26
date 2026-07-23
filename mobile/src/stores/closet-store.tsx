import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AvatarChoice, CategoryId, ClosetAccount, defaultPixelAvatar, PixelAvatarConfig, WardrobeItem } from '@/models/closet';
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
  logIn: (username: string, password: string) => AuthResult;
  logOut: () => void;
  refreshItems: () => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateItem: (item: WardrobeItem) => void;
  scheduledOutfits: ScheduledOutfits;
  scheduleOutfitForDate: (dateKey: string, itemIds: string[]) => void;
  selectedOutfit: SelectedOutfit;
  selfieImageUrl: string;
  setSelfieImageUrl: (url: string) => void;
  signUp: (username: string, password: string, gender: ClosetAccount['gender']) => AuthResult;
  updateAccountAvatar: (avatar: AvatarChoice) => void;
  updateGuidedMode: (enabled: boolean) => void;
  updatePixelAvatar: (updates: Partial<PixelAvatarConfig>) => void;
  toggleWornItem: (item: WardrobeItem) => void;
  wishlistItems: WardrobeItem[];
};

const ClosetStoreContext = createContext<ClosetStoreValue | undefined>(undefined);
const accountsStorageKey = 'bove-closet-accounts';
const closetItemsStoragePrefix = 'bove-closet-items';
const calendarOutfitsStoragePrefix = 'bove-calendar-outfits';
const currentUserStorageKey = 'bove-closet-current-user';

const initialSelectedOutfit: SelectedOutfit = {
  shirt: null,
  dress: null,
  shorts: null,
  pants: null,
};

function canUseLocalStorage() {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

function loadStoredAccounts() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const storedAccounts = globalThis.localStorage.getItem(accountsStorageKey);

    return storedAccounts ? (JSON.parse(storedAccounts) as ClosetAccount[]) : [];
  } catch {
    return [];
  }
}

function loadStoredCurrentUserId() {
  if (!canUseLocalStorage()) {
    return '';
  }

  return globalThis.localStorage.getItem(currentUserStorageKey) ?? '';
}

function saveStoredAccounts(accounts: ClosetAccount[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  globalThis.localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

function saveStoredCurrentUserId(userId: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  if (userId) {
    globalThis.localStorage.setItem(currentUserStorageKey, userId);
  } else {
    globalThis.localStorage.removeItem(currentUserStorageKey);
  }
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

export function ClosetStoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<ClosetAccount[]>(loadStoredAccounts);
  const [currentUserId, setCurrentUserId] = useState(loadStoredCurrentUserId);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(Boolean(currentUserId));
  const [itemsError, setItemsError] = useState('');
  const [selectedOutfit, setSelectedOutfit] = useState<SelectedOutfit>(initialSelectedOutfit);
  const [scheduledOutfits, setScheduledOutfits] = useState<ScheduledOutfits>(() => loadCachedScheduledOutfits(currentUserId));
  const [selfieImageUrl, setSelfieImageUrl] = useState('');
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const currentUser = accounts.find((account) => account.id === currentUserId) ?? null;

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
    saveStoredAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    saveStoredCurrentUserId(currentUserId);
  }, [currentUserId]);

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
      logIn: (username, password) => {
        const cleanedUsername = normalizeUsername(username);
        const matchingAccount = accounts.find(
          (account) => account.username.toLowerCase() === cleanedUsername.toLowerCase()
        );

        if (!cleanedUsername || !password) {
          return { ok: false, message: 'Enter your username and password.' };
        }

        if (!matchingAccount || matchingAccount.password !== password) {
          return { ok: false, message: 'That username or password does not match.' };
        }

        setCurrentUserId(matchingAccount.id);

        return { ok: true, message: `Welcome back, ${matchingAccount.username}.` };
      },
      logOut: () => {
        setCurrentUserId('');
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
      signUp: (username, password, gender) => {
        const cleanedUsername = normalizeUsername(username);

        if (!gender) {
          return { ok: false, message: 'Choose male or female so recommendations fit better.' };
        }

        if (cleanedUsername.length < 3) {
          return { ok: false, message: 'Use at least 3 characters for your username.' };
        }

        if (password.length < 6) {
          return { ok: false, message: 'Use at least 6 characters for your password.' };
        }

        if (accounts.some((account) => account.username.toLowerCase() === cleanedUsername.toLowerCase())) {
          return { ok: false, message: 'That username is already taken.' };
        }

        const nextAccount: ClosetAccount = {
          avatar: 'shirt',
          createdAt: new Date().toISOString(),
          gender,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          password,
          pixelAvatar: defaultPixelAvatar,
          username: cleanedUsername,
        };

        setAccounts((currentAccounts) => [nextAccount, ...currentAccounts]);
        setCurrentUserId(nextAccount.id);

        return { ok: true, message: `Account created for ${nextAccount.username}.` };
      },
      updateAccountAvatar: (avatar) => {
        if (!currentUserId) {
          return;
        }

        setAccounts((currentAccounts) =>
          currentAccounts.map((account) =>
            account.id === currentUserId ? { ...account, avatar } : account
          )
        );
      },
      updateGuidedMode: (enabled) => {
        if (!currentUserId) {
          return;
        }

        setAccounts((currentAccounts) =>
          currentAccounts.map((account) =>
            account.id === currentUserId ? { ...account, guidedMode: enabled } : account
          )
        );
      },
      updatePixelAvatar: (updates) => {
        if (!currentUserId) {
          return;
        }

        setAccounts((currentAccounts) =>
          currentAccounts.map((account) =>
            account.id === currentUserId
              ? { ...account, pixelAvatar: { ...defaultPixelAvatar, ...(account.pixelAvatar ?? {}), ...updates } }
              : account
          )
        );
      },
      toggleWornItem: (item) => {
        setSelectedOutfit((currentOutfit) => ({
          ...currentOutfit,
          [item.category]: currentOutfit[item.category] === item.id ? null : item.id,
        }));
      },
      wishlistItems,
    };
  }, [accounts, currentUser, currentUserId, editingItem, items, isLoadingItems, itemsError, refreshItems, scheduledOutfits, selectedOutfit, selfieImageUrl]);

  return <ClosetStoreContext.Provider value={value}>{children}</ClosetStoreContext.Provider>;
}

export function useClosetStore() {
  const context = useContext(ClosetStoreContext);

  if (!context) {
    throw new Error('useClosetStore must be used inside ClosetStoreProvider.');
  }

  return context;
}

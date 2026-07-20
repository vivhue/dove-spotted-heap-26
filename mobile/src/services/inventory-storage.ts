import { cloneInventoryState, initialInventoryState, InventoryState } from '@/models/closet';

const STORAGE_KEY = 'bovecloset.inventory.v1';

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadInventoryState(): InventoryState {
  if (!isBrowserStorageAvailable()) {
    return cloneInventoryState(initialInventoryState);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return cloneInventoryState(initialInventoryState);
    }

    const parsed = JSON.parse(raw) as InventoryState;

    if (!Array.isArray(parsed.closet) || !Array.isArray(parsed.wishlist)) {
      return cloneInventoryState(initialInventoryState);
    }

    return cloneInventoryState(parsed);
  } catch {
    return cloneInventoryState(initialInventoryState);
  }
}

export function saveInventoryState(state: InventoryState) {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

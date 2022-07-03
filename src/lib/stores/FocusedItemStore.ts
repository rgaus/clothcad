import { writable } from 'svelte/store';
import type { Item } from '$lib/types/item';

export const FocusedItemStore = {
  ...writable<Item | null>(null),

  isFocused(
    state: Item | null,
    itemType: Item['itemType'],
    itemId: Item['itemId'],
  ): boolean {
    if (!state) {
      return false;
    }
    return state.itemType === itemType && state.itemId === itemId;
  },

  isTypeFocused(
    state: Item | null,
    itemType: Item['itemType'],
  ): boolean {
    if (!state) {
      return false;
    }
    return state.itemType === itemType;
  },

  focusItem(
    itemType: Item['itemType'],
    itemId: Item['itemId'],
  ) {
    FocusedItemStore.set({itemType, itemId});
  },

  blurItem() {
    FocusedItemStore.set(null);
  },
};

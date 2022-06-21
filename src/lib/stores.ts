import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

import { Surface } from '$lib/core';

type CollectionStoreAPI<T extends {id: string}, U extends { items: Array<T> }> = Writable<U> & {
  list: (value: U) => Array<T>;
  get: (value: U, itemId: T['id']) => T | null;
  add: (item: T) => void;
  update: (itemId: T['id'], updater: (item: T) => T) => void;
  remove: (itemId: T['id']) => void;
};

function createCollectionStore<T extends {id: string}, U extends { items: Array<T> }>(
  initialValue={ items: [] },
): CollectionStoreAPI<T> {
  const store = writable<U>(initialValue);

  return {
    ...store,

    list(value: U): Array<T> {
      return value.items;
    },

    get(value: U, itemId: T['id']): T | null {
      const item = value.items.find(n => n.id === itemId);
      if (!item) {
        return null;
      }
      return item;
    },

    add(item: T) {
      store.update(value => ({...value, items: [...value.items, item]}));
    },

    update(itemId: T['id'], updater: (item: T) => T) {
      store.update(value => {
        const newValue = {
          ...value,
          items: value.items.map(n => n.id === itemId ? updater(n) : n),
        };
        return newValue;
      });
    },

    remove(itemId: T['id']) {
      store.update(value => {
        return { ...value, items: value.items.filter(n => n.id !== itemId) }
      });
    },
  };
}

const SurfaceStore = createCollectionStore<Surface>();




type Item =
  | { itemType: 'surface'; itemId: Surface['id'] }
  | { itemType: 'fold'; itemId: LinearFold['id'] };

const HighlightedItemStore = {
  ...writable<Item | null>(null),

  isHighlighted(
    state: Item | null,
    itemType: Item['itemType'],
    itemId: Item['itemId'],
  ): boolean {
    if (!state) {
      return false;
    }
    return state.itemType === itemType && state.itemId === itemId;
  },

  enterItem(
    itemType: Item['itemType'],
    itemId: Item['itemId'],
  ) {
    HighlightedItemStore.set({itemType, itemId});
  },

  leaveItem() {
    HighlightedItemStore.set(null);
  },
};

const FocusedItemStore = {
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


export { SurfaceStore, HighlightedItemStore, FocusedItemStore };

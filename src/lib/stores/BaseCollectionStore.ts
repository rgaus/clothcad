import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

import type { FixMe } from '$lib/types/fixme';

type CollectionStoreBaseMethods<T extends { items: Array<{id: string}> }> = Writable<T> & {
  list: (value: T) => Array<T['items'][0]>;
  get: (value: T, itemId: T['items'][0]['id']) => T['items'][0] | null;
  addItem: (storeValue: T, item: T['items'][0]) => T;
  updateItem: (storeValue: T, itemId: T['items'][0]['id'], updater: (item: T['items'][0]) => T['items'][0]) => T;
  removeItem: (storeValue: T, itemId: T['items'][0]['id']) => T;
};

const COLLECTION_STORE_DEFAULT_INITIAL_STATE: FixMe = { items: [] };

export function createCollectionStore<T extends { items: Array<{id: string}> }>(
  initialValue: T = COLLECTION_STORE_DEFAULT_INITIAL_STATE
): CollectionStoreBaseMethods<T> {
  type CollectionItem = T['items'][0];
  const store = writable<T>(initialValue);

  return {
    ...store,

    list(value: T): Array<CollectionItem> {
      return value.items;
    },

    get(value: T, itemId: CollectionItem['id']): CollectionItem | null {
      const item = value.items.find(n => n.id === itemId);
      if (!item) {
        return null;
      }
      return item;
    },

    addItem(storeValue: T, item: CollectionItem) {
      return { ...storeValue, items: [...storeValue.items, item] };
    },

    updateItem(storeValue: T, itemId: CollectionItem['id'], updater: (item: CollectionItem) => CollectionItem) {
      const newValue = {
        ...storeValue,
        items: storeValue.items.map(n => n.id === itemId ? updater(n) : n),
      };
      return newValue;
    },

    removeItem(storeValue: T, itemId: CollectionItem['id']) {
      return { ...storeValue, items: storeValue.items.filter(n => n.id !== itemId) }
    },
  };
}

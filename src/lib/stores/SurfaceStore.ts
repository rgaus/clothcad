import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

import type { Surface, LinearFold } from '$lib/core';
import type { Item } from '$lib/types/item';
import type { FixMe } from '$lib/types/fixme';

import { FocusedItemStore } from './FocusedItemStore';

type CollectionStoreBaseMethods<T extends { items: Array<{id: string}> }> = Writable<T> & {
  list: (value: T) => Array<T['items'][0]>;
  get: (value: T, itemId: T['items'][0]['id']) => T['items'][0] | null;
  addItem: (item: T['items'][0]) => void;
  updateItem: (itemId: T['items'][0]['id'], updater: (item: T['items'][0]) => T['items'][0]) => void;
  removeItem: (itemId: T['items'][0]['id']) => void;
};

const COLLECTION_STORE_DEFAULT_INITIAL_STATE: FixMe = { items: [] };

function createCollectionStore<T extends { items: Array<{id: string}> }>(
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

    addItem(item: CollectionItem) {
      store.update(value => ({...value, items: [...value.items, item]}));
    },

    updateItem(itemId: CollectionItem['id'], updater: (item: CollectionItem) => CollectionItem) {
      store.update(value => {
        const newValue = {
          ...value,
          items: value.items.map(n => n.id === itemId ? updater(n) : n),
        };
        return newValue;
      });
    },

    removeItem(itemId: CollectionItem['id']) {
      store.update(value => {
        return { ...value, items: value.items.filter(n => n.id !== itemId) }
      });
    },
  };
}

export type SurfaceStoreState = {
  items: Array<Surface>;
};

export const SurfaceStore = {
  ...createCollectionStore<SurfaceStoreState>({
    items: [],
    history: [],
    currentHistoryIndex: -1,
  }),

  addItem(value: SurfaceStoreState, item: Surface): SurfaceStoreState {
    return {
      ...value,
      items: [...value.items, item],
    };
  },

  updateItem(value: SurfaceStoreState, itemId: Surface['id'], updater: Surface | ((item: Surface) => Surface)) {
    return {
      ...value,
      items: value.items.map(n => {
        if (n.id !== itemId) {
          return n;
        }

        if (typeof updater === 'function') {
          return updater(n);
        } else {
          // Here, `updater` is a surface instance
          return updater;
        }
      }),
    };
  },

  removeItem(value: SurfaceStoreState, itemId: Surface['id']) {
    return {
      ...value,
      items: value.items.filter(n => n.id !== itemId),
    };
  },

  listFolds(value: SurfaceStoreState): Array<LinearFold> {
    return value.items.flatMap(surface => {
      return surface.folds;
    });
  },
  getFold(value: SurfaceStoreState, foldId: LinearFold['id']): LinearFold | null {
    const foldList = value.items.flatMap(surface => surface.folds.filter(fold => fold.id === foldId));
    return foldList.length > 0 ? foldList[0] : null;
  },
  updateFold(value: SurfaceStoreState, foldId: LinearFold['id'], updater: LinearFold | ((f: LinearFold) => LinearFold)): SurfaceStoreState {
    const items = value.items.map(surface => {
      let hit = false;
      const folds = surface.folds.map(fold => {
        if (fold.id !== foldId) {
          return fold;
        }
        hit = true;
        if (typeof updater === 'function') {
          return updater(fold);
        } else {
          // Here, `updater` is a fld instance
          return updater;
        }
      });

      if (!hit) {
        return surface;
      } else {
        return { ...surface, folds };
      }
    });

    return { ...value, items };
  },
  getSurfacesContainingFold(value: SurfaceStoreState, foldId: LinearFold['id']): Array<Surface> {
    return value.items.filter(surface => typeof surface.folds.find(fold => fold.id === foldId) !== 'undefined');
  },

  subscribeToFocusedSurface(
    initialSurfaceStoreState: SurfaceStoreState,
    initialFocusedItemState: Item | null,
    func: (s: Surface | null) => void
  ) {
    let focusedSurface: Surface | null = null;
    let surfaceStoreState = initialSurfaceStoreState;

    // Call subscribe syncrnously initially
    const onFocusedItemChanged = (focusedItem: Item | null) => {
      if (!focusedItem) {
        focusedSurface = null;
        func(focusedSurface);
        return;
      }
      if (focusedItem.itemType !== "surface") {
        focusedSurface = null;
        func(focusedSurface);
        return;
      }

      focusedSurface = SurfaceStore.get(surfaceStoreState, focusedItem.itemId);
      func(focusedSurface);
    }
    onFocusedItemChanged(initialFocusedItemState);

    // And then call it going forward when there are changes
    const focusedItemUnsubscribe = FocusedItemStore.subscribe(onFocusedItemChanged);
    const surfaceStoreUnsubscribe = SurfaceStore.subscribe(value => {
      surfaceStoreState = value;
      if (!focusedSurface) {
        return;
      }
      focusedSurface = SurfaceStore.get(surfaceStoreState, focusedSurface.id);
      func(focusedSurface);
    });

    return () => {
      focusedItemUnsubscribe();
      surfaceStoreUnsubscribe();
    };
  },
};

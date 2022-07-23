import { derived } from 'svelte/store';
import fuzzy from 'fuzzy';

import type { Surface, LinearFold } from '$lib/core';

import { FocusedItemStore } from './FocusedItemStore';
import { createCollectionStore } from './BaseCollectionStore';

export type SurfaceStoreState = {
  items: Array<Surface>;
  search: string;
};

export const SurfaceStore = {
  ...createCollectionStore<SurfaceStoreState>({ items: [], search: '' }),

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

  updateSearch(value: SurfaceStoreState, search: string): SurfaceStoreState {
    return { ...value, search };
  },
  filterDisplayableItems(value: SurfaceStoreState): Array<Surface> {
    const surfaces = value.items;
    if (value.search.length === 0) {
      return surfaces;
    }

    const results = fuzzy.filter(value.search, surfaces, {
      extract: surface => surface.name,
    });
    return results.map(result => result.original);
  },
};


// Subscribe to changes in focused surface
export const FocusedSurfaceStore = derived<
  [typeof SurfaceStore, typeof FocusedItemStore],
  Surface | null
>([SurfaceStore, FocusedItemStore], ([$SurfaceStore, $FocusedItemStore], set) => {
  if (!$FocusedItemStore) {
    set(null);
    return;
  }
  if ($FocusedItemStore.itemType !== "surface") {
    set(null);
    return;
  }

  set(SurfaceStore.get($SurfaceStore, $FocusedItemStore.itemId));
  return;
}, null);

// Subscribe to changes in focused surface
export const FocusedFoldStore = derived<
  [typeof SurfaceStore, typeof FocusedItemStore],
  LinearFold | null
>([SurfaceStore, FocusedItemStore], ([$SurfaceStore, $FocusedItemStore], set) => {
  if (!$FocusedItemStore) {
    set(null);
    return;
  }
  if ($FocusedItemStore.itemType !== "fold") {
    set(null);
    return;
  }

  set(SurfaceStore.getFold($SurfaceStore, $FocusedItemStore.itemId));
  return;
}, null);

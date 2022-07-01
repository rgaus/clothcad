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
): CollectionStoreAPI<T, U> {
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

    addItem(item: T) {
      store.update(value => ({...value, items: [...value.items, item]}));
    },

    updateItem(itemId: T['id'], updater: (item: T) => T) {
      store.update(value => {
        const newValue = {
          ...value,
          items: value.items.map(n => n.id === itemId ? updater(n) : n),
        };
        return newValue;
      });
    },

    removeItem(itemId: T['id']) {
      store.update(value => {
        return { ...value, items: value.items.filter(n => n.id !== itemId) }
      });
    },
  };
}

type SurfaceHistoryContext = object;

type SurfaceHistoryListItem = {
  forwards: (value: SurfaceStoreState, context: SurfaceHistoryContext) => SurfaceStoreState;
  backwards: (value: SurfaceStoreState, context: SurfaceHistoryContext) => SurfaceStoreState;
  args: Array<any>;
  context?: SurfaceHistoryContext;
  requires?: (args: Array<any>, context: SurfaceHistoryContext) => Array<Item>;
};

type SurfaceStoreState = {
  items: Array<Surface>;
  history: Array<SurfaceHistoryListItem>;
  currentHistoryIndex: number;
};

const SurfaceStore = {
  ...createCollectionStore<Surface, SurfaceStoreState>({
    items: [],
    history: [],
    currentHistoryIndex: -1,
  }),

  createMutation(historyItem: SurfaceHistoryListItem) {
    return (...args) => {
      SurfaceStore.update(value => {
        historyItem.args = args;
        historyItem.context = historyItem.context || {};
        const newValue = historyItem.forwards(value, historyItem.args, historyItem.context);
        if (typeof newValue === 'undefined') {
          throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
        }

        const newCurrentHistoryIndex = newValue.currentHistoryIndex + 1;
        const newHistory = newValue.history.slice(0, newCurrentHistoryIndex);
        return {
          ...newValue,
          history: [...newHistory, historyItem],
          currentHistoryIndex: newCurrentHistoryIndex,
        };
      });
    };
  },

  historyGo(amount: number, absolute=false) {
    return SurfaceStore.update(value => {
      // console.log('START VALUE', value);
      // If "absolute" is turned on, then this should be an absolute move
      if (absolute) {
        amount = amount - value.currentHistoryIndex;
      }

      if (amount === 0) {
        return value;
      }

      const movingForwards = amount > 0;

      let startIndex = Math.max(Math.min(value.currentHistoryIndex, value.history.length-1), 0);
      let endIndex = Math.max(Math.min(value.currentHistoryIndex + amount, value.history.length-1), 0);

      if (movingForwards) {
        startIndex += 1;
      }

      // console.log('INDEXES', startIndex, endIndex);

      for (
        let index = startIndex;
        movingForwards ? index <= endIndex : index > endIndex;
        movingForwards ? index += 1 : index -= 1
      ) {
        const historyItem = value.history[index];
        if (movingForwards) {
          // console.log('RUNNING FORWARDS', index);
          value = historyItem.forwards(value, historyItem.args, historyItem.context);
          if (!value) {
            throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
          }
        } else {
          // console.log('RUNNING BACKWARDS', index);
          value = historyItem.backwards(value, historyItem.args, historyItem.context);
          if (!value) {
            throw new Error("`undefined` was returned from mutation backwards function, this isn't allowed!");
          }
        }
      }

      value = { ...value, currentHistoryIndex: endIndex };
      // console.log('END VALUE', value);
      return value;
    });
  },
  historyTo(index: number) {
    return SurfaceStore.historyGo(index, true);
  },

  historyUndo(): SurfaceStoreState { return SurfaceStore.historyGo(-1); },
  historyRedo(): SurfaceStoreState { return SurfaceStore.historyGo(1); },

  addItem(value: SurfaceStoreState, item: Surface): SurfaceStoreState {
    return {
      ...value,
      items: [...value.items, item],
    };
  },

  updateItem(value: SurfaceStoreState, itemId: Surface['id'], updater: Surface | (item: Surface) => Surface) {
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

  listFolds(value: SurfaceStoreState): Array<Fold> {
    return value.items.flatMap(value => {
      return items.folds;
    });
  },
  getFold(value: SurfaceStoreState, foldId: LinearFold['id']): Fold | null {
    const foldList = value.items.flatMap(surface => surface.folds.filter(fold => fold.id === foldId));
    return foldList.length > 0 ? foldList[0] : null;
  },
  updateFold(value: SurfaceStoreState, foldId: LinearFold['id'], updater: Fold | (f: Fold) => Fold): SurfaceStoreState {
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
};




export type Item =
  | { itemType: 'surface'; itemId: Surface['id'] }
  | { itemType: 'fold'; itemId: LinearFold['id'] };

export const Item = {
  surface(itemId: Surface['id']): Item {
    return { itemType: 'surface', itemId };
  },
  fold(itemId: Fold['id']): Item {
    return { itemType: 'fold', itemId };
  },
};

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

const PickingItemStore = {
  ...writable<{
    enabled: true,
    itemType: Item['itemType'],
    resolve: (item: Item) => void;
  } | { enabled: false }>({enabled: false}),

  pickFold: (focusedItemState: Item | null, parentSurface: Surface) => {
    return new Promise<LinearFold['id']>(resolve => {
      // Clear the focused item
      FocusedItemStore.blurItem();

      // Make the one surface in question visible and hide all other surfaces
      let surfaceStoreState: SurfaceStoreState;
      SurfaceStore.update(value => {
        surfaceStoreState = value;

        return {
          ...value,
          items: value.items.map(surface => ({...surface, visible: surface.id === parentSurface.id})),
        };
      });

      FocusedItemStore.subscribe(value => {
        if (value && value.itemType === 'fold') {
          // Make sure the fold is being selected from the right surface
          const surfaces = SurfaceStore.getSurfacesContainingFold(surfaceStoreState, value.itemId);
          if (surfaces.map(s => s.id).includes(parentSurface.id)) {
            PickingItemStore.set({ enabled: false });

            // Restore surface state
            SurfaceStore.set(surfaceStoreState);

            // Restore the focused item
            FocusedItemStore.set(focusedItemState);
            resolve(value.itemId);
          }
        };
      });

      PickingItemStore.set({
        enabled: true,
        itemType: 'fold',
      });
    });
  },

  pickSurface: (focusedItemState: Item | null) => {
    return new Promise<Surface['id']>(resolve => {
      // Clear the focused item
      FocusedItemStore.blurItem();

      FocusedItemStore.subscribe(value => {
        if (value && value.itemType === 'surface') {
          PickingItemStore.set({ enabled: false });
          // Restore the focused item
          FocusedItemStore.set(focusedItemState);
          resolve(value);
        };
      });

      PickingItemStore.set({
        enabled: true,
        itemType: 'surface',
      });
    });
  },
};


export { SurfaceStore, HighlightedItemStore, FocusedItemStore, PickingItemStore };

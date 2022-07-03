import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
// import type { SvelteComponent } from 'svelte';

import type { Surface, LinearFold } from '$lib/core';
import type { FixMe } from '$lib/types/fixme';

import ActionSurfaceSplitPanel from '../components/ActionSurfaceSplitPanel.svelte';
import ActionSurfaceFoldPanel from '../components/ActionSurfaceFoldPanel.svelte';

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

type SurfaceHistoryContext = FixMe<any>;

type SurfaceHistoryListItem<A = Array<FixMe>, C = object> = {
  updatedAt: string;
  forwards: (value: SurfaceStoreState, args: Array<FixMe>, context: SurfaceHistoryContext) => SurfaceStoreState;
  backwards: (value: SurfaceStoreState, args: Array<FixMe>, context: SurfaceHistoryContext) => SurfaceStoreState;
  args: A;
  context: C;

  // requireExists?: (args: Array<any>, context: SurfaceHistoryContext) => Array<Item>;
  requireFreshlyCreated?: (args: Array<any>, context: SurfaceHistoryContext) => Array<Item>;
};

type SurfaceStoreState = {
  items: Array<Surface>;
  history: Array<SurfaceHistoryListItem>;
  currentHistoryIndex: number;
};

const SurfaceStore = {
  ...createCollectionStore<SurfaceStoreState>({
    items: [],
    history: [],
    currentHistoryIndex: -1,
  }),

  createMutation<A extends Array<FixMe> = Array<FixMe>, C = object>(
    historyItemParams: Omit<
      SurfaceHistoryListItem<A, C>,
      'updatedAt' | 'args' | 'context'
    > & { context?: C }
  ) {
    return (...args: A) => {
      SurfaceStore.update(value => {
        const historyItem: SurfaceHistoryListItem = {
          ...historyItemParams,
          args,
          context: historyItemParams.context || {},
          updatedAt: new Date().toISOString(),
        };

        const originalValue = value;

        // Requirements allow a mutation to define what must be newly created before the mutation
        // can run
        const requirements = historyItem.requireFreshlyCreated ? historyItem.requireFreshlyCreated(historyItem.args, historyItem.context) : [];
        let historyIndexSteppedBackwardsTo = value.currentHistoryIndex + 1;
        if (requirements.length > 0) {
          let previousValue = value;

          // Go backwards until the requirements are no longer met
          for (let index = value.currentHistoryIndex; index >= 0; index -= 1) {
            const historyItem = value.history[index];

            previousValue = value;
            value = historyItem.backwards(value, historyItem.args, historyItem.context);

            const allRequirementsMet = requirements.every(({itemType, itemId}) => {
              switch (itemType) {
                case 'surface':
                  return SurfaceStore.get(value, itemId) !== null;
                case 'fold':
                  return SurfaceStore.getFold(value, itemId) !== null;
                default:
                  throw new Error(`Unknown requirement with itemType ${itemType}!`);
              }
            });
            if (!allRequirementsMet) {
              // Ok! We're finally done going back
              // The "previous value" now becomes the value we care about going forward
              value = previousValue;
              // Also update a few variables that are set to their "next" values to reset them to
              // the previous values
              historyIndexSteppedBackwardsTo = index + 1;
              break;
            }
          }
        }
        console.log('NOW AT', originalValue, historyIndexSteppedBackwardsTo);

        // Migrate the state forwards with the current history item
        value = historyItem.forwards(value, historyItem.args, historyItem.context);
        if (typeof value === 'undefined') {
          throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
        }

        const newCurrentHistoryIndex = originalValue.currentHistoryIndex + 1;

        // If there were requirements, now step forward again to reapply history that was previously
        // inverted
        if (requirements.length > 0) {
          for (
            let index = historyIndexSteppedBackwardsTo;
            index < newCurrentHistoryIndex;
            index += 1
          ) {
            const historyItem = value.history[index];
            value = historyItem.forwards(value, historyItem.args, historyItem.context);
          }
        }

        // Insert the new history item in the right place
        const newHistory = [
          ...value.history.slice(0, historyIndexSteppedBackwardsTo),
          historyItem,
          ...value.history.slice(historyIndexSteppedBackwardsTo),
        ];
        console.log('NEW HISORY', newHistory);
        return {
          ...value,
          history: newHistory,
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

  historyUndo() { return SurfaceStore.historyGo(-1); },
  historyRedo() { return SurfaceStore.historyGo(1); },

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




export type Item =
  | { itemType: 'surface'; itemId: Surface['id'] }
  | { itemType: 'fold'; itemId: LinearFold['id'] };

export const Item = {
  surface(itemId: Surface['id']): Item {
    return { itemType: 'surface', itemId };
  },
  fold(itemId: LinearFold['id']): Item {
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

type PickingItemStoreEnabledState = {
  enabled: true,
  itemType: Item['itemType'],
  cancel: () => void;
};
type PickingItemStoreDisabledState = {
  enabled: false,
};
type PickingItemStoreState = PickingItemStoreEnabledState | PickingItemStoreDisabledState;

const PickingItemStore = {
  ...writable<PickingItemStoreState>({enabled: false}),

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

      const cancel = () => {
        PickingItemStore.set({ enabled: false });

        // Restore surface state
        SurfaceStore.set(surfaceStoreState);

        // Restore the focused item
        FocusedItemStore.set(focusedItemState);
      };

      FocusedItemStore.subscribe(value => {
        if (value && value.itemType === 'fold') {
          // Make sure the fold is being selected from the right surface
          const surfaces = SurfaceStore.getSurfacesContainingFold(surfaceStoreState, value.itemId);
          if (surfaces.map(s => s.id).includes(parentSurface.id)) {
            cancel();
            resolve(value.itemId);
          }
        };
      });

      PickingItemStore.set({
        enabled: true,
        itemType: 'fold',
        cancel,
      });
    });
  },

  pickSurface: (focusedItemState: Item | null) => {
    return new Promise<Surface['id']>(resolve => {
      // Clear the focused item
      FocusedItemStore.blurItem();

      const cancel = () => {
        PickingItemStore.set({ enabled: false });

        // Restore the focused item
        FocusedItemStore.set(focusedItemState);
      };

      FocusedItemStore.subscribe(value => {
        if (value && value.itemType === 'surface') {
          PickingItemStore.set({ enabled: false });
          cancel();
          resolve(value.itemId);
        };
      });

      PickingItemStore.set({
        enabled: true,
        itemType: 'surface',
        cancel,
      });
    });
  },

  cancel: (value: PickingItemStoreState) => {
    if (!value.enabled) {
      return;
    }
    value.cancel();
  },
};




type Action<T extends string> = {
  type: T;
};
type ActionBaseMethods<T extends Action<string>> = {
  create: () => T;
  getName: () => string;
  isToolbarButtonEnabled: (focusedItem: Item | null, surfaceStoreState: SurfaceStoreState) => boolean;
  getPanelComponent: () => FixMe | null;
};

type ActionSurfaceSplit = Action<'surface.split'>;
const ActionSurfaceSplit: ActionBaseMethods<ActionSurfaceSplit> = {
  create() {
    return { type: 'surface.split', completable: false };
  },
  getName() {
    return 'Split';
  },
  isToolbarButtonEnabled() { return true },
  getPanelComponent() {
    return ActionSurfaceSplitPanel;
  },
};

type ActionSurfaceFold = Action<'surface.fold'>;
const ActionSurfaceFold: ActionBaseMethods<ActionSurfaceFold> = {
  create() {
    return { type: 'surface.fold', completable: false };
  },
  getName() {
    return 'Fold';
  },

  // Only surfaces with parents (ie, not a top level surface) can be folded
  isToolbarButtonEnabled(focusedItem: Item | null, surfaceStoreState: SurfaceStoreState) {
    if (!focusedItem) {
      return false;
    }
    if (focusedItem.itemType !== 'surface') {
      return false;
    }
    const surface = SurfaceStore.get(surfaceStoreState, focusedItem.itemId);
    if (!surface) {
      return false;
    }

    return surface.parentId !== null;
  },

  getPanelComponent() {
    return ActionSurfaceFoldPanel;
  },
};


type ActionStoreState = {
  enabled: true,
  action: Action<string>,
  ActionType: ActionBaseMethods<Action<string>>,
  completable: boolean;

  onComplete?: () => Promise<void>;
  onCancel?: () => Promise<void>;
} | {enabled: false};

const ActionStore = {
  ...writable<ActionStoreState>({enabled: false}),

  getActionsForFocusedItem(item: Item | null): Array<ActionBaseMethods<Action<string>> | Array<ActionBaseMethods<Action<string>>>> {
    if (!item) {
      return [];
    }

    switch (item.itemType) {
      case 'surface':
        return [
          [
            ActionSurfaceSplit,
            ActionSurfaceFold,
          ]
        ];
      default:
        return [];
    }
  },

  begin(ActionType: ActionBaseMethods<Action<string>>) {
    ActionStore.set({
      enabled: true,
      action: ActionType.create(),
      completable: false,
      ActionType,
    });
  },

  registerComplete(onComplete: () => Promise<void>) {
    ActionStore.update(value => {
      if (value.enabled) {
        return { ...value, onComplete };
      } else {
        return value;
      }
    });
  },

  registerCancel(onCancel: () => Promise<void>) {
    ActionStore.update(value => {
      if (value.enabled) {
        return { ...value, onCancel };
      } else {
        return value;
      }
    });
  },

  async complete(value: ActionStoreState) {
    if (!value.enabled) {
      return;
    }
    if (value.onComplete) {
      await value.onComplete();
    }
    ActionStore.set({ enabled: false });
  },
  async cancel(value: ActionStoreState) {
    if (!value.enabled) {
      return;
    }
    if (value.onCancel) {
      await value.onCancel();
    }
    ActionStore.set({ enabled: false });
  },

  markCompletable(completable: boolean) {
    ActionStore.update(value => {
      if (value.enabled) {
        return { ...value, completable };
      } else {
        return value;
      }
    });
  },
};


export { SurfaceStore, HighlightedItemStore, FocusedItemStore, PickingItemStore, ActionStore };

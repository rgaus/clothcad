import { writable, get } from 'svelte/store';

import type { Item } from '$lib/types/item';
import type { FixMe } from '$lib/types/fixme';

import { SurfaceStore } from './SurfaceStore';
import type { SurfaceStoreState } from './SurfaceStore';

export type StoreValues = {
  SurfaceStore: SurfaceStoreState;
};
const getInitialStoreValues: () => StoreValues = () => ({
  SurfaceStore: get(SurfaceStore),
});
const updateStoreValues = (initialStoreValues: StoreValues, storeValues: StoreValues) => {
  for (const [storeName, storeValue] of Object.entries(storeValues)) {
    switch (storeName) {
      case 'SurfaceStore':
        // Only update the store if the reference changed
        if (storeValue !== initialStoreValues.SurfaceStore) {
          SurfaceStore.set(storeValue);
        }
        break;
      default:
        throw new Error(`Unable to find store with name ${storeName} to update!`);
    }
  }
};

type HistoryListItem<A = Array<any>, C = object> = {
  updatedAt: string;
  forwards: (value: StoreValues, args: A, context: C) => StoreValues;
  backwards: (value: StoreValues, args: A, context: C) => StoreValues;
  args: A;
  context: C;

  // requireExists?: (args: Array<any>, context: SurfaceHistoryContext) => Array<Item>;
  requireFreshlyCreated?: (args: A, context: C) => Array<Item>;
};

export type HistoryStoreState = {
  history: Array<HistoryListItem>;
  currentHistoryIndex: number;
};

export const HistoryStore = {
  ...writable<HistoryStoreState>({
    history: [],
    currentHistoryIndex: -1,
  }),

  createMutation<A extends Array<FixMe> = Array<FixMe>, C = object>(
    historyItemParams: Omit<
      HistoryListItem<A, Partial<C>>,
      'updatedAt' | 'args' | 'context'
    > & { context?: Partial<C> }
  ) {
    return (...args: A) => {
      HistoryStore.update(value => {
        const historyItem: HistoryListItem<A, Partial<C>> = {
          ...historyItemParams,
          args,
          context: historyItemParams.context || {},
          updatedAt: new Date().toISOString(),
        };

        const initialStoreValues = getInitialStoreValues();
        let storeValues = initialStoreValues;

        // Requirements allow a mutation to define what must be newly created before the mutation
        // can run
        const requirements = historyItem.requireFreshlyCreated ? historyItem.requireFreshlyCreated(historyItem.args, historyItem.context) : [];
        let historyIndexSteppedBackwardsTo = value.currentHistoryIndex + 1;
        if (requirements.length > 0) {
          let previousStoreValues = storeValues;

          // Go backwards until the requirements are no longer met
          for (let index = value.currentHistoryIndex; index >= 0; index -= 1) {
            const historyItem = value.history[index];

            previousStoreValues = storeValues;
            storeValues = historyItem.backwards(storeValues, historyItem.args, historyItem.context);

            const allRequirementsMet = requirements.every(({itemType, itemId}) => {
              switch (itemType) {
                case 'surface':
                  return SurfaceStore.get(storeValues.SurfaceStore, itemId) !== null;
                case 'fold':
                  return SurfaceStore.getFold(storeValues.SurfaceStore, itemId) !== null;
                default:
                  throw new Error(`Unknown requirement with itemType ${itemType}!`);
              }
            });
            if (!allRequirementsMet) {
              // Ok! We're finally done going back
              // The "previous value" now becomes the value we care about going forward
              storeValues = previousStoreValues;
              // Also update a few variables that are set to their "next" values to reset them to
              // the previous values
              historyIndexSteppedBackwardsTo = index + 1;
              break;
            }
          }
        }
        // console.log('NOW AT', value, historyIndexSteppedBackwardsTo);

        // Migrate the state forwards with the current history item
        storeValues = historyItem.forwards(storeValues, historyItem.args, historyItem.context);
        if (typeof storeValues === 'undefined') {
          throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
        }

        const newCurrentHistoryIndex = value.currentHistoryIndex + 1;

        // If there were requirements, now step forward again to reapply history that was previously
        // inverted
        if (requirements.length > 0) {
          for (
            let index = historyIndexSteppedBackwardsTo;
            index < newCurrentHistoryIndex;
            index += 1
          ) {
            const historyItem = value.history[index];
            storeValues = historyItem.forwards(storeValues, historyItem.args, historyItem.context);
          }
        }

        // Insert the new history item in the right place
        const newHistory = [
          ...value.history.slice(0, historyIndexSteppedBackwardsTo),
          (historyItem as unknown) as HistoryListItem,
          ...value.history.slice(historyIndexSteppedBackwardsTo),
        ];
        console.log('NEW HISORY', newHistory);
        const newHistoryValue = {
          ...value,
          history: newHistory,
          currentHistoryIndex: newCurrentHistoryIndex,
        };

        // Update all stores with the latest state
        updateStoreValues(initialStoreValues, storeValues);

        return newHistoryValue;
      });
    };
  },

  go(amount: number, absolute=false) {
    return HistoryStore.update(value => {
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

      const initialStoreValues = getInitialStoreValues();
      let storeValues = initialStoreValues;

      for (
        let index = startIndex;
        movingForwards ? index <= endIndex : index > endIndex;
        movingForwards ? index += 1 : index -= 1
      ) {
        const historyItem = value.history[index];
        if (movingForwards) {
          // console.log('RUNNING FORWARDS', index);
          storeValues = historyItem.forwards(storeValues, historyItem.args, historyItem.context);
          if (!value) {
            throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
          }
        } else {
          // console.log('RUNNING BACKWARDS', index);
          storeValues = historyItem.backwards(storeValues, historyItem.args, historyItem.context);
          if (!value) {
            throw new Error("`undefined` was returned from mutation backwards function, this isn't allowed!");
          }
        }
      }

      updateStoreValues(initialStoreValues, storeValues);

      value = { ...value, currentHistoryIndex: endIndex };
      // console.log('END VALUE', value);
      return value;
    });
  },
  to(index: number) {
    return HistoryStore.go(index, true);
  },

  undo() { return HistoryStore.go(-1); },
  redo() { return HistoryStore.go(1); },
};

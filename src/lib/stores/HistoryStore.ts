import { v4 as uuidv4 } from 'uuid';
import { writable, get } from 'svelte/store';

import type { Item } from '$lib/types/item';
import type { FixMe } from '$lib/types/fixme';

import { SurfaceStore } from './SurfaceStore';
import type { SurfaceStoreState } from './SurfaceStore';

// StoreValues ensapsulates the current state of all stores that are tracked by the HistoryStore.
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
  id: string;
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

  // When a history item is undone, push it into this stack, and when a redo is run, pop it off
  // again
  undoneHistoryItems: Array<{
    previousId: HistoryListItem['id'] | null,
    changeType: 'insertion', // 'deletion' | 'modification'
    item: HistoryListItem,
  }>;
};

export const HistoryStore = {
  ...writable<HistoryStoreState>({
    history: [],
    currentHistoryIndex: -1,
    undoneHistoryItems: [],
  }),

  createMutation<A extends Array<FixMe> = Array<FixMe>, C = object>(
    historyItemParams: Omit<
      HistoryListItem<A, Partial<C>>,
      'id' | 'updatedAt' | 'args' | 'context'
    > & { context?: Partial<C> }
  ) {
    return (...args: A) => {
      HistoryStore.update(value => {
        const historyItem: HistoryListItem<A, Partial<C>> = {
          ...historyItemParams,
          id: uuidv4(),
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

          // When creating new mutatations, erase the undo stack
          undoneHistoryItems: [],
        };

        // Update all stores with the latest state
        updateStoreValues(initialStoreValues, storeValues);

        return newHistoryValue;
      });
    };
  },

  // Move forward or back a set amount in history, but don't actually update the store state, ust do
  // the move in memory. This effectively allows one to seek back and forth through the history as
  // part of a more complex operation.
  goInMemory(
    value: HistoryStoreState,
    initialStoreValues: StoreValues,
    amount: number,
    absolute=false,
  ): [ HistoryStoreState, StoreValues ] {
    // console.log('START VALUE', value);

    // If "absolute" is turned on, then this should be an absolute move
    if (absolute) {
      amount = amount - value.currentHistoryIndex;
    }

    if (amount === 0) {
      return [ value, initialStoreValues ];
    }

    const movingForwards = amount > 0;

    let startIndex = Math.max(Math.min(value.currentHistoryIndex, value.history.length-1), 0);
    let endIndex = Math.max(Math.min(value.currentHistoryIndex + amount, value.history.length-1), 0);

    if (movingForwards) {
      startIndex += 1;
    }

    // console.log('INDEXES', startIndex, endIndex);

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

    value = { ...value, currentHistoryIndex: endIndex };
    // console.log('END VALUE', value);
    return [value, storeValues];
  },

  toInMemory(
    value: HistoryStoreState,
    initialStoreValues: StoreValues,
    amount: number,
  ): [ HistoryStoreState, StoreValues ] {
    return HistoryStore.goInMemory(value, initialStoreValues, amount, true);
  },

  go(amount: number, absolute=false) {
    return HistoryStore.update(value => {
      const initialStoreValues = getInitialStoreValues();

      const [newValue, newStoreValues] = HistoryStore.goInMemory(
        value,
        initialStoreValues,
        amount,
        absolute,
      );

      updateStoreValues(initialStoreValues, newStoreValues);
      return newValue;
    });
  },
  to(index: number) {
    return HistoryStore.go(index, true);
  },

  undo() {
    // return HistoryStore.go(-1);
    return HistoryStore.update(value => {
      let mostRecentlyAddedHistoryItem: HistoryListItem | null = null;
      for (const historyItem of value.history) {
        if (!mostRecentlyAddedHistoryItem) {
          mostRecentlyAddedHistoryItem = historyItem;
          continue;
        }
        if (historyItem.updatedAt > mostRecentlyAddedHistoryItem.updatedAt) {
          mostRecentlyAddedHistoryItem = historyItem;
          continue;
        }
      }

      if (!mostRecentlyAddedHistoryItem) {
        // The history ie empty.
        return value;
      }

      const index = value.history.indexOf(mostRecentlyAddedHistoryItem);
      console.log('MOST RECENT', index, mostRecentlyAddedHistoryItem, value.history);
      const previousHistoryItem = value.history[index-1];
      const previousHistoryItemId = previousHistoryItem ? previousHistoryItem.id : null;

      const initialStoreValues = getInitialStoreValues();

      // Decrement the history index if the change is happening on or after the current index
      // This ensures that the same history item is focused at the end as at the start of the process
      let newCurrentHistoryIndex = value.currentHistoryIndex;
      if (value.currentHistoryIndex >= index) {
        newCurrentHistoryIndex = value.currentHistoryIndex - 1;
      }

      console.log('GO BACK TO', index - 1);
      // Go backwards to the state before the item to be removed
      let [newValue, newStoreValues] = HistoryStore.toInMemory(
        value,
        initialStoreValues,
        index - 1,
      );

      // Remove the item in question from history, and add to the undo stack
      newValue = {
        ...newValue,
        history: [
          ...value.history.slice(0, index),
          ...value.history.slice(index+1),
        ],
        undoneHistoryItems: [
          ...value.undoneHistoryItems,
          {
            changeType: 'insertion',
            previousId: previousHistoryItemId,
            item: mostRecentlyAddedHistoryItem
          },
        ],
      };

      console.log('GO FORWARDS TO', newCurrentHistoryIndex);
      // Then reaggregate forwards without the new history item
      [newValue, newStoreValues] = HistoryStore.toInMemory(
        newValue,
        newStoreValues,
        newCurrentHistoryIndex,
      );

      console.log('END', newValue);

      updateStoreValues(initialStoreValues, newStoreValues);
      return newValue;
    });
  },
  redo() {
    // return HistoryStore.go(1);
    return HistoryStore.update(value => {
      // Get the last created history item
      const newUndoneHistoryItems = value.undoneHistoryItems.slice();

      const popped = newUndoneHistoryItems.pop();
      if (!popped) {
        // The undo stack is empty.
        return value;
      }
      const { previousId, item } = popped;

      // 1. Assume that the previous item is in the main history
      // 2. If not, look it up in the undolist - it itself may have been undone.
      // 3. Keep traversing recursively down until a parent's parent's parent (etc) is in the
      //    history list.
      let previousHistoryItemId: HistoryListItem['id'] | null = previousId;
      console.log('PREV', previousId);
      while (!value.history.find(i => i.id === previousHistoryItemId)) {
        const result = value.undoneHistoryItems.find(i => i.item.id === previousHistoryItemId);
        if (!result) {
          throw new Error(`Unable to find history item with id ${previousHistoryItemId}!`);
        }
        previousHistoryItemId = result.previousId;
        console.log('PREV', previousHistoryItemId);
      }
      console.log('FINAL PREV', previousHistoryItemId);

      const previousHistoryItemIndex = value.history.findIndex(item => item.id === previousId);

      const initialStoreValues = getInitialStoreValues();

      // Go backwards to the state of the previous item
      let [newValue, newStoreValues] = HistoryStore.toInMemory(
        value,
        initialStoreValues,
        previousHistoryItemIndex,
      );
      console.log('BACK VALUES', newStoreValues);

      // Increment the history index if the change is happening before the current index
      // Since to stay on the same item, that item's index will have changed.
      let newCurrentHistoryIndex = value.currentHistoryIndex;
      if (previousHistoryItemIndex <= value.currentHistoryIndex) {
        newCurrentHistoryIndex = value.currentHistoryIndex + 1;
      }

      // Add back the history item
      newValue = {
        ...newValue,
        history: [
          ...value.history.slice(0, previousHistoryItemIndex+1),
          item,
          ...value.history.slice(previousHistoryItemIndex+1),
        ],
        undoneHistoryItems: newUndoneHistoryItems,
      };

      // Then reaggregate forwards with the new history item
      [newValue, newStoreValues] = HistoryStore.toInMemory(
        newValue,
        newStoreValues,
        newCurrentHistoryIndex,
      );
      console.log('FINAL VALUES', newStoreValues);

      console.log('END', newValue);

      updateStoreValues(initialStoreValues, newStoreValues);
      return newValue;
    });
  },
};

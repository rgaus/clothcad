import { writable, get } from 'svelte/store';

import { Item } from '$lib/types/item';
import type { CreatedItem, UpdatedItem, DeletedItem } from '$lib/types/item';
// import type { FixMe } from '$lib/types/fixme';
import { generateId } from '$lib/id';
import type { DrawingSurface } from '$lib/core';

import { SurfaceStore } from './SurfaceStore';
import type { SurfaceStoreState } from './SurfaceStore';
import { DrawingStore, FocusedDrawingSurfaceIdStore } from './DrawingStore';
import type { DrawingStoreState } from './DrawingStore';

// StoreValues ensapsulates the current state of all stores that are tracked by the HistoryStore.
export type StoreValues = {
  SurfaceStore: SurfaceStoreState;
  DrawingStore: DrawingStoreState;
  FocusedDrawingSurfaceIdStore: DrawingSurface['id'] | null
};
const getInitialStoreValues: () => StoreValues = () => ({
  SurfaceStore: get(SurfaceStore),
  DrawingStore: get(DrawingStore),
  FocusedDrawingSurfaceIdStore: get(FocusedDrawingSurfaceIdStore),
});
const updateStoreValues = (initialStoreValues: StoreValues, storeValues: StoreValues) => {
  for (const [storeName, storeValue] of Object.entries(storeValues)) {
    switch (storeName) {
      case 'SurfaceStore':
        // Only update the store if the reference changed
        if (storeValue !== initialStoreValues.SurfaceStore) {
          SurfaceStore.set(storeValue as SurfaceStoreState);
        }
        break;
      case 'DrawingStore':
        // Only update the store if the reference changed
        if (storeValue !== initialStoreValues.DrawingStore) {
          DrawingStore.set(storeValue as DrawingStoreState);
        }
        break;
      case 'FocusedDrawingSurfaceIdStore':
        // Only update the store if the reference changed
        if (storeValue !== initialStoreValues.FocusedDrawingSurfaceIdStore) {
          FocusedDrawingSurfaceIdStore.set(storeValue as StoreValues["FocusedDrawingSurfaceIdStore"]);
        }
        break;
      default:
        throw new Error(`Unable to find store with name ${storeName} to update!`);
    }
  }
};

export type HistoryListItem<A = Array<any>, C = object> = {
  id: string;
  type: string;
  name: string;
  updatedAt: string;
  forwards: (value: StoreValues, args: A, context: C) => StoreValues;
  backwards: (value: StoreValues, args: A, context: C) => StoreValues;
  args: A;
  context: C;

  provides?: (args: A, context: C) => Array<CreatedItem | UpdatedItem | DeletedItem>;
  requires?: (args: A, context: C) => Array<CreatedItem | UpdatedItem | DeletedItem>;
};

export type HistoryStoreState = {
  history: Array<HistoryListItem>;
  currentHistoryIndex: number;

  // When set to true, disable dependency checking when loading in mutations
  // This is turned on when loading data in via the SerializationStore
  mutationBatchLoadMode: boolean;

  // When a history item is undone, push it into this stack, and when a redo is run, pop it off
  // again
  undoneHistoryItems: Array<{
    previousId: HistoryListItem['id'] | null,
    changeType: 'insertion', // 'deletion' | 'modification'
    item: HistoryListItem,
  }>;
};

export type Mutation<A extends Array<any> = Array<any>, C = object> = (args?: A, defaultContext?: Partial<C>) => void;

export const MUTATIONS: { [mutationType: string]: Mutation } = {};

export const HistoryStore = {
  ...writable<HistoryStoreState>({
    history: [],
    currentHistoryIndex: -1,
    mutationBatchLoadMode: false,
    undoneHistoryItems: [],
  }),

  createMutation<A extends Array<any> = Array<any>, C = object>(
    historyItemParams: Omit<
      HistoryListItem<A, Partial<C>>,
      'id' | 'updatedAt' | 'args' | 'context' | 'name'
    > & { name?: string; generateDefaultName?: (args: A) => string; context?: Partial<C> }
  ): Mutation<A, C> {
    const mutation: Mutation<A, C> = (args=[] as unknown as A, defaultContext={}) => {
      HistoryStore.update(value => {
        const context = historyItemParams.context || defaultContext;
        const historyItem: HistoryListItem<A, Partial<C>> = {
          ...historyItemParams,
          id: generateId('his'),
          args,
          context,
          updatedAt: new Date().toISOString(),
          name: historyItemParams.generateDefaultName ? historyItemParams.generateDefaultName(args) : '',
        };
        console.groupCollapsed('%cMUTATION', 'font-weight:bold;background-color:green;padding:2px;', historyItem.name);
        console.log('History Item:', historyItem);
        console.log('History Stack:', value.history);

        const initialStoreValues = getInitialStoreValues();
        console.log('Initial Store Values:', initialStoreValues);
        let storeValues = initialStoreValues;

        // Requirements allow a mutation to define what must be newly created before the mutation
        // can run
        //
        // NOTE: requirements are skipped when in "batch load mode" because it's assumed that
        // the mutations being loaded in a batch are being inserted in the proper order.
        const requirements = !value.mutationBatchLoadMode && historyItem.requires ? (
          historyItem.requires(historyItem.args, historyItem.context)
        ) : [];
        let historyIndexSteppedBackwardsTo = value.currentHistoryIndex + 1;
        console.groupCollapsed('%cRequirements:', 'font-weight:bold;background-color:red;padding:2px;', requirements);
        if (requirements.length > 0) {
          console.log('Requirments found, finding index to place item...');
          let previousStoreValues = storeValues;

          // Mark all requirements as initially unmet.
          let metRequirements = requirements.map(() => false);

          // Go backwards until the requirements are all met
          console.groupCollapsed('Start working backwards to find item meeting requirements:');
          for (let index = value.currentHistoryIndex; index >= 0; index -= 1) {
            const historyItem = value.history[index];
            console.log('At history item index:', index, historyItem);

            previousStoreValues = storeValues;
            storeValues = historyItem.backwards(storeValues, historyItem.args, historyItem.context);

            // Test requirements at this new point in history
            const provides = historyItem.provides ? historyItem.provides(historyItem.args, historyItem.context) : [];
            for (let i = 0; i < requirements.length; i += 1) {
              const found = provides.find(
                p => p.operation === requirements[i].operation && Item.equals(p.item, requirements[i].item)
              );
              if (found) {
                metRequirements[i] = true;
              }
            }
            console.log('\tRequirements state:', metRequirements);

            if (metRequirements.every(i => i === true)) {
              // Ok! We're finally done going back
              // The "previous value" now becomes the value we care about going forward
              storeValues = previousStoreValues;
              // Also update a few variables that are set to their "next" values to reset them to
              // the previous values
              historyIndexSteppedBackwardsTo = index + 1;
              console.log(`Met all requirements, moving back to last item (last item at index: ${historyIndexSteppedBackwardsTo})`)
              break;
            }
          }
          console.groupEnd();
        } else {
          console.log(`No requirements found! ${value.mutationBatchLoadMode ? 'Batch load mode enabled.' : ''}`);
        }
        console.log('After applying requirements:');
        console.log('\tCurrent Index:', historyIndexSteppedBackwardsTo);
        console.log('\tHistoryStore Values:', value);
        console.log('\tStore Values:', storeValues);
        console.groupEnd();

        // Migrate the state forwards with the current history item
        console.groupCollapsed('%cApply history item:', 'font-weight:bold;background-color:red;padding:2px;');
        console.log('Store Values (before) :', storeValues);
        storeValues = historyItem.forwards(storeValues, historyItem.args, historyItem.context);
        if (typeof storeValues === 'undefined') {
          throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
        }
        console.log('Store Values (after) :', storeValues);
        console.groupEnd();

        const newCurrentHistoryIndex = value.currentHistoryIndex + 1;

        // If there were requirements, now step forward again to reapply history that was previously
        // inverted
        if (requirements.length > 0) {
          console.groupCollapsed('Replaying all old history on top of new history item...');
          for (
            let index = historyIndexSteppedBackwardsTo;
            index < newCurrentHistoryIndex;
            index += 1
          ) {
            const historyItem = value.history[index];
            console.log('At history item index:', index, historyItem);
            storeValues = historyItem.forwards(storeValues, historyItem.args, historyItem.context);
          }
          console.groupEnd();
        }

        // Insert the new history item in the right place
        const newHistory = [
          ...value.history.slice(0, historyIndexSteppedBackwardsTo),
          (historyItem as unknown) as HistoryListItem,
          ...value.history.slice(historyIndexSteppedBackwardsTo),
        ];
        console.log('New history stack:', newHistory);
        const newHistoryValue = {
          ...value,
          history: newHistory,
          currentHistoryIndex: newCurrentHistoryIndex,

          // When creating new mutatations, erase the undo stack
          undoneHistoryItems: [],
        };
        console.log('New history store value:', newHistoryValue);

        // Update all stores with the latest state
        console.log('Final Store Values:', storeValues);
        updateStoreValues(initialStoreValues, storeValues);

        console.groupEnd();
        return newHistoryValue;
      });
    };

    MUTATIONS[historyItemParams.type] = mutation as Mutation;
    return mutation;
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

    console.groupCollapsed('%cGO', 'font-weight:bold;background-color:blue;padding:2px;', amount);
    const movingForwards = amount > 0;

    let startIndex = Math.max(Math.min(value.currentHistoryIndex, value.history.length-1), 0);
    let endIndex = Math.max(Math.min(value.currentHistoryIndex + amount, value.history.length-1), -1);

    if (movingForwards) {
      startIndex += 1;
    }
    console.log('Start Index:', startIndex);
    console.log('End Index:', endIndex);

    let storeValues = initialStoreValues;
    console.log('Initial Store Values:', storeValues);

    for (
      let index = startIndex;
      movingForwards ? index <= endIndex : index > endIndex;
      movingForwards ? index += 1 : index -= 1
    ) {
      const historyItem = value.history[index];
      if (movingForwards) {
        console.groupCollapsed('Running forwards:', index, historyItem);
        storeValues = historyItem.forwards(storeValues, historyItem.args, historyItem.context);
        if (!value) {
          throw new Error("`undefined` was returned from mutation forwards function, this isn't allowed!");
        }
        console.groupEnd();
      } else {
        console.groupCollapsed('Running backwards:', index, historyItem);
        storeValues = historyItem.backwards(storeValues, historyItem.args, historyItem.context);
        if (!value) {
          throw new Error("`undefined` was returned from mutation backwards function, this isn't allowed!");
        }
        console.groupEnd();
      }
    }

    value = { ...value, currentHistoryIndex: endIndex };
    console.log('Final History:', value);
    console.log('Final Store Values:', storeValues);
    console.groupEnd();
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
      if (value.history.length > 0) {
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
      }

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

  updateHistoryItemName(historyItemId: HistoryListItem['id'], newName: string) {
    return HistoryStore.update(value => {
      const newValue = {
        ...value,
        history: value.history.map(n => n.id === historyItemId ? {...n, name: newName} : n),
      };
      return newValue;
    });
  },

  // FIXME: It's possible to put your history stack into a werd state by deleting items that create
  // things that later items modify. Update this function to have logic where if an item which
  // provides a "create" is removed, it removes all items which require that item in any way
  remove(index: number) {
    if (index === 0) {
      throw new Error('Cannot remove history item at index 0!');
    }

    return HistoryStore.update(value => {
      const initialStoreValues = getInitialStoreValues();
      const initialHistoryIndex = value.currentHistoryIndex;

      console.groupCollapsed('%cREMOVE', 'font-weight:bold;background-color:red;padding:2px;', index);

      // Go to the item before the item to remove
      let [newValue, newStoreValues] = HistoryStore.toInMemory(
        value,
        initialStoreValues,
        index-1,
      );

      // Remove the item from the history stack
      newValue = {
        ...value,
        history: [
          ...newValue.history.slice(0, index),
          ...newValue.history.slice(index+1),
        ],
        currentHistoryIndex: index-1,
      };

      // Replay back forwards all the history on top of the new state
      [newValue, newStoreValues] = HistoryStore.toInMemory(
        newValue,
        newStoreValues,
        initialHistoryIndex,
      );

      console.groupEnd();

      updateStoreValues(initialStoreValues, newStoreValues);
      return newValue;
    });
  },
};

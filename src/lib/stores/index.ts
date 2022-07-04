import { writable } from 'svelte/store';
// import type { SvelteComponent } from 'svelte';

import type { Surface, LinearFold } from '$lib/core';
import type { Item } from '$lib/types/item';

import { ActionStore } from './ActionStore';
import { SurfaceStore, FocusedSurfaceStore, FocusedFoldStore } from './SurfaceStore';
import type { SurfaceStoreState } from './SurfaceStore';
import { FocusedItemStore } from './FocusedItemStore';
import { HistoryStore } from './HistoryStore';

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


export {
  SurfaceStore,
  FocusedSurfaceStore,
  FocusedFoldStore,
  HighlightedItemStore,
  FocusedItemStore,
  PickingItemStore,
  ActionStore,
  HistoryStore,
};

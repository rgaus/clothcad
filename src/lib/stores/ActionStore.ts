import { writable } from 'svelte/store';

import type { FixMe } from '$lib/types/fixme';
import type { Item } from '$lib/types/item';

import type { SurfaceStoreState } from './SurfaceStore';
import { SurfaceStore } from './SurfaceStore';

import ActionSurfaceSplitPanel from '../../components/ActionSurfaceSplitPanel.svelte';
import ActionSurfaceFoldPanel from '../../components/ActionSurfaceFoldPanel.svelte';

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
  // Only surfaces with folds can be split
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

    return surface.folds.length > 0;
  },
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

export const ActionStore = {
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

import { writable, derived } from 'svelte/store';

import { FocusedItemStore } from './FocusedItemStore';
import { createCollectionStore } from './BaseCollectionStore';

import type { Drawing, DrawingSurface, Surface } from '$lib/core';
// import type { Item } from '$lib/types/item';

export type DrawingStoreState = {
  items: Array<Drawing>;
  editing: (
    | { enabled: false }
    | {
      enabled: true,
      id: Drawing['id'],
    }
  ),
};

export const DrawingStore = {
  ...createCollectionStore<DrawingStoreState>(),

  beginEditing(drawingStoreValue: DrawingStoreState, drawingId: Drawing['id']): DrawingStoreState {
    const editing = {
      enabled: true,
      id: drawingId,
    };
    return { ...drawingStoreValue, editing };
  },
  cancelEditing() {
    DrawingStore.update(value => ({ ...value, editing: {enabled: false}}))
  },

  getContainingSurface(value: DrawingStoreState, surfaceId: Surface['id']): [Drawing, DrawingSurface] | null {
    for (const drawing of value.items) {
      for (const drawingSurface of drawing.surfaces) {
        if (drawingSurface.surfaceId === surfaceId) {
          return [drawing, drawingSurface]
        }
      }
    }
    return null;
  },
};

// Subscribe to changes in focused drawing
export const FocusedDrawingStore = derived<
  [typeof DrawingStore, typeof FocusedItemStore],
  Drawing | null
>([DrawingStore, FocusedItemStore], ([$DrawingStore, $FocusedItemStore], set) => {
  if (!$FocusedItemStore) {
    set(null);
    return;
  }
  if ($FocusedItemStore.itemType !== "drawing") {
    set(null);
    return;
  }

  set(DrawingStore.get($DrawingStore, $FocusedItemStore.itemId));
  return;
}, null);

// Subscribe to the drawing being edited
export const EditingDrawingStore = derived<
  typeof DrawingStore,
  Drawing | null
>(DrawingStore, ($DrawingStore, set) => {
  if (!$DrawingStore) {
    set(null);
    return;
  }

  const editing = $DrawingStore.editing;
  if (!editing || !editing.enabled) {
    set(null);
    return;
  }

  set(DrawingStore.get($DrawingStore, editing.id));
  return;
}, null);

export const FocusedDrawingSurfaceIdStore = writable<DrawingSurface['id'] | null>(null);
export const FocusedDrawingSurfaceStore = derived<
  [typeof EditingDrawingStore, typeof FocusedDrawingSurfaceIdStore],
  DrawingSurface | null
>([EditingDrawingStore, FocusedDrawingSurfaceIdStore], ([$EditingDrawingStore, $FocusedDrawingSurfaceIdStore], set) => {
  if (!$FocusedDrawingSurfaceIdStore) {
    set(null);
    return;
  }

  set($EditingDrawingStore?.surfaces.find(s => s.id === $FocusedDrawingSurfaceIdStore) || null)
  return;
}, null);

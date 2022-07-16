import type { Surface, LinearFold, Drawing, DrawingSurface, DrawingSurfaceFoldSet } from '$lib/core';

export type Item =
  | { itemType: 'drawing'; itemId: Drawing['id'] }
  | { itemType: 'drawing-surface'; itemId: DrawingSurface['id'] }
  | { itemType: 'drawing-surface-fold-set'; itemId: DrawingSurfaceFoldSet['id'] }
  | { itemType: 'surface'; itemId: Surface['id'] }
  | { itemType: 'fold'; itemId: LinearFold['id'] };

export const Item = {
  drawing(itemId: Drawing['id']): Item {
    return { itemType: 'drawing', itemId };
  },
  surface(itemId: Surface['id']): Item {
    return { itemType: 'surface', itemId };
  },
  fold(itemId: LinearFold['id']): Item {
    return { itemType: 'fold', itemId };
  },
  equals(a: Item, b: Item) {
    return a.itemType === b.itemType && a.itemId === b.itemId;
  },
};

export type CreatedItem = { operation: 'create', item: Item };
export type UpdatedItem = { operation: 'update', item: Item };
export type DeletedItem = { operation: 'delete', item: Item };

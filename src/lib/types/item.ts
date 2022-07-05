import type { Surface, LinearFold } from '$lib/core';

// FIXME: import the correct type here!!
type Drawing = { id: string };

export type Item =
  | { itemType: 'drawing'; itemId: Drawing['id'] }
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
};


import type { Surface, LinearFold } from '$lib/core';

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


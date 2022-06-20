import { v4 as uuidv4 } from 'uuid';
import { PlanarCoordinates, SpacialCoordinates } from './coordinates';

export type LinearFold = {
  type: 'linear-fold';
  id: string;
  a: PlanarCoordinates;
  b: PlanarCoordinates;
};
export const LinearFold = {
  create(a: PlanarCoordinates, b: PlanarCoordinates): LinearFold {
    return { type: 'linear-fold', id: uuidv4(), a, b };
  },

  isPointOnLeft(fold: LinearFold, c: PlanarCoordinates) {
    return (
      (fold.b.x - fold.a.x)*(c.y - fold.a.y) -
      (fold.b.y - fold.a.y)*(c.x - fold.a.x)
    ) > 0;
  },

  toSpacial(fold: LinearFold, surface: Surface): [ SpacialCoordinates, SpacialCoordinates ] {
    const a = PlanarCoordinates.toSpacialCoordinates(fold.a, surface.face);
    const b = PlanarCoordinates.toSpacialCoordinates(fold.b, surface.face);
    return [a, b];
  },
};

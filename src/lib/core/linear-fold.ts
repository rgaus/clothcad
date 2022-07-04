import { Vector3 } from 'three';
import { PlanarCoordinates, SpacialCoordinates } from './coordinates';
import { radiansToDegrees, degreesToRadians } from './utils';
import type { Surface } from './surface';

import { generateId } from '$lib/id';

export type LinearFold = {
  type: 'linear-fold';
  id: string;
  a: PlanarCoordinates;
  b: PlanarCoordinates;

  surfaceAId: Surface['id'] | null,
  surfaceBId: Surface['id'] | null,
};
export const LinearFold = {
  create(a: PlanarCoordinates, b: PlanarCoordinates): LinearFold {
    return { type: 'linear-fold', id: generateId('fld'), a, b, surfaceAId: null, surfaceBId: null };
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

  computeAngleBetweenSurfaces(fold: LinearFold, parentSurface: Surface, surfaceA: Surface, surfaceB: Surface): number {
    const foldAngleDegrees = radiansToDegrees(Math.atan2(fold.b.y - fold.a.y, fold.b.x - fold.b.x));
    const foldOffsetAmount = 1;

    const foldMidpoint = PlanarCoordinates.create(
      (fold.a.x + fold.b.x) / 2,
      (fold.a.y + fold.b.y) / 2,
    );

    const midpointSpacial = PlanarCoordinates.toSpacialCoordinates(foldMidpoint, parentSurface.face);

    const midpointSurfaceA = SpacialCoordinates.toPlanarCoordinates(midpointSpacial, surfaceA.face);
    // const midpointSurfaceB = SpacialCoordinates.toPlanarCoordinates(midpointSpacial, surfaceB.face);

    const endpointSurfaceA = PlanarCoordinates.create(
      midpointSurfaceA.x + (foldOffsetAmount * Math.cos(degreesToRadians(foldAngleDegrees + 90))),
      midpointSurfaceA.y + (foldOffsetAmount * Math.sin(degreesToRadians(foldAngleDegrees + 90)))
    );
    const endpointSurfaceB = PlanarCoordinates.create(
      midpointSurfaceA.x + (foldOffsetAmount * Math.cos(degreesToRadians(foldAngleDegrees - 90))),
      midpointSurfaceA.y + (foldOffsetAmount * Math.sin(degreesToRadians(foldAngleDegrees - 90)))
    );

    const endpointSurfaceASpacial = PlanarCoordinates.toSpacialCoordinates(endpointSurfaceA, surfaceA.face);
    const endpointSurfaceBSpacial = PlanarCoordinates.toSpacialCoordinates(endpointSurfaceB, surfaceB.face);

    const angle = new Vector3(
      endpointSurfaceASpacial.x - midpointSpacial.x,
      endpointSurfaceASpacial.y - midpointSpacial.y,
      endpointSurfaceASpacial.z - midpointSpacial.z,
    ).angleTo(
      new Vector3(
        endpointSurfaceBSpacial.x - midpointSpacial.x,
        endpointSurfaceBSpacial.y - midpointSpacial.y,
        endpointSurfaceBSpacial.z - midpointSpacial.z,
      )
    );

    return radiansToDegrees(angle);
  },
};

import type { SpacialCoordinates } from '../coordinates';
import type { Matrix4 } from 'three';
import type { Numeral } from '$lib/numeral';

export type PlanarFace = {
  type: 'planar-face',
  points: Array<SpacialCoordinates>;
  origin: SpacialCoordinates;
  referencePointX: SpacialCoordinates;
  referencePointY: SpacialCoordinates;
  referencePointZ: SpacialCoordinates;
  matrix: Matrix4;
  thickness: Numeral;
};

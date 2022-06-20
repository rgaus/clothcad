import { SpacialCoordinates } from '../coordinates';
import { Matrix4 } from 'three';

export type PlanarFace = {
  type: 'planar-face',
  points: Array<SpacialCoordinates>;
  origin: SpacialCoordinates;
  referencePointX: SpacialCoordinates;
  referencePointY: SpacialCoordinates;
  referencePointZ: SpacialCoordinates;
  matrix: Matrix4;
};

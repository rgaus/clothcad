import { Vector3 } from 'three';
// FIXME: The below imports from "/definition" to avoid a circular dependency
import type { PlanarFace } from './planar-face/definition';
import { round } from './utils';

export type SVGCoordinates = {
  type: 'svg-coordinates';
  x: number;
  y: number;
};
export const SVGCoordinates = {
  create(x: number, y: number): SVGCoordinates {
    return { type: 'svg-coordinates', x, y };
  },
  toPlanarCoordinates(svgCoords: SVGCoordinates, face: PlanarFace, scale: number = 1): PlanarCoordinates {
    // 1. Get the origin of the face
    const origin = face.origin;

    const height = Math.max(...face.points.map(p => p.y)) - origin.y;

    return PlanarCoordinates.create(
      svgCoords.x * scale,
      ((height / scale) - svgCoords.y) * scale,
    );
  },
};

export type PlanarCoordinates = {
  type: 'planar-coordinates';
  x: number;
  y: number;
};
export const PlanarCoordinates = {
  create(x: number, y: number): PlanarCoordinates {
    return { type: 'planar-coordinates', x, y };
  },
  round(planarCoordinates: PlanarCoordinates, places?: number) {
    return PlanarCoordinates.create(
      round(planarCoordinates.x, places),
      round(planarCoordinates.y, places),
    );
  },
  toSpacialCoordinates(planarCoordinates: PlanarCoordinates, face: PlanarFace): SpacialCoordinates {
    // 1. Get the origin of the face
    const origin = face.origin;

    // const pitch = degreesToRadians(PlanarFace.calculatePitch(face));
    // const yaw = degreesToRadians(PlanarFace.calculateYaw(face));
    // const roll = degreesToRadians(PlanarFace.calculateRoll(face));

    const matrix = face.matrix;//new THREE.Matrix4();
    // matrix.identity();
    //
    // matrix.multiply((new THREE.Matrix4()).identity().makeRotationX(pitch));
    // matrix.multiply((new THREE.Matrix4()).identity().makeRotationY(yaw));
    // matrix.multiply((new THREE.Matrix4()).identity().makeRotationZ(roll));

    const result = (new Vector3(planarCoordinates.x, planarCoordinates.y, 0)).applyMatrix4(matrix);
    return SpacialCoordinates.create(
      result.x + origin.x,
      result.y + origin.y,
      result.z + origin.z,
    );
  },
};

// X and Y are flat, z goes upwards
export type SpacialCoordinates = { type: 'spacial-coordinates', x: number, y: number, z: number };
export const SpacialCoordinates = {
  create(x: number, y: number, z: number): SpacialCoordinates {
    return { type: 'spacial-coordinates', x, y, z };
  },
  createFromVector3(vec3: Vector3): SpacialCoordinates {
    return SpacialCoordinates.create(vec3.x, vec3.y, vec3.z);
  },
  toVector3(spacialCoordinates: SpacialCoordinates): Vector3 {
    return new Vector3(spacialCoordinates.x, spacialCoordinates.y, spacialCoordinates.z);
  },
  toPlanarCoordinates(spacialCoordinates: SpacialCoordinates, face: PlanarFace): PlanarCoordinates {
    // 1. Get the origin of the face
    const origin = face.origin;

    // const pitch = degreesToRadians(PlanarFace.calculatePitch(face));
    // const yaw = degreesToRadians(PlanarFace.calculateYaw(face));
    // const roll = degreesToRadians(PlanarFace.calculateRoll(face));

    const matrix = face.matrix.clone();//new THREE.Matrix4();
    // matrix.identity();
    //
    // matrix.multiply((new THREE.Matrix4()).identity().makeRotationX(pitch));
    // matrix.multiply((new THREE.Matrix4()).identity().makeRotationY(yaw));
    // matrix.multiply((new THREE.Matrix4()).identity().makeRotationZ(roll));

    matrix.invert();

    const result = (new Vector3(spacialCoordinates.x - origin.x, spacialCoordinates.y - origin.y, spacialCoordinates.z - origin.z)).applyMatrix4(matrix);
    return PlanarCoordinates.create(result.x, result.y);

    // let planarCoordinates = PlanarCoordinates.create(0, 0);
    //
    // // 2. Calculate x coordinate
    // (() => {
    //   // cos(yaw) = a / h     OR     a / cos(yaw) = h
    //   const a = spacialCoordinates.x - origin.x;
    //   const yaw = PlanarFace.calculateYaw(face);
    //   const h = a / Math.cos(degreesToRadians(yaw));
    //
    //   // But also, take into account roll - h from the previous calculation if there is no roll
    //   // would be aligned with the x axis
    //   //
    //   // NOTE: the hypotenuse in both of these right triangles is shared! And a2 in this case is
    //   // aligned with the y axis
    //   // cos(roll) = a2 / h    OR    cos(roll) * h = a2
    //   const roll = PlanarFace.calculateRoll(face);
    //   const a2 = Math.cos(degreesToRadians(roll)) * h;
    //   planarCoordinates.x = a2;
    // })();
    //
    // // 3. Calculate y coordinate
    // (() => {
    //   // cos(pitch) = a / h     OR     a / cos(pitch) = h
    //   const a = spacialCoordinates.y - origin.y;
    //   const pitch = PlanarFace.calculatePitch(face);
    //   const h = a / Math.cos(degreesToRadians(pitch));
    //
    //   // But also, take into account roll - h from the previous calculation if there is no roll
    //   // would be aligned with the y axis
    //   //
    //   // NOTE: the hypotenuse in both of these right triangles is shared! And a2 in this case is
    //   // aligned with the y axis
    //   // cos(roll) = a2 / h    OR    cos(roll) * h = a2
    //   const roll = PlanarFace.calculateRoll(face);
    //   const a2 = Math.cos(degreesToRadians(roll)) * h;
    //   planarCoordinates.y = a2;
    // })();
    //
    // return planarCoordinates;
  },
};

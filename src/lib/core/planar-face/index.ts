import { Vector3, Matrix4, Quaternion, Euler } from 'three';

import {
  SpacialCoordinates,
  PlanarCoordinates,
} from '../coordinates';
import {
  degreesToRadians,
  radiansToDegrees,
  intersection,
  pointInPolygon,
  spacialDistance,
  POINT_IN_POLYGON,
} from '../utils';

import type { PlanarFace as PlanarFaceDefinition } from './definition';

type PlanarFaceCreateRectangleOptions = {
  pitchInDegrees: number,
  yawInDegrees: number,
  rollInDegrees: number,
  translation: SpacialCoordinates,
};

const PLANAR_FACE_DEFAULT_REFERENCE_POINT_X = SpacialCoordinates.createFromVector3((new Vector3(1, 0, 0)).normalize());
const PLANAR_FACE_DEFAULT_REFERENCE_POINT_Y = SpacialCoordinates.createFromVector3((new Vector3(0, 1, 0)).normalize());
const PLANAR_FACE_DEFAULT_REFERENCE_POINT_Z = SpacialCoordinates.createFromVector3((new Vector3(0, 0, 1)).normalize());

function computeFaceOrigin(points: Array<SpacialCoordinates>) {
  // Get the point closest to (0, 0, 0) and call that the origin
  let newOrigin = SpacialCoordinates.create(0, 0, 0);
  let distanceToSpacialOrigin = Infinity;
  for (const point of points) {
    const d = spacialDistance(SpacialCoordinates.create(0, 0, 0), point);
    if (d < distanceToSpacialOrigin) {
      newOrigin = point;
      distanceToSpacialOrigin = d;
    }
  }
  return newOrigin;
}

export type PlanarFace = PlanarFaceDefinition;

export const PlanarFace = {
  // NOTE: points is expected to be in counterclockwise order
  create(
    points: Array<SpacialCoordinates>,
    origin: SpacialCoordinates,
    referencePointX: SpacialCoordinates,
    referencePointY: SpacialCoordinates,
    referencePointZ: SpacialCoordinates,
    matrix: Matrix4,
  ): PlanarFace {
    if (points.length < 3) {
      throw new Error(`PlanarFace: point length must be at least three, only received ${points.length}`);
    }
    return { type: 'planar-face', points, origin, referencePointX, referencePointY, referencePointZ, matrix };
  },

  createRectangle(width: number, height: number, opts?: Partial<PlanarFaceCreateRectangleOptions>): PlanarFace {
    const options: PlanarFaceCreateRectangleOptions = {
      translation: opts?.translation || SpacialCoordinates.create(0, 0, 0),
      pitchInDegrees: opts?.pitchInDegrees || 0,
      yawInDegrees: opts?.yawInDegrees || 0,
      rollInDegrees: opts?.rollInDegrees || 0,
    };

    const pitch = degreesToRadians(options.pitchInDegrees),
          yaw = degreesToRadians(options.yawInDegrees),
          roll = degreesToRadians(options.rollInDegrees);

    const origin = options.translation;

    // Pitch
    // cos(t) = a / h
    // h * cos(t) = a
    //
    const matrix = new Matrix4();
    matrix.identity();

    matrix.multiply((new Matrix4()).identity().makeRotationX(pitch));
    matrix.multiply((new Matrix4()).identity().makeRotationY(yaw));
    matrix.multiply((new Matrix4()).identity().makeRotationZ(roll));

    const points = [
      SpacialCoordinates.create(0, 0, 0),
      SpacialCoordinates.createFromVector3((new Vector3(width, 0, 0)).applyMatrix4(matrix)),
      SpacialCoordinates.createFromVector3((new Vector3(width, height, 0)).applyMatrix4(matrix)),
      SpacialCoordinates.createFromVector3((new Vector3(0, height, 0)).applyMatrix4(matrix)),
    ];

    const referencePointVectorX = SpacialCoordinates.toVector3(PLANAR_FACE_DEFAULT_REFERENCE_POINT_X).applyMatrix4(matrix);
    const referencePointVectorY = SpacialCoordinates.toVector3(PLANAR_FACE_DEFAULT_REFERENCE_POINT_Y).applyMatrix4(matrix);
    const referencePointVectorZ = SpacialCoordinates.toVector3(PLANAR_FACE_DEFAULT_REFERENCE_POINT_Z).applyMatrix4(matrix);

    return PlanarFace.create(
      points.map(p => SpacialCoordinates.create(p.x + origin.x, p.y + origin.y, p.z + origin.z)),
      origin,
      SpacialCoordinates.createFromVector3(referencePointVectorX),
      SpacialCoordinates.createFromVector3(referencePointVectorY),
      SpacialCoordinates.createFromVector3(referencePointVectorZ),
      matrix,
    );
  },

  // Applys a transformation to all points in the PlanarFace to rotate them a given number of
  // degrees around the given line
  rotate(face: PlanarFace, line: [SpacialCoordinates, SpacialCoordinates], angleInDegrees: number): PlanarFace {
    const angle = degreesToRadians(angleInDegrees);
    const origin = face.origin;

    const axis = new Vector3(
      line[1].x - line[0].x,
      line[1].y - line[0].y,
      line[1].z - line[0].z,
    );
    axis.normalize();

    const matrix = new Matrix4();
    matrix.identity();
    matrix.makeRotationAxis(axis, angle);

    // Update all reference points using the matrix
    const referencePointX = SpacialCoordinates.createFromVector3(
      SpacialCoordinates.toVector3(face.referencePointX).applyMatrix4(matrix).normalize()
    );
    const referencePointY = SpacialCoordinates.createFromVector3(
      SpacialCoordinates.toVector3(face.referencePointY).applyMatrix4(matrix).normalize()
    );
    const referencePointZ = SpacialCoordinates.createFromVector3(
      SpacialCoordinates.toVector3(face.referencePointZ).applyMatrix4(matrix).normalize()
    );

    // Apply the same matrix to all points in the face
    const newPoints = face.points.map(p => {
      const result = (new Vector3(p.x - origin.x, p.y - origin.y, p.z - origin.z)).applyMatrix4(matrix)
      return SpacialCoordinates.create(
        result.x + origin.x,
        result.y + origin.y,
        result.z + origin.z,
      );
    });

    const newMatrix = new Matrix4().multiplyMatrices(matrix, face.matrix);

    // Get the point closest to (0, 0, 0) and call that the origin
    const newOrigin = computeFaceOrigin(newPoints);

    const newFace = PlanarFace.create(
      newPoints,
      newOrigin,
      referencePointX,
      referencePointY,
      referencePointZ,
      newMatrix,
    );

    // Now, translate the rotated face so that line[0] in the old face is in the same place in the
    // new face

    // const lineZeroOffsetByOrigin = SpacialCoordinates.create(
    //   line[0].x - face.origin.x,
    //   line[0].y - face.origin.y,
    //   line[0].z - face.origin.z,
    // );

    const planarLineZero = SpacialCoordinates.toPlanarCoordinates(line[0], face);
    const lineZeroEndPositionPreRotation = PlanarCoordinates.toSpacialCoordinates(planarLineZero, face);
    const lineZeroEndPositionPostRotation = PlanarCoordinates.toSpacialCoordinates(planarLineZero, newFace);

    // console.log('line[0]:', line[0]);
    // console.log('line[0] (planar):', planarLineZero);
    // console.log('Pre Rotation:', lineZeroEndPositionPreRotation);
    // console.log('Post Rotation:', lineZeroEndPositionPostRotation);

    const translationX = lineZeroEndPositionPreRotation.x - lineZeroEndPositionPostRotation.x;
    const translationY = lineZeroEndPositionPreRotation.y - lineZeroEndPositionPostRotation.y;
    const translationZ = lineZeroEndPositionPreRotation.z - lineZeroEndPositionPostRotation.z;

    // console.log('TRANSLATIONS', translationX, translationY, translationZ);

    const finalPoints = newFace.points.map(p => {
      return SpacialCoordinates.create(
        p.x + translationX,
        p.y + translationY,
        p.z + translationZ,
      );
    });

    const finalOrigin = SpacialCoordinates.create(
      newOrigin.x + translationX,
      newOrigin.y + translationY,
      newOrigin.z + translationZ,
    );

    return PlanarFace.create(
      finalPoints,
      finalOrigin,
      newFace.referencePointX,
      newFace.referencePointY,
      newFace.referencePointZ,
      newFace.matrix,
    );
  },

  calculatePitch(face: PlanarFace): number {
    // const defaultReferencePoint = SpacialCoordinates.toVector3(PLANAR_FACE_DEFAULT_REFERENCE_POINT_Z);
    // const referencePoint = SpacialCoordinates.toVector3(face.referencePointZ);
    // const referencePoint = SpacialCoordinates.toVector3(
    //   SpacialCoordinates.create(
    //     0,
    //     face.referencePointZ.y,
    //     face.referencePointZ.z,
    //   )
    // ).normalize();

    // ref: https://stackoverflow.com/a/25199671
    const quaternion = new Quaternion();
    quaternion.setFromRotationMatrix(face.matrix);
    // quaternion.setFromUnitVectors(defaultReferencePoint, referencePoint);

    const e = new Euler();
    e.setFromQuaternion(quaternion);

    return radiansToDegrees(e.x);
  },

  // Yaw is rotation around the Y axis
  calculateYaw(face: PlanarFace): number {
    // const defaultReferencePoint = SpacialCoordinates.toVector3(PLANAR_FACE_DEFAULT_REFERENCE_POINT_Z);
    // const referencePoint = SpacialCoordinates.toVector3(face.referencePointZ);
    // const referencePoint = SpacialCoordinates.toVector3(
    //   SpacialCoordinates.create(
    //     face.referencePointZ.y,
    //     0,
    //     face.referencePointZ.z,
    //   )
    // ).normalize();

    // ref: https://stackoverflow.com/a/25199671
    const quaternion = new Quaternion();
    quaternion.setFromRotationMatrix(face.matrix);
    // quaternion.setFromUnitVectors(defaultReferencePoint, referencePoint);

    const e = new Euler();
    e.setFromQuaternion(quaternion);

    return radiansToDegrees(e.y);
  },

  // Roll is rotation around the Z axis
  calculateRoll(face: PlanarFace): number {
    // const defaultReferencePoint = SpacialCoordinates.toVector3(PLANAR_FACE_DEFAULT_REFERENCE_POINT_X);
    // const referencePoint = SpacialCoordinates.toVector3(face.referencePointX);
    // const referencePoint = SpacialCoordinates.toVector3(
    //   SpacialCoordinates.create(
    //     face.referencePointX.x,
    //     face.referencePointX.y,
    //     0,
    //   )
    // ).normalize();

    // ref: https://stackoverflow.com/a/25199671
    const quaternion = new Quaternion();
    quaternion.setFromRotationMatrix(face.matrix);
    // quaternion.setFromUnitVectors(defaultReferencePoint, referencePoint);

    const e = new Euler();
    e.setFromQuaternion(quaternion);

    return radiansToDegrees(e.z);

    // const origin = face.origin;
    // // tan(t) = o / a
    // const opposite = second.y - origin.y;
    // const adjacent = second.x - origin.x;
    //
    // return radiansToDegrees(Math.atan2(opposite, adjacent));
  },

  // Return all perimeter line segments that make up the face
  // If "closed" is false, skip the final segment that connects the last point to the first point
  calculatePerimeterLineSegments(
    face: PlanarFace,
    closed: boolean = true,
  ): Array<[PlanarCoordinates, PlanarCoordinates]> {
    const convertedPoints = face.points.map(p => SpacialCoordinates.toPlanarCoordinates(p, face));

    let segments: Array<[PlanarCoordinates, PlanarCoordinates]> = [];
    for (let i = 0; i < convertedPoints.length-1; i += 1) {
      segments.push([convertedPoints[i], convertedPoints[i+1]]);
    }
    if (closed) {
      segments.push([convertedPoints[convertedPoints.length-1], convertedPoints[0]]);
    }
    return segments;
  },

  intersection(
    face: PlanarFace,
    lineA: [PlanarCoordinates, PlanarCoordinates],
    lineB: [PlanarCoordinates, PlanarCoordinates],
  ): PlanarCoordinates | null {
    let intersectionPoint = intersection(lineA, lineB);

    if (!intersectionPoint) {
      return null;
    }

    // NOTE: it's possible for the intersection point to be outside the polygon, if so, it doesn't
    // count
    //
    // WHen calculating, round all values. Some of the weird floating point precision issues can lead
    // to false positives.
    const convertedPoints = face.points.map(p => PlanarCoordinates.round(SpacialCoordinates.toPlanarCoordinates(p, face)), 3);
    if (pointInPolygon(convertedPoints, PlanarCoordinates.round(intersectionPoint, 3)) === POINT_IN_POLYGON.OUTSIDE) {
      return null;
    }

    return intersectionPoint;
  },

  bisect(
    face: PlanarFace,
    bisectLinePointA: PlanarCoordinates,
    bisectLinePointB: PlanarCoordinates,
  ): [PlanarFace, PlanarFace] {
    const origin = face.origin;
    const bisectLine: [PlanarCoordinates, PlanarCoordinates] = [bisectLinePointA, bisectLinePointB];

    const convertedPoints = face.points.map(p => SpacialCoordinates.toPlanarCoordinates(p, face));

    const leftPoints: Array<PlanarCoordinates> = [];
    const rightPoints: Array<PlanarCoordinates> = [];

    const calculateLineSide = (c: PlanarCoordinates) => {
      return (
        (bisectLinePointB.x - bisectLinePointA.x)*(c.y - bisectLinePointA.y) -
        (bisectLinePointB.y - bisectLinePointA.y)*(c.x - bisectLinePointA.x)
      ) > 0;
    };

    // Loop through each perimeter line segment of the face
    for (let [pointA, pointB] of PlanarFace.calculatePerimeterLineSegments(face)) {
      const pointOnLeft = calculateLineSide(pointA);
      // console.log('PT', pointA, pointB);

      let intersectionPoint = PlanarFace.intersection(face, [pointA, pointB], bisectLine);

      // Push a new item onto the end of an array if the last item of the array doesn't equal that
      // item already
      const pushIfNew = (array: Array<PlanarCoordinates>, item: PlanarCoordinates) => {
        if (array.length === 0) {
          array.push(item);
          // console.log('-------->', item);
          return;
        }

        if (
          array[array.length-1].x === item.x &&
          array[array.length-1].y === item.y
        ) {
          return;
        }

        array.push(item);
        // console.log('-------->', item);
      };

      if (intersectionPoint) {
        // If the perimeter segment intersects the line, split up the line into two lines, and put one
        // on each side
        if (pointOnLeft) {
          // console.log('LEFTPUSH', pointA, intersectionPoint)
          pushIfNew(leftPoints, pointA);
          pushIfNew(leftPoints, intersectionPoint);

          // console.log('RIGHTPUSH', intersectionPoint)
          pushIfNew(rightPoints, intersectionPoint);
          pushIfNew(rightPoints, pointB);
        } else {
          // console.log('RIGHTPUSH', pointA, intersectionPoint)
          pushIfNew(rightPoints, pointA);
          pushIfNew(rightPoints, intersectionPoint);

          // console.log('LEFTPUSH', intersectionPoint)
          pushIfNew(leftPoints, intersectionPoint);
          pushIfNew(leftPoints, pointB);
        }
      } else {
        if (pointOnLeft) {
          // console.log('LEFTPUSH', pointA)
          pushIfNew(leftPoints, pointA);
        } else {
          // console.log('RIGHTPUSH', pointA)
          pushIfNew(rightPoints, pointA);
        }
      }
    }

    // Remove final points if they are the same as the initial points
    if (leftPoints[0].x === leftPoints[leftPoints.length-1].x && leftPoints[0].y === leftPoints[leftPoints.length-1].y) {
      leftPoints.splice(leftPoints.length-1, 1);
    }
    if (rightPoints[0].x === rightPoints[rightPoints.length-1].x && rightPoints[0].y === rightPoints[rightPoints.length-1].y) {
      rightPoints.splice(rightPoints.length-1, 1);
    }

    const leftPointsSpacial = leftPoints.map(p => PlanarCoordinates.toSpacialCoordinates(p, face));
    const rightPointsSpacial = rightPoints.map(p => PlanarCoordinates.toSpacialCoordinates(p, face));

    const leftOrigin = computeFaceOrigin(leftPointsSpacial);
    const rightOrigin = computeFaceOrigin(rightPointsSpacial);

    return [
      PlanarFace.create(leftPointsSpacial, leftOrigin, face.referencePointX, face.referencePointY, face.referencePointZ, face.matrix),
      PlanarFace.create(rightPointsSpacial, rightOrigin, face.referencePointX, face.referencePointY, face.referencePointZ, face.matrix),
    ];
  },
};

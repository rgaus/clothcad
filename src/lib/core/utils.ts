import { PlanarCoordinates, SpacialCoordinates } from './coordinates';
import robustPiP from 'robust-point-in-polygon';
import inters from 'intersection';

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Compute the intersection of two line segments
export function intersection(a: [PlanarCoordinates, PlanarCoordinates], b: [PlanarCoordinates, PlanarCoordinates]) {
  var seg2 = { start: a[0], end: a[1] };
  var seg3 = { start: b[0], end: b[1] };

  const result = inters.intersect(seg2, seg3); 
  if (result) {
    return PlanarCoordinates.create(result.x, result.y);
  } else {
    return null;
  }
}

export function extendLineSegment(lineSegment: [PlanarCoordinates, PlanarCoordinates], amount: number): PlanarCoordinates {
  const [a, b] = lineSegment;
  const lengthAB = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  const newLength = lengthAB + amount;
  const x = b.x + (b.x - a.x) / lengthAB * newLength;
  const y = b.y + (b.y - a.y) / lengthAB * newLength;
  return PlanarCoordinates.create(x, y);
}

export function lineIntersection(a: [PlanarCoordinates, PlanarCoordinates], b: [PlanarCoordinates, PlanarCoordinates]) {
  return intersection(
    [a[0], extendLineSegment(a, 1)],
    [b[0], extendLineSegment(b, 1)],
  );
}

export function failedLineIntersection(a: [PlanarCoordinates, PlanarCoordinates], b: [PlanarCoordinates, PlanarCoordinates]) {
  const aSlope = (a[1].y - a[0].y) / (a[1].x - a[1].x);
  const aYIntercept = -1 * (aSlope * a[0].x - a[0].y);

  const bSlope = (b[1].y - b[0].y) / (b[1].x - b[1].x);
  const bYIntercept = -1 * (bSlope * b[0].x - b[0].y);

  // y = (am * x) + ab
  // y = (bm * x) + bb
  // so set them equal to each other:
  // (am * x) + ab = (bm * x) + bb
  // (am * x) - (bm * x) = bb - ab
  // (am - bm) * x = bb - ab
  // x = (bb - ab) / (am - bm)

  const x = (bYIntercept - aYIntercept) / (aSlope - bSlope);
  if (isNaN(x)) {
    return null;
  }
  const y = (aSlope * x) + aYIntercept;
  return PlanarCoordinates.create(x, y);
}

export enum POINT_IN_POLYGON {
  CONTAINED = -1,
  BOUNDARY = 0,
  OUTSIDE = 1,
}
export function pointInPolygon(polygon: Array<PlanarCoordinates>, point: PlanarCoordinates): POINT_IN_POLYGON {
  return robustPiP(polygon.map(p => [p.x, p.y]), [point.x, point.y]); // true
}

export function planarDistance(a: PlanarCoordinates, b: PlanarCoordinates): number {
  return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
}
export function spacialDistance(a: SpacialCoordinates, b: SpacialCoordinates): number {
  return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2) + Math.pow(b.z - a.z, 2));
}

export function round(n: number, places: number = 1): number {
  const scalar = Math.pow(10, places);
  return Math.round(n * scalar) / scalar;
}

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

import inters from 'intersection';

export type Point2D = {
  type: 'point';
  dimensionality: '2d';
  x: number;
  y: number;
};
export const Point2D = {
  create(x: number, y: number): Point2D {
    return { type: 'point', dimensionality: '2d', x, y };
  },
};

type Point3D = {
  type: 'point';
  dimensionality: '3d';
  x: number;
  y: number;
  z: number;
}
const Point3D = {
  create(x: number, y: number, z: number = 0): Point3D {
    return { type: 'point', dimensionality: '3d', x, y, z };
  },
};

type Point = Point3D | Point2D;

export type Line<P extends Point> = {
  type: 'line';
  start: P;
  mid: P;
  end: P;
};
export const Line = {
  create<P extends Point = Point2D>(start: P, end: P): Line<P> {
    const mid = midpoint<P>(start, end);
    return {
      type: 'line',
      start,
      mid,
      end,
    };
  },
};

export type Rectangle<P extends Point> = {
  type: 'rectangle';
  upperLeft: P;
  lowerRight: P;
};
export const Rectangle = {
  create<P extends Point = Point2D>(origin: P, width: number, height: number): Rectangle<P> {
    return {
      type: 'rectangle',
      upperLeft: origin,
      lowerRight: (origin.dimensionality === '2d' ? Point2D : Point3D).create(origin.x + width, origin.y + height) as P,
    };
  },
};

export type Polygon<P extends Point> = { type: 'polygon'; segments: Array<[P, P]> };
export const Polygon = {
  create<P extends Point = Point2D>(segments: Array<[P, P]>): Polygon<P> {
    return {
      type: 'polygon',
      segments,
    };
  },
};

export type Geometry<P extends Point> = P | Line<P> | Rectangle<P> | Polygon<P>;

export function distance(a: Point, b: Point): number {
  if (a.dimensionality !== b.dimensionality) {
    throw new Error(`Can only get distance between poins of the same dimensionality! ${a.dimensionality} != ${b.dimensionality}`);
  }

  if (a.dimensionality === '2d' && b.dimensionality === '2d') {
    // 2d
    return Math.sqrt(
      Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)
    );
  } else if (a.dimensionality === '3d' && b.dimensionality === '3d') {
    // 3d
    return Math.sqrt(
      Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2) + Math.pow(b.z - a.z, 2)
    );
  } else {
    throw new Error(`Unknown dimensionality ${a.dimensionality}!`);
  }
}

function midpoint<P extends Point>(a: P, b: P): P {
  if (a.dimensionality !== b.dimensionality) {
    throw new Error(`Can only get midpoint between points of the same dimensionality! ${a.dimensionality} != ${b.dimensionality}`);
  }

  if (a.dimensionality === '2d' && b.dimensionality === '2d') {
    // 2d
    const twod = Point2D.create((a.x+b.x)/2, (a.y+b.y)/2);
    return twod as P;
  } else if (a.dimensionality === '3d' && b.dimensionality === '3d') {
    // 3d
    const threed = Point3D.create((a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2);
    return threed as P;
  } else {
    throw new Error(`Unknown dimensionality ${a.dimensionality}!`);
  }
}

// ref: https://stackoverflow.com/questions/52791641/distance-from-point-to-line-3d-formula
function distanceToLine<P extends Point>(start: P, end: P, test: P): P {
  if (start.dimensionality !== end.dimensionality) {
    throw new Error(`Cannot get distance from line with points of different dimensionalities! ${start.dimensionality} != ${end.dimensionality}`);
  }
  if (start.dimensionality !== test.dimensionality) {
    throw new Error(`Cannot get distance from point to line - different dimensionalities! ${start.dimensionality} != ${test.dimensionality}`);
  }
  const AB    = [end.x-start.x, end.y-start.y, ((end as any)?.z || 0)-((start as any)?.z || 0)];
  const lenAB = Math.sqrt(AB[0]*AB[0] + AB[1]*AB[1] + AB[2]*AB[2]);

  const D  = [AB[0]/lenAB, AB[1]/lenAB, AB[2]/lenAB];
  const AP = [test.x-start.x, test.y-start.y, ((test as any)?.z || 0)-((start as any)?.z || 0)];

  const d = D[0]*AP[0] + D[1]*AP[1] + D[2]*AP[2];

  const result = [start.x + d * D[0], start.y + d * D[1], ((start as any)?.z || 0) + d * D[2]];

  if (start.dimensionality === '2d') {
    return Point2D.create(result[0], result[1]) as P;
  } else {
    return Point3D.create(result[0], result[1], result[2]) as P;
  }
}

function snapToPoint<P extends Point>(point: P, geometry: P, activationDistance: number): [number, P] {
  // Attempt to snap to a point
  const d = distance(point, geometry);
  if (d > activationDistance) {
    return [0, point];
  }
  return [d, geometry];
}

type MetadataPoint<P extends Point> = { type: 'point', point: P };
type MetadataLine<P extends Point> = { type: 'line', line: Line<P> };
type MetadataLineMidpoint<P extends Point> = { type: 'line-midpoint', line: Line<P> };

export type Metadata<P extends Point> = (
  | MetadataPoint<P>
  | MetadataLine<P>
  | MetadataLineMidpoint<P>
);
export const Metadata = {
  point<P extends Point>(point: P): Metadata<P> {
    return { type: 'point', point };
  },
  line<P extends Point>(line: Line<P>): Metadata<P> {
    return { type: 'line', line };
  },
  midpoint<P extends Point>(line: Line<P>): Metadata<P> {
    return { type: 'line-midpoint', line };
  },
};

export default function calculateSnappedPosition<P extends Point = Point2D>(
  point: P,
  geometries: Array<Geometry<P>>,
  activationDistance = 5,
): [number, P, Array<Metadata<P>>] {
  const results: Array<[number, P, Metadata<P> | null]> = geometries.map(geometry => {
    let points: Array<[P, Metadata<P>]> = [];
    let lines: Array<[P, P, Metadata<P>]> = [];

    switch (geometry.type) {
      case 'point': {
        points.push([geometry, Metadata.point(geometry)]);
        break;
      }
      case 'line': {
        // Attempt to snap to either end of a line
        points.push([geometry.start, Metadata.point(geometry.start)]);
        points.push([geometry.mid, Metadata.midpoint(geometry)]);
        points.push([geometry.end, Metadata.point(geometry.end)]);
        lines.push([geometry.start, geometry.end, Metadata.line(geometry)]);
        break;
      }
      case 'rectangle': {
        const lowerLeft = (geometry.upperLeft.dimensionality === '2d' ? Point2D : Point3D) 
          .create(geometry.upperLeft.x, geometry.lowerRight.y) as P;
        const upperRight = (geometry.upperLeft.dimensionality === '2d' ? Point2D : Point3D) 
          .create(geometry.lowerRight.x, geometry.upperLeft.y) as P;
        points.push([geometry.upperLeft, Metadata.point(geometry.upperLeft)]);
        points.push([geometry.lowerRight, Metadata.point(geometry.lowerRight)]);
        points.push([lowerLeft, Metadata.point(lowerLeft)]);
        points.push([upperRight, Metadata.point(upperRight)]);
        lines.push([
          geometry.upperLeft,
          upperRight,
          Metadata.line(Line.create(geometry.upperLeft, upperRight)),
        ]);
        points.push([
          midpoint(geometry.upperLeft, upperRight),
          Metadata.midpoint(Line.create(geometry.upperLeft, upperRight)),
        ]);
        lines.push([
          upperRight,
          geometry.lowerRight,
          Metadata.line(Line.create(upperRight, geometry.lowerRight)),
        ]);
        points.push([
          midpoint(upperRight, geometry.lowerRight),
          Metadata.midpoint(Line.create(upperRight, geometry.lowerRight)),
        ]);
        lines.push([
          geometry.lowerRight,
          lowerLeft,
          Metadata.line(Line.create(geometry.lowerRight, lowerLeft)),
        ]);
        points.push([
          midpoint(geometry.lowerRight, lowerLeft),
          Metadata.midpoint(Line.create(geometry.lowerRight, lowerLeft)),
        ]);
        lines.push([
          lowerLeft,
          geometry.upperLeft,
          Metadata.line(Line.create(lowerLeft, geometry.upperLeft)),
        ]);
        points.push([
          midpoint(lowerLeft, geometry.upperLeft),
          Metadata.midpoint(Line.create(lowerLeft, geometry.upperLeft)),
        ]);
        break;
      }
      case 'polygon': {
        // Add all points and all segments of the polygon as lines
        points.push([geometry.segments[0][0], Metadata.point(geometry.segments[0][0])]);
        for (const segment of geometry.segments) {
          lines.push([segment[0], segment[1], Metadata.line(Line.create(segment[0], segment[1]))]);
          points.push([segment[1], Metadata.point(segment[1])]);
        }
        break;
      }
    }

    let maxScore: number | null = null;
    let maxScorePoint: P | null = null;
    let maxScoreMetadata: Metadata<P> | null = null;

    // Try to snap to points
    for (const [pointOfInterest, metadata] of points) {
      const [score, result] = snapToPoint(point, pointOfInterest, activationDistance);
      if (maxScore === null || maxScorePoint === null || maxScoreMetadata === null || score > maxScore) {
        maxScore = score;
        maxScorePoint = result;
        maxScoreMetadata = metadata;
      }
    }

    // Try to snap to lines
    for (const line of lines) {
      const pointOnLine = distanceToLine(line[0], line[1], point);
      const [score, result] = snapToPoint(point, pointOnLine, activationDistance);
      if (maxScore === null || maxScorePoint === null || maxScoreMetadata === null || score > maxScore) {
        maxScore = score;
        maxScorePoint = result;
        maxScoreMetadata = line[2];
      }
    }

    if (maxScore !== null && maxScorePoint !== null && maxScore > 0) {
      return [maxScore, maxScorePoint, maxScoreMetadata] as [number, P, Metadata<P>];
    } else {
      return [0, point, null] as [number, P, null];
    }
  }).filter(([score, _point, _metadata]) => score > 0);

  // console.log('RESULTS', results)

  if (results.length === 0) {
    // Zero results = no snap point.
    return [0, point, []];
  } else if (results.length === 1) {
    // One result = that's the snap point!
    const metadata = results[0][2] ? [results[0][2]] : [];
    return [results[0][0], results[0][1], metadata];
  } else {
    // More than one result = get the intersection of all lines and that's the snap point!
    const lineGeometries = results.filter(
      ([_score, _point, metadata]) => metadata && (metadata.type === 'line' || metadata.type == 'line-midpoint')
    ) as Array<[number, P, MetadataLine<P> | MetadataLineMidpoint<P>]>;
    if (lineGeometries.length < 2) {
      return [0, point, []];
    }

    if (lineGeometries[0][2].line.start.dimensionality !== '2d') {
      console.warn('Snap line intersection not yet implemented in 3d :(');
      return [0, point, []];
    }
    const result = inters.intersect(lineGeometries[0][2].line, lineGeometries[1][2].line); 
    const averageScore = (lineGeometries[0][0] + lineGeometries[1][0]) / 2;
    // console.log('RESULT', averageScore, result)
    return [
      averageScore,
      Point2D.create(result.x, result.y) as P,
      lineGeometries.map(([_score, _point, metadata]) => metadata),
    ];
  }
}

// const geometries = [
//   // { type: 'point', dimensionality: '2d', x: 10, y: 10 } as Point2D,
//   Line.create<Point2D>(
//     { type: 'point', dimensionality: '2d', x: 0, y: 10 } as Point2D,
//     { type: 'point', dimensionality: '2d', x: 10, y: 10 } as Point2D,
//   ),
// ];
//
// console.log(calculateSnappedPosition(
//   { type: 'point', dimensionality: '2d', x: 5, y: 11 },
//   geometries,
// ));

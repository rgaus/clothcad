// from "distance-top-poygon": https://npmjs.com/distance-to-polygon
type Point = [number, number];

const distanceBetweenPoints = ([p1x, p1y]: Point, [p2x, p2y]: Point, f = (x: number): number => x) => f(Math.sqrt(
  Math.pow(p1x - p2x, 2) + Math.pow(p1y - p2y, 2)
));

const distanceToLine = ([px, py]: Point, [[l1x, l1y], [l2x, l2y]]: [Point, Point], f = (x: number): number => x) => {
  const xD = l2x - l1x;
  const yD = l2y - l1y;

  const u = (((px - l1x) * xD) + ((py - l1y) * yD)) / ((xD * xD) + (yD * yD));

  let closestLine: Point;
  if (u < 0) {
    closestLine = [l1x, l1y];
  } else if (u > 1) {
    closestLine = [l2x, l2y];
  } else {
    closestLine = [l1x + (u * xD), l1y + (u * yD)];
  }

  return f(distanceBetweenPoints([px, py], closestLine));
};

const distanceToPolygon = ([px, py]: Point, vertices: Array<Point>, f = (x: number): number => x) => {
  const comp = vertices.reduce(({ prevPoint, dist }, currPoint) => {
    const currDist = distanceToLine([px, py], [prevPoint, currPoint]);
    const ret = {
      prevPoint: currPoint,
      dist,
    };
    if (currDist < dist) {
      ret.dist = currDist;
    }
    return ret;
  }, { prevPoint: vertices[vertices.length - 1], dist: Infinity });
  return f(comp.dist);
};

export { distanceBetweenPoints, distanceToLine, distanceToPolygon };

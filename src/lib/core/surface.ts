import { v4 as uuidv4 } from 'uuid';
import { parseSVG as parseSVGPath, makeAbsolute } from 'svg-path-parser';
import { PlanarFace } from './planar-face';
import { LinearFold } from './linear-fold';
import {
  PlanarCoordinates,
  SpacialCoordinates,
  SVGCoordinates,
} from './coordinates';

import { colorGeneratorFactory } from '$lib/color';

export type Surface = {
  id: string;
  name: string;
  face: PlanarFace;
  folds: Array<LinearFold>;

  colorFamily: string;
  visible: boolean;
  parentId: Surface['id'] | null;
};

const generateColorFamily = colorGeneratorFactory();

export const Surface = {
  create(face: PlanarFace, folds: Array<LinearFold> = []): Surface {
    const colorFamily = generateColorFamily();
    return {
      id: uuidv4(),
      name: 'Untitled Surface',
      face,
      folds,

      colorFamily,
      visible: true,
      parent: null,
    };
  },

  createFromSVG(svgContents: string, selectWrapperElement: (svgDoc: Document) => Element) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContents, "image/svg+xml");

    const rect = selectWrapperElement(svgDoc);
    const parentElement = rect.parentElement;
    if (!parentElement) {
      throw new Error('No parent element above selected rect!');
    }

    const scale = 0.5;

    let minX = parseFloat(rect.getAttribute('x') || '');
    let minY = parseFloat(rect.getAttribute('y') || '');
    let maxX = minX + parseFloat(rect.getAttribute('width') || '');
    let maxY = minY + parseFloat(rect.getAttribute('height') || '');

    const face = PlanarFace.createRectangle((maxX - minX) * scale, (maxY - minY) * scale, {
      translation: SpacialCoordinates.create(minX * scale, minY * scale, 0),
    });

    // Convert every path into a series of folds
    const folds: Array<LinearFold> = [];
    for (const path of Array.from(parentElement.getElementsByTagName("path"))) {
      const pathCommands = parseSVGPath(path.getAttribute('d') || '');
      makeAbsolute(pathCommands);

      let position = SVGCoordinates.create(0, 0);
      for (const pathCommand of pathCommands) {
        switch (pathCommand.command) {
          case 'moveto': {
            position = SVGCoordinates.create(pathCommand.x - minX, pathCommand.y - minY);
            break;
          }
          case 'lineto': {
            const newPosition = SVGCoordinates.create(pathCommand.x - minX, pathCommand.y - minY);
            const fold = LinearFold.create(
              SVGCoordinates.toPlanarCoordinates(position, face, scale),
              SVGCoordinates.toPlanarCoordinates(newPosition, face, scale),
            );
            folds.push(fold);
            position = newPosition;
            break;
          }
        }
      }
    }

    return Surface.create(face, folds);
  },

  // Bisect a surface into two surfaces, based off of a fold. Returns the original surface and the
  // two new surfaces.
  //
  // NOTE: the primary fold will not be in either returned surface
  bisect(surface: Surface, primaryFold: LinearFold): [Surface, Surface] {
    // Bisect the underlying face
    const [faceA, faceB] = PlanarFace.bisect(surface.face, primaryFold.a, primaryFold.b);

    // Get the origin of each face in original-surface-relative planar coordinates
    const faceAOrigin = SpacialCoordinates.toPlanarCoordinates(faceA.origin, surface.face);
    const faceBOrigin = SpacialCoordinates.toPlanarCoordinates(faceB.origin, surface.face);

    // But also, bisect all folds within the surface
    const surfaceAFolds: Array<LinearFold> = [];
    const surfaceBFolds: Array<LinearFold> = [];

    const foldsExceptForPrimaryFold = surface.folds.filter(f => f.id !== primaryFold.id);
    for (const fold of foldsExceptForPrimaryFold) {
      const foldPointAOnLeft = LinearFold.isPointOnLeft(primaryFold, fold.a);
      const foldPointBOnLeft = LinearFold.isPointOnLeft(primaryFold, fold.b);
      if (foldPointAOnLeft && foldPointBOnLeft) {
        // Both on left
        surfaceAFolds.push(fold);
      } else if (!foldPointAOnLeft && !foldPointBOnLeft) {
        // Both on right
        surfaceAFolds.push(fold);
      } else {
        // Bisect fold into left and right parts, and add each part to each surface
        let intersectionPoint = PlanarFace.intersection(
          surface.face,
          [primaryFold.a, primaryFold.b],
          [fold.a, fold.b]
        );
        // console.log('INTERSECT', intersectionPoint);
        if (!intersectionPoint) {
          throw new Error(`Surface.bisect: Point A of fold is on one sideof primary fold, and Point B is on the other side of the primary fold, but the primary fold and fold being worked on don't intersect. This should be impossible...`);
        }

        if (foldPointAOnLeft) {
          // console.log('left')
          // Point A on left, Point B on right
          surfaceAFolds.push(LinearFold.create(
            PlanarCoordinates.create(
              fold.a.x - faceAOrigin.x,
              fold.a.y - faceAOrigin.y,
            ),
            PlanarCoordinates.create(
              intersectionPoint.x - faceAOrigin.x,
              intersectionPoint.y - faceAOrigin.y,
            ),
          ));
          surfaceBFolds.push(LinearFold.create(
            PlanarCoordinates.create(
              intersectionPoint.x - faceBOrigin.x,
              intersectionPoint.y - faceBOrigin.y,
            ),
            PlanarCoordinates.create(
              fold.b.x - faceBOrigin.x,
              fold.b.y - faceBOrigin.y,
            ),
          ));
        } else {
          // Point A on right, Point B on left
          surfaceAFolds.push(LinearFold.create(
            PlanarCoordinates.create(
              intersectionPoint.x - faceAOrigin.x,
              intersectionPoint.y - faceAOrigin.y,
            ),
            PlanarCoordinates.create(
              fold.b.x - faceAOrigin.x,
              fold.b.y - faceAOrigin.y,
            ),
          ));
          surfaceBFolds.push(LinearFold.create(
            PlanarCoordinates.create(
              fold.a.x - faceBOrigin.x,
              fold.a.y - faceBOrigin.y,
            ),
            PlanarCoordinates.create(
              intersectionPoint.x - faceBOrigin.x,
              intersectionPoint.y - faceBOrigin.y,
            ),
          ));
        }
      }
    }

    // console.log('FOLDS', surfaceAFolds, surfaceBFolds);

    // Return original surface, only now hidden

    const surfaceA = Surface.create(faceA, surfaceAFolds);
    surfaceA.name = `Bisect A of ${surface.name}`;
    surfaceA.parentId = surface.id;

    const surfaceB = Surface.create(faceB, surfaceBFolds);
    surfaceB.name = `Bisect B of ${surface.name}`;
    surfaceB.parentId = surface.id;

    return [surfaceA, surfaceB];
  },

  // Rotate a surface around a given fold
  rotate(surface: Surface, primaryFoldLine: [SpacialCoordinates, SpacialCoordinates], angleInDegrees: number): Surface {
    const newFace = PlanarFace.rotate(surface.face, primaryFoldLine, angleInDegrees);

    while (angleInDegrees > 360) {
      angleInDegrees -= 360;
    }
    while (angleInDegrees < 0) {
      angleInDegrees += 360;
    }

    // // Translate all folds within the newly rotated face because the (0, 0) of the new face could
    // // be different (if the rotation didn't happen around an axis that the origin is part of)
    // const oldFaceOrigin = surface.face.points[0];
    // const newFolds = surface.folds.map(fold => {
    //   return LinearFold.create(
    //     PlanarCoordinates.create(fold.a.x - oldFaceOrigin.x, fold.a.y - oldFaceOrigin.y),
    //     PlanarCoordinates.create(fold.b.x - oldFaceOrigin.x, fold.b.y - oldFaceOrigin.y),
    //   );
    // });

    return { ...surface, face: newFace };
  },
};

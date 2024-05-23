import svgPathParser from 'svg-path-parser';
const { parseSVG: parseSVGPath, makeAbsolute } = svgPathParser;
import { Vector2, Matrix3 } from 'three';

import { generateId } from '$lib/id';
import { SVGCoordinates } from '$lib/core';
import type { Numeral } from '$lib/numeral';
import { LiteralNumeral } from '$lib/numeral';

export const DEFAULT_DRAWING_GEOMETRY_TRANSFORM = new Matrix3().identity();

export const DEFAULT_DRAWING_SCALE = LiteralNumeral.create(1);
export const DEFAULT_DRAWING_THICKNESS = LiteralNumeral.create(0.1);

export type DrawingGeometry = DrawingGeometryPath | DrawingGeometryLine | DrawingGeometryRect;
export const DrawingGeometry = {
  create(element: Element, transform: Matrix3 = DEFAULT_DRAWING_GEOMETRY_TRANSFORM): DrawingGeometry | null {
    if (element instanceof SVGPathElement) {
      return DrawingGeometryPath.create(element, transform);
    } else if (element instanceof SVGLineElement) {
      return DrawingGeometryLine.create(element, transform);
    } else if (element instanceof SVGRectElement) {
      return DrawingGeometryRect.create(element, transform);
    } else {
      return null;
    }
  },
};

export type DrawingGeometryPath = {
  type: 'path',
  element: SVGPathElement,
  // "segments" is a set of line segments that make up the outside of the path
  segments: Array<[SVGCoordinates, SVGCoordinates]>,
};
export const DrawingGeometryPath = {
  create(element: SVGPathElement, transform: Matrix3 = DEFAULT_DRAWING_GEOMETRY_TRANSFORM): DrawingGeometryPath {
    const pathCommands = parseSVGPath(element.getAttribute('d') || '');
    makeAbsolute(pathCommands);

    let segments: Array<[SVGCoordinates, SVGCoordinates]> = [];

    let position = SVGCoordinates.create(0, 0);
    for (const pathCommand of pathCommands) {
      switch (pathCommand.command) {
        case 'moveto': {
          const pathCommandTransformed = (new Vector2(pathCommand.x, pathCommand.y)).applyMatrix3(transform);
          position = SVGCoordinates.create(pathCommandTransformed.x, pathCommandTransformed.y);
          break;
        }
        case 'lineto': {
          const pathCommandTransformed = (new Vector2(pathCommand.x, pathCommand.y)).applyMatrix3(transform);
          const newPosition = SVGCoordinates.create(pathCommandTransformed.x, pathCommandTransformed.y);
          segments.push([position, newPosition]);
          position = newPosition;
          break;
        }
      }
    }

    return { type: 'path', element, segments };
  },
};

export type DrawingGeometryRect = {
  type: 'rect',
  element: SVGRectElement,
  origin: SVGCoordinates,
  width: number,
  height: number,
};
export const DrawingGeometryRect = {
  create(element: SVGRectElement, transform: Matrix3 = DEFAULT_DRAWING_GEOMETRY_TRANSFORM): DrawingGeometryRect {
    const originX = parseFloat(element.getAttribute('x') || '');
    const originY = parseFloat(element.getAttribute('y') || '');
    const width = parseFloat(element.getAttribute('width') || '');
    const height = parseFloat(element.getAttribute('height') || '');

    const upperLeftTransformed = (new Vector2(originX, originY)).applyMatrix3(transform);
    const lowerRightTransformed = (new Vector2(originX + width, originY + height)).applyMatrix3(transform);

    return {
      type: 'rect',
      element,
      origin: SVGCoordinates.create(upperLeftTransformed.x, upperLeftTransformed.y),
      width: lowerRightTransformed.x - upperLeftTransformed.x,
      height: lowerRightTransformed.y - upperLeftTransformed.y,
    };
  },
};

export type DrawingGeometryLine = {
  type: 'line',
  element: SVGLineElement,
  a: SVGCoordinates,
  b: SVGCoordinates,
};
export const DrawingGeometryLine = {
  create(element: SVGLineElement, transform: Matrix3 = DEFAULT_DRAWING_GEOMETRY_TRANSFORM): DrawingGeometryLine {
    const aX = parseFloat(element.getAttribute('x1') || '');
    const aY = parseFloat(element.getAttribute('y1') || '');
    const bX = parseFloat(element.getAttribute('x2') || '');
    const bY = parseFloat(element.getAttribute('y2') || '');

    const aTransformed = (new Vector2(aX, aY)).applyMatrix3(transform);
    const bTransformed = (new Vector2(bX, bY)).applyMatrix3(transform);

    return {
      type: 'line',
      element,
      a: SVGCoordinates.create(aTransformed.x, aTransformed.y),
      b: SVGCoordinates.create(bTransformed.x, bTransformed.y),
    };
  },
};



export type DrawingSurfaceFoldSet = {
  id: string;
  geometrySelector: string;
  folds: Array<{
    foldId: string | null;
    geometry: DrawingGeometryPath | DrawingGeometryLine | null;
  }>;
};
export const DrawingSurfaceFoldSet = {
  create(fields: Omit<DrawingSurfaceFoldSet, 'id'>): DrawingSurfaceFoldSet {
    return { id: generateId(), ...fields };
  },

  getMoreSpecificSelectorForFold(
    drawingSurfaceFoldSet: DrawingSurfaceFoldSet,
    drawingMedia: Drawing['media'],
    geometry: DrawingGeometry,
  ): string {
    const testSelector = (selector: string) => {
      return drawingMedia.document.querySelectorAll(selector).length === 1;
    };

    let selector = drawingSurfaceFoldSet.geometrySelector;

    // Try to add an id to the selector if one exists
    const element = geometry.element;

    const id = element.getAttribute('id');
    if (id) {
      selector = `${selector}#${id}`;
    }
    if (testSelector(selector)) {
      return selector;
    }

    // If the id alone isn't unique enough, add a `:nth-of-type`
    const n = Array.from(
      drawingMedia.document.querySelectorAll(selector)
    ).findIndex(element => element === geometry.element);

    return `${selector}:nth-of-type(${n})`;
  },
};



export type DrawingSurface = {
  id: string;
  surfaceId: string | null; // sur_x

  geometrySelector: string;
  geometry: DrawingGeometryPath | DrawingGeometryRect | null;

  foldSets: Array<DrawingSurfaceFoldSet>;
};
export const DrawingSurface = {
  create(fields: Omit<DrawingSurface, 'id'>): DrawingSurface {
    return { id: generateId(), ...fields };
  },
};


export type Drawing = {
  type: 'drawing';
  id: string; // drw_x
  name: string;

  media: {
    type: 'svg/literal';
    scale: Numeral;
    thickness: Numeral;
    contents: string;
    document: Document;
  },

  surfaces: Array<DrawingSurface>;
};
export const Drawing = {
  create(data: Omit<Drawing, 'id' | 'type'>): Drawing {
    return { type: 'drawing', id: generateId('drw'), ...data };
  },
  createSample() {
    const svgContents = `
      <svg width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 57.1 (83088) - https://sketch.com -->
          <title>Artboard</title>
          <desc>Created with Sketch.</desc>
          <g id="Artboard" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <rect fill="#FFFFFF" x="0" y="0" width="100" height="100"></rect>
              <rect id="Rectangle" stroke="#979797" fill="#D8D8D8" x="18.5" y="17.5" width="49" height="49"></rect>
              <path d="M12.5,42.5 L73.5,42.5" id="Path" stroke="#979797"></path>
              <path d="M14,37 L77,63" id="Path-Copy" stroke="#979797"></path>
          </g>
      </svg>
    `;
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContents, "image/svg+xml");

    return Drawing.create({
      name: 'Untitled Drawing',

      media: {
        type: 'svg/literal',
        scale: DEFAULT_DRAWING_SCALE,
        thickness: DEFAULT_DRAWING_THICKNESS,
        contents: svgContents,
        document: svgDoc,
      },
      surfaces: [],
    });
  },

  addSurface(drawing: Drawing, drawingSurface: DrawingSurface): Drawing {
    return { ...drawing, surfaces: [...drawing.surfaces, drawingSurface] };
  },
  updateSurface(
    drawing: Drawing,
    drawingSurfaceId: DrawingSurface['id'],
    updater: (drawingSurface: DrawingSurface) => DrawingSurface,
  ): Drawing {
    return {
      ...drawing,
      surfaces: drawing.surfaces.map(n => n.id === drawingSurfaceId ? updater(n) : n),
    };
  },
  getSurface(drawing: Drawing, drawingSurfaceId: DrawingSurface['id']): DrawingSurface | null {
    return drawing.surfaces.find(n => n.id === drawingSurfaceId) || null;
  },
  removeSurface(drawing: Drawing, drawingSurfaceId: DrawingSurface['id']): Drawing {
    return { ...drawing, surfaces: drawing.surfaces.filter(i => i.id !== drawingSurfaceId) };
  },
  updateFoldSet(
    drawing: Drawing,
    drawingSurfaceId: DrawingSurface['id'],
    drawingFoldSetId: DrawingSurfaceFoldSet['id'],
    updater: (drawingSurfaceFoldSet: DrawingSurfaceFoldSet) => DrawingSurfaceFoldSet,
  ): Drawing {
    return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => ({
      ...drawingSurface,
      foldSets: drawingSurface.foldSets.map(n => n.id === drawingFoldSetId ? updater(n) : n),
    }))
  },
};

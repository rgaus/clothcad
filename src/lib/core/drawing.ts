import { parseSVG as parseSVGPath, makeAbsolute } from 'svg-path-parser';

import { generateId } from '$lib/id';
import { SVGCoordinates } from '$lib/core';
import type { Numeral } from '$lib/numeral';
import { LiteralNumeral } from '$lib/numeral';

export type DrawingGeometry = DrawingGeometryPath | DrawingGeometryLine | DrawingGeometryRect;
export const DrawingGeometry = {
  create(element: Element): DrawingGeometry | null {
    if (element instanceof SVGPathElement) {
      return DrawingGeometryPath.create(element);
    } else if (element instanceof SVGLineElement) {
      return DrawingGeometryLine.create(element);
    } else if (element instanceof SVGRectElement) {
      return DrawingGeometryRect.create(element);
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
  create(element: SVGPathElement): DrawingGeometryPath {
    const pathCommands = parseSVGPath(element.getAttribute('d') || '');
    makeAbsolute(pathCommands);

    let segments: Array<[SVGCoordinates, SVGCoordinates]> = [];

    let position = SVGCoordinates.create(0, 0);
    for (const pathCommand of pathCommands) {
      switch (pathCommand.command) {
        case 'moveto': {
          position = SVGCoordinates.create(pathCommand.x, pathCommand.y);
          break;
        }
        case 'lineto': {
          const newPosition = SVGCoordinates.create(pathCommand.x, pathCommand.y);
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
  create(element: SVGRectElement): DrawingGeometryRect {
    return {
      type: 'rect',
      element,
      origin: SVGCoordinates.create(parseFloat(element.getAttribute('x') || ''), parseFloat(element.getAttribute('y') || '')),
      width: parseFloat(element.getAttribute('width') || ''),
      height: parseFloat(element.getAttribute('height') || ''),
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
  create(element: SVGLineElement): DrawingGeometryLine {
    return {
      type: 'line',
      element,
      a: SVGCoordinates.create(parseFloat(element.getAttribute('x1') || ''), parseFloat(element.getAttribute('y1') || '')),
      b: SVGCoordinates.create(parseFloat(element.getAttribute('x2') || ''), parseFloat(element.getAttribute('y2') || '')),
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
        scale: LiteralNumeral.create(1),
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

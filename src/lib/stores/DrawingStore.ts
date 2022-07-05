import { derived } from 'svelte/store';

import { FocusedItemStore } from './FocusedItemStore';
import { SurfaceStore } from './SurfaceStore';
import type { SurfaceStoreState } from './SurfaceStore';
import { createCollectionStore } from './BaseCollectionStore';

import type { Drawing } from '$lib/core';
import {
  SpacialCoordinates,
  SVGCoordinates,
  PlanarCoordinates,
  LinearFold,
  PlanarFace,
  Surface,
} from '$lib/core';
import { Numeral } from '$lib/numeral';

export type DrawingStoreState = {
  items: Array<Drawing>;
  editing: (
    | { enabled: false }
    | {
      enabled: true,
      id: Drawing['id'],
    }
  ),
};

export const DrawingStore = {
  ...createCollectionStore<DrawingStoreState>(),

  beginEditing(drawingStoreValue: DrawingStoreState, drawingId: Drawing['id']): DrawingStoreState {
    const editing = {
      enabled: true,
      id: drawingId,
    };
    return { ...drawingStoreValue, editing };
  },
  cancelEditing(drawingStoreValue: DrawingStoreState): DrawingStoreState {
    return { ...drawingStoreValue, editing: {enabled: false}};
  },
  completeEditing(drawingStoreValue: DrawingStoreState, surfaceStoreValue: SurfaceStoreState): [DrawingStoreState, SurfaceStoreState] {
    if (!drawingStoreValue.editing.enabled) {
      return [drawingStoreValue, surfaceStoreValue];
    }

    // Get the drawing currently being edited
    const editingDrawingId = drawingStoreValue.editing.id;
    const drawing = drawingStoreValue.items.find(d => d.id === editingDrawingId);
    if (!drawing) {
      return [drawingStoreValue, surfaceStoreValue];
    }

    const scale = Numeral.toNumber(drawing.media.scale);
    console.log('SCALE', drawing.media.scale)

    const newSurfaces = drawing.surfaces.map(drawingSurface => {
      if (!drawingSurface.geometry) {
        return drawingSurface;
      }

      // Using the "geometry" field from the DrawingSurface, make a PlanarFace
      if (drawingSurface.geometry.type !== 'rect') {
        throw new Error(`Non-rect geometries are not yet supported for the outside border of a surface, received ${drawingSurface.geometry.type}!`);
      }
      const face = PlanarFace.createRectangle(
        drawingSurface.geometry.width * scale,
        drawingSurface.geometry.height * scale,
        {
          translation: SpacialCoordinates.create(
            drawingSurface.geometry.origin.x * scale,
            drawingSurface.geometry.origin.y * scale,
            0,
          ),
        },
      );

      // Iterate through all the floldSets and create / update the folds on the surface
      const linearFolds: Array<LinearFold> = [];
      const foldSets = drawingSurface.foldSets.map(foldSet => {
        const folds = foldSet.folds.map(({foldId, geometry}) => {
          if (!geometry) {
            return { foldId, geometry };
          }

          // Figure out the endpoints of the fold
          let a: PlanarCoordinates, b: PlanarCoordinates;
          switch (geometry.type) {
            case 'line':
              a = SVGCoordinates.toPlanarCoordinates(geometry.a, face, scale);
              b = SVGCoordinates.toPlanarCoordinates(geometry.b, face, scale);
              break;

            case 'path':
              // FIXME: For now, use the start point of the path and end point of the path ad
              // the end poins for the fold. Bu really, this should make multple folds.
              if (geometry.segments.length === 0) {
                throw new Error('DrawingGeometryPath had no segments within it, this is probably bad!');
              }
              a = SVGCoordinates.toPlanarCoordinates(geometry.segments[0][0], face, scale);
              b = SVGCoordinates.toPlanarCoordinates(geometry.segments[geometry.segments.length-1][1], face, scale);
              break;

            default:
              return { foldId, geometry };
          }

          // Then find the fold to attach the endpoints to
          let fold: LinearFold;
          if (foldId) {
            // Try to find an existing fold if one was specified
            const foundFold = SurfaceStore.getFold(surfaceStoreValue, foldId);
            if (!foundFold) {
              return { foldId, geometry };
            }
            fold = { ...foundFold, a, b };
          } else {
            // Or fall back to creating a new fold
            fold = LinearFold.create(a, b);
          }

          linearFolds.push(fold);
          return { foldId: fold.id, geometry };
        });
        return { ...foldSet, folds };
      });

      // Create a surface to attach the folds and planar face to
      let surface: Surface | null = null;
      if (drawingSurface.surfaceId) {
        surface = SurfaceStore.get(surfaceStoreValue, drawingSurface.surfaceId);
        if (!surface) {
          return drawingSurface;
        }
        surface = { ...surface, face, folds: linearFolds };
        surfaceStoreValue = SurfaceStore.updateItem(
          surfaceStoreValue,
          surface.id,
          () => surface as Surface,
        );
      } else {
        surface = Surface.create(face, linearFolds);
        surfaceStoreValue = SurfaceStore.addItem(surfaceStoreValue, surface);
      }

      return {
        ...drawingSurface,
        surfaceId: surface.id,
        foldSets,
      };
    });

    drawingStoreValue = DrawingStore.cancelEditing(drawingStoreValue);

    drawingStoreValue = {
      ...drawingStoreValue,
      items: drawingStoreValue.items.map(n => n.id === editingDrawingId ? ({
        ...n,
        surfaces: newSurfaces,
      }) : n),
    };

    return [drawingStoreValue, surfaceStoreValue];
  },
};

// Subscribe to changes in focused drawing
export const FocusedDrawingStore = derived<
  [typeof DrawingStore, typeof FocusedItemStore],
  Drawing | null
>([DrawingStore, FocusedItemStore], ([$DrawingStore, $FocusedItemStore], set) => {
  if (!$FocusedItemStore) {
    set(null);
    return;
  }
  if ($FocusedItemStore.itemType !== "drawing") {
    set(null);
    return;
  }

  set(DrawingStore.get($DrawingStore, $FocusedItemStore.itemId));
  return;
}, null);

// Subscribe to the drawing being edited
export const EditingDrawingStore = derived<
  typeof DrawingStore,
  Drawing | null
>(DrawingStore, ($DrawingStore, set) => {
  if (!$DrawingStore) {
    set(null);
    return;
  }

  const editing = $DrawingStore.editing;
  if (!editing || !editing.enabled) {
    set(null);
    return;
  }

  set(DrawingStore.get($DrawingStore, editing.id));
  return;
}, null);

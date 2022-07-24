import { HistoryStore } from '$lib/stores/HistoryStore';
import { SurfaceStore } from '$lib/stores/SurfaceStore';
import { DrawingStore } from '$lib/stores/DrawingStore';

import {
  Drawing,
  DrawingSurface,
  DrawingSurfaceFoldSet,
  PlanarFace,
  SpacialCoordinates,
  PlanarCoordinates,
  SVGCoordinates,
  Surface,
  LinearFold,
} from '$lib/core';
import { Numeral } from '$lib/numeral';
import type { FixMe } from '$lib/types/fixme';
import type { CreatedItem, UpdatedItem, DeletedItem } from '$lib/types/item';

export const createSurfacesFromDrawing = HistoryStore.createMutation<[Drawing['id']], {
  drawingSurfaceToSurfaceId?: { [drawingSurfaceId: string]: Surface['id'] },
  drawingSurfaceToFoldIds?: { [drawingSurfaceId: string]: { [foldSetId: string]: { [foldSelector: string]: LinearFold['id'] } } },
  previousSurfaceValues?: { [surfaceId: string]: Surface | null },
  previousDrawingSurfaceToSurfaceMapping?: {[drawingSurfaceId: string]: Partial<DrawingSurface>},
}>({
  type: 'v1/drawings/surfaces',
  generateDefaultName: () => `Create surfaces from drawing`,
  forwards: (storeValues, [editingDrawingId], context) => {
    let surfaceStoreValue = storeValues.SurfaceStore;
    let drawingStoreValue = storeValues.DrawingStore;

    context.drawingSurfaceToSurfaceId = context.drawingSurfaceToSurfaceId || {};
    context.drawingSurfaceToFoldIds = context.drawingSurfaceToFoldIds || {};
    context.previousSurfaceValues = {};
    context.previousDrawingSurfaceToSurfaceMapping = {};

    // Get the drawing currently being edited
    const drawing = drawingStoreValue.items.find(d => d.id === editingDrawingId);
    if (!drawing) {
      return storeValues;
    }
    console.group('CREATE SURFACE FROM DRAWING');

    const scale = Numeral.toNumber(drawing.media.scale);
    console.log('SCALE', drawing.media.scale)

    for (const drawingSurface of drawing.surfaces) {
      if (!drawingSurface.geometry) {
        continue;
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
          thickness: drawing.media.thickness,
        },
      );
      console.log('FACE', face);

      // Iterate through all the floldSets and create / update the folds on the surface
      let linearFolds: Array<LinearFold> = [];
      const foldSets = drawingSurface.foldSets.map(foldSet => {
        const folds = foldSet.folds.map(({foldId, geometry}) => {
          if (!geometry) {
            throw new Error(`Fold ${foldId} geometry is undefined!`);
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
              throw new Error(`Cannot get fold endpoints, unknown fold geometry ${(geometry as FixMe).type}!`);
          }
          console.log('Fold endpoints:', a, b);

          // Then find the fold to attach the endpoints to
          let fold: LinearFold;
          const foundFold = SurfaceStore.getFold(surfaceStoreValue, foldId || '');
          if (foundFold) {
            // Update fold to attach new endpoints
            fold = { ...foundFold, a, b };
          } else {
            // Or fall back to creating a new fold
            fold = LinearFold.create(a, b);
            console.log('Creating new fold:', a, b);
          }

          // And finally assign the correct id to the fold so that fold ids are predicatable
          if (!context.drawingSurfaceToFoldIds) {
            throw new Error(`context.drawingSurfaceToFoldIds is not defined, this should be impossible!`);
          }
          if (!context.drawingSurfaceToFoldIds[drawingSurface.id]) {
            context.drawingSurfaceToFoldIds[drawingSurface.id] = {};
          }
          if (!context.drawingSurfaceToFoldIds[drawingSurface.id][foldSet.id]) {
            context.drawingSurfaceToFoldIds[drawingSurface.id][foldSet.id] = {};
          }
          const selector = DrawingSurfaceFoldSet.getMoreSpecificSelectorForFold(
            foldSet,
            drawing.media,
            geometry,
          );
          const correctFoldId = context.drawingSurfaceToFoldIds[drawingSurface.id][foldSet.id][selector];
          console.log('Selector:', selector, 'Correct Fold Id:', correctFoldId);
          if (correctFoldId) {
            fold = { ...fold, id: correctFoldId };
          } else {
            context.drawingSurfaceToFoldIds[drawingSurface.id][foldSet.id][selector] = fold.id;
          }
          linearFolds.push(fold);

          return { foldId: fold.id, geometry };
        });
        return { ...foldSet, folds };
      });
      console.log('FOLDS', foldSets, linearFolds);

      // Create / update a surface to attach the folds and planar face to
      let surface: Surface;
      const surfaceOrNull = SurfaceStore.get(surfaceStoreValue, drawingSurface.surfaceId || '');
      if (surfaceOrNull) {
        surface = { ...surfaceOrNull, face, folds: linearFolds };
        surfaceStoreValue = SurfaceStore.updateItem(
          surfaceStoreValue,
          surface.id,
          (oldSurface) => {
            if (!context.previousSurfaceValues) {
              return oldSurface;
            }
            context.previousSurfaceValues[surface.id] = oldSurface;
            return surface;
          },
        );
      } else {
        // Create a new surface, and ensure it has a predicable id
        surface = Surface.create(face, linearFolds);
        if (context.drawingSurfaceToSurfaceId[drawingSurface.id]) {
          surface.id = context.drawingSurfaceToSurfaceId[drawingSurface.id];
        } else {
          context.drawingSurfaceToSurfaceId[drawingSurface.id] = surface.id;
        }

        surfaceStoreValue = SurfaceStore.addItem(surfaceStoreValue, surface);
        context.previousSurfaceValues[surface.id] = null;
      }
      console.log('SURFACE', surface);

      // Update drawing to reference the new surface
      drawingStoreValue = DrawingStore.updateItem(drawingStoreValue, editingDrawingId, drawing => {
        return Drawing.updateSurface(drawing, drawingSurface.id, drawingSurface => {
          if (!context.previousDrawingSurfaceToSurfaceMapping) {
            return drawingSurface;
          }

          context.previousDrawingSurfaceToSurfaceMapping[drawingSurface.id] = {
            surfaceId: surface.id,
            foldSets,
          };

          return {
            ...drawingSurface,
            ...context.previousDrawingSurfaceToSurfaceMapping[drawingSurface.id],
          };
        });
      });
      console.log('NEW STATE', surfaceStoreValue, drawingStoreValue);
      console.groupEnd();
    }

    return {
      ...storeValues,
      SurfaceStore: surfaceStoreValue,
      DrawingStore: drawingStoreValue,
    };
  },
  backwards: (storeValues, [editingDrawingId], context) => {
    let surfaceStoreValue = storeValues.SurfaceStore;
    let drawingStoreValue = storeValues.DrawingStore;

    if (!context.previousSurfaceValues) {
      throw new Error(`Cannot revert mutation, previousSurfaceValues is undefined`);
    }

    if (!context.previousDrawingSurfaceToSurfaceMapping) {
      throw new Error(`Cannot revert mutation, previousDrawingSurfaceToSurfaceMapping is undefined`);
    }

    // Revert surfaces
    for (const [surfaceId, value] of Object.entries(context.previousSurfaceValues)) {
      if (value === null) {
        console.log('Remove surface', surfaceId);
        surfaceStoreValue = SurfaceStore.removeItem(surfaceStoreValue, surfaceId);
      } else {
        console.log('Update surface', surfaceId, 'to', value);
        surfaceStoreValue = SurfaceStore.updateItem(surfaceStoreValue, surfaceId, () => value);
      }
    }

    drawingStoreValue = DrawingStore.updateItem(drawingStoreValue, editingDrawingId, drawing => {
      if (!context.previousDrawingSurfaceToSurfaceMapping) {
        return drawing;
      }

      // Revert drawing surface metadata
      for (const [drawingSurfaceId, fields] of Object.entries(context.previousDrawingSurfaceToSurfaceMapping)) {
        drawing = Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
          return { ...drawingSurface, ...fields };
        });
      }
      return drawing;
    });

    return {
      ...storeValues,
      SurfaceStore: surfaceStoreValue,
      DrawingStore: drawingStoreValue,
    };
  },
  requires: (_args, context) => {
    if (!context.drawingSurfaceToFoldIds) {
      return [];
    }
    return Object.keys(
      context.drawingSurfaceToFoldIds
    ).flatMap((drawingSurfaceId: DrawingSurface['id']): Array<CreatedItem | UpdatedItem | DeletedItem> => {
      // If no folds are found, then depend on the drawing surface
      if (
        !context.drawingSurfaceToFoldIds ||
        !context.drawingSurfaceToFoldIds[drawingSurfaceId] ||
        Object.entries(context.drawingSurfaceToFoldIds[drawingSurfaceId]).length === 0
      ) {
        const drawingSurfaceRequirement = {
          operation: 'update' as const,
          item: {itemType: 'drawing-surface' as const, itemId: drawingSurfaceId},
        };
        return [drawingSurfaceRequirement];
      }

      // If there are folds then depend on them
      // This is a better option because the folds are later in the history tree and therefore will
      // put this item later in the history tree
      const foldSetRequirements = Object.keys(context.drawingSurfaceToFoldIds[drawingSurfaceId]).map(id => ({
        operation: 'update' as const,
        item: {itemType: 'drawing-surface-fold-set' as const, itemId: id},
      }));
      return [...foldSetRequirements];
    });
  },
  provides: (_args, context) => {
    if (!context.previousSurfaceValues) {
      return [];
    }
    return Object.keys(context.previousSurfaceValues).flatMap(id => [{
      operation: 'create' as const,
      item: {itemType: 'surface' as const, itemId: id},
    }, {
      operation: 'update' as const,
      item: {itemType: 'surface' as const, itemId: id},
    }]);
  },
});

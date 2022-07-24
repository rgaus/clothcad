import { DrawingStore, HistoryStore } from '$lib/stores';
import {
  Drawing,
  DrawingGeometry,
  DrawingSurface,
  DrawingSurfaceFoldSet,
  DEFAULT_DRAWING_SCALE,
  DEFAULT_DRAWING_THICKNESS,
} from '$lib/core';
import { Numeral } from '$lib/numeral';
import { findInSVGAll } from '$lib/svg';

export const createSampleDrawingMutation = HistoryStore.createMutation<[], {drawingId: Drawing['id']}>({
  type: 'v1/drawings/sample',
  generateDefaultName: () => 'Create sample drawing',
  forwards: (storeValues, _args, context) => {
    let drawingStoreValue = storeValues.DrawingStore;
    const drawing = Drawing.createSample();
    if (context.drawingId) {
      drawing.id = context.drawingId;
    } else {
      context.drawingId = drawing.id;
    }
    drawingStoreValue = DrawingStore.addItem(drawingStoreValue, drawing);
    return { ...storeValues, DrawingStore: drawingStoreValue };
  },
  backwards: (storeValues, _args, context) => {
    let drawingStoreValue = storeValues.DrawingStore;
    if (!context.drawingId) {
      throw new Error(`Error creating drawing: context.drawingId was not set, this should not happen!`);
    }
    drawingStoreValue = DrawingStore.removeItem(drawingStoreValue, context.drawingId);
    return { ...storeValues, DrawingStore: drawingStoreValue };
  },
  provides: (_args, context) => context.drawingId ? [
    {operation: 'create', item: {itemType: 'drawing', itemId: context.drawingId}},
    {operation: 'update', item: {itemType: 'drawing', itemId: context.drawingId}},
  ] : [],
});

type FileName = string;
type FileContents = string;
export const createDrawingMutation = HistoryStore.createMutation<[FileName, FileContents], {drawingId: Drawing['id']}>({
  type: 'v1/drawings',
  generateDefaultName: (args) => `Create drawing from ${args[0]}`,
  forwards: (storeValues, [name, contents], context) => {
    let drawingStoreValue = storeValues.DrawingStore;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(contents, "image/svg+xml");

    const drawing = Drawing.create({
      name,

      media: {
        type: 'svg/literal',
        scale: DEFAULT_DRAWING_SCALE,
        thickness: DEFAULT_DRAWING_THICKNESS,
        contents,
        document: svgDoc,
      },
      surfaces: [],
    });

    if (context.drawingId) {
      drawing.id = context.drawingId;
    } else {
      context.drawingId = drawing.id;
    }
    drawingStoreValue = DrawingStore.addItem(drawingStoreValue, drawing);
    return { ...storeValues, DrawingStore: drawingStoreValue };
  },
  backwards: (storeValues, _args, context) => {
    let drawingStoreValue = storeValues.DrawingStore;
    if (!context.drawingId) {
      throw new Error(`Error creating drawing: context.drawingId was not set, this should not happen!`);
    }
    drawingStoreValue = DrawingStore.removeItem(drawingStoreValue, context.drawingId);
    return { ...storeValues, DrawingStore: drawingStoreValue };
  },
  provides: (_args, context) => context.drawingId ? [
    {operation: 'create', item: {itemType: 'drawing', itemId: context.drawingId}},
    {operation: 'update', item: {itemType: 'drawing', itemId: context.drawingId}},
  ] : [],
});

export const changeDrawingScaleMutation = HistoryStore.createMutation<[
  Drawing['id'],
  Drawing['media']['scale'],
], { previousScale?: Drawing['media']['scale'] }>({
  type: 'v1/drawings/scale',
  generateDefaultName: (args) => `Change drawing scale to ${Numeral.serializeToString(args[1])}`,

  forwards: (storeValues, [drawingId, scale], context) => {
    console.log('FORWARDS', drawingId, scale);
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      context.previousScale = drawing.media.scale;

      const newDrawing = {
        ...drawing,
        media: { ...drawing.media, scale },
      };

      return newDrawing;
    });
    return { ...storeValues, DrawingStore: value };
  },

  backwards: (storeValues, [drawingId, _scale], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      if (!context.previousScale) {
        throw new Error('context.previousScale was not set, cannot run backwards function!');
      }

      const newDrawing = {
        ...drawing,
        media: { ...drawing.media, scale: context.previousScale },
      };
      return newDrawing;
    });
    return { ...storeValues, DrawingStore: value };
  },

  provides: (args) => [
    {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
  ],
  requires: (args) => [
    {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
  ],
});

export const changeDrawingThicknessMutation = HistoryStore.createMutation<[
  Drawing['id'],
  Drawing['media']['thickness'],
], { previousThickness?: Drawing['media']['thickness'] }>({
  type: 'v1/drawings/thickness',
  generateDefaultName: (args) => `Change drawing thickness to ${Numeral.serializeToString(args[1])}`,

  forwards: (storeValues, [drawingId, thickness], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      context.previousThickness = drawing.media.thickness;

      const newDrawing = {
        ...drawing,
        media: { ...drawing.media, thickness },
      };

      return newDrawing;
    });
    return { ...storeValues, DrawingStore: value };
  },

  backwards: (storeValues, [drawingId, _thickness], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      if (!context.previousThickness) {
        throw new Error('context.previousThickness was not set, cannot run backwards function!');
      }

      const newDrawing = {
        ...drawing,
        media: { ...drawing.media, thickness: context.previousThickness },
      };
      return newDrawing;
    });
    return { ...storeValues, DrawingStore: value };
  },

  provides: (args) => [
    {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
  ],
  requires: (args) => [
    {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
  ],
});

export const createDrawingSurfaceMutation = HistoryStore.createMutation<[Drawing['id']], { drawingSurfaceId: DrawingSurface['id'] }>({
  type: 'v1/drawings/subregion/create',
  generateDefaultName: () => `Create drawing surface`,
  forwards: (storeValues, [drawingId], context) => {
    const drawingSurface = DrawingSurface.create({
      surfaceId: null,
      geometrySelector: '',
      geometry: null,
      foldSets: [],
    });

    if (context.drawingSurfaceId) {
      drawingSurface.id = context.drawingSurfaceId;
    } else {
      context.drawingSurfaceId = drawingSurface.id;
    }

    console.log('UP', storeValues.DrawingStore, drawingId);
    const newValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawingValue => {
      const result = Drawing.addSurface(drawingValue, drawingSurface);
      console.log('CREATE', drawingSurface, result);
      return result;
    });

    return { ...storeValues, DrawingStore: newValue };
  },
  backwards: (storeValues, [drawingId], context) => {
    const newValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawingValue => {
      if (!context.drawingSurfaceId) {
        throw new Error(`Drawing surface id was not set!`);
      }
      return Drawing.removeSurface(drawingValue, context.drawingSurfaceId);
    });

    return { ...storeValues, DrawingStore: newValue, FocusedDrawingSurfaceIdStore: null };
  },
  requires: (args) => [
    {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
  ],
  provides: (_args, context) => context.drawingSurfaceId ? [
    {operation: 'create', item: {itemType: 'drawing-surface', itemId: context.drawingSurfaceId}},
    {operation: 'update', item: {itemType: 'drawing-surface', itemId: context.drawingSurfaceId}},
  ] : [],
});

export const createFoldSetMutation = HistoryStore.createMutation<[Drawing['id'], DrawingSurface['id']], { foldSetId: DrawingSurfaceFoldSet['id'] }>({
  type: 'v1/drawings/subregion/fold-set/create',
  generateDefaultName: () => `Create fold set`,

  forwards: (storeValues, [drawingId, drawingSurfaceId], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
        const foldSet = DrawingSurfaceFoldSet.create({
          geometrySelector: '',
          folds: [],
        });

        // Cache fold id so that if this step is run again in the future, the foldset
        // will receive the same id
        if (context.foldSetId) {
          foldSet.id = context.foldSetId;
        } else {
          context.foldSetId = foldSet.id;
        }

        return {
          ...drawingSurface,
          foldSets: [ ...drawingSurface.foldSets, foldSet ],
        };
      })
    });
    return { ...storeValues, DrawingStore: value };
  },

  backwards: (storeValues, [drawingId, drawingSurfaceId], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
        if (!context.foldSetId) {
          throw new Error('context.foldSetId was not set, this should not be possible!');
        }

        return {
          ...drawingSurface,
          foldSets: drawingSurface.foldSets.filter(fs => fs.id !== context.foldSetId),
        };
      })
    });
    return { ...storeValues, DrawingStore: value };
  },
  provides: (_args, context) => context.foldSetId ? [
    {operation: 'create', item: {itemType: 'drawing-surface-fold-set', itemId: context.foldSetId}},
    {operation: 'update', item: {itemType: 'drawing-surface-fold-set', itemId: context.foldSetId}},
  ] : [],
});

export const updateFoldSetGeometryMutation = HistoryStore.createMutation<
  [Drawing['id'], DrawingSurface['id'], DrawingSurfaceFoldSet['id'], DrawingSurfaceFoldSet['geometrySelector']],
  { oldGeometrySelector: DrawingSurfaceFoldSet['geometrySelector'] }
>({
  type: 'v1/drawings/subregion/fold-set/geometry',
  generateDefaultName: () => `Update fold set geometry`,
  forwards: (storeValues, [drawingId, drawingSurfaceId, drawingSurfaceFoldSetId, newSelector], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      return Drawing.updateFoldSet(
        drawing,
        drawingSurfaceId,
        drawingSurfaceFoldSetId,
        drawingSurfaceFoldSet => {
          context.oldGeometrySelector = drawingSurfaceFoldSet.geometrySelector;

          return {
            ...drawingSurfaceFoldSet,
            geometrySelector: newSelector,
            folds: findInSVGAll(newSelector, drawing).map(element => {
              const geometry = DrawingGeometry.create(element);
              if (!geometry) {
                throw new Error(`Unable to parse this svg element into a fold: ${element.outerHTML}`);
              }
              if (geometry.type === 'rect') {
                throw new Error('Unable to use a rect geometry as a fold!');
              }
              return { geometry, foldId: null };
            }),
          };
        },
      );
    });
    return { ...storeValues, DrawingStore: value };
  },
  backwards: (storeValues, [drawingId, drawingSurfaceId, drawingSurfaceFoldSetId, _newSelector], context) => {
    const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      return Drawing.updateFoldSet(
        drawing,
        drawingSurfaceId,
        drawingSurfaceFoldSetId,
        drawingSurfaceFoldSet => {
          if (typeof context.oldGeometrySelector === 'undefined') {
            throw new Error(`context.oldGeometrySelector was not set!`);
          }

          return {
            ...drawingSurfaceFoldSet,
            geometrySelector: context.oldGeometrySelector,
            folds: findInSVGAll(context.oldGeometrySelector, drawing).map(element => {
              const geometry = DrawingGeometry.create(element);
              if (!geometry) {
                throw new Error(`Unable to parse this svg element into a fold: ${element.outerHTML}`);
              }
              if (geometry.type === 'rect') {
                throw new Error('Unable to use a rect geometry as a fold!');
              }
              return { geometry, foldId: null };
            }),
          };
        },
      );
    });
    return { ...storeValues, DrawingStore: value };
  },
  requires: (args) => [
    {operation: 'update', item: {itemType: 'drawing-surface-fold-set', itemId: args[2]}},
  ],
  provides: (args) => [
    {operation: 'update', item: {itemType: 'drawing-surface-fold-set', itemId: args[2]}},
  ],
});

export const setDrawingSurfaceGeometryMutation = HistoryStore.createMutation<
  [Drawing['id'], DrawingSurface['id'], string],
  { existingDrawingSurface?: DrawingSurface }
>({
  type: 'v1/drawings/subregion/geometry',
  generateDefaultName: (args) => `Set drawing surface geometry to ${args[2]}`,
  forwards: (storeValues, [drawingId, drawingSurfaceId, selector], context) => {
    // Update drawing to use new main geometry selector
    const newDrawingStoreValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      let result: Element | null;
      try {
        result = drawing.media.document.querySelector(selector);
      } catch (err) {
        result = null;
      }

      const updatedSurface = Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
        context.existingDrawingSurface = drawingSurface;

        if (!result) {
          // If the query didn't result in anything, reset
          return {
            ...drawingSurface,
            geometrySelector: selector,
            geometry: null,
          };
        }

        const geometry = DrawingGeometry.create(result);
        if (!geometry) {
          return {
            ...drawingSurface,
            geometrySelector: selector,
            geometry: null,
          };
        }

        // Only path / rect geometries can be used as outside surface perimeters
        if (geometry.type !== 'path' && geometry.type !== 'rect') {
          return {
            ...drawingSurface,
            geometrySelector: selector,
            geometry: null,
          };
        }

        return {
          ...drawingSurface,
          geometrySelector: selector,
          geometry,
        };
      });
      console.log('F UPDATED DRAWING SURFACE', updatedSurface);
      return updatedSurface;
    });
    return { ...storeValues, DrawingStore: newDrawingStoreValue };
  },
  backwards: (storeValues, [drawingId, drawingSurfaceId, _selector], context) => {
    // Reset back to original values
    const newDrawingStoreValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
      // console.log('B UPDATED DRAWING SURFACE', existingDrawingSurface.geometrySelector, existingDrawingSurface.geometry);
      return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
        if (!context.existingDrawingSurface) {
          return drawingSurface;
        }
        return {
          ...drawingSurface,
          geometrySelector: context.existingDrawingSurface.geometrySelector,
          geometry: context.existingDrawingSurface.geometry,
        };
      })
    });
    return { ...storeValues, DrawingStore: newDrawingStoreValue };
  },
  requires: (args) => [
    {operation: 'update', item: {itemType: 'drawing-surface', itemId: args[1]}},
  ],
  provides: (args) => [
    {operation: 'update', item: {itemType: 'drawing-surface', itemId: args[1]}},
  ],
});

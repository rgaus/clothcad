import { get } from 'svelte/store';
import { HistoryStore } from '$lib/stores/HistoryStore';
import { SurfaceStore } from '$lib/stores/SurfaceStore';
import { Surface, LinearFold } from '$lib/core';
import type { FixMe } from '$lib/types/fixme';

export const colorSurfaceMutation = HistoryStore.createMutation<
  [Surface['id'], Surface['colorFamily']],
  { originalColorFamily?: Surface['colorFamily'] }
>({
  type: 'v1/surfaces/color-family',
  generateDefaultName: ([surfaceId, colorFamily]) => {
    if (!surfaceId) {
      return '';
    }
    const value = get(SurfaceStore);
    const focusedSurface = SurfaceStore.get(value, surfaceId);
    if (!focusedSurface) {
      return '';
    }
    return `Color ${focusedSurface.name} ${colorFamily}`;
  },
  forwards: (value, [surfaceId, colorFamily], context) => {
    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
      context.originalColorFamily = surface.colorFamily;
      return {
        ...surface,
        colorFamily,
      };
    });
    return { ...value, SurfaceStore: newValue };
  },
  backwards: (value, [surfaceId, _colorFamily], context) => {
    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
      if (!context.originalColorFamily) {
        throw new Error('Surface rename: context.originalColorFamily not set, cannot run backwards!');
      }
      return {
        ...surface,
        colorFamily: context.originalColorFamily,
      };
    });
    return { ...value, SurfaceStore: newValue };
  },
  requires: (args) => [
    {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
  ],
  provides: (args) => [
    {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
  ],
});

export const renameSurfaceMutation = HistoryStore.createMutation<
  [Surface['id'], Surface['name']],
  { originalName?: string }
>({
  type: 'v1/surfaces/rename',
  generateDefaultName: (args) => `Rename to ${args[1]}`,
  forwards: (value, [surfaceId, name], context) => {
    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
      context.originalName = surface.name;
      return {
        ...surface,
        name,
      };
    });
    return { ...value, SurfaceStore: newValue };
  },
  backwards: (value, [surfaceId, _name], context) => {
    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
      if (!context.originalName) {
        throw new Error('Surface rename: context.originalName not set, cannot run backwards!');
      }
      return {
        ...surface,
        name: context.originalName,
      };
    });
    return { ...value, SurfaceStore: newValue };
  },
  requires: (args) => [
    {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
  ],
  provides: (args) => [
    {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
  ],
});

export const bisectSurfaceMutation = HistoryStore.createMutation<
  [Surface['id'] | null, LinearFold['id'] | null],
  {
    surfaceAId?: Surface['id'],
    surfaceAFoldIds?: Array<LinearFold['id']>,
    surfaceBId?: Surface['id'],
    surfaceBFoldIds?: Array<LinearFold['id']>,
  }
>({
  type: 'v1/surfaces/bisect',
  generateDefaultName: (args) => `Split ${args[0]} at ${args[1]}`,
  forwards: (storeValues, [parentSurfaceId, foldId], context) => {
    let value = storeValues.SurfaceStore;

    if (!parentSurfaceId) {
      throw new Error(`Cannot find parent surface, the specified id was null!`);
    }

    const parentSurface = SurfaceStore.get(value, parentSurfaceId);
    if (!parentSurface) {
      throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
    }

    if (!foldId) {
      throw new Error(`Cannot find fold, the specified id was null!`);
    }

    const fold = SurfaceStore.getFold(value, foldId);
    if (!fold) {
      throw new Error(`Cannot find fold with id ${foldId}`);
    }

    const [surfaceA, surfaceB] = Surface.bisect(parentSurface, fold);

    // Ensure that surface ids and fold ids remain consistient as forwards / backwards is run
    //
    // FIXME: The fold part of ths isn't very robust. Ideally, this should be stored as a
    // mapping from like underlying svg element to id
    if (context.surfaceAId && context.surfaceAFoldIds) {
      surfaceA.id = context.surfaceAId;
      surfaceA.folds = surfaceA.folds.map((fold, index) => ({
        ...fold,
        id: (context.surfaceAFoldIds as FixMe)[index] || fold.id,
      }));
    } else {
      context.surfaceAId = surfaceA.id;
      context.surfaceAFoldIds = surfaceA.folds.map(i => i.id);
    }
    if (context.surfaceBId && context.surfaceBFoldIds) {
      surfaceB.id = context.surfaceBId;
      surfaceB.folds = surfaceB.folds.map((fold, index) => ({
        ...fold,
        id: (context.surfaceBFoldIds as FixMe)[index] || fold.id,
      }));
    } else {
      context.surfaceBId = surfaceB.id;
      context.surfaceBFoldIds = surfaceB.folds.map(i => i.id);
    }

    /* console.log('CONTEXT', context); */

    value = SurfaceStore.updateItem(value, parentSurface.id, s => ({...s, visible: false}));
    value = SurfaceStore.addItem(value, surfaceA);
    value = SurfaceStore.addItem(value, surfaceB);
    value = SurfaceStore.updateFold(value, foldId, f => ({
      ...f,
      surfaceAId: surfaceA.id,
      surfaceBId: surfaceB.id,
    }));

    return { ...storeValues, SurfaceStore: value };
  },
  backwards: (storeValues, [parentSurfaceId, foldId], context) => {
    let value = storeValues.SurfaceStore;

    if (!parentSurfaceId) {
      throw new Error(`Cannot find parent surface, the specified id was null!`);
    }
    if (!foldId) {
      throw new Error(`Cannot find fold, the specified id was null!`);
    }
    if (!context.surfaceAId) {
      throw new Error(`context.surfaceAId is not set!`);
    }
    if (!context.surfaceBId) {
      throw new Error(`context.surfaceBId is not set!`);
    }

    const surfaceA = SurfaceStore.get(storeValues.SurfaceStore, context.surfaceAId);
    if (!surfaceA) {
      throw new Error(`Cannot find surface with id ${context.surfaceAId}`);
    }
    const surfaceB = SurfaceStore.get(storeValues.SurfaceStore, context.surfaceBId);
    if (!surfaceB) {
      throw new Error(`Cannot find surface with id ${context.surfaceBId}`);
    }

    value = SurfaceStore.updateItem(value, parentSurfaceId, s => ({...s, visible: true}));
    value = SurfaceStore.removeItem(value, surfaceA.id);
    value = SurfaceStore.removeItem(value, surfaceB.id);
    value = SurfaceStore.updateFold(value, foldId, f => ({
      ...f,
      surfaceAId: null,
      surfaceBId: null,
    }));

    return { ...storeValues, SurfaceStore: value };
  },

  // Requires the surface to spilt, and provides two new surfaces
  requires: (args) => args[0] ? [
    {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
  ] : [],
  provides: (_args, context) => context.surfaceAId && context.surfaceBId ? [
    {operation: 'create', item: {itemType: 'surface', itemId: context.surfaceAId}},
    {operation: 'update', item: {itemType: 'surface', itemId: context.surfaceAId}},
    {operation: 'create', item: {itemType: 'surface', itemId: context.surfaceBId}},
    {operation: 'update', item: {itemType: 'surface', itemId: context.surfaceBId}},
  ] : [],
});

export const splitSurfaceMutation = HistoryStore.createMutation<
  [Surface['id'] | null, LinearFold['id'] | null],
  {
    surfaceAId?: Surface['id'],
    surfaceAFoldIds?: Array<LinearFold['id']>,
    surfaceBId?: Surface['id'],
    surfaceBFoldIds?: Array<LinearFold['id']>,
  }
>({
  type: 'v1/surfaces/split',
  generateDefaultName: ([parentSurfaceId, foldId]) => {
    if (!parentSurfaceId) {
      return '';
    }
    const value = get(SurfaceStore);
    const parentSurface = SurfaceStore.get(value, parentSurfaceId);
    if (!parentSurface) {
      return '';
    }
    return `Split ${parentSurface.name} at ${foldId}`;
  },
  forwards: (storeValues, [parentSurfaceId, foldId], context) => {
    let value = storeValues.SurfaceStore;

    if (!parentSurfaceId) {
      throw new Error(`Cannot find parent surface, the specified id was null!`);
    }

    const parentSurface = SurfaceStore.get(value, parentSurfaceId);
    if (!parentSurface) {
      throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
    }

    if (!foldId) {
      throw new Error(`Cannot find fold, the specified id was null!`);
    }

    const fold = SurfaceStore.getFold(value, foldId);
    if (!fold) {
      throw new Error(`Cannot find fold with id ${foldId}`);
    }

    const [surfaceA, surfaceB] = Surface.bisect(parentSurface, fold);

    // Ensure that surface ids and fold ids remain consistient as forwards / backwards is run
    //
    // FIXME: The fold part of ths isn't very robust. Ideally, this should be stored as a
    // mapping from like underlying svg element to id
    if (context.surfaceAId && context.surfaceAFoldIds) {
      surfaceA.id = context.surfaceAId;
      surfaceA.folds = surfaceA.folds.map((fold, index) => ({
        ...fold,
        id: (context.surfaceAFoldIds as FixMe)[index] || fold.id,
      }));
    } else {
      context.surfaceAId = surfaceA.id;
      context.surfaceAFoldIds = surfaceA.folds.map(i => i.id);
    }
    if (context.surfaceBId && context.surfaceBFoldIds) {
      surfaceB.id = context.surfaceBId;
      surfaceB.folds = surfaceB.folds.map((fold, index) => ({
        ...fold,
        id: (context.surfaceBFoldIds as FixMe)[index] || fold.id,
      }));
    } else {
      context.surfaceBId = surfaceB.id;
      context.surfaceBFoldIds = surfaceB.folds.map(i => i.id);
    }

    /* console.log('CONTEXT', context); */

    value = SurfaceStore.updateItem(value, parentSurface.id, s => ({...s, visible: false}));
    value = SurfaceStore.addItem(value, surfaceA);
    value = SurfaceStore.addItem(value, surfaceB);
    value = SurfaceStore.updateFold(value, foldId, f => ({
      ...f,
      surfaceAId: surfaceA.id,
      surfaceBId: surfaceB.id,
    }));

    return { ...storeValues, SurfaceStore: value };
  },
  backwards: (storeValues, [parentSurfaceId, foldId], context) => {
    let value = storeValues.SurfaceStore;

    if (!parentSurfaceId) {
      throw new Error(`Cannot find parent surface, the specified id was null!`);
    }
    if (!foldId) {
      throw new Error(`Cannot find fold, the specified id was null!`);
    }
    if (!context.surfaceAId) {
      throw new Error(`context.surfaceAId is not set!`);
    }
    if (!context.surfaceBId) {
      throw new Error(`context.surfaceBId is not set!`);
    }

    const surfaceA = SurfaceStore.get(storeValues.SurfaceStore, context.surfaceAId);
    if (!surfaceA) {
      throw new Error(`Cannot find surface with id ${context.surfaceAId}`);
    }
    const surfaceB = SurfaceStore.get(storeValues.SurfaceStore, context.surfaceBId);
    if (!surfaceB) {
      throw new Error(`Cannot find surface with id ${context.surfaceBId}`);
    }

    value = SurfaceStore.updateItem(value, parentSurfaceId, s => ({...s, visible: true}));
    value = SurfaceStore.removeItem(value, surfaceA.id);
    value = SurfaceStore.removeItem(value, surfaceB.id);
    value = SurfaceStore.updateFold(value, foldId, f => ({
      ...f,
      surfaceAId: null,
      surfaceBId: null,
    }));

    return { ...storeValues, SurfaceStore: value };
  },

  // Requires the surface to spilt, and provides two new surfaces
  requires: (args) => args[0] ? [
    {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
  ] : [],
  provides: (_args, context) => context.surfaceAId && context.surfaceBId ? [
    {operation: 'create', item: {itemType: 'surface', itemId: context.surfaceAId}},
    {operation: 'update', item: {itemType: 'surface', itemId: context.surfaceAId}},
    {operation: 'create', item: {itemType: 'surface', itemId: context.surfaceBId}},
    {operation: 'update', item: {itemType: 'surface', itemId: context.surfaceBId}},
  ] : [],
});

export const foldSurfaceMutation = HistoryStore.createMutation<
  [Surface['id'], LinearFold['id'], Surface['id'], number]
>({
  type: 'v1/surfaces/fold',
  generateDefaultName: ([_parentSurfaceId, _foldId, surfaceToRotateId, angle]) => {
    const value = get(SurfaceStore);
    const surfaceToRotate = SurfaceStore.get(value, surfaceToRotateId);
    if (!surfaceToRotate) {
      return '';
    }
    return `Fold ${surfaceToRotate.name} to ${angle}deg`;
  },
  forwards: (storeValues, [parentSurfaceId, foldId, surfaceToRotateId, rotationInDegrees]) => {
    let value = storeValues.SurfaceStore;

    const parentSurface = SurfaceStore.get(value, parentSurfaceId);
    if (!parentSurface) {
      throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
    }

    const fold = SurfaceStore.getFold(value, foldId);
    if (!fold) {
      throw new Error(`Cannot find fold with id ${foldId}`);
    }

    let surfaceToRotate = SurfaceStore.get(value, surfaceToRotateId);
    if (!surfaceToRotate) {
      throw new Error(`Cannot find surface with id ${surfaceToRotateId}`);
    }

    surfaceToRotate = Surface.rotate(
      surfaceToRotate,
      LinearFold.toSpacial(fold, parentSurface),
      rotationInDegrees,
    );

    console.log('ROTATED', surfaceToRotate);

    value = SurfaceStore.updateItem(value, surfaceToRotate.id, surfaceToRotate);
    return { ...storeValues, SurfaceStore: value };
  },
  backwards: (storeValues, [parentSurfaceId, foldId, surfaceToRotateId, rotationInDegrees]) => {
    let value = storeValues.SurfaceStore;

    const parentSurface = SurfaceStore.get(value, parentSurfaceId);
    if (!parentSurface) {
      throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
    }

    const fold = SurfaceStore.getFold(value, foldId);
    if (!fold) {
      throw new Error(`Cannot find fold with id ${foldId}`);
    }

    let surfaceToRotate = SurfaceStore.get(value, surfaceToRotateId);
    if (!surfaceToRotate) {
      throw new Error(`Cannot find surface with id ${surfaceToRotateId}`);
    }

    surfaceToRotate = Surface.rotate(
      surfaceToRotate,
      LinearFold.toSpacial(fold, parentSurface),
      -1 * rotationInDegrees,
    );

    value = SurfaceStore.updateItem(value, surfaceToRotate.id, surfaceToRotate);
    return { ...storeValues, SurfaceStore: value };
  },
  // This is an update purely to the surface being folded and is unrelaed to the parent
  // surface
  requires: (args) => [
    {operation: 'update', item: {itemType: 'surface', itemId: args[2]}},
  ],
  provides: (args) => [
    {operation: 'update', item: {itemType: 'surface', itemId: args[2]}},
  ],
});

export const toggleSurfaceVisibilityMutation = HistoryStore.createMutation({
  type: 'v1/surface/visibility/toggle',
  generateDefaultName: (args) => {
    const value = get(SurfaceStore);
    const surface = SurfaceStore.get(value, args[0]);
    if (!surface) {
      return '';
    }
    return `${surface.visible ? 'Hide' : 'Show'} ${surface.name}`;
  },
  forwards: (value, [surfaceId]) => {
    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
      return {
        ...surface,
        visible: !surface.visible,
      };
    });
    return { ...value, SurfaceStore: newValue };
  },
  backwards: (value, [surfaceId]) => {
    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
      return {
        ...surface,
        visible: !surface.visible,
      };
    });
    return { ...value, SurfaceStore: newValue };
  },
  requires: () => [],
  provides: () => [],
});

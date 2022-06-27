<script lang="ts">
  import { SurfaceStore, FocusedItemStore } from '$lib/stores';
  import { Surface, LinearFold, PlanarFace } from '$lib/core';

  import Panel from './Panel.svelte';
  import PanelBody from './PanelBody.svelte';
  import RotationField from './RotationField.svelte';

  let focusedFold: LinearFold | null;
  let associatedParentSurface: Surface | null;
  let associatedSurfaceA: Surface | null;
  let associatedSurfaceB: Surface | null;
  
  function onFocusedFoldUpdated() {
    const surfaces = SurfaceStore.getSurfacesContainingFold($SurfaceStore, focusedFold.id);
    if (surfaces.length > 0) {
      associatedParentSurface = surfaces[0];
    } else {
      associatedParentSurface = null
    }

    associatedSurfaceA = SurfaceStore.get($SurfaceStore, focusedFold.surfaceAId);
    associatedSurfaceB = SurfaceStore.get($SurfaceStore, focusedFold.surfaceBId);
  }

  FocusedItemStore.subscribe(focusedItem => {
    if (!focusedItem) {
      focusedFold = null;
      return;
    }
    if (focusedItem.itemType !== "fold") {
      focusedFold = null;
      return;
    }

    focusedFold = SurfaceStore.getFold($SurfaceStore, focusedItem.itemId);

    if (focusedFold) {
      onFocusedFoldUpdated();
    }
  });
  SurfaceStore.subscribe(surface => {
    if (!focusedFold) {
      return;
    }
    focusedFold = SurfaceStore.get($SurfaceStore, focusedFold.id);

    if (!focusedFold) {
      return;
    }

    onFocusedFoldUpdated();
  });
</script>

{#if focusedFold}
  <Panel left="300px" height="300px">
    <PanelBody>
      {#if associatedParentSurface && associatedSurfaceA && associatedSurfaceB}
        {LinearFold.computeAngleBetweenSurfaces(focusedFold, associatedParentSurface, associatedSurfaceA, associatedSurfaceB)}
      {/if}
      <button on:click={() => {
        SurfaceStore.createMutation({
          forwards: (value, [parentSurfaceId, foldId], context) => {
            const parentSurface = SurfaceStore.get(value, parentSurfaceId);
            if (!parentSurface) {
              throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
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
                id: context.surfaceAFoldIds[index] || fold.id,
              }));
            } else {
              context.surfaceAId = surfaceA.id;
              context.surfaceAFoldIds = surfaceA.folds.map(i => i.id);
            }
            if (context.surfaceBId && context.surfaceBFoldIds) {
              surfaceB.id = context.surfaceBId;
              surfaceB.folds = surfaceB.folds.map((fold, index) => ({
                ...fold,
                id: context.surfaceBFoldIds[index] || fold.id,
              }));
            } else {
              context.surfaceBId = surfaceB.id;
              context.surfaceBFoldIds = surfaceB.folds.map(i => i.id);
            }

            console.log('CONTEXT', context);

            value = SurfaceStore.updateItem(value, parentSurface.id, s => ({...s, visible: false}));
            value = SurfaceStore.addItem(value, surfaceA);
            value = SurfaceStore.addItem(value, surfaceB);
            value = SurfaceStore.updateFold(value, foldId, f => ({
              ...f,
              surfaceAId: surfaceA.id,
              surfaceBId: surfaceB.id,
            }));

            return value;
          },
          backwards: (value, [parentSurfaceId, foldId], context) => {
            if (!context.surfaceAId) {
              throw new Error(`context.surfaceAId is not set!`);
            }
            if (!context.surfaceBId) {
              throw new Error(`context.surfaceBId is not set!`);
            }

            const surfaceA = SurfaceStore.get($SurfaceStore, context.surfaceAId);
            if (!surfaceA) {
              throw new Error(`Cannot find surface with id ${context.surfaceAId}`);
            }
            const surfaceB = SurfaceStore.get($SurfaceStore, context.surfaceBId);
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

            return value;
          },
        })(associatedParentSurface.id, focusedFold.id);
      }}>
        Split Surface
      </button>

      <button on:click={() => {
        SurfaceStore.createMutation({
          forwards: (value, [parentSurfaceId, foldId, surfaceToRotateId, rotationInDegrees], context) => {
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

            return SurfaceStore.updateItem(value, surfaceToRotate.id, surfaceToRotate);
          },
          backwards: (value, [parentSurfaceId, foldId, surfaceToRotateId, rotationInDegrees], context) => {
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

            return SurfaceStore.updateItem(value, surfaceToRotate.id, surfaceToRotate);
          },
        })(associatedParentSurface.id, focusedFold.id, associatedSurfaceA.id, 45);
      }}>
        Fold
      </button>

      <br />
      <br />
      <br />
      {JSON.stringify(focusedFold)}
      <br />
      <br />
      <br />
      {JSON.stringify(associatedParentSurface)}
    </PanelBody>
  </Panel>
{/if}

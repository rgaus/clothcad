<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, FocusedSurfaceStore, HistoryStore, PickingItemStore, ActionStore } from '$lib/stores';
  import { Surface, LinearFold } from '$lib/core';
  import Panel from './ui/Panel.svelte';
  import FoldField from './ui/FoldField.svelte';
  import RotationField from './ui/RotationField.svelte';

  let focusedSurface: Surface | null;
  let focusedSurfaceParent: Surface | null;
  let unsubscribeFocusedSurface: (() => void) | null = null;
  let angle = 0;

  onMount(() => {
    ActionStore.registerComplete(async () => {
      if (!focusedSurface) {
        return;
      }

      HistoryStore.createMutation({
        name: `Fold ${focusedSurface.name} to ${angle}deg`,
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
        // This is an update to the parent surface which results in updates to the focused surface
        requires: (args) => [
          {operation: 'update', item: {itemType: 'surface', itemId: args[0]}},
        ],
        provides: (args) => [
          {operation: 'update', item: {itemType: 'surface', itemId: args[2]}},
        ],
      })(focusedSurface.parentId, focusedFoldId, focusedSurface.id, angle);
    });

    unsubscribeFocusedSurface = FocusedSurfaceStore.subscribe(surface => {
      focusedSurface = surface;
      focusedSurfaceParent = focusedSurface && focusedSurface.parentId ? (
        SurfaceStore.get($SurfaceStore, focusedSurface.parentId)
      ) : null;
    });
  });

  let focusedFoldId: LinearFold['id'] | null = null;
  $: {
    ActionStore.markCompletable(focusedFoldId !== null);
  }

  onDestroy(() => unsubscribeFocusedSurface && unsubscribeFocusedSurface());
</script>

<Panel width="300px" top="var(--space-10)" hidden={$PickingItemStore.enabled}>
  {#if focusedSurface && focusedSurfaceParent}
    Fold along: <FoldField bind:value={focusedFoldId} surface={focusedSurfaceParent} />
    Angle: <RotationField bind:value={angle} />
  {:else}
    No parent!
  {/if}
</Panel>

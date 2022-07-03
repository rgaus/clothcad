<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, FocusedItemStore, PickingItemStore, ActionStore } from '$lib/stores';
  import { Surface, LinearFold } from '$lib/core';
  import Panel from './Panel.svelte';
  import FoldField from './FoldField.svelte';
  import RotationField from './RotationField.svelte';

  let focusedSurface: Surface | null;
  let focusedSurfaceParent: Surface | null;
  let unsubscribeFocusedSurface: (() => void) | null = null;
  let angle = 0;

  onMount(() => {
    ActionStore.registerComplete(async () => {
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
        requireFreshlyCreated: (args, context) => [
          { itemType: 'surface', itemId: args[2] },
        ],
      })(focusedSurface.parentId, focusedFoldId, focusedSurface.id, angle);
    });

    unsubscribeFocusedSurface = SurfaceStore.subscribeToFocusedSurface($SurfaceStore, $FocusedItemStore, surface => {
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

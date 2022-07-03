<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, FocusedItemStore, PickingItemStore, ActionStore } from '$lib/stores';
  import { Surface, LinearFold } from '$lib/core';
  import Panel from './ui/Panel.svelte';
  import FoldField from './ui/FoldField.svelte';

  let focusedSurface: Surface | null;
  let unsubscribeFocusedSurface: (() => void) | null = null;

  onMount(() => {
    ActionStore.registerComplete(async () => {
      if (!focusedSurface) {
        return;
      }

      SurfaceStore.createMutation<
        [Surface['id'] | null, LinearFold['id'] | null],
        {
          surfaceAId?: Surface['id'],
          surfaceAFoldIds?: Array<LinearFold['id']>,
          surfaceBId?: Surface['id'],
          surfaceBFoldIds?: Array<LinearFold['id']>,
        }
      >({
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

          /* console.log('CONTEXT', context); */

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
      })(focusedSurface.id, focusedFoldId);
    });

    unsubscribeFocusedSurface = SurfaceStore.subscribeToFocusedSurface($SurfaceStore, $FocusedItemStore, surface => {
      focusedSurface = surface;
    });
  });

  let focusedFoldId: LinearFold['id'] | null = null;
  $: {
    ActionStore.markCompletable(focusedFoldId !== null);
  }

  onDestroy(() => {
    unsubscribeFocusedSurface && unsubscribeFocusedSurface();
  });
</script>

<Panel width="300px" top="var(--space-10)" hidden={$PickingItemStore.enabled}>
  {#if focusedSurface}
    <FoldField bind:value={focusedFoldId} surface={focusedSurface} />
  {/if}
</Panel>

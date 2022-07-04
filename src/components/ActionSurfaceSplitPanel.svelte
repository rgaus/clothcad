<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, FocusedSurfaceStore, HistoryStore, PickingItemStore, ActionStore } from '$lib/stores';
  import { Surface, LinearFold } from '$lib/core';
  import type { FixMe } from '$lib/types/fixme';
  import Panel from './ui/Panel.svelte';
  import FoldField from './ui/FoldField.svelte';

  let focusedSurface: Surface | null;
  let unsubscribeFocusedSurface: (() => void) | null = null;

  onMount(() => {
    ActionStore.registerComplete(async () => {
      if (!focusedSurface) {
        return;
      }

      HistoryStore.createMutation<
        [Surface['id'] | null, LinearFold['id'] | null],
        {
          surfaceAId?: Surface['id'],
          surfaceAFoldIds?: Array<LinearFold['id']>,
          surfaceBId?: Surface['id'],
          surfaceBFoldIds?: Array<LinearFold['id']>,
        }
      >({
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

          return { SurfaceStore: value };
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

          return { SurfaceStore: value };
        },
      })(focusedSurface.id, focusedFoldId);
    });

    unsubscribeFocusedSurface = FocusedSurfaceStore.subscribe(surface => {
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

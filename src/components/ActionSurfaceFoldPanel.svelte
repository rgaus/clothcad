<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, FocusedSurfaceStore, PickingItemStore, ActionStore } from '$lib/stores';
  import type { Surface, LinearFold } from '$lib/core';
  import { foldSurfaceMutation } from '$lib/mutations/surfaces';
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
      if (!focusedSurface.parentId) {
        return;
      }
      if (!focusedFoldId) {
        return;
      }

      foldSurfaceMutation([focusedSurface.parentId, focusedFoldId, focusedSurface.id, angle]);
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

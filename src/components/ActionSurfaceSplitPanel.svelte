<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { FocusedSurfaceStore, PickingItemStore, ActionStore } from '$lib/stores';
  import type { Surface, LinearFold } from '$lib/core';
  import { splitSurfaceMutation } from '$lib/mutations/surfaces';
  import Panel from './ui/Panel.svelte';
  import FoldField from './ui/FoldField.svelte';

  let focusedSurface: Surface | null;
  let unsubscribeFocusedSurface: (() => void) | null = null;

  onMount(() => {
    ActionStore.registerComplete(async () => {
      if (!focusedSurface) {
        return;
      }

      splitSurfaceMutation([focusedSurface.id, focusedFoldId]);
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

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { SurfaceStore, FocusedFoldStore, ActionStore, PickingItemStore } from '$lib/stores';
  import { Surface, LinearFold } from '$lib/core';

  import Panel from './ui/Panel.svelte';
  import PanelBody from './ui/PanelBody.svelte';

  let focusedFold: LinearFold | null;
  let associatedParentSurface: Surface | null;
  let associatedSurfaceA: Surface | null;
  let associatedSurfaceB: Surface | null;
  
  const unsubscribe = FocusedFoldStore.subscribe(fold => {
    focusedFold = fold;

    if (!focusedFold) {
      associatedParentSurface = null
      associatedSurfaceA = null;
      associatedSurfaceB = null;
      return;
    }

    const surfaces = SurfaceStore.getSurfacesContainingFold($SurfaceStore, focusedFold.id);
    if (surfaces.length > 0) {
      associatedParentSurface = surfaces[0];
    } else {
      associatedParentSurface = null
    }

    if (focusedFold.surfaceAId) {
      associatedSurfaceA = SurfaceStore.get($SurfaceStore, focusedFold.surfaceAId);
    } else {
      associatedSurfaceA = null;
    }
    if (focusedFold.surfaceBId) {
      associatedSurfaceB = SurfaceStore.get($SurfaceStore, focusedFold.surfaceBId);
    } else {
      associatedSurfaceB = null;
    }
  });

  onDestroy(() => unsubscribe());
</script>

{#if focusedFold}
  <Panel left="300px" height="300px" hidden={$PickingItemStore.enabled || $ActionStore.enabled}>
    <PanelBody>
      {#if associatedParentSurface && associatedSurfaceA && associatedSurfaceB}
        {LinearFold.computeAngleBetweenSurfaces(focusedFold, associatedParentSurface, associatedSurfaceA, associatedSurfaceB)}
      {/if}

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

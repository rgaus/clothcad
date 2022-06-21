<script lang="ts">
  import Panel from './Panel.svelte';
  import PanelBody from './PanelBody.svelte';
  import { SurfaceStore, FocusedItemStore } from '$lib/stores';

  let focusedSurface: Surface | null;

  FocusedItemStore.subscribe(focusedItem => {
    if (!focusedItem) {
      focusedSurface = null;
      return;
    }
    if (focusedItem.itemType !== "surface") {
      focusedSurface = null;
      return;
    }

    focusedSurface = SurfaceStore.get($SurfaceStore, focusedItem.itemId);
  });
</script>

{#if focusedSurface}
  <Panel left="300px" height="300px">
    <PanelBody>
      {JSON.stringify(focusedSurface)}
    </PanelBody>
  </Panel>
{/if}

<script lang="ts">
  import { SurfaceStore, FocusedItemStore } from '$lib/stores';
  import { PlanarFace } from '$lib/core';

  import Panel from './Panel.svelte';
  import PanelBody from './PanelBody.svelte';
  import RotationField from './RotationField.svelte';

  let focusedSurface: Surface | null;

  let pitch = 0;
  let yaw = 0;
  let roll = 0;
  
  function onFocusedSurfaceUpdated() {
    pitch = PlanarFace.calculatePitch(focusedSurface.face);
    yaw = PlanarFace.calculateYaw(focusedSurface.face);
    roll = PlanarFace.calculateRoll(focusedSurface.face);
  }

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
    onFocusedSurfaceUpdated();
  });
  SurfaceStore.subscribe(surface => {
    if (!focusedSurface) {
      return;
    }
    focusedSurface = SurfaceStore.get($SurfaceStore, focusedSurface.id);
    onFocusedSurfaceUpdated();
  });
</script>

{#if focusedSurface}
  <Panel left="300px" height="300px">
    <PanelBody>
      Name: {focusedSurface.name}<br/>
      {#if !focusedSurface.parentId}
        Pitch: <RotationField bind:value={pitch} />
        Yaw: <RotationField bind:value={yaw} />
        Roll: <RotationField bind:value={roll} />
      {/if}
      <h3>Points</h3>
      <ul>
        {#each focusedSurface.face.points as point}
          <li>({point.x}, {point.y})</li>
        {/each}
      </ul>
      <h3>Folds</h3>
      <ul>
        {#each focusedSurface.folds as fold (fold.id)}
          <li on:click={() => FocusedItemStore.focusItem('fold', fold.id)}>{fold.id}</li>
        {/each}
      </ul>
      <br />
      <br />
      <br />
      <br />
      {JSON.stringify(focusedSurface)}
    </PanelBody>
  </Panel>
{/if}

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, FocusedItemStore, PickingItemStore, ActionStore } from '$lib/stores';
  import { Surface, LinearFold, PlanarFace } from '$lib/core';

  import Panel from './Panel.svelte';
  import PanelBody from './PanelBody.svelte';
  import RotationField from './RotationField.svelte';
  import FoldField from './FoldField.svelte';
  import ColorFamilyField from './ColorFamilyField.svelte';

  let focusedSurface: Surface | null;

  let pitch = 0;
  let yaw = 0;
  let roll = 0;

  let unsubscribeFocusedSurface: (() => void) | null = null;
  onMount(() => {
    unsubscribeFocusedSurface = SurfaceStore.subscribeToFocusedSurface($SurfaceStore, $FocusedItemStore, surface => {
      focusedSurface = surface;
    });
  });

  onDestroy(() => unsubscribeFocusedSurface && unsubscribeFocusedSurface());
</script>

{#if focusedSurface}
  <Panel left="300px" height="300px" hidden={$PickingItemStore.enabled || $ActionStore.enabled}>
    <PanelBody>
      Name: {focusedSurface.name}<br/>
      Color: <ColorFamilyField
        value={focusedSurface.colorFamily}
        on:change={event => {
          const originalColorFamily = focusedSurface.colorFamily;
          const colorFamily = event.detail;
          if (originalColorFamily === colorFamily) {
            return;
          }

          SurfaceStore.createMutation({
            forwards: (value, [surfaceId]) => {
              return SurfaceStore.updateItem(value, surfaceId, surface => {
                return {
                  ...surface,
                  colorFamily,
                };
              });
            },
            backwards: (value, [surfaceId]) => {
              return SurfaceStore.updateItem(value, surfaceId, surface => {
                return {
                  ...surface,
                  colorFamily: originalColorFamily,
                };
              });
            },
          })(focusedSurface.id);
        }}
      />
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

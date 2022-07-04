<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SurfaceStore, HistoryStore, FocusedItemStore, PickingItemStore, ActionStore } from '$lib/stores';
  import type { Surface } from '$lib/core';

  import Panel from './ui/Panel.svelte';
  import PanelBody from './ui/PanelBody.svelte';
  import ColorFamilyField from './ui/ColorFamilyField.svelte';
  import TextField from './ui/TextField.svelte';
  import ButtonGroup from './ui/ButtonGroup.svelte';

  let focusedSurface: Surface | null;
  let focusedSurfaceName: Surface['name'] = '';
  let focusedSurfaceNameInvalid: boolean = true;

  function surfaceNameValid(surfaceName: string): boolean {
    return surfaceName.trim().length > 0;
  }

  let unsubscribeFocusedSurface: (() => void) | null = null;
  onMount(() => {
    unsubscribeFocusedSurface = SurfaceStore.subscribeToFocusedSurface($SurfaceStore, $FocusedItemStore, surface => {
      focusedSurface = surface;
      focusedSurfaceName = focusedSurface ? focusedSurface.name : '';
      focusedSurfaceNameInvalid = !surfaceNameValid(focusedSurfaceName);
    });
  });

  $: {
    focusedSurfaceNameInvalid = !surfaceNameValid(focusedSurfaceName);
  }

  onDestroy(() => unsubscribeFocusedSurface && unsubscribeFocusedSurface());
</script>

{#if focusedSurface}
  <Panel left="300px" height="300px" hidden={$PickingItemStore.enabled || $ActionStore.enabled}>
    <PanelBody>
      <ButtonGroup>
        <ColorFamilyField
          value={focusedSurface.colorFamily}
          on:change={event => {
            if (!focusedSurface) {
              return;
            }

            const originalColorFamily = focusedSurface.colorFamily;
            const colorFamily = event.detail;
            if (originalColorFamily === colorFamily) {
              return;
            }

            HistoryStore.createMutation({
              forwards: (value, [surfaceId]) => {
                const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
                  return {
                    ...surface,
                    colorFamily,
                  };
                });
                return { SurfaceStore: newValue };
              },
              backwards: (value, [surfaceId]) => {
                const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
                  return {
                    ...surface,
                    colorFamily: originalColorFamily,
                  };
                });
                return { SurfaceStore: newValue };
              },
            })(focusedSurface.id);
          }}
        />
        <TextField
          bind:value={focusedSurfaceName}
          invalid={focusedSurfaceNameInvalid}
          muted
          on:blur={() => {
            if (!focusedSurface) {
              return;
            }
            if (focusedSurfaceNameInvalid) {
              focusedSurfaceName = focusedSurface.name;
              return
            }

            const originalName = focusedSurface.name;
            const name = focusedSurfaceName;
            if (originalName === name) {
              return;
            }

            HistoryStore.createMutation({
              forwards: (value, [surfaceId]) => {
                const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
                  return {
                    ...surface,
                    name,
                  };
                });
                return { SurfaceStore: newValue };
              },
              backwards: (value, [surfaceId]) => {
                const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
                  return {
                    ...surface,
                    name: originalName,
                  };
                });
                return { SurfaceStore: newValue };
              },
            })(focusedSurface.id);
          }}
        />
      </ButtonGroup>
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

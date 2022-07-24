<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    FocusedSurfaceStore,
    FocusedItemStore,
    PickingItemStore,
    ActionStore,
    DrawingStore,
    FocusedDrawingSurfaceIdStore,
  } from '$lib/stores';
  import type { Surface } from '$lib/core';
  import { colorSurfaceMutation, renameSurfaceMutation } from '$lib/mutations/surfaces';

  import Panel from './ui/Panel.svelte';
  import PanelBody from './ui/PanelBody.svelte';
  import ColorFamilyField from './ui/ColorFamilyField.svelte';
  import TextField from './ui/TextField.svelte';
  import Button from './ui/Button.svelte';
  import ButtonGroup from './ui/ButtonGroup.svelte';

  let focusedSurface: Surface | null;
  let focusedSurfaceName: Surface['name'] = '';
  let focusedSurfaceNameInvalid: boolean = true;

  function surfaceNameValid(surfaceName: string): boolean {
    return surfaceName.trim().length > 0;
  }

  let unsubscribeFocusedSurface: (() => void) | null = null;
  onMount(() => {
    unsubscribeFocusedSurface = FocusedSurfaceStore.subscribe(surface => {
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

            colorSurfaceMutation([focusedSurface.id, colorFamily]);
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

            renameSurfaceMutation([focusedSurface.id, name]);
          }}
        />
      </ButtonGroup>
      <Button on:click={() => {
        if (!focusedSurface) {
          return;
        }
        const result = DrawingStore.getContainingSurface($DrawingStore, focusedSurface.id);
        if (result) {
          const [drawing, drawingSurface] = result;
          DrawingStore.set(
            DrawingStore.beginEditing($DrawingStore, drawing.id)
          );
          FocusedDrawingSurfaceIdStore.set(drawingSurface.id);
        }
      }}>Open Drawing</Button>
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

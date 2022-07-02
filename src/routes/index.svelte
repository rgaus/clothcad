<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  import {
    PlanarCoordinates,
    SpacialCoordinates,
    SVGCoordinates,
    LinearFold,
    PlanarFace,
    Surface,
    radiansToDegrees,
    degreesToRadians,
    intersection,
    POINT_IN_POLYGON,
    pointInPolygon,
    planarDistance,
    spacialDistance,
    round,
  } from '$lib/core'
  import Layout from '../components/Layout.svelte';
  import AppBar from '../components/AppBar.svelte';
  import Button from '../components/Button.svelte';
  import ButtonGroup from '../components/ButtonGroup.svelte';
  import Stack from '../components/Stack.svelte';
  import Treeview from '../components/Treeview.svelte';
  import Toolbar from '../components/Toolbar.svelte';
  import FocusedSurfacePanel from '../components/FocusedSurfacePanel.svelte';
  import FocusedFoldPanel from '../components/FocusedFoldPanel.svelte';
  import Viewport from '../components/Viewport.svelte';

  import { SurfaceStore, PickingItemStore, ActionStore, FocusedItemStore } from '$lib/stores';

  let surface: Surface, surfaceA: Surface, surfaceB: Surface;

  onMount(() => {
    surface = Surface.createFromSVG(
      `
        <svg width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <!-- Generator: Sketch 57.1 (83088) - https://sketch.com -->
            <title>Artboard</title>
            <desc>Created with Sketch.</desc>
            <g id="Artboard" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <rect fill="#FFFFFF" x="0" y="0" width="100" height="100"></rect>
                <rect id="Rectangle" stroke="#979797" fill="#D8D8D8" x="18.5" y="17.5" width="49" height="49"></rect>
                <path d="M12.5,42.5 L73.5,42.5" id="Path" stroke="#979797"></path>
                <path d="M14,37 L77,63" id="Path-Copy" stroke="#979797"></path>
            </g>
        </svg>
      `,
      (doc) => {
        const artboard = doc.getElementById('Artboard');
        if (!artboard) {
          throw new Error('Could not find element with id=Artboard');
        }
        const rect = artboard.children[1];
        if (!rect) {
          throw new Error('Could not find element with id=Rect');
        }
        return rect;
      },
    );
    /* surface.visible = false; */

    /* const primaryFold = surface.folds[0]; */
    /* [surfaceA, surfaceB] = Surface.bisect(surface, primaryFold); */
    /*  */
    /* surfaceA = Surface.rotate(surfaceA, LinearFold.toSpacial(primaryFold, surface), 45); */
    /*  */
    /* primaryFold.surfaceAId = surfaceA.id; */
    /* primaryFold.surfaceBId = surfaceB.id; */

    if ($SurfaceStore.items.length === 0) {
      SurfaceStore.createMutation({
        forwards: value => {
          value = SurfaceStore.addItem(value, surface);
          /* value = SurfaceStore.addItem(value, surfaceA); */
          /* value = SurfaceStore.addItem(value, surfaceB); */
          return value;
        },
        backwards: value => {
          if (surface) {
            value = SurfaceStore.removeItem(value, surface.id);
          }
          /* surfaceA && SurfaceStore.removeItem(surfaceA); */
          /* surfaceB && SurfaceStore.removeItem(surfaceB); */
          return value;
        },
      })();
    }
  });
  onDestroy(() => {
    /* SurfaceStore.historyTo(0); */
  });
</script>

<Layout>
  <svelte:fragment slot="main">
    {#if $PickingItemStore.enabled}
      <AppBar fixed>
        <span slot="title">Pick {$PickingItemStore.itemType}</span>
        <svelte:fragment slot="actions">
          <Button
            on:click={() => PickingItemStore.cancel($PickingItemStore)}
            text="Cancel"
          />
        </svelte:fragment>
      </AppBar>
    {/if}
    {#if $ActionStore.enabled}
      <AppBar fixed>
        <span slot="title">{$ActionStore.ActionType.getName()}</span>
        <svelte:fragment slot="actions">
          <Button
            on:click={() => ActionStore.cancel()}
            text="Cancel"
          />
          <Button
            on:click={() => ActionStore.complete()}
            variant="primary"
            text="Apply"
          />
        </svelte:fragment>
      </AppBar>
    {/if}

    <Viewport />

    <Toolbar />

    <Treeview />
    <FocusedSurfacePanel />
    <FocusedFoldPanel />
  </svelte:fragment>
</Layout>

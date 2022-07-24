<script lang="ts">
  import { EditingDrawingStore, FocusedDrawingSurfaceIdStore, FocusedDrawingSurfaceStore } from '$lib/stores';
  import { DrawingSurfaceFoldSet } from '$lib/core';
  import { Numeral } from '$lib/numeral';
  import { findInSVG, findInSVGAll } from '$lib/svg';
  import { removeLeadingWhitespace } from '$lib/text';
  import {
    changeDrawingScaleMutation,
    changeDrawingThicknessMutation,
    createDrawingSurfaceMutation,
    createFoldSetMutation,
    updateFoldSetGeometryMutation,
    setDrawingSurfaceGeometryMutation,
  } from '$lib/mutations/drawings';

  import AppBar from '../ui/AppBar.svelte';
  import Button from '../ui/Button.svelte';
  import TextField from '../ui/TextField.svelte';
  import NumberInputField from '../ui/NumberInputField.svelte';

  // When the edited drawing updates, update the scale
  let focusedDrawingScale: Numeral | null = null;
  let focusedDrawingThickness: Numeral | null = null;
  EditingDrawingStore.subscribe(editingDrawing => {
    focusedDrawingScale = editingDrawing?.media.scale || null;
    focusedDrawingThickness = editingDrawing?.media.thickness || null;
  });

  // When focused drawingsurface changes, update derived values
  let focusedDrawingSurfaceSelector = '';
  let foldSetSelectors: { [foldSetId: string]: string } = {};
  FocusedDrawingSurfaceStore.subscribe(focusedDrawingSurface => {
    if (focusedDrawingSurface) {
      focusedDrawingSurfaceSelector = focusedDrawingSurface.geometrySelector || '';
      foldSetSelectors = Object.fromEntries(focusedDrawingSurface.foldSets.map(i => [i.id, i.geometrySelector]));
    } else {
      focusedDrawingSurfaceSelector = '';
      foldSetSelectors = {};
    }
  });

  // When focusedDrawingSurfaceSelector changes, try to reresolve it in the svg document
  let focusedDrawingSurfaceSelectorResult = findInSVG(focusedDrawingSurfaceSelector, $EditingDrawingStore);
  $: focusedDrawingSurfaceSelectorResult = findInSVG(focusedDrawingSurfaceSelector, $EditingDrawingStore);

  let foldSetSelectorResults = Object.fromEntries(Object.entries(foldSetSelectors).map(([k, v]) => [k, findInSVGAll(v, $EditingDrawingStore)]))
  $: foldSetSelectorResults = Object.fromEntries(Object.entries(foldSetSelectors).map(([k, v]) => [k, findInSVGAll(v, $EditingDrawingStore)]))

  // ----------------------------------------------------------------------------
  // UPDATER FUNCTIONS
  // ------------------------------------------------------------------------------

  function addFoldSet() {
    if (!$EditingDrawingStore) {
      return;
    }

    if (!$FocusedDrawingSurfaceStore) {
      throw new Error(`Focused drawing surface cannot be found!`);
    }

    createFoldSetMutation([$EditingDrawingStore.id, $FocusedDrawingSurfaceStore.id]);
  }

  function newSubregion() {
    if (!$EditingDrawingStore) {
      return;
    }

    createDrawingSurfaceMutation([$EditingDrawingStore.id]);
  }

  function updateFoldSetGeometry(drawingSurfaceFoldSetId: DrawingSurfaceFoldSet['id']) {
    if (!$EditingDrawingStore) {
      return;
    }
    if (!$FocusedDrawingSurfaceStore) {
      return;
    }

    updateFoldSetGeometryMutation([
      $EditingDrawingStore.id,
      $FocusedDrawingSurfaceStore.id,
      drawingSurfaceFoldSetId,
      foldSetSelectors[drawingSurfaceFoldSetId],
    ]);
  }

  function updateFocusedDrawingSurfaceSelector() {
    if (!$EditingDrawingStore) {
      return;
    }

    if (!$FocusedDrawingSurfaceStore) {
      throw new Error('No drawing surface is currently focused!');
    }

    setDrawingSurfaceGeometryMutation([
      $EditingDrawingStore.id,
      $FocusedDrawingSurfaceStore.id,
      focusedDrawingSurfaceSelector,
    ]);
  }

  function updateScale(newScale: Numeral) {
    if (!$EditingDrawingStore) {
      return;
    }
    if (Numeral.equal(newScale, $EditingDrawingStore.media.scale)) {
      return;
    }

    changeDrawingScaleMutation([$EditingDrawingStore.id, newScale]);
  }

  function updateThickness(newThickness: Numeral) {
    if (!$EditingDrawingStore) {
      return;
    }
    if (Numeral.equal(newThickness, $EditingDrawingStore.media.thickness)) {
      return;
    }

    changeDrawingThicknessMutation([$EditingDrawingStore.id, newThickness]);
  }
</script>

<style>
  @import "../../styles/variables.css";

  .sidebar {
    position: absolute;
    top: var(--space-11);
    left: var(--space-1);
    bottom: var(--space-1);
    width: calc(300px - var(--space-2));
    background-color: var(--gray-5);

    display: flex;
    flex-direction: column;
  }
  .sidebarSurfaceList {
    height: 50%;
    flex-grow: 1;
    flex-shrink: 1;
    padding: var(--space-1);
    margin: 0px;

    display: flex;
    flex-direction: column;
    white-space: nowrap;
  }
  .sidebarSurfaceListItem {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding-left: var(--space-1);
    padding-right: var(--space-1);

    height: var(--space-8);
    cursor: pointer;
    user-select: none;
    border-radius: var(--border-radius-2);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--space-1);
  }
  .sidebarSurfaceListItem.muted {
    color: var(--gray-6);
  }
  .sidebarSurfaceListItem:hover, .sidebarSurfaceListItem:active {
    background-color: var(--gray-6);
    color: var(--gray-8);
  }
  .sidebarSurfaceListItem .label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebarField {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: var(--space-10);
    padding-left: var(--space-1);
    padding-right: var(--space-1);
  }



  .body {
    margin: var(--space-1);
  }

  .well {
    padding: var(--space-1);
    margin: 0px;
    margin-top: var(--space-1);
    margin-bottom: var(--space-1);
    border-radius: var(--border-radius-2);
    color: var(--gray-2);
    background-color: var(--cyan-8);
    overflow: auto;
    max-height: 100px;
    font-size: 8px;
  }
</style>

{#if $EditingDrawingStore}
  <div class="sidebar">
    {#if $FocusedDrawingSurfaceStore}
      <AppBar back on:back={() => FocusedDrawingSurfaceIdStore.set(null)}>
        <span slot="title">Edit Drawing Subregion</span>
      </AppBar>

      <div class="body">
        <br />
        Find surface main geometry:
        <TextField
          bind:value={focusedDrawingSurfaceSelector}
          on:blur={() => updateFocusedDrawingSurfaceSelector()}
          invalid={focusedDrawingSurfaceSelectorResult === null}
          placeholder="eg: #myid"
        />
        {#if focusedDrawingSurfaceSelectorResult}
          <pre class="well">{
            removeLeadingWhitespace(focusedDrawingSurfaceSelectorResult.outerHTML)
          }</pre>
        {:else}
          No result
        {/if}


        <br />
        <br />
        Display Surface Fold Sets:
        <Button text="Add fold set" on:click={() => addFoldSet()} />
        <ul>
          {#each $FocusedDrawingSurfaceStore.foldSets as drawingSurfaceFoldSet (drawingSurfaceFoldSet.id)}
            <li>
              {drawingSurfaceFoldSet.id}

              <TextField
                bind:value={foldSetSelectors[drawingSurfaceFoldSet.id]}
                on:blur={() => updateFoldSetGeometry(drawingSurfaceFoldSet.id)}
                invalid={focusedDrawingSurfaceSelectorResult === null}
                placeholder="eg: #myid"
              />
              {#if focusedDrawingSurfaceSelectorResult}
                {#each foldSetSelectorResults[drawingSurfaceFoldSet.id] as foldSetResult, index}
                  {@const foo = drawingSurfaceFoldSet.folds[index]}
                  {foo && foo.geometry && DrawingSurfaceFoldSet.getMoreSpecificSelectorForFold(
                    drawingSurfaceFoldSet,
                    $EditingDrawingStore.media,
                    foo.geometry,
                  )}

                  <pre class="well">{removeLeadingWhitespace(foldSetResult.outerHTML)}</pre>
                {/each}
              {:else}
                No result
              {/if}

              <!--
              <br />
              Folds Within Fold Set:
              {#each drawingSurfaceFoldSet.folds as fold}
                <pre class="well">{}</pre>
              {/each}
              -->
            </li>
          {/each}
        </ul>
      </div>
    {:else}
      <AppBar>
        <span slot="title">Drawing Subregions</span>
        <svelte:fragment slot="actions">
          <Button
            on:click={() => newSubregion()}
            text="New"
          />
        </svelte:fragment>
      </AppBar>
      <ul class="sidebarSurfaceList">
        {#each $EditingDrawingStore.surfaces as drawingSurface (drawingSurface.id)}
          <li
            class="sidebarSurfaceListItem"
            class:muted={!drawingSurface.geometrySelector}
            on:click={() => FocusedDrawingSurfaceIdStore.set(drawingSurface.id)}
          >
            <span class="label">
              {drawingSurface.geometrySelector || drawingSurface.id}
            </span>
            <span>
              {drawingSurface.foldSets.map(
                fs => findInSVGAll(fs.geometrySelector, $EditingDrawingStore).length
              ).reduce((a, b) => a + b, 0)} folds
            </span>
          </li>
        {/each}
      </ul>

      <div class="sidebarField">
        <span>Scale:</span>
        <NumberInputField
          value={focusedDrawingScale}
          placeholder="eg: 1"
          on:change={e => {
            const newScale = e.detail;
            if (!newScale) {
              return;
            }

            updateScale(newScale);
          }}
          unit="px / unit"
          width="150px"
        />
      </div>
      <div class="sidebarField">
        <span>Thickness:</span>
        <NumberInputField
          value={focusedDrawingThickness}
          placeholder="eg: 1"
          on:change={e => {
            const newThickness = e.detail;
            if (!newThickness) {
              return;
            }

            updateThickness(newThickness);
          }}
          unit={focusedDrawingThickness && Numeral.isSingular(focusedDrawingThickness) ? "unit" : "units"}
          width="150px"
        />
      </div>
    {/if}
  </div>
{/if}

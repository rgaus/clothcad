<script lang="ts">
  import { DrawingStore, EditingDrawingStore, HistoryStore } from '$lib/stores';
  import {
    Drawing,
    DrawingGeometry,
    DrawingSurface,
    DrawingSurfaceFoldSet,
  } from '$lib/core';
  import { Numeral } from '$lib/numeral';
  import { findInSVG, findInSVGAll } from '$lib/svg';
  import { removeLeadingWhitespace } from '$lib/text';

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

  let focusedDrawingSurfaceId: DrawingSurface['id'] | null = null;
  let focusedDrawingSurface: DrawingSurface | null = null;
  $: focusedDrawingSurface = $EditingDrawingStore?.surfaces.find(s => s.id === focusedDrawingSurfaceId) || null;

  // When focused drawingsurface changes, update derived values
  let oldFocusedDrawingSurface: DrawingSurface | null = null;
  let focusedDrawingSurfaceSelector = '';
  let foldSetSelectors: { [foldSetId: string]: string } = {};
  $: {
    if (oldFocusedDrawingSurface !== focusedDrawingSurface) {
      if (focusedDrawingSurface) {
        focusedDrawingSurfaceSelector = focusedDrawingSurface.geometrySelector || '';
        foldSetSelectors = Object.fromEntries(focusedDrawingSurface.foldSets.map(i => [i.id, i.geometrySelector]));
      } else {
        focusedDrawingSurfaceSelector = '';
        foldSetSelectors = {};
      }
      oldFocusedDrawingSurface = focusedDrawingSurface;
    }
  }

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

    if (!focusedDrawingSurface) {
      throw new Error(`Drawing surface ${focusedDrawingSurfaceId} cannot be found!`);
    }

    HistoryStore.createMutation<[Drawing['id'], DrawingSurface['id']], { foldSetId: DrawingSurfaceFoldSet['id'] }>({
      name: `Create fold set`,

      forwards: (storeValues, [drawingId, drawingSurfaceId], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
            const foldSet = DrawingSurfaceFoldSet.create({
              geometrySelector: '',
              folds: [],
            });

            // Cache fold id so that if this step is run again in the future, the foldset
            // will receive the same id
            if (context.foldSetId) {
              foldSet.id = context.foldSetId;
            } else {
              context.foldSetId = foldSet.id;
            }

            return {
              ...drawingSurface,
              foldSets: [ ...drawingSurface.foldSets, foldSet ],
            };
          })
        });
        return { ...storeValues, DrawingStore: value };
      },

      backwards: (storeValues, [drawingId, drawingSurfaceId], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
            if (!context.foldSetId) {
              throw new Error('context.foldSetId was not set, this should not be possible!');
            }

            return {
              ...drawingSurface,
              foldSets: drawingSurface.foldSets.filter(fs => fs.id !== context.foldSetId),
            };
          })
        });
        return { ...storeValues, DrawingStore: value };
      },
      provides: (_args, context) => context.foldSetId ? [
        {operation: 'create', item: {itemType: 'drawing-surface-fold-set', itemId: context.foldSetId}},
        {operation: 'update', item: {itemType: 'drawing-surface-fold-set', itemId: context.foldSetId}},
      ] : [],
    })($EditingDrawingStore.id, focusedDrawingSurface.id);
  }

  function newSubregion() {
    if (!$EditingDrawingStore) {
      return;
    }

    const mutation = HistoryStore.createMutation<[Drawing['id']], { drawingSurfaceId: DrawingSurface['id'] }>({
      name: `Create drawing surface`,
      forwards: (storeValues, [drawingId], context) => {
        const drawingSurface = DrawingSurface.create({
          surfaceId: null,
          geometrySelector: '',
          geometry: null,
          foldSets: [],
        });

        if (context.drawingSurfaceId) {
          drawingSurface.id = context.drawingSurfaceId;
        } else {
          context.drawingSurfaceId = drawingSurface.id;
        }

        console.log('UP', storeValues.DrawingStore, drawingId);
        const newValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawingValue => {
          const result = Drawing.addSurface(drawingValue, drawingSurface);
          console.log('CREATE', drawingSurface, result);
          return result;
        });

        focusedDrawingSurfaceId = drawingSurface.id;

        return { ...storeValues, DrawingStore: newValue };
      },
      backwards: (storeValues, [drawingId], context) => {
        const newValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawingValue => {
          if (!context.drawingSurfaceId) {
            throw new Error(`Drawing surface id was not set!`);
          }
          return Drawing.removeSurface(drawingValue, context.drawingSurfaceId);
        });

        focusedDrawingSurfaceId = null;

        return { ...storeValues, DrawingStore: newValue };
      },
      requires: (args) => [
        {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
      ],
      provides: (_args, context) => context.drawingSurfaceId ? [
        {operation: 'create', item: {itemType: 'drawing-surface', itemId: context.drawingSurfaceId}},
        {operation: 'update', item: {itemType: 'drawing-surface', itemId: context.drawingSurfaceId}},
      ] : [],
    });
    mutation($EditingDrawingStore.id);
  }

  function updateFoldSetGeometry(drawingSurfaceFoldSetId: DrawingSurfaceFoldSet['id']) {
    if (!$EditingDrawingStore) {
      return;
    }
    if (!focusedDrawingSurface) {
      return;
    }

    HistoryStore.createMutation<
      [Drawing['id'], DrawingSurface['id'], DrawingSurfaceFoldSet['id'], DrawingSurfaceFoldSet['geometrySelector']],
      { oldGeometrySelector: DrawingSurfaceFoldSet['geometrySelector'] }
    >({
      name: `Update fold set geometry`,
      forwards: (storeValues, [drawingId, drawingSurfaceId, drawingSurfaceFoldSetId, newSelector], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          return Drawing.updateFoldSet(
            drawing,
            drawingSurfaceId,
            drawingSurfaceFoldSetId,
            drawingSurfaceFoldSet => {
              context.oldGeometrySelector = drawingSurfaceFoldSet.geometrySelector;

              return {
                ...drawingSurfaceFoldSet,
                geometrySelector: newSelector,
                folds: findInSVGAll(newSelector, drawing).map(element => {
                  const geometry = DrawingGeometry.create(element);
                  if (!geometry) {
                    throw new Error(`Unable to parse this svg element into a fold: ${element.outerHTML}`);
                  }
                  if (geometry.type === 'rect') {
                    throw new Error('Unable to use a rect geometry as a fold!');
                  }
                  return { geometry, foldId: null };
                }),
              };
            },
          );
        });
        return { ...storeValues, DrawingStore: value };
      },
      backwards: (storeValues, [drawingId, drawingSurfaceId, drawingSurfaceFoldSetId, _newSelector], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          return Drawing.updateFoldSet(
            drawing,
            drawingSurfaceId,
            drawingSurfaceFoldSetId,
            drawingSurfaceFoldSet => {
              if (typeof context.oldGeometrySelector === 'undefined') {
                throw new Error(`context.oldGeometrySelector was not set!`);
              }

              return {
                ...drawingSurfaceFoldSet,
                geometrySelector: context.oldGeometrySelector,
                folds: findInSVGAll(context.oldGeometrySelector, drawing).map(element => {
                  const geometry = DrawingGeometry.create(element);
                  if (!geometry) {
                    throw new Error(`Unable to parse this svg element into a fold: ${element.outerHTML}`);
                  }
                  if (geometry.type === 'rect') {
                    throw new Error('Unable to use a rect geometry as a fold!');
                  }
                  return { geometry, foldId: null };
                }),
              };
            },
          );
        });
        return { ...storeValues, DrawingStore: value };
      },
      requires: (args) => [
        {operation: 'update', item: {itemType: 'drawing-surface-fold-set', itemId: args[2]}},
      ],
      provides: (args) => [
        {operation: 'update', item: {itemType: 'drawing-surface-fold-set', itemId: args[2]}},
      ],
    })($EditingDrawingStore.id, focusedDrawingSurface.id, drawingSurfaceFoldSetId, foldSetSelectors[drawingSurfaceFoldSetId]);
  }

  function updateFocusedDrawingSurfaceSelector() {
    if (!$EditingDrawingStore) {
      return;
    }

    if (!focusedDrawingSurface) {
      throw new Error(`Drawing surface ${focusedDrawingSurfaceId} cannot be found!`);
    }

    // Cache the old drawing surface value for if backwards needs to be run
    const existingDrawingSurface = focusedDrawingSurface;

    HistoryStore.createMutation<[Drawing['id'], DrawingSurface['id'], string]>({
      name: `Set drawing surface geometry to ${focusedDrawingSurfaceSelector}`,
      forwards: (storeValues, [drawingId, drawingSurfaceId, selector]) => {
        // Update drawing to use new main geometry selector
        const newDrawingStoreValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          let result: Element | null;
          try {
            result = drawing.media.document.querySelector(selector);
          } catch (err) {
            result = null;
          }

          const updatedSurface = Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
            if (!result) {
              // If the query didn't result in anything, reset
              return {
                ...drawingSurface,
                geometrySelector: selector,
                geometry: null,
              };
            }

            const geometry = DrawingGeometry.create(result);
            if (!geometry) {
              return {
                ...drawingSurface,
                geometrySelector: selector,
                geometry: null,
              };
            }

            // Only path / rect geometries can be used as outside surface perimeters
            if (geometry.type !== 'path' && geometry.type !== 'rect') {
              return {
                ...drawingSurface,
                geometrySelector: selector,
                geometry: null,
              };
            }

            return {
              ...drawingSurface,
              geometrySelector: selector,
              geometry,
            };
          });
          console.log('F UPDATED DRAWING SURFACE', updatedSurface);
          return updatedSurface;
        });
        return { ...storeValues, DrawingStore: newDrawingStoreValue };
      },
      backwards: (storeValues, [drawingId, drawingSurfaceId, _selector]) => {
        // Reset back to original values
        const newDrawingStoreValue = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          // console.log('B UPDATED DRAWING SURFACE', existingDrawingSurface.geometrySelector, existingDrawingSurface.geometry);
          return Drawing.updateSurface(drawing, drawingSurfaceId, drawingSurface => {
            return {
              ...drawingSurface,
              geometrySelector: existingDrawingSurface.geometrySelector,
              geometry: existingDrawingSurface.geometry,
            };
          })
        });
        return { ...storeValues, DrawingStore: newDrawingStoreValue };
      },
      requires: (args) => [
        {operation: 'update', item: {itemType: 'drawing-surface', itemId: args[1]}},
      ],
      provides: (args) => [
        {operation: 'update', item: {itemType: 'drawing-surface', itemId: args[1]}},
      ],
    })($EditingDrawingStore.id, focusedDrawingSurface.id, focusedDrawingSurfaceSelector);
  }

  function updateScale(newScale: Numeral) {
    if (!$EditingDrawingStore) {
      return;
    }
    if (Numeral.equal(newScale, $EditingDrawingStore.media.scale)) {
      return;
    }

    HistoryStore.createMutation<[Drawing['id'], Drawing['media']['scale']], { previousScale?: Drawing['media']['scale'] }>({
      name: `Change drawing scale to ${Numeral.serializeToString(newScale)}`,

      forwards: (storeValues, [drawingId, scale], context) => {
        console.log('FORWARDS', drawingId, scale);
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          context.previousScale = drawing.media.scale;

          const newDrawing = {
            ...drawing,
            media: { ...drawing.media, scale },
          };

          return newDrawing;
        });
        return { ...storeValues, DrawingStore: value };
      },

      backwards: (storeValues, [drawingId, _scale], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          if (!context.previousScale) {
            throw new Error('context.previousScale was not set, cannot run backwards function!');
          }

          const newDrawing = {
            ...drawing,
            media: { ...drawing.media, scale: context.previousScale },
          };
          return newDrawing;
        });
        return { ...storeValues, DrawingStore: value };
      },

      provides: (args) => [
        {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
      ],
      requires: (args) => [
        {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
      ],
    })($EditingDrawingStore.id, newScale);
  }

  function updateThickness(newThickness: Numeral) {
    if (!$EditingDrawingStore) {
      return;
    }
    if (Numeral.equal(newThickness, $EditingDrawingStore.media.thickness)) {
      return;
    }

    HistoryStore.createMutation<[Drawing['id'], Drawing['media']['thickness']], { previousThickness?: Drawing['media']['thickness'] }>({
      name: `Change drawing thickness to ${Numeral.serializeToString(newThickness)}`,

      forwards: (storeValues, [drawingId, thickness], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          context.previousThickness = drawing.media.thickness;

          const newDrawing = {
            ...drawing,
            media: { ...drawing.media, thickness },
          };

          return newDrawing;
        });
        return { ...storeValues, DrawingStore: value };
      },

      backwards: (storeValues, [drawingId, _thickness], context) => {
        const value = DrawingStore.updateItem(storeValues.DrawingStore, drawingId, drawing => {
          if (!context.previousThickness) {
            throw new Error('context.previousThickness was not set, cannot run backwards function!');
          }

          const newDrawing = {
            ...drawing,
            media: { ...drawing.media, thickness: context.previousThickness },
          };
          return newDrawing;
        });
        return { ...storeValues, DrawingStore: value };
      },

      provides: (args) => [
        {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
      ],
      requires: (args) => [
        {operation: 'update', item: {itemType: 'drawing', itemId: args[0]}},
      ],
    })($EditingDrawingStore.id, newThickness);
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
    {#if focusedDrawingSurface}
      <AppBar back on:back={() => { focusedDrawingSurfaceId = null; }}>
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
          {#each focusedDrawingSurface.foldSets as drawingSurfaceFoldSet (drawingSurfaceFoldSet.id)}
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
            on:click={() => { focusedDrawingSurfaceId = drawingSurface.id }}
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

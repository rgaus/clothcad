<script lang="ts">
  import { DrawingStore, EditingDrawingStore, HistoryStore } from '$lib/stores';
  import {
    Drawing,
    DrawingGeometry,
    DrawingSurface,
    DrawingSurfaceFoldSet,
  } from '$lib/core';
  import type { Numeral } from '$lib/numeral';

  import AppBar from './ui/AppBar.svelte';
  import Button from './ui/Button.svelte';
  import TextField from './ui/TextField.svelte';
  import NumberInputField from './ui/NumberInputField.svelte';

  // When the edited drawing updates, update the scale
  let focusedDrawingScale: Numeral | null = null;
  EditingDrawingStore.subscribe(editingDrawing => {
    focusedDrawingScale = editingDrawing?.media.scale || null;
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

  function findInSVG(selector: string): Element | null {
    if (!$EditingDrawingStore) {
      return null;
    }
    if (selector.length === 0) {
      return null;
    }

    try {
      const result = $EditingDrawingStore.media.document.querySelector(selector);
      return result || null;
    } catch (err) {
      return null;
    }
  }

  function findInSVGAll(selector: string): Array<Element> {
    if (!$EditingDrawingStore) {
      return [];
    }
    if (selector.length === 0) {
      return [];
    }

    try {
      const result = $EditingDrawingStore.media.document.querySelectorAll(selector);
      return Array.from(result);
    } catch (err) {
      return [];
    }
  }

  // When focusedDrawingSurfaceSelector changes, try to reresolve it in the svg document
  let focusedDrawingSurfaceSelectorResult = findInSVG(focusedDrawingSurfaceSelector);
  $: focusedDrawingSurfaceSelectorResult = findInSVG(focusedDrawingSurfaceSelector);

  let foldSetSelectorResults = Object.fromEntries(Object.entries(foldSetSelectors).map(([k, v]) => [k, findInSVGAll(v)]))
  $: foldSetSelectorResults = Object.fromEntries(Object.entries(foldSetSelectors).map(([k, v]) => [k, findInSVGAll(v)]))

  function removeLeadingWhitespace(input: string): string {
    const lines = input.split(/\n/);
    const whitespaceCount = lines[lines.length-1].length - lines[lines.length-1].trimStart().length;
    return lines.map(l => l.startsWith(' ') ? l.slice(whitespaceCount) : l).join('\n');
  }

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

    const newSelector = foldSetSelectors[drawingSurfaceFoldSetId];

    HistoryStore.createMutation<
      [Drawing['id'], DrawingSurface['id'], DrawingSurfaceFoldSet['id']],
      { oldGeometrySelector: DrawingSurfaceFoldSet['geometrySelector'] }
    >({
      name: `Update fold set geometry`,
      forwards: (storeValues, [drawingId, drawingSurfaceId, drawingSurfaceFoldSetId], context) => {
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
                folds: findInSVGAll(newSelector).map(element => {
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
      backwards: (storeValues, [drawingId, drawingSurfaceId, drawingSurfaceFoldSetId], context) => {
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
                folds: findInSVGAll(context.oldGeometrySelector).map(element => {
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
    })($EditingDrawingStore.id, focusedDrawingSurface.id, drawingSurfaceFoldSetId);
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
          console.log('B UPDATED DRAWING SURFACE', existingDrawingSurface.geometrySelector, existingDrawingSurface.geometry);
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
    })($EditingDrawingStore.id, focusedDrawingSurface.id, focusedDrawingSurfaceSelector);
  }
</script>

<style>
  @import "../styles/variables.css";

  .drawingEditViewport {
    position: absolute;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    background-color: var(--gray-4);
  }

  .drawingEditViewport svg {
    margin-top: var(--space-10);
  }

  .sidebar {
    position: absolute;
    top: var(--space-11);
    left: var(--space-1);
    bottom: var(--space-1);
    width: 300px;
    background-color: var(--gray-5);

    display: flex;
    flex-direction: column;
  }
  .sidebarSurfaceList {
    height: 50%;
    flex-grow: 0;
    flex-shrink: 0;
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
  <div class="drawingEditViewport">
    <svg width="500" height="500" viewBox="0 0 500 500">
      <text transform="translate(20, 20)">{$EditingDrawingStore.id}</text>

      <!-- FIXME: this doesn't work. -->
      {@html $EditingDrawingStore.media.contents}
    </svg>
  </div>

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
                fs => findInSVGAll(fs.geometrySelector).length
              ).reduce((a, b) => a + b, 0)} folds
            </span>
          </li>
        {/each}
      </ul>

      Scale: <NumberInputField
        value={focusedDrawingScale}
        placeholder="eg: 1"
        on:change={e => {
          if (!$EditingDrawingStore) {
            return;
          }

          const drawingId = $EditingDrawingStore.id;
          DrawingStore.update(value => {
            return DrawingStore.updateItem(value, drawingId, drawing => {
              if (!e.detail) {
                return drawing;
              }
              const newDrawing = {
                ...drawing,
                media: {
                  ...drawing.media,
                  scale: e.detail,
                },
              };
              return newDrawing;
            });
          });
        }}
      />
    {/if}
  </div>
{/if}

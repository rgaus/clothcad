<script lang="ts">
  import { DrawingStore, EditingDrawingStore } from '$lib/stores';
  import { Drawing, DrawingGeometry, DrawingSurface, DrawingSurfaceFoldSet } from '$lib/core';
  import type { Numeral } from '$lib/numeral';

  import AppBar from './ui/AppBar.svelte';
  import Button from './ui/Button.svelte';
  import TextField from './ui/TextField.svelte';
  import NumberInputField from './ui/NumberInputField.svelte';

  // When the edited drawing updates, update the scale
  let focusedDrawingScale: Numeral | null = null;
  EditingDrawingStore.subscribe(editingDrawing => {
    console.log('HERE');
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
          on:blur={() => {
            if (!$EditingDrawingStore) {
              return;
            }

            DrawingStore.updateItem($EditingDrawingStore.id, drawing => {
              if (!focusedDrawingSurface) {
                return drawing;
              }
              return Drawing.updateSurface(drawing, focusedDrawingSurface.id, drawingSurface => {
                if (!focusedDrawingSurfaceSelectorResult) {
                  // If the query didn' result in anything, reset
                  return {
                    ...drawingSurface,
                    geometrySelector: focusedDrawingSurfaceSelector,
                    geometry: null,
                  };
                }

                const geometry = DrawingGeometry.create(focusedDrawingSurfaceSelectorResult);
                if (!geometry) {
                  return drawingSurface;
                }
                // Only path / rect geometries can be used as outside surface perimeters
                if (geometry.type !== 'path' && geometry.type !== 'rect') {
                  return drawingSurface;
                }

                return {
                  ...drawingSurface,
                  geometrySelector: focusedDrawingSurfaceSelector,
                  geometry,
                };
              })
            });
          }}
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
        <Button
          text="Add fold set"
          on:click={() => {
            if (!$EditingDrawingStore) {
              return;
            }

            DrawingStore.updateItem($EditingDrawingStore.id, drawing => {
              if (!focusedDrawingSurface) {
                return drawing;
              }
              return Drawing.updateSurface(drawing, focusedDrawingSurface.id, drawingSurface => ({
                ...drawingSurface,
                foldSets: [
                  ...drawingSurface.foldSets,
                  DrawingSurfaceFoldSet.create({
                    geometrySelector: '',
                    folds: [],
                  }),
                ],
              }))
            });
          }}
        />
        <ul>
          {#each focusedDrawingSurface.foldSets as drawingSurfaceFoldSet (drawingSurfaceFoldSet.id)}
            <li>
              {drawingSurfaceFoldSet.id}

              <TextField
                bind:value={foldSetSelectors[drawingSurfaceFoldSet.id]}
                on:blur={() => {
                  if (!$EditingDrawingStore) {
                    return;
                  }

                  DrawingStore.updateItem($EditingDrawingStore.id, drawing => {
                    if (!focusedDrawingSurface) {
                      return drawing;
                    }
                    return Drawing.updateFoldSet(
                      drawing,
                      focusedDrawingSurface.id,
                      drawingSurfaceFoldSet.id,
                      drawingSurfaceFoldSet => ({
                        ...drawingSurfaceFoldSet,
                        geometrySelector: foldSetSelectors[drawingSurfaceFoldSet.id],
                        folds: findInSVGAll(foldSetSelectors[drawingSurfaceFoldSet.id]).map(element => {
                          const geometry = DrawingGeometry.create(element);
                          if (!geometry) {
                            throw new Error(`Unable to parse this svg element into a fold: ${element.outerHTML}`);
                          }
                          if (geometry.type === 'rect') {
                            throw new Error('Unable to use a rect geometry as a fold!');
                          }
                          return { geometry, foldId: null };
                        }),
                      }),
                    );
                  });
                }}
                invalid={focusedDrawingSurfaceSelectorResult === null}
                placeholder="eg: #myid"
              />
              {#if focusedDrawingSurfaceSelectorResult}
                {#each foldSetSelectorResults[drawingSurfaceFoldSet.id] as foldSetResult}
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
            on:click={() => {
              if (!$EditingDrawingStore) {
                return;
              }

              DrawingStore.updateItem($EditingDrawingStore.id, drawingValue => {
                const drawingSurface = DrawingSurface.create({
                  surfaceId: null,
                  geometrySelector: '',
                  geometry: null,
                  foldSets: [],
                });

                drawingValue = Drawing.addSurface(drawingValue, drawingSurface);

                focusedDrawingSurfaceId = drawingSurface.id;
                return drawingValue;
              });
            }}
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

          DrawingStore.updateItem($EditingDrawingStore.id, drawing => {
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
        }}
      />
    {/if}
  </div>
{/if}

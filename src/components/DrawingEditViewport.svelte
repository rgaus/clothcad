<script lang="ts">
  import { onMount } from 'svelte';
  import { Matrix3 } from 'three';
  import { DrawingStore, EditingDrawingStore, HistoryStore } from '$lib/stores';
  import {
    Drawing,
    DrawingGeometry,
    DrawingSurface,
    DrawingSurfaceFoldSet,
    radiansToDegrees,
    DEFAULT_DRAWING_GEOMETRY_TRANSFORM,
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

  function findInSVGAll(selector: string, drawing?: Drawing): Array<Element> {
    if (!drawing) {
      if (!$EditingDrawingStore) {
        return [];
      }
      drawing = $EditingDrawingStore;
    }

    if (selector.length === 0) {
      return [];
    }

    try {
      const result = drawing.media.document.querySelectorAll(selector);
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

  // Given a svg transform string, extract a matrix from it for positioning drawing geometries
  function parseSvgTransform(transformString: string): Matrix3 {
    const functionRegex = /^([a-zA-Z]+)\((.*?)\)/;

    let transformation = new Matrix3().identity();

    while (true) {
      const match = functionRegex.exec(transformString);
      if (!match) {
        break;
      }
      
      transformString = transformString.slice(match[0].length).trim();

      const functionName = match[1].toLowerCase(), functionArgs = match[2].split(/,\s/);

      const stringToNumber = (s: string | undefined, defaultNumber: number): number => {
        if (!s) {
          return defaultNumber;
        }
        const result = parseFloat(s);
        if (isNaN(result)) {
          return defaultNumber;
        }
        return result;
      };

      switch (functionName) {
        case 'transform':
          // translate(x)
          // translate(x, y)
          transformation.multiply(
            new Matrix3().translate(
              stringToNumber(functionArgs[0], 0),
              stringToNumber(functionArgs[1], 0),
            )
          );
          break;

        case 'scale':
          // scale(x)
          // scale(x, y)
          const scaleX = stringToNumber(functionArgs[0], 0);
          transformation.multiply(
            new Matrix3().scale(
              scaleX,
              stringToNumber(functionArgs[1], scaleX),
            )
          );
          break;

        case 'rotate':
          if (functionArgs.length === 1) {
            // rotate(a)
            transformation.multiply(
              new Matrix3().rotate(
                radiansToDegrees(stringToNumber(functionArgs[0], 0))
              )
            );
          } else {
            // rotate(a, cx, cy)
            // TODO: implement
          }
          break;

        case 'skewX':
        case 'skewY':
          // skewX(a)
          // skewY(a)
          // TODO: implement
          break;

        case 'matrix':
          // matrix(a, b, c, d, e, f)
          const a = stringToNumber(functionArgs[0], 1);
          const b = stringToNumber(functionArgs[1], 0);
          const c = stringToNumber(functionArgs[2], 0);
          const d = stringToNumber(functionArgs[3], 0);
          const e = stringToNumber(functionArgs[4], 1);
          const f = stringToNumber(functionArgs[5], 0);
          transformation.multiply(
            new Matrix3().fromArray([a, d, 0, b, e, 0, c, f, 1])
          );
          break;
      }
    }
    return transformation;
  }

  // Get a flad list of all geometries within a svg
  function getDrawingGeometries(
    rootElem: Element | Document,
    transformation: Matrix3 = DEFAULT_DRAWING_GEOMETRY_TRANSFORM,
  ): Array<DrawingGeometry> {
    return Array.from(rootElem.children).flatMap(child => {
      // Apply svg transforms to this element and all children of this element.
      const transformAttribute = child.getAttribute('transform');
      if (transformAttribute) {
        transformation = transformation.clone().multiply(parseSvgTransform(transformAttribute));
      }

      if (child.children.length === 0) {
        const geometry = DrawingGeometry.create(child, transformation);
        if (geometry) {
          return [geometry];
        } else {
          return [];
        }
      } else {
        return getDrawingGeometries(child, transformation);
      }
    });
  }

  // When the page resizes, adjust the svg bounds
  let container: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let svgWidth = 0;
  let svgHeight = 0;
  onMount(() => {
    if (!container) {
      return;
    }

    const bbox = container.getBoundingClientRect();
    svgWidth = bbox.width;
    svgHeight = bbox.height;

    resizeObserver = new ResizeObserver(entries => {
      const bbox = entries[0].contentRect;
      svgWidth = bbox.width;
      svgHeight = bbox.height;
    });
    resizeObserver.observe(container);
  });

  let viewport = {
    top: -4,
    left: -400,
    zoom: 1,
  };
  // function fitToBounds() {
  //   if (!$EditingDrawingStore) {
  //     return;
  //   }
  //   const drawingWidth = parseInt($EditingDrawingStore.media.element.getAttribute('width'), 10);
  //   const drawingHeight = parseInt($EditingDrawingStore.media.element.getAttribute('height'), 10);
  //
  //   const scale = drawingWidth / svgWidth;
  //
  //   viewportScale = scale;
  // }

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

              console.log('SVG', drawing.media.document, newSelector, findInSVGAll(newSelector, drawing));
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
    overflow: hidden;
  }

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
  <div class="drawingEditViewport" bind:this={container}>
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      on:wheel={event => {
        event.preventDefault();
        const dx = event.deltaX;
        const dy = event.deltaY;

        if (event.ctrlKey || event.metaKey) {
          // limit scroll wheel sensitivity for mouse users
          const limit = 8;
          const scrollDelta = Math.max(-limit, Math.min(limit, dy));

          const nextZoomFactor =
            viewport.zoom + viewport.zoom * scrollDelta * -0.01;

          const targetX = viewport.left + event.clientX / viewport.zoom;
          const targetY = viewport.top + event.clientY / viewport.zoom;

          const top = targetY - event.clientY / nextZoomFactor;
          const left = targetX - event.clientX / nextZoomFactor;

          viewport = {
            zoom: nextZoomFactor,
            top,
            left,
          };
        }

        // otherwise pan
        viewport = {
          ...viewport,
          top: viewport.top + dy / viewport.zoom,
          left: viewport.left + dx / viewport.zoom,
        };
      }}
    >
      <g transform={`scale(${viewport.zoom}) translate(${-1 * viewport.left}, ${-1 * viewport.top})`}>
        <!--
        <rect
          x={0}
          y={0}
          width={$EditingDrawingStore.media.document && $EditingDrawingStore.media.document.getAttribute('width')} 
          height={$EditingDrawingStore.media.document && $EditingDrawingStore.media.document.getAttribute('height')} 
          fill="silver"
        />
        -->
        {#each getDrawingGeometries($EditingDrawingStore.media.document) as drawingGeometry}
          {#if drawingGeometry.type == "rect"}
            <rect
              x={drawingGeometry.origin.x}
              y={drawingGeometry.origin.y}
              width={drawingGeometry.width}
              height={drawingGeometry.height}
              stroke="red"
              fill="transparent"
            />
          {:else if drawingGeometry.type === "path"}
            <path
              d={`
                M${drawingGeometry.segments[0][0].x},${drawingGeometry.segments[0][0].y}
                ${drawingGeometry.segments.map(segment => `L${segment[1].x},${segment[1].y}`).join(' ')}
              `}
              stroke="blue"
            />
          {:else if drawingGeometry.type === "line"}
            <line
              x1={drawingGeometry.a.x}
              y1={drawingGeometry.a.y}
              x2={drawingGeometry.b.x}
              y2={drawingGeometry.b.y}
              stroke="green"
            />
          {/if}
        {/each}
      </g>
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

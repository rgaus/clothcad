<script lang="ts">
  import { Red4, Green4, Cyan4, COLORS } from '$lib/color';

  import { SurfaceStore, DrawingStore, HistoryStore, HighlightedItemStore, PickingItemStore, FocusedItemStore, ActionStore } from '$lib/stores';
  import type { HistoryListItem } from '$lib/stores/HistoryStore';

  import { Drawing, DEFAULT_DRAWING_SCALE, DEFAULT_DRAWING_THICKNESS } from '$lib/core';

  import Panel from './ui/Panel.svelte';
  import TextField from './ui/TextField.svelte';
  import Button from './ui/Button.svelte';

  import type { FixMe } from '$lib/types/fixme';
  import { LiteralNumeral } from '$lib/numeral';

  type TabItem = 'drawing' | 'surface' | 'fold' | 'history';

  let activeTab: TabItem = 'drawing';

  let focusedHistoryItemId: HistoryListItem['id'] | null = null;
  let highlightedHistoryItemId: HistoryListItem['id'] | null = null;
  let focusedHistoryItemName = '';

  FocusedItemStore.subscribe(focusedItem => {
    if (focusedItem && focusedItem.itemType !== activeTab && ["drawing", "surface", "fold"].includes(focusedItem.itemType)) {
      activeTab = focusedItem.itemType as FixMe;
    }
  });

  function createSample() {
    const mutation = HistoryStore.createMutation<[], {drawingId: Drawing['id']}>({
      name: "Create drawing",
      forwards: (storeValues, _args, context) => {
        let drawingStoreValue = storeValues.DrawingStore;
        const drawing = Drawing.createSample();
        if (context.drawingId) {
          drawing.id = context.drawingId;
        } else {
          context.drawingId = drawing.id;
        }
        drawingStoreValue = DrawingStore.addItem(drawingStoreValue, drawing);
        return { ...storeValues, DrawingStore: drawingStoreValue };
      },
      backwards: (storeValues, _args, context) => {
        let drawingStoreValue = storeValues.DrawingStore;
        if (!context.drawingId) {
          throw new Error(`Error creating drawing: context.drawingId was not set, this should not happen!`);
        }
        drawingStoreValue = DrawingStore.removeItem(drawingStoreValue, context.drawingId);
        return { ...storeValues, DrawingStore: drawingStoreValue };
      },
      provides: (_args, context) => context.drawingId ? [
        {operation: 'create', item: {itemType: 'drawing', itemId: context.drawingId}},
        {operation: 'update', item: {itemType: 'drawing', itemId: context.drawingId}},
      ] : [],
    });
    mutation();
  }
  function uploadSVG() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    document.body.appendChild(input);

    input.addEventListener('change', (event) => {
      const fileList = (event.target as FixMe).files;
      if (fileList.length === 0) {
        return;
      }

      // Read file from file handle
      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        HistoryStore.createMutation<[string, string], {drawingId: Drawing['id']}>({
          name: `Create drawing from ${fileList[0].name}`,
          forwards: (storeValues, [name, contents], context) => {
            let drawingStoreValue = storeValues.DrawingStore;

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(contents, "image/svg+xml");

            const drawing = Drawing.create({
              name,

              media: {
                type: 'svg/literal',
                scale: DEFAULT_DRAWING_SCALE,
                thickness: DEFAULT_DRAWING_THICKNESS,
                contents,
                document: svgDoc,
              },
              surfaces: [],
            });

            if (context.drawingId) {
              drawing.id = context.drawingId;
            } else {
              context.drawingId = drawing.id;
            }
            drawingStoreValue = DrawingStore.addItem(drawingStoreValue, drawing);
            return { ...storeValues, DrawingStore: drawingStoreValue };
          },
          backwards: (storeValues, _args, context) => {
            let drawingStoreValue = storeValues.DrawingStore;
            if (!context.drawingId) {
              throw new Error(`Error creating drawing: context.drawingId was not set, this should not happen!`);
            }
            drawingStoreValue = DrawingStore.removeItem(drawingStoreValue, context.drawingId);
            return { ...storeValues, DrawingStore: drawingStoreValue };
          },
          provides: (_args, context) => context.drawingId ? [
            {operation: 'create', item: {itemType: 'drawing', itemId: context.drawingId}},
            {operation: 'update', item: {itemType: 'drawing', itemId: context.drawingId}},
          ] : [],
        })(fileList[0].name, (event.target as FixMe).result);
      });
      reader.readAsText(fileList[0]);
    });
    input.click();

    document.body.removeChild(input);
  }
</script>

<style>
  @import "../styles/variables.css";

  :root {
    --treeview-default-width: 300px;
  }

  .wrapper {
    position: relative;
    padding: var(--space-2);
    color: var(--gray-4);
    background-color: var(--gray-9);
    height: 100%;
    overflow-y: auto;
  }

  .tabrow {
    display: flex;

    background-color: var(--gray-8);
    border-radius: var(--border-radius-2);
    margin-bottom: var(--space-2);
    overflow: hidden;
    height: var(--space-8);
    width: calc(var(--treeview-default-width) - var(--space-6));
    user-select: none;
  }

  .tab {
    flex-grow: 1;
    flex-shrink: 1;
    background-color: var(--gray-7);
    color: var(--gray-5);
    font-weight: var(--font-weight-bold);
    border: 0px;
    font-family: var(--font-family);
    cursor: pointer;
  }
  .tab:hover {
    background-color: var(--gray-6);
  }
  .tab:focus {
    background-color: var(--gray-5);
  }
  .tab:active {
    background-color: var(--gray-8);
  }
  .tab.active {
    background-color: var(--gray-5);
    color: var(--gray-9);
  }

  .activeline {
    --activeline-width: var(--space-1);
    position: absolute;
    margin-left: calc(-1 * (var(--activeline-width) / 2));
    margin-top: calc(-1 * var(--border-radius-2));
    width: var(--activeline-width);
    background-color: var(--cyan-4);
    z-index: 999;
    border-top-left-radius: var(--border-radius-2);
    border-top-right-radius: var(--border-radius-2);
  }

  .list {
    list-style-type: none;
    padding: 0px;
    margin: 0px;
  }
  .item {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);

    height: var(--space-8);
    cursor: pointer;
    user-select: none;
    border-radius: var(--border-radius-2);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--space-1);
  }
  .item.highlighted, .item:hover, .item:active {
    background-color: var(--gray-8);
  }
  .item.focused {
    background-color: var(--cyan-8);
  }
  .item.fold {
    padding-left: var(--space-1);
  }

  .icon {
    width: var(--space-6);
    height: var(--space-6);
    flex-grow: 0;
    flex-shrink: 0;
  }
  .icon.fold {
    color: var(--red-4);
  }

  .colorswatch {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--gray-5);
    border-top-left-radius: var(--border-radius-2);
    border-bottom-left-radius: var(--border-radius-2);
    width: var(--space-8);
    height: var(--space-8);
    flex-grow: 0;
    flex-shrink: 0;
  }
  .colorswatch.dark {
    color: var(--gray-8);
  }

  .currentItemMarker {
    position: absolute;
    bottom: calc(-1 * var(--space-1));
    left: calc(-1 * var(--space-1));
    width: var(--space-2);
    height: var(--space-2);
    border-radius: 99999999px;
    background-color: var(--cyan-4);
    border: 1px solid var(--cyan-1);
    z-index: 9999;
  }

  .providesRequiresBox {
    background-color: var(--gray-7);
    width: var(--space-8);
    height: var(--space-8);
    border-radius: var(--border-radius-2);
    overflow: hidden;

    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 0;
    flex-shrink: 0;
  }

  .label {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    padding-right: var(--space-1);
    flex-grow: 1;
    flex-shrink: 1;
  }
  .label:first-child { padding-left: var(--space-3); }
  .label:last-child { padding-right: var(--space-1); }
</style>

<Panel
  width={activeTab === 'history' ? "600px" : "var(--treeview-default-width)"}
  height="100%"
  hidden={$PickingItemStore.enabled || $ActionStore.enabled || $DrawingStore?.editing?.enabled}
>
  <div class="wrapper">
    <div class="tabrow">
      <button
        class="tab"
        class:active={activeTab === "drawing"}
        on:click={() => { activeTab = "drawing"; }}
      >Drawings</button>
      <button
        class="tab"
        class:active={activeTab === "surface"}
        on:click={() => { activeTab = "surface"; }}
      >Surfaces</button>
      <button
        class="tab"
        class:active={activeTab === "fold"}
        on:click={() => { activeTab = "fold"; }}
      >Folds</button>
      <button
        class="tab"
        class:active={activeTab === "history"}
        on:click={() => {
          FocusedItemStore.blurItem();
          activeTab = "history";
        }}
      >History</button>
    </div>
    {#if activeTab === "drawing"}
      <Button
        on:click={() => createSample()}
        text="Create Sample"
      />
      <Button
        on:click={() => uploadSVG()}
        text="Upload"
      />
      <ul class="list">
        {#each $DrawingStore.items as drawing (drawing.id)}
          <li
            class="item"
            class:highlighted={HighlightedItemStore.isHighlighted(
              $HighlightedItemStore,
              "drawing",
              drawing.id,
            )}
            class:focused={FocusedItemStore.isFocused(
              $FocusedItemStore,
              "drawing",
              drawing.id,
            )}
            on:mouseenter={() => HighlightedItemStore.enterItem("drawing", drawing.id)}
            on:mouseleave={() => HighlightedItemStore.leaveItem()}
            on:click={() => FocusedItemStore.focusItem("drawing", drawing.id)}
          >
            <div class="label">
              {drawing.name}
            </div>
            <Button
              text="Edit"
              on:click={() => DrawingStore.set(
                DrawingStore.beginEditing($DrawingStore, drawing.id)
              )}
            />
          </li>
        {/each}
      </ul>
    {/if}
    {#if activeTab === "surface"}
      <ul class="list">
        {#each $SurfaceStore.items as surface (surface.id)}
          <li
            class="item surface"
            class:highlighted={HighlightedItemStore.isHighlighted(
              $HighlightedItemStore,
              "surface",
              surface.id,
            )}
            class:focused={FocusedItemStore.isFocused(
              $FocusedItemStore,
              "surface",
              surface.id,
            )}
            on:mouseenter={() => HighlightedItemStore.enterItem("surface", surface.id)}
            on:mouseleave={() => HighlightedItemStore.leaveItem()}
            on:click={() => FocusedItemStore.focusItem("surface", surface.id)}
          >
            <div
              class="colorswatch"
              class:dark={surface.visible ? COLORS[surface.colorFamily].textColor === 'dark' : ''}
              style:background-color={surface.visible ? COLORS[surface.colorFamily].dark : ''}
              on:click={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const initialSurfaceVisibility = surface.visible;

                HistoryStore.createMutation({
                  name: `${surface.visible ? 'Hide' : 'Show'} ${surface.name}`,
                  forwards: (value, [surfaceId]) => {
                    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
                      return {
                        ...surface,
                        visible: !initialSurfaceVisibility,
                      };
                    });
                    return { ...value, SurfaceStore: newValue };
                  },
                  backwards: (value, [surfaceId]) => {
                    const newValue = SurfaceStore.updateItem(value.SurfaceStore, surfaceId, surface => {
                      return {
                        ...surface,
                        visible: initialSurfaceVisibility,
                      };
                    });
                    return { ...value, SurfaceStore: newValue };
                  },
                  requires: () => [],
                  provides: () => [],
                })(surface.id);
              }}
            >
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                class="icon"
              >
                <g id="Artboard" stroke="none" stroke-width="2" fill="none" fill-rule="evenodd">
                    <path d="M6.79088856,5.5 L3.62566339,19.5 L17.6004241,19.5 L20.7656493,5.5
                    L6.79088856,5.5 Z" id="Rectangle" stroke="currentColor"></path>
                    <text id="S" font-family="PTMono-Bold, PT Mono" font-size="8" font-weight="bold"
                    fill="currentColor">
                        <tspan x="10" y="15">S</tspan>
                    </text>
                </g>
              </svg>
            </div>
            <div class="label">
              {surface.name}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    {#if activeTab === "fold"}
      <ul class="list">
        {#each $SurfaceStore.items as surface (surface.id)}
          {#if surface.visible}
            {#each surface.folds as fold (fold.id)}
              <li
                class="item fold"
                class:highlighted={HighlightedItemStore.isHighlighted(
                  $HighlightedItemStore,
                  "fold",
                  fold.id,
                )}
                class:focused={FocusedItemStore.isFocused(
                  $FocusedItemStore,
                  "fold",
                  fold.id,
                )}
                on:mouseenter={() => HighlightedItemStore.enterItem("fold", fold.id)}
                on:mouseleave={() => HighlightedItemStore.leaveItem()}
                on:click={() => FocusedItemStore.focusItem("fold", fold.id)}
              >
                <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="icon fold">
                  <!-- Generator: Sketch 57.1 (83088) - https://sketch.com -->
                  <title>Artboard Copy</title>
                  <desc>Created with Sketch.</desc>
                  <g id="Artboard-Copy" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                      <circle id="Oval" stroke="currentColor" cx="12" cy="12" r="5.5"></circle>
                      <text id="F" font-family="PTMono-Bold, PT Mono" font-size="8" font-weight="bold" fill="currentColor">
                          <tspan x="9.75" y="15">F</tspan>
                      </text>
                      <path d="M17.5678441,14.2401378 L22.4514762,17.3994636 L21.3753606,19.0597117
                      L16.5308784,15.9334766 C16.9644265,15.4345112 17.3169155,14.8632311
                      17.5678441,14.2401378 Z M3.59118986,5.2 L7.67525411,7.84107482 C7.21298563,8.32165737
                      6.83006038,8.87911253 6.54755231,9.49236635 L2.5,6.88110527 L3.59118986,5.2 Z"
                      id="Combined-Shape" fill="currentColor"></path>
                  </g>
                </svg>
                <div class="label">
                  {fold.id}
                </div>
              </li>
            {/each}
          {/if}
        {/each}
      </ul>
    {/if}
    {#if activeTab === "history"}
      <div class="activeline" style:height={`calc(${$HistoryStore.currentHistoryIndex+1} * var(--space-9))`} />
      <ul class="list">
        {#each $HistoryStore.history as historyItem, index (historyItem.id)}
          <li
            class="item"
            class:focused={$HistoryStore.currentHistoryIndex === index}
            on:click={() => HistoryStore.to(index)}
            on:mouseenter={() => { highlightedHistoryItemId = historyItem.id; }}
            on:mouseleave={() => { highlightedHistoryItemId = null; }}
          >
            <div class="providesRequiresBox">
              {#if historyItem.provides}
                {#each historyItem.provides(historyItem.args, historyItem.context) as provide}
                  <span style:color={{create: Green4, update: Cyan4, delete: Red4}[provide.operation]}>
                  {{
                    'drawing': 'd',
                    'drawing-surface': 's',
                    'drawing-surface-fold-set': 'e',
                    'surface': 'S',
                    'fold': 'F',
                  }[provide.item.itemType]}
                  </span>
                {/each}
              {:else}
                &mdash;
              {/if}
            </div>
            <div class="label">
              {#if historyItem.id === focusedHistoryItemId}
                <TextField
                  bind:value={focusedHistoryItemName}
                  width="100%"
                  muted
                  light
                  focused
                  on:blur={() => {
                    HistoryStore.updateHistoryItemName(historyItem.id, focusedHistoryItemName);
                    focusedHistoryItemId = null;
                  }}
                  on:enter={() => {
                    HistoryStore.updateHistoryItemName(historyItem.id, focusedHistoryItemName);
                    focusedHistoryItemId = null;
                  }}
                />
              {:else}
                {historyItem.name}
              {/if}
            </div>
            {#if $HistoryStore.currentHistoryIndex === index}
              <div class="currentItemMarker" />
            {/if}
            <Button
              text="Edit"
              on:click={() => {
                focusedHistoryItemId = historyItem.id;
                focusedHistoryItemName = historyItem.name;
              }}
            />
            <Button
              text="Delete"
              on:click={() => HistoryStore.remove(index)}
              disabled={index === 0}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Panel>

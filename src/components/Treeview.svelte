<script lang="ts">
  import { Surface } from '$lib/core';
  import { COLORS } from '$lib/color';

  import { SurfaceStore, HighlightedItemStore, FocusedItemStore } from '$lib/stores';

  import Panel from './Panel.svelte';

  type TabItem = 'drawing' | 'surface' | 'fold';

  let activeTab: TabItem = 'surface';

  FocusedItemStore.subscribe(focusedItem => {
    if (focusedItem && focusedItem.itemType !== activeTab) {
      activeTab = focusedItem.itemType;
    }
  });
</script>

<style>
  @import "../styles/variables.css";

  .wrapper {
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
  .tab:active, .tab:focus {
    background-color: var(--gray-5);
  }
  .tab.active {
    background-color: var(--gray-5);
    color: var(--gray-9);
  }

  .list {
    list-style-type: none;
    padding: 0px;
    margin: 0px;
  }
  .item {
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
  .item.highlighted, .item:active {
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
  .icon.surface {
    color: var(--cyan-4);
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

  .label {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    padding-right: var(--space-1);
  }
</style>

<Panel width="300px" height="100%">
  <button on:click={() => SurfaceStore.historyUndo()}>Undo</button>
  <button on:click={() => SurfaceStore.historyRedo()}>Redo</button>
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
    </div>
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

                SurfaceStore.createMutation({
                  forwards: (value, [surfaceId]) => {
                    return SurfaceStore.updateItem(value, surfaceId, surface => {
                      return {
                        ...surface,
                        visible: !initialSurfaceVisibility,
                      };
                    });
                  },
                  backwards: (value, [surfaceId]) => {
                    return SurfaceStore.updateItem(value, surfaceId, surface => {
                      return {
                        ...surface,
                        visible: initialSurfaceVisibility,
                      };
                    });
                  },
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
  </div>
</Panel>

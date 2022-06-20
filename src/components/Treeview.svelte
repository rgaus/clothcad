<script lang="ts">
  import { Surface } from '$lib/core';
  export let surfaces: Array<Surface>;
</script>

<style>
  @import "../styles/variables.css";

  .wrapper {
    padding: var(--space-1);
    color: var(--gray-4);
    background-color: var(--gray-9);
    list-style-type: none;
  }
  .item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);

    padding: var(--space-1);
    cursor: pointer;
    user-select: none;
    border-radius: var(--border-radius-2);
    font-weight: var(--font-weight-medium);
  }
  .item:hover, .item:active {
    background-color: var(--gray-8);
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

  .label {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
</style>

<ul class="wrapper">
  {#each surfaces as surface (surface.id)}
    <li class="item surface">
      <svg
        width="24px"
        height="24px"
        viewBox="0 0 24 24"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        class="icon surface"
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
      <div class="label">
        {surface.name}
      </div>
    </li>
  {/each}
</ul>

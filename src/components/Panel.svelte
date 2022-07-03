<script lang="ts">
  export let top: string = '0px';
  export let left: string = '0px';
  export let height: string = 'auto';
  export let width: string = "300px";
  export let hidden: boolean = false;
</script>

<style>
  @import "../styles/variables.css";

  .panelWrapper {
    position: absolute;
    bottom: 0px;
    padding-top: var(--space-2);
    padding-bottom: var(--space-2);
    padding-left: var(--space-1);
    padding-right: var(--space-1);
    pointer-events: none;
  }

  .panel {
    color: var(--gray-1);
    background-color: var(--gray-9);
    border-radius: var(--border-radius-2);
    overflow-y: auto;
    pointer-events: auto;
  }
  .panel.hidden {
    display: none;
  }
</style>

<div class="panelWrapper" style:top={top} style:left={left} style:width={width} on:mousedown={e => e.stopPropagation()}>
  <div class="panel" class:hidden={hidden} style:height={height}>
    <slot />
  </div>
</div>

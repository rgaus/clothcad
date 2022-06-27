<script lang="ts">
  export let top: number = 0;
  export let left: number = 0;
  export let height: string;
  export let width: string = "300px";
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
    background-color: var(--gray-9);
    border-radius: var(--border-radius-2);
    overflow-y: auto;
    pointer-events: auto;
  }
</style>

<div class="panelWrapper" style:top={top} style:left={left} style:width={width} on:mousedown={e => e.stopPropagation()}>
  <div class="panel" style:height={height}>
    <slot />
  </div>
</div>

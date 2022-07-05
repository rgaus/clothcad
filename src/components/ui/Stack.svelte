<script lang="ts">
  export let gap: number;
  export let direction: 'horizontal' | 'vertical' = 'horizontal';
</script>

<style>
  @import "../../styles/variables.css";

  .stack {
    display: flex;
  }
</style>

<div
  class="stack"
  style:gap={`var(--space-${gap})`}
  style:flex-direction={direction === 'horizontal' ? 'row' : 'column'}
>
  <slot />
</div>

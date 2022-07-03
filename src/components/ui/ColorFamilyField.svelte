<script lang="ts">
	import { createEventDispatcher } from 'svelte';
  import { COLORS } from '$lib/color';
  import Button from './Button.svelte';
  import ButtonGroup from './ButtonGroup.svelte';

  export let value: string | null = null;
  export let variant: 'light' | 'dark' = 'light';

  let showPopup = false;

  const dispatch = createEventDispatcher();
</script>

<style>
  @import "../../styles/variables.css";

  .colorFieldWrapper {
    position: relative;
  }

  .swatch {
    width: var(--space-4);
    height: var(--space-4);
    border-radius: var(--border-radius-2);
  }

  .popup {
    position: absolute;
    top: calc(var(--space-6) + (var(--space-1) / 2));
    left: calc(-1 * (var(--space-1) / 2));

    display: none;
    background-color: var(--gray-5);
    padding: calc(var(--space-1) / 2);
    border-radius: var(--border-radius-2);
  }
  .popup.visible {
    display: flex;
  }
</style>

<div class="colorFieldWrapper">
  <Button
    width="var(--space-6)"
    height="var(--space-6)"
    invalid={typeof COLORS[value || ''] === 'undefined'}
    on:click={() => { showPopup = !showPopup }}
  >
    <div class="swatch" style:background-color={COLORS[value || ''] ? COLORS[value || ''][variant]: ''}></div>
  </Button>

  <div class="popup" class:visible={showPopup}>
    <ButtonGroup>
      {#each Object.entries(COLORS) as [family, color]}
        <Button
          width="var(--space-6)"
          height="var(--space-6)"
          on:click={() => {
            value = family;
            showPopup = false;
            dispatch('change', value);
          }}
        >
          <div class="swatch" style:background-color={color[variant]}></div>
        </Button>
      {/each}
    </ButtonGroup>
  </div>
</div>

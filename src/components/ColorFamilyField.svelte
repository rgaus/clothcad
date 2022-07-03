<script lang="ts">
	import { createEventDispatcher } from 'svelte';
  import { COLORS } from '$lib/color';

  export let value: string | null = null;
  export let variant: 'light' | 'dark' = 'light';

  let showPopup = false;

  const dispatch = createEventDispatcher();
</script>

<style>
  @import "../styles/variables.css";

  .colorFieldWrapper {
    position: relative;
  }

  .colorField {
    display: flex;
    border-radius: var(--border-radius-2);
    overflow: hidden;
    padding: 0px;
    width: var(--space-6);
    height: var(--space-6);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .colorField.invalid {
    border-color: var(--red-7);
  }

  .swatch {
    width: var(--space-4);
    height: var(--space-4);
  }

  .popup {
    position: absolute;
    top: var(--space-6);
    left: 0px;
    height: var(--space-6);

    display: none;
    background-color: var(--gray-2);
  }
  .popup.visible {
    display: flex;
  }
</style>

<div class="colorFieldWrapper">
  <button
    class="colorField"
    class:invalid={typeof COLORS[value || ''] === 'undefined'}
    on:click={() => { showPopup = !showPopup }}
  >
    <div class="swatch" style:background-color={COLORS[value || ''] ? COLORS[value || ''][variant]: ''}></div>
  </button>

  <div class="popup" class:visible={showPopup}>
    {#each Object.entries(COLORS) as [family, color]}
      <button class="colorField" on:click={() => {
        value = family;
        showPopup = false;
        dispatch('change', value);
      }}>
        <div class="swatch" style:background-color={color[variant]}></div>
      </button>
    {/each}
  </div>
</div>

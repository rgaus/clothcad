<script lang="ts">
  import type { LinearFold, Surface } from '$lib/core';
  import { FocusedItemStore, PickingItemStore } from '$lib/stores';
  import Button from './Button.svelte';
  import ButtonGroup from './ButtonGroup.svelte';

  export let value: LinearFold['id'] | null = null;

  export let surface: Surface;

  let foldIds: Array<LinearFold['id']> = [];
  $: {
    foldIds = surface.folds.map(f => f.id);
  }
</script>

<style>
  @import "../../styles/variables.css";

  .faceFieldWrapper {
    display: flex;
    border-radius: var(--border-radius-2);
    overflow: hidden;
    height: var(--space-6);
  }

  .faceFieldWrapper select {
    border: 0px;
    padding-left: var(--space-1);
    background-color: var(--white);
    font-family: var(--font-family);
    font-size: var(--font-size);

    border: 1px solid var(--gray-7);
    width: 100px;

    border-top-left-radius: var(--border-radius-3);
    border-bottom-left-radius: var(--border-radius-3);
  }
  .faceFieldWrapper select:focus {
    border-color: var(--cyan-5);
    outline: none;
  }

  .faceFieldWrapper select.invalid {
    border-color: var(--red-7);
  }
</style>

<div class="faceFieldWrapper">
  <ButtonGroup>
    <select bind:value={value} class:invalid={!foldIds.includes(value || '')}>
      {#each surface.folds as fold (fold.id)}
        <option value={fold.id}>{fold.id}</option>
      {/each}
    </select>
    <Button
      on:click={() => {
        PickingItemStore.pickFold($FocusedItemStore, surface).then(itemId => {
          value = itemId;
        });
      }}
      text="+"
    />
  </ButtonGroup>
</div>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Stack from './Stack.svelte';
  import Button from './Button.svelte';

  const dispatch = createEventDispatcher();

  export let fixed: boolean = false;
  export let back: boolean = false;
</script>

<style>
  @import "../../styles/variables.css";

  .appbar {
    height: var(--space-10);
    width: 100%;
    background-color: var(--gray-9);
    color: var(--gray-1);
    padding-left: var(--space-2);
    padding-right: var(--space-2);

    font-family: var(--font-family);

    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .appbar.fixed {
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    z-index: 999;
  }

  .title {
    display: flex;
    gap: var(--space-2);
    font-size: var(--font-size-large);
    font-weight: var(--font-weight-bold);
  }
</style>

<div class="appbar" class:fixed={fixed}>
  <div class="title">
    {#if back}
      <Button
        on:click={() => dispatch('back')}
        text="&larr;"
      />
    {/if}
    <slot name="title" />
  </div>
  <div class="actions">
    <Stack gap={2}>
      <slot name="actions" />
    </Stack>
  </div>
</div>

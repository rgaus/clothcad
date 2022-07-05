<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import TextField from './TextField.svelte';
  import { Numeral } from '$lib/numeral';

  const dispatch = createEventDispatcher();

  export let invalid: boolean = false;

  export let value: Numeral | null = null;
  let oldValue: Numeral | null = null;
  let rawValue: string = value ? Numeral.serializeToString(value) || '' : '';
  $: {
    if (oldValue !== value) {
      rawValue = value ? Numeral.serializeToString(value) || '' : '';
      oldValue = value;
    }
  }
</script>

<style>
</style>

<TextField
  {...$$restProps}

  bind:value={rawValue}
  on:focus
  on:blur
  on:blur={() => {
    const result = Numeral.parseFromString(rawValue);
    if (!result) {
      return;
    }
    value = result;
    dispatch('change', result);
  }}
  invalid={invalid || Numeral.parseFromString(rawValue) === null}
/>

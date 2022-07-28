<script lang="ts">
  import { getContext, createEventDispatcher } from 'svelte';
  const inControlGroup: () => boolean = getContext('control-in-group') || (() => false);
  const dispatch = createEventDispatcher();

  export let value: string = '';
  export let placeholder: string = '';
  export let muted: boolean = false;
  export let light: boolean = false;
  export let invalid: boolean = false;
  export let width: string = '';
  export let unit: string | null = null;

  export let focused = false;

  // If "focused" is changed externally, then imperatively focus the element
  let input: HTMLInputElement | null = null;
  let oldFocused = false;
  $: {
    if (input && oldFocused !== focused) {
      input.focus();
      input.select();
    }
  }
</script>

<style>
  @import "../../styles/variables.css";

  .textFieldWrapper {
    display: flex;
    align-items: center;
    overflow: hidden;
    border-radius: var(--border-radius-3);
    background-color: var(--gray-2);
    height: var(--space-6);
    border: 1px solid var(--gray-7);
  }
  .textFieldWrapper.inControlGroup {
    border-radius: var(--border-radius-1);
    border-left: 0px;
  }
  .textFieldWrapper.inControlGroup:first-child {
    border-top-left-radius: var(--border-radius-3);
    border-bottom-left-radius: var(--border-radius-3);
    border-left: 1px solid var(--gray-8);
  }
  .textFieldWrapper.inControlGroup:last-child {
    border-top-right-radius: var(--border-radius-3);
    border-bottom-right-radius: var(--border-radius-3);
  }

  .textFieldWrapper.muted {
    background-color: transparent;
  }
  .textFieldWrapper.muted.light {
    border-color: var(--cyan-8);
  }
  .textFieldWrapper.muted input { color: var(--gray-2); }
  .textFieldWrapper.muted:hover, .textFieldWrapper.muted:hover { background-color: var(--gray-7); }
  .textFieldWrapper.muted.light:hover, .textFieldWrapper.muted.light.focus { background-color: var(--gray-4); }
  .textFieldWrapper.muted.light input { color: var(--gray-2); }
  .textFieldWrapper.muted.light:hover input, .textFieldWrapper.muted.light.focus input {
    color: var(--gray-7);
  }

  .textFieldWrapper input {
    border: 0px;
    padding-left: var(--space-1);
    font-family: var(--font-family);
    font-size: var(--font-size);
    background-color: transparent;

    border: 0px;
    width: 100%;
    outline: none;
    overflow: hidden;
  }
  .textFieldWrapper.focus {
    border-color: var(--cyan-5);
    outline: none;
  }
  .textFieldWrapper.invalid {
    border-color: var(--red-7);
  }


  .unit {
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    padding-right: var(--space-1);
    pointer-events: none;
    user-select: none;
  }
</style>

<div
  class="textFieldWrapper"
  class:inControlGroup={inControlGroup()}
  class:muted={muted}
  class:light={light}
  class:invalid={invalid}
  class:focus={focused}
  style:width={width}
  on:click={() => { focused = true; }}
>
  <input
    type="text"
    placeholder={placeholder}
    bind:this={input}
    bind:value={value}
    on:focus
    on:focus={() => { oldFocused = focused = true; }}
    on:blur
    on:blur={() => { oldFocused = focused = false; }}
    on:keydown={evt => {
      if (evt.key === 'Enter') {
        dispatch('enter');
      }
    }}
    on:change
    on:keydown
    on:keyup
  />
  {#if unit}
    <span class="unit">{unit}</span>
  {/if}
</div>

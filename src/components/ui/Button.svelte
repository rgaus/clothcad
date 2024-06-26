<script lang="ts">
  import { getContext } from 'svelte';

  const inControlGroup: () => boolean = getContext('control-in-group') || (() => false);

  export let variant: 'default' | 'primary' = 'default';
  export let text: string = '';
  export let size: 'small' | 'large' = 'small';
  export let disabled = false;
  export let width: string = '';
  export let height: string = '';
  export let invalid: boolean = false;
</script>

<style>
  @import "../../styles/variables.css";

  .button {
    height: var(--space-6);
    min-width: var(--space-6);

    color: var(--gray-5);
    background-color: var(--gray-7);
    border: 1px solid var(--gray-8);
    border-radius: var(--border-radius-3);

    cursor: pointer;

    font-family: var(--font-family);
    font-size: var(--font-size);
    font-weight: var(--font-weight-medium);

    margin: 0px;
    padding: 0px;

    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 0;
    flex-shrink: 0;
  }
  .button:hover {
    background-color: var(--gray-6);
  }
  .button:active {
    background-color: var(--gray-8);
  }
  .button.hasText {
    padding-left: var(--space-2);
    padding-right: var(--space-2);
  }
  .button.invalid {
    border-color: var(--red-7);
  }

  .button[disabled] {
    background-color: var(--gray-9);
    color: var(--gray-7);
    cursor: not-allowed;
  }

  .button.inControlGroup {
    border-radius: var(--border-radius-1);
    border-left: 0px;
  }
  .button.inControlGroup:first-child {
    border-top-left-radius: var(--border-radius-3);
    border-bottom-left-radius: var(--border-radius-3);
    border-left: 1px solid var(--gray-8);
  }
  .button.inControlGroup:last-child {
    border-top-right-radius: var(--border-radius-3);
    border-bottom-right-radius: var(--border-radius-3);
  }

  .button.sizeLarge {
    height: var(--space-8);
    min-width: var(--space-8);
  }

  .button.variantPrimary {
    background-color: var(--cyan-8);
  }
  .button.variantPrimary:hover {
    background-color: var(--cyan-7);
  }
  .button.variantPrimary:active {
    background-color: var(--cyan-9);
  }
  .button.variantPrimary[disabled] {
    color: var(--gray-7);
    background-color: var(--cyan-9);
  }
</style>

<button
  class="button"
  class:sizeLarge={size === 'large'}
  class:variantPrimary={variant === 'primary'}
  class:inControlGroup={inControlGroup()}
  class:hasText={text !== ''}
  class:invalid={invalid}
  disabled={disabled}
  style:width={width}
  style:height={height}
  on:click
>
  {text}
  <slot />
</button>

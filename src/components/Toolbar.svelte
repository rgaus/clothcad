<script lang="ts">
  import Button from '../components/Button.svelte';
  import ButtonGroup from '../components/ButtonGroup.svelte';
  import Stack from '../components/Stack.svelte';

  import { SurfaceStore, FocusedItemStore, ActionStore, PickingItemStore } from '$lib/stores';
</script>

<style>
  @import "../styles/variables.css";

  .toolbar {
    position: fixed;
    top: var(--space-2);
    right: var(--space-1);
  }
</style>

{#if !($PickingItemStore.enabled || $ActionStore.enabled)}
  <div class="toolbar">
    <Stack gap={2}>
      {#each ActionStore.getActionsForFocusedItem($FocusedItemStore) as ActionTypeOrArray}
        {#if Array.isArray(ActionTypeOrArray)}
          <ButtonGroup>
            {#each ActionTypeOrArray as ActionType}
              <Button
                size="large"
                on:click={() => ActionStore.begin(ActionType)}
                text={ActionType.getName()}
              />
            {/each}
          </ButtonGroup>
        {:else}
          <Button
            size="large"
            on:click={() => ActionStore.begin(ActionTypeOrArray)}
            text={ActionTypeOrArray.getName()}
          />
        {/if}
      {/each}

      <ButtonGroup>
        <Button
          size="large"
          variant="primary"
          on:click={() => SurfaceStore.historyUndo()}
          text="Undo"
        />
        <Button
          size="large"
          on:click={() => SurfaceStore.historyRedo()}
          text="Redo"
        />
      </ButtonGroup>
    </Stack>
  </div>
{/if}
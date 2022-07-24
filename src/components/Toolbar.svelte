<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  /* import debounce from 'lodash-es/debounce'; */

  import Button from '../components/ui/Button.svelte';
  import ButtonGroup from '../components/ui/ButtonGroup.svelte';
  import Stack from '../components/ui/Stack.svelte';

  import { SerializationStore, HistoryStore, SurfaceStore, FocusedItemStore, ActionStore, PickingItemStore } from '$lib/stores';
  import type { FixMe } from '$lib/types/fixme';

  // When changes are made to the history store, sync them to the filesystem
  let unsubscribe: FixMe = null;
  /* const FILE_DEBOUNCE_THRESHOLD_MS = 1000; */
  /* const debouncedSerialize = debounce(historyValue => { */
  /*   SerializationStore.serialize($SerializationStore, historyValue); */
  /* }, FILE_DEBOUNCE_THRESHOLD_MS); */
  onMount(() => {
    unsubscribe = HistoryStore.subscribe(historyValue => {
      SerializationStore.serialize($SerializationStore, historyValue);
    });
  });
  onDestroy(() => unsubscribe && unsubscribe());
</script>

<style>
  @import "../styles/variables.css";

  .toolbar {
    position: fixed;
    bottom: var(--space-2);
    left: var(--space-1);
  }
</style>

{#if !($PickingItemStore.enabled || $ActionStore.enabled)}
  <div class="toolbar">
    <Stack gap={2}>
      <ButtonGroup>
        {#if $SerializationStore.attachedFile}
          <Button
            size="large"
            text={(() => {
              let name = $SerializationStore.attachedFile.file.name;
              if ($SerializationStore.attachedFile.saveOnReEnable) {
                name += '*';
              } else if ($SerializationStore.attachedFile.loadOnReEnable) {
                name += '^';
              }
              return name;
            })()}
            variant={$SerializationStore?.attachedFile?.enabled ? "primary" : "default"}
            on:click={() => SerializationStore.toggleFileEnabled($SerializationStore, $HistoryStore)}
            disabled={!$SerializationStore.attachedFile}
          />
          {#if $SerializationStore.attachedFile.syncing}
            <Button
              size="large"
              text="Syncing"
              disabled
            />
          {:else}
            <Button
              size="large"
              text="Detach"
              on:click={() => SerializationStore.detachFile()}
            />
          {/if}
        {:else}
          <Button
            size="large"
            text="Save"
            on:click={async () => {
              await SerializationStore.attachNewFile();
              await SerializationStore.serialize($SerializationStore, $HistoryStore);
            }}
          />
          <Button
            size="large"
            text="Load"
            on:click={async () => {
              await SerializationStore.attachFile();
              await SerializationStore.deserialize();
            }}
          />
        {/if}
        <!--
        <Button
          size="large"
          text="Save"
          on:click={async () => {
            // ref: https://web.dev/file-system-access/
            const options = {
              types: [
                {
                  description: 'Text Files',
                  accept: {
                    'text/plain': ['.txt'],
                  },
                },
              ],
            };
            const fileHandle = await window.showSaveFilePicker(options);

            // Make we can read and write to the file
            const opts = { mode: 'readwrite' };
            if (await fileHandle.queryPermission(opts) !== 'granted') {
              if (await fileHandle.requestPermission(opts) !== 'granted') {
                return;
              }
            }

            // Create a FileSystemWritableFileStream to write to.
            const writable = await fileHandle.createWritable();
            // Write the contents of the file to the stream.
            await writable.write('testing 123');
            // Close the file and write the contents to disk.
            await writable.close();
          }}
        />
        -->
      </ButtonGroup>

      <ButtonGroup>
        <Button
          size="large"
          variant="primary"
          on:click={() => HistoryStore.undo()}
          text="Undo"
        />
        <Button
          size="large"
          on:click={() => HistoryStore.redo()}
          text="Redo"
        />
      </ButtonGroup>

      {#each ActionStore.getActionsForFocusedItem($FocusedItemStore) as ActionTypeOrArray}
        {#if Array.isArray(ActionTypeOrArray)}
          <ButtonGroup>
            {#each ActionTypeOrArray as ActionType}
              <Button
                size="large"
                disabled={!ActionType.isToolbarButtonEnabled($FocusedItemStore, $SurfaceStore)}
                on:click={() => ActionStore.begin(ActionType)}
                text={ActionType.getName()}
              />
            {/each}
          </ButtonGroup>
        {:else}
          <Button
            size="large"
            disabled={!ActionTypeOrArray.isToolbarButtonEnabled($FocusedItemStore, $SurfaceStore)}
            on:click={() => ActionStore.begin(ActionTypeOrArray)}
            text={ActionTypeOrArray.getName()}
          />
        {/if}
      {/each}
    </Stack>
  </div>
{/if}

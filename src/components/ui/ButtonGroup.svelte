<script lang="ts">
  import { setContext } from 'svelte';
  import Stack from './Stack.svelte';

  setContext('button-in-group', () => true);
</script>

<Stack direction="horizontal" gap={0}>
  <slot />
</Stack>

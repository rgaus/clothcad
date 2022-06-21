<script lang="ts">
	import * as SC from 'svelte-cubed';
  import { Vector3, SphereGeometry, MeshStandardMaterial } from 'three';
  import { SpacialCoordinates } from '$lib/core';

  export let coords: SpacialCoordinates;
  export let color: number;
  export let radius: number = 0.1;
</script>

<SC.Mesh
  geometry={new SphereGeometry(radius)}
  material={new MeshStandardMaterial({ color })}
  position={[coords.x, coords.y, coords.z]}
/>

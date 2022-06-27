<script lang="ts">
	import * as SC from 'svelte-cubed';
  import { onMount } from 'svelte';
  import { Vector3, ArrowHelper, CylinderBufferGeometry, MeshStandardMaterial, Quaternion } from 'three';
  import { SpacialCoordinates } from '$lib/core';

  export let a: SpacialCoordinates;
  export let b: SpacialCoordinates;
  export let color: number;

  let length = 0, position = new Vector3(0, 0, 0), rotation = new Quaternion();

  onMount(() => {
    // ref: https://stackoverflow.com/questions/15316127/three-js-line-vector-to-cylinder
    const pointX = new Vector3(a.x, a.y, a.z), pointY = new Vector3(b.x, b.y, b.z);
    const direction = new Vector3().subVectors( pointY, pointX );
    length = direction.length();
    position = new Vector3().addVectors( pointX, direction.multiplyScalar(0.5) );

    const arrow = new ArrowHelper(direction.normalize(), pointX);
    rotation = arrow.rotation.clone();
  });
</script>

<SC.Mesh
  geometry={new CylinderBufferGeometry(0.1, 0.1, length)}
  material={new MeshStandardMaterial({ color })}
  position={[position.x, position.y, position.z]}
  rotation={[rotation.x, rotation.y, rotation.z]}
/>

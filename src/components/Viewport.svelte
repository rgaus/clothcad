<script lang="ts">
	import * as THREE from 'three';
	import * as SC from 'svelte-cubed';
  import { onMount } from 'svelte';

  import { SurfaceStore, HighlightedItemStore } from '$lib/stores';
  import { PlanarCoordinates } from '$lib/core';
  import { Cyan4, COLORS, toRawHex } from '$lib/color';

  import Plane from './Plane.svelte';
  import Line from './Line.svelte';
  import Point from './Point.svelte';

  /* import Viewcube from './Viewcube.svelte'; */

  let canvas: any;
  let ctx: any;
  // ref: https://github.com/Rich-Harris/svelte-cubed/issues/59
  onMount(() => {
    const mapIter = canvas.$$.context.values();
    mapIter.next()
    ctx = mapIter.next().value;
  })
</script>

<!--
<Viewcube camera={ctx && ctx.camera} on:complete={() => ctx && ctx.invalidate()} />
-->

<SC.Canvas
	antialias
	background={new THREE.Color('#bfbfbf')}
	shadows
  bind:this={canvas}
>
	<SC.PerspectiveCamera position={[1, 1, 3]} />
	<SC.OrbitControls enableZoom={true} maxPolarAngle={Math.PI * 0.51} />
	<SC.AmbientLight intensity={0.6} />
	<SC.DirectionalLight intensity={0.6} position={[-2, 3, 2]} shadow={{ mapSize: [2048, 2048] }} />

  <SC.Primitive object={new THREE.AxesHelper(100)} />

  {#each $SurfaceStore.items as surface (surface.id)}
    {#if surface.visible}
      <Plane
        face={surface.face}
        color={toRawHex(COLORS[surface.colorFamily][HighlightedItemStore.isHighlighted($HighlightedItemStore, "surface", surface.id) ? 'dark' : 'light'])}
      />
      {#each surface.folds as fold (fold.id)}
        <Line
          a={PlanarCoordinates.toSpacialCoordinates(fold.a, surface.face)}
          b={PlanarCoordinates.toSpacialCoordinates(fold.b, surface.face)}
          color={HighlightedItemStore.isHighlighted($HighlightedItemStore, "fold", fold.id) ?
          toRawHex(Cyan4) : toRawHex(COLORS[surface.colorFamily].dark)}
        />
      {/each}
    {/if}
  {/each}
</SC.Canvas>

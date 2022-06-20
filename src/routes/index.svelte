<script lang="ts">
  import { onMount } from 'svelte';

  import {
    PlanarCoordinates,
    SpacialCoordinates,
    SVGCoordinates,
    LinearFold,
    PlanarFace,
    Surface,
    radiansToDegrees,
    degreesToRadians,
    intersection,
    POINT_IN_POLYGON,
    pointInPolygon,
    planarDistance,
    spacialDistance,
    round,
  } from '$lib/core'
  import Treeview from '../components/Treeview.svelte';

  let surfaces: Array<Surface> = [];

  onMount(() => {
    const fold = LinearFold.create(PlanarCoordinates.create(0, 0), PlanarCoordinates.create(10, 10));
    const surface = Surface.create(PlanarFace.createRectangle(10, 10), [fold]);

    const [a, b] = Surface.bisect(surface, fold);

    surfaces = [
      surface,
      a,
      b,
    ];
  });
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<Treeview surfaces={surfaces} />

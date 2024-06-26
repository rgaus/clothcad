<style>
  .container {
    width: 100%;
    height: 100%;
  }
</style>

<script lang="ts">
	import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { onMount, onDestroy, setContext } from 'svelte';

  import {
    SurfaceStore,
    HighlightedItemStore,
    FocusedItemStore,
    ActionStore,
    PickingItemStore,
  } from '$lib/stores';
  import type { Item } from '$lib/types/item';
  import type { ViewportContext } from '$lib/viewport-context';

  import ViewportSurface from './ViewportSurface.svelte';

  /* import Viewcube from './Viewcube.svelte'; */

  let container: HTMLDivElement | null = null;
  let currentAnimationFrameId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  const raycaster = new THREE.Raycaster();

  let geometryToItem: {[threeGeometryId: string]: Item} = {};

  setContext<ViewportContext>('viewport', {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,

    registerItem: (threeGeometryId, item) => {
      geometryToItem[threeGeometryId] = item;
    },
    deregisterItem: (threeGeometryId) => {
      delete geometryToItem[threeGeometryId];
    },
    getItemWithThreeGeometry: (threeGeometryId) => {
      return geometryToItem[threeGeometryId] || null;
    },
  });

  onMount(() => {
    if (!container) {
      return;
    }
    const bbox = container.getBoundingClientRect();

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#bfbfbf');

    camera = new THREE.PerspectiveCamera( 75, bbox.width / bbox.height, 0.1, 1000 );
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ antialias: true});
    renderer.setSize(bbox.width, bbox.height);

    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);

    resizeObserver = new ResizeObserver(entries => {
      if (!camera || !renderer) {
        return;
      }

      const bbox = entries[0].contentRect;
      camera.aspect = bbox.width / bbox.height;
      renderer.setSize(bbox.width, bbox.height);
    });
    resizeObserver.observe(container);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.maxPolarAngle = Math.PI * 0.51;

    const ambientLight = new THREE.AmbientLight(0x404040);
    ambientLight.intensity = 0.6;
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x404040, 0.6);
    directionalLight.position.set(-2, 3, 2).normalize();
    scene.add(directionalLight);

    const axes = new THREE.AxesHelper(100);
    scene.add(axes);

    function animate() {
      if (!scene || !camera || !renderer) {
        return;
      }

      // required if controls.enableDamping or controls.autoRotate are set to true
      controls.update();

      renderer.render(scene, camera);
      currentAnimationFrameId = requestAnimationFrame( animate );
    }
    animate();
  });

  function onMouseMove(event: MouseEvent) {
    if (!camera || !scene || !renderer) {
      return;
    }

    const mouse = {
      x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
      y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    };
    raycaster.setFromCamera( mouse, camera );

    const intersects = raycaster.intersectObjects(scene.children, false);
    for (let index = 0; index < intersects.length; index += 1) {
      const geometry = intersects[index].object;
      if (!geometry.visible) {
        continue
      }

      const item = geometryToItem[geometry.id];
      if (!item) {
        continue;
      }

      HighlightedItemStore.enterItem(item.itemType, item.itemId);
      return;
    }

    HighlightedItemStore.leaveItem();
  }

  function onClick() {
    // If in an action, but not in picking mode, then clicking shouldn't select things
    if ($ActionStore.enabled && !$PickingItemStore.enabled) {
      return;
    }

    // If an item is highlighted, make it the selected item on click
    const highlightedItem = $HighlightedItemStore;
    if (highlightedItem !== null) {
      FocusedItemStore.focusItem(highlightedItem.itemType, highlightedItem.itemId);
      return;
    }

    // Otherwise blue the active item
    FocusedItemStore.blurItem()
  }

  onDestroy(() => {
    if (currentAnimationFrameId !== null) {
      cancelAnimationFrame(currentAnimationFrameId);
    }
    if (resizeObserver && renderer?.domElement) {
      resizeObserver.unobserve(renderer.domElement);
    }
    if (container) {
      container.removeEventListener('mousemove', onMouseMove);
    }
  });
</script>

<!--
<Viewcube camera={ctx && ctx.camera} on:complete={() => ctx && ctx.invalidate()} />
-->

<div
  class="container"
  bind:this={container}
  style:cursor={$HighlightedItemStore ? 'pointer' : 'default'}
></div>

{#each $SurfaceStore.items as surface (surface.id)}
  <ViewportSurface surface={surface} />
{/each}

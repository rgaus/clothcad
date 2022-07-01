<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte';
  import { Surface, PlanarFace, SpacialCoordinates } from '$lib/core';
  import { Cyan4, COLORS, toRawHex } from '$lib/color';
  import { HighlightedItemStore, Item } from '$lib/stores';
  import {
    Mesh,
    MeshLambertMaterial,
    ShapePath,
    Path,
    ExtrudeGeometry,
    Quaternion,
    Vector3,
    BufferGeometry,
    LineBasicMaterial,
    Line,
  } from 'three';

  export let surface: Surface;

  let material: MeshLambertMaterial | null = null;
  let mesh: Mesh | null = null;
  let lastFacePoints: PlanarFace["points"] = [];
  let lastFolds: Surface["folds"] = [];

  const viewport = getContext('viewport');

  function getSurfaceColor(): string {
    const isHighlighted = HighlightedItemStore.isHighlighted($HighlightedItemStore, "surface", surface.id);
    const color = COLORS[surface.colorFamily][isHighlighted ? 'dark' : 'light'];
    return color;
  }

  function getFoldColor(fold: LinearFold): strin {
    return HighlightedItemStore.isHighlighted($HighlightedItemStore, "fold", fold.id) ? Cyan4 : COLORS[surface.colorFamily].dark;
  }

  function onPointsChanged() {
    const scene = viewport.getScene();
    if (!scene) {
      return;
    }

    if (mesh) {
      scene.remove(mesh);
      viewport.deregisterItem(mesh.id);
    }

    const color = toRawHex(getSurfaceColor());
    material = new MeshLambertMaterial({ color, emissive: color });

    const path = new ShapePath();
    let first = true;
    for (const point of surface.face.points) {
      const planarCoordinate = SpacialCoordinates.toPlanarCoordinates(point, surface.face);
      if (first) {
        path.moveTo(planarCoordinate.x, planarCoordinate.y);
        first = false;
      } else {
        path.lineTo(planarCoordinate.x, planarCoordinate.y);
      }
    }
    lastFacePoints = surface.face.points;

    const shape = path.toShapes(true);
    const shape3d = new ExtrudeGeometry(shape, {
      depth: -0.1,
      bevelEnabled: false
    });
    mesh = new Mesh(shape3d, material);

    scene.add(mesh);
    viewport.registerItem(mesh.id, Item.surface(surface.id));
  }

  let foldMeshes: Array<Line> = [];
  function onFoldsChanged() {
    const scene = viewport.getScene();
    if (!scene) {
      return;
    }

    for (const foldMesh of foldMeshes) {
      scene.remove(foldMesh);
      viewport.deregisterItem(foldMesh.id);
    }

    for (const fold of surface.folds) {
      switch (fold.type) {
        case 'linear-fold':
          const path = new Path();

          path.moveTo(fold.a.x, fold.a.y);
          path.lineTo(fold.b.x, fold.b.y);

          const points = path.getPoints();

          const geometry = new BufferGeometry().setFromPoints( points );

          const color = toRawHex(getFoldColor(fold));
          const material = new LineBasicMaterial({ color });

          const line = new Line( geometry, material );

          const quaternion = new Quaternion();
          quaternion.setFromRotationMatrix(surface.face.matrix);
          line.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

          line.position.set(surface.face.origin.x, surface.face.origin.y, surface.face.origin.z);

          scene.add(line);
          foldMeshes.push(line);
          viewport.registerItem(line.id, Item.fold(fold.id));
          break;
      }
    }
  }

  function onMetadataChanged() {
    if (!mesh) {
      return;
    }

    const quaternion = new Quaternion();
    quaternion.setFromRotationMatrix(surface.face.matrix);
    mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

    mesh.position.set(surface.face.origin.x, surface.face.origin.y, surface.face.origin.z);

    mesh.visible = surface.visible;

    for (const foldMesh of foldMeshes) {
      foldMesh.visible = surface.visible;
    }
  }

  onMount(() => {
    onPointsChanged();
    onMetadataChanged();
    onFoldsChanged();
  });

  $: {
    if (lastFacePoints !== surface.face.points) {
      onPointsChanged();
    }
    if (lastFolds !== surface.folds) {
      onFoldsChanged();
    }
    onMetadataChanged();
  }

  HighlightedItemStore.subscribe(highlightedItem => {
    if (!material) {
      return;
    }

    const color = toRawHex(getSurfaceColor());
    material.color.set(color);
    material.emissive.set(color);

    for (let i = 0; i < surface.folds.length; i += 1) {
      const fold = surface.folds[i];
      const color = getFoldColor(fold);
      foldMeshes[i].material.color.set(color);
    }
  });

  onDestroy(() => {
    const scene = viewport.getScene();
    if (!scene) {
      return;
    }

    if (!mesh) {
      return;
    }
    scene.remove(mesh);
    viewport.deregisterItem(mesh.id);

    for (const foldMesh of foldMeshes) {
      scene.remove(mesh);
      viewport.deregisterItem(foldMesh.id);
    }
  });
</script>

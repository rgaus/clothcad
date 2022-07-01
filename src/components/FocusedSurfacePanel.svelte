<script lang="ts">
  import { SurfaceStore, FocusedItemStore } from '$lib/stores';
  import { Surface, LinearFold, PlanarFace } from '$lib/core';

  import Panel from './Panel.svelte';
  import PanelBody from './PanelBody.svelte';
  import RotationField from './RotationField.svelte';
  import FoldField from './FoldField.svelte';

  let focusedSurface: Surface | null;
  let parentSurface: Surface | null;

  let pitch = 0;
  let yaw = 0;
  let roll = 0;

  let focusedFoldId: string | null = null;
  let focusedFoldAngle = 0;
  
  function onFocusedSurfaceUpdated() {
    if (!focusedSurface) {
      return;
    }

    parentSurface = SurfaceStore.get($SurfaceStore, focusedSurface.parentId);

    pitch = PlanarFace.calculatePitch(focusedSurface.face);
    yaw = PlanarFace.calculateYaw(focusedSurface.face);
    roll = PlanarFace.calculateRoll(focusedSurface.face);
  }

  FocusedItemStore.subscribe(focusedItem => {
    if (!focusedItem) {
      focusedSurface = null;
      return;
    }
    if (focusedItem.itemType !== "surface") {
      focusedSurface = null;
      return;
    }

    focusedSurface = SurfaceStore.get($SurfaceStore, focusedItem.itemId);
    onFocusedSurfaceUpdated();
  });
  SurfaceStore.subscribe(surface => {
    if (!focusedSurface) {
      return;
    }
    focusedSurface = SurfaceStore.get($SurfaceStore, focusedSurface.id);
    onFocusedSurfaceUpdated();
  });
</script>

{#if focusedSurface}
  <Panel left="300px" height="300px">
    <PanelBody>
      Name: {focusedSurface.name}<br/>
      {#if !focusedSurface.parentId}
        Pitch: <RotationField bind:value={pitch} />
        Yaw: <RotationField bind:value={yaw} />
        Roll: <RotationField bind:value={roll} />
      {/if}
      <h3>Points</h3>
      <ul>
        {#each focusedSurface.face.points as point}
          <li>({point.x}, {point.y})</li>
        {/each}
      </ul>

      {#if parentSurface}
        <h3>Perform Fold</h3>
        Fold along: <FoldField bind:value={focusedFoldId} surface={parentSurface} />
        Angle: <RotationField bind:value={focusedFoldAngle} />
        <button on:click={() => {
          SurfaceStore.createMutation({
            forwards: (value, [parentSurfaceId, foldId, surfaceToRotateId, rotationInDegrees], context) => {
              const parentSurface = SurfaceStore.get(value, parentSurfaceId);
              if (!parentSurface) {
                throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
              }

              const fold = SurfaceStore.getFold(value, foldId);
              if (!fold) {
                throw new Error(`Cannot find fold with id ${foldId}`);
              }

              let surfaceToRotate = SurfaceStore.get(value, surfaceToRotateId);
              if (!surfaceToRotate) {
                throw new Error(`Cannot find surface with id ${surfaceToRotateId}`);
              }

              surfaceToRotate = Surface.rotate(
                surfaceToRotate,
                LinearFold.toSpacial(fold, parentSurface),
                rotationInDegrees,
              );

              console.log('ROTATED', surfaceToRotate);

              return SurfaceStore.updateItem(value, surfaceToRotate.id, surfaceToRotate);
            },
            backwards: (value, [parentSurfaceId, foldId, surfaceToRotateId, rotationInDegrees], context) => {
              const parentSurface = SurfaceStore.get(value, parentSurfaceId);
              if (!parentSurface) {
                throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
              }

              const fold = SurfaceStore.getFold(value, foldId);
              if (!fold) {
                throw new Error(`Cannot find fold with id ${foldId}`);
              }

              let surfaceToRotate = SurfaceStore.get(value, surfaceToRotateId);
              if (!surfaceToRotate) {
                throw new Error(`Cannot find surface with id ${surfaceToRotateId}`);
              }

              surfaceToRotate = Surface.rotate(
                surfaceToRotate,
                LinearFold.toSpacial(fold, parentSurface),
                -1 * rotationInDegrees,
              );

              return SurfaceStore.updateItem(value, surfaceToRotate.id, surfaceToRotate);
            },
            requireFreshlyCreated: (args, context) => [
              { itemType: 'surface', itemId: args[2] },
            ],
          })(focusedSurface.parentId, focusedFoldId, focusedSurface.id, focusedFoldAngle);
        }}>Go</button>
      {/if}

      <h3>Split at fold</h3>
      Fold: <FoldField bind:value={focusedFoldId} surface={focusedSurface} />
      <button on:click={() => {
        SurfaceStore.createMutation({
          forwards: (value, [parentSurfaceId, foldId], context) => {
            const parentSurface = SurfaceStore.get(value, parentSurfaceId);
            if (!parentSurface) {
              throw new Error(`Cannot find surface with id ${parentSurfaceId}`);
            }

            const fold = SurfaceStore.getFold(value, foldId);
            if (!fold) {
              throw new Error(`Cannot find fold with id ${foldId}`);
            }

            const [surfaceA, surfaceB] = Surface.bisect(parentSurface, fold);

            // Ensure that surface ids and fold ids remain consistient as forwards / backwards is run
            //
            // FIXME: The fold part of ths isn't very robust. Ideally, this should be stored as a
            // mapping from like underlying svg element to id
            if (context.surfaceAId && context.surfaceAFoldIds) {
              surfaceA.id = context.surfaceAId;
              surfaceA.folds = surfaceA.folds.map((fold, index) => ({
                ...fold,
                id: context.surfaceAFoldIds[index] || fold.id,
              }));
            } else {
              context.surfaceAId = surfaceA.id;
              context.surfaceAFoldIds = surfaceA.folds.map(i => i.id);
            }
            if (context.surfaceBId && context.surfaceBFoldIds) {
              surfaceB.id = context.surfaceBId;
              surfaceB.folds = surfaceB.folds.map((fold, index) => ({
                ...fold,
                id: context.surfaceBFoldIds[index] || fold.id,
              }));
            } else {
              context.surfaceBId = surfaceB.id;
              context.surfaceBFoldIds = surfaceB.folds.map(i => i.id);
            }

            /* console.log('CONTEXT', context); */

            value = SurfaceStore.updateItem(value, parentSurface.id, s => ({...s, visible: false}));
            value = SurfaceStore.addItem(value, surfaceA);
            value = SurfaceStore.addItem(value, surfaceB);
            value = SurfaceStore.updateFold(value, foldId, f => ({
              ...f,
              surfaceAId: surfaceA.id,
              surfaceBId: surfaceB.id,
            }));

            return value;
          },
          backwards: (value, [parentSurfaceId, foldId], context) => {
            if (!context.surfaceAId) {
              throw new Error(`context.surfaceAId is not set!`);
            }
            if (!context.surfaceBId) {
              throw new Error(`context.surfaceBId is not set!`);
            }

            const surfaceA = SurfaceStore.get($SurfaceStore, context.surfaceAId);
            if (!surfaceA) {
              throw new Error(`Cannot find surface with id ${context.surfaceAId}`);
            }
            const surfaceB = SurfaceStore.get($SurfaceStore, context.surfaceBId);
            if (!surfaceB) {
              throw new Error(`Cannot find surface with id ${context.surfaceBId}`);
            }

            value = SurfaceStore.updateItem(value, parentSurfaceId, s => ({...s, visible: true}));
            value = SurfaceStore.removeItem(value, surfaceA.id);
            value = SurfaceStore.removeItem(value, surfaceB.id);
            value = SurfaceStore.updateFold(value, foldId, f => ({
              ...f,
              surfaceAId: null,
              surfaceBId: null,
            }));

            return value;
          },
        })(focusedSurface.id, focusedFoldId);
      }}>Split</button>

      <h3>Folds</h3>
      <ul>
        {#each focusedSurface.folds as fold (fold.id)}
          <li on:click={() => FocusedItemStore.focusItem('fold', fold.id)}>{fold.id}</li>
        {/each}
      </ul>
      <br />
      <br />
      <br />
      <br />
      {JSON.stringify(focusedSurface)}
    </PanelBody>
  </Panel>
{/if}

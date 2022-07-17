<script lang="ts">
  import { onMount } from 'svelte';
  import type { Matrix3 } from 'three';
  import { EditingDrawingStore } from '$lib/stores';
  import {
    DrawingGeometry,
    DrawingSurface,
    DrawingSurfaceFoldSet,
    DEFAULT_DRAWING_GEOMETRY_TRANSFORM,
  } from '$lib/core';
  import { parseSvgTransform } from '$lib/svg';
  import { Cyan2, Red4, Cyan7, Gray1, Gray10 } from '$lib/color';

  import DrawingEditViewportSVGLabel from './DrawingEditViewportSVGLabel.svelte';

  let focusedDrawingSurfaceId: DrawingSurface['id'] | null = null;
  let focusedDrawingSurface: DrawingSurface | null = null;
  $: focusedDrawingSurface = $EditingDrawingStore?.surfaces.find(s => s.id === focusedDrawingSurfaceId) || null;

  // Get a flat list of all geometries within a svg
  type DrawingGeometryWithMetadata = DrawingGeometry & {
    mode: 'none' | 'focused-drawing-surface' | 'focused-fold' | 'muted',
    selector: string | null;
  };
  function getDrawingGeometries(
    rootElem: Element | Document,
    focusedDrawingSurface: DrawingSurface | null,
    transformation: Matrix3 = DEFAULT_DRAWING_GEOMETRY_TRANSFORM,
  ): Array<DrawingGeometryWithMetadata> {
    return Array.from(rootElem.children).flatMap(child => {
      // Apply svg transforms to this element and all children of this element.
      const transformAttribute = child.getAttribute('transform');
      if (transformAttribute) {
        transformation = transformation.clone().multiply(parseSvgTransform(transformAttribute));
      }

      if (child.children.length === 0) {
        const geometry = DrawingGeometry.create(child, transformation);

        if (geometry) {
          // The child mode defines how the child should render
          // ie, if a drawing surface is selected, highlight the surface element and its folds
          const mode: DrawingGeometryWithMetadata['mode'] = (() => {
            // If nothing is focused, then use "none"
            if (!focusedDrawingSurface || !focusedDrawingSurface.geometry) {
              return 'none';
            }

            if (geometry.element === focusedDrawingSurface.geometry.element) {
              return 'focused-drawing-surface';
            }

            const folds = focusedDrawingSurface.foldSets.flatMap(foldSet => foldSet.folds);
            if (folds.find(fold => fold.geometry && geometry.element === fold.geometry.element)) {
              return 'focused-fold';
            }

            return 'muted';
          })();

          // The selector is the css selector that was used to target this element
          const selector = (() => {
            if (!$EditingDrawingStore) {
              return null;
            }
            if (!focusedDrawingSurface) {
              return null;
            }

            switch (mode) {
              case 'none':
                return null;
              case 'muted':
                return null;
              case 'focused-drawing-surface':
                return focusedDrawingSurface.geometrySelector;
              case 'focused-fold':
                const foldSet = focusedDrawingSurface.foldSets.find(foldSet => {
                  return foldSet.folds.find(fold => fold.geometry && geometry.element === fold.geometry.element);
                });
                if (!foldSet) {
                  return null;
                }

                return DrawingSurfaceFoldSet.getMoreSpecificSelectorForFold(
                  foldSet,
                  $EditingDrawingStore.media,
                  geometry,
                );
            }
          })();

          return [{...geometry, mode, selector}];
        } else {
          return [];
        }
      } else {
        return getDrawingGeometries(child, focusedDrawingSurface, transformation);
      }
    });
  }

  // When the page resizes, adjust the svg bounds
  let container: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let svgWidth = 0;
  let svgHeight = 0;
  onMount(() => {
    if (!container) {
      return;
    }

    const bbox = container.getBoundingClientRect();
    svgWidth = bbox.width;
    svgHeight = bbox.height;

    resizeObserver = new ResizeObserver(entries => {
      const bbox = entries[0].contentRect;
      svgWidth = bbox.width;
      svgHeight = bbox.height;
    });
    resizeObserver.observe(container);
  });

  let viewport = {
    top: -4,
    left: -300,
    zoom: 1,
  };
  // function fitToBounds() {
  //   if (!$EditingDrawingStore) {
  //     return;
  //   }
  //   const drawingWidth = parseInt($EditingDrawingStore.media.element.getAttribute('width'), 10);
  //   const drawingHeight = parseInt($EditingDrawingStore.media.element.getAttribute('height'), 10);
  //
  //   const scale = drawingWidth / svgWidth;
  //
  //   viewportScale = scale;
  // }
</script>

<style>
  @import "../../styles/variables.css";

  .drawingEditViewport {
    position: absolute;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    background-color: var(--gray-4);
    overflow: hidden;
  }
</style>

{#if $EditingDrawingStore}
  <div class="drawingEditViewport" bind:this={container}>
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      on:wheel={event => {
        event.preventDefault();
        const dx = event.deltaX;
        const dy = event.deltaY;

        if (event.ctrlKey || event.metaKey) {
          // limit scroll wheel sensitivity for mouse users
          const limit = 8;
          const scrollDelta = Math.max(-limit, Math.min(limit, dy));

          const nextZoomFactor =
            viewport.zoom + viewport.zoom * scrollDelta * -0.01;

          const targetX = viewport.left + event.clientX / viewport.zoom;
          const targetY = viewport.top + event.clientY / viewport.zoom;

          const top = targetY - event.clientY / nextZoomFactor;
          const left = targetX - event.clientX / nextZoomFactor;

          viewport = {
            zoom: nextZoomFactor,
            top,
            left,
          };
        }

        // otherwise pan
        viewport = {
          ...viewport,
          top: viewport.top + dy / viewport.zoom,
          left: viewport.left + dx / viewport.zoom,
        };
      }}
    >
      <g transform={`scale(${viewport.zoom}) translate(${-1 * viewport.left}, ${-1 * viewport.top})`}>
        {#each getDrawingGeometries($EditingDrawingStore.media.document, focusedDrawingSurface) as drawingGeometryWithMetadata}
          {#if drawingGeometryWithMetadata.type == "rect"}
            <rect
              x={drawingGeometryWithMetadata.origin.x}
              y={drawingGeometryWithMetadata.origin.y}
              width={drawingGeometryWithMetadata.width}
              height={drawingGeometryWithMetadata.height}
              fill={{
                "none": Gray1,
                "focused-drawing-surface": Cyan2,
                "focused-fold": "", // This is an impossible case
                "muted": "rgba(31, 31, 31, 0.1)", // FIXME: this is "Gray10" with 10% opacity
              }[drawingGeometryWithMetadata.mode]}
              stroke={{
                "none": Gray10,
                "focused-drawing-surface": Cyan7,
                "focused-fold": "", // This is an impossible case
                "muted": "rgba(31, 31, 31, 0.5)", // FIXME: this is "Gray10" with 50% opacity
              }[drawingGeometryWithMetadata.mode]}
              stroke-width={2 / viewport.zoom}
            />
            {#if drawingGeometryWithMetadata.selector}
              <DrawingEditViewportSVGLabel
                x={drawingGeometryWithMetadata.origin.x}
                y={drawingGeometryWithMetadata.origin.y}
                label={drawingGeometryWithMetadata.selector}
                fill={Cyan7}
                viewport={viewport}
              />
            {/if}
          {:else if drawingGeometryWithMetadata.type === "path"}
            <path
              d={`
                M${drawingGeometryWithMetadata.segments[0][0].x},${drawingGeometryWithMetadata.segments[0][0].y}
                ${drawingGeometryWithMetadata.segments.map(segment => `L${segment[1].x},${segment[1].y}`).join(' ')}
                L${drawingGeometryWithMetadata.segments[0][0].x}, ${drawingGeometryWithMetadata.segments[0][0].y}
              `}
              fill={{
                "none": Gray1,
                "focused-drawing-surface": Cyan2,
                "focused-fold": "transparent", // This is an impossible case
                "muted": "rgba(31, 31, 31, 0.1)", // FIXME: this is "Gray10" with 10% opacity
              }[drawingGeometryWithMetadata.mode]}
              stroke={{
                "none": Gray10,
                "focused-drawing-surface": "", // This is an impossible case
                "focused-fold": Red4,
                "muted": "rgba(31, 31, 31, 0.5)", // FIXME: this is "Gray10" with 50% opacity
              }[drawingGeometryWithMetadata.mode]}
              stroke-dasharray={drawingGeometryWithMetadata.mode === "focused-fold" ? `1px` : ""}
              stroke-width={2 / viewport.zoom}
            />
            {#if drawingGeometryWithMetadata.selector}
              <DrawingEditViewportSVGLabel
                x={drawingGeometryWithMetadata.segments[0][0].x}
                y={drawingGeometryWithMetadata.segments[0][0].y}
                label={drawingGeometryWithMetadata.selector}
                fill={Red4}
                viewport={viewport}
              />
            {/if}
          {:else if drawingGeometryWithMetadata.type === "line"}
            <line
              x1={drawingGeometryWithMetadata.a.x}
              y1={drawingGeometryWithMetadata.a.y}
              x2={drawingGeometryWithMetadata.b.x}
              y2={drawingGeometryWithMetadata.b.y}
              stroke={{
                "none": Gray10,
                "focused-drawing-surface": "", // This is an impossible case
                "focused-fold": Red4,
                "muted": "rgba(31, 31, 31, 0.5)", // FIXME: this is "Gray10" with 50% opacity
              }[drawingGeometryWithMetadata.mode]}
              stroke-dasharray={drawingGeometryWithMetadata.mode === "focused-fold" ? `1px` : ""}
              stroke-width={2 / viewport.zoom}
            />
            {#if drawingGeometryWithMetadata.selector}
              <DrawingEditViewportSVGLabel
                x={drawingGeometryWithMetadata.a.x}
                y={drawingGeometryWithMetadata.a.y}
                label={drawingGeometryWithMetadata.selector}
                fill={Red4}
                viewport={viewport}
              />
            {/if}
          {/if}
        {/each}
      </g>
    </svg>
  </div>
{/if}

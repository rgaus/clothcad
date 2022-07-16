<script lang="ts">
  import { onMount } from 'svelte';
  import { Gray2, Gray10 } from '$lib/color';

  export let x: number;
  export let y: number;
  export let label: string;
  export let fill: string = Gray10;
  export let fontSize = 18;
  export let viewport: { zoom: number };

  const horizontalPaddingInPx = 8;
  const verticalPaddingInPx = 4;

  let textElement: SVGTextElement | null = null;
  let textWidth = 0;
  onMount(() => {
    if (!textElement) { return; }
    const { width } = textElement.getBBox();
    textWidth = width;
  });

  let width = 0, height = 0;
  $: width = textWidth + (horizontalPaddingInPx * 2);
  $: height = fontSize + (verticalPaddingInPx * 2);
</script>

<g transform={`translate(${x},${y}) scale(${1 / viewport.zoom})`} style="user-select: none;">
  <rect
    fill={fill}
    x={-1 * (width / 2)}
    y={-1 * (height / 2)}
    width={width}
    height={height}
    rx={height / 2}
    ry={height / 2}
  />
  <text
    bind:this={textElement}
    font-size={`${fontSize}px`}
    font-family="var(--font-family)"
    text-anchor="middle"
    alignment-baseline="middle"
    fill={Gray2}
  >{label}</text>
</g>

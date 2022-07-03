import type { Scene, PerspectiveCamera, WebGLRenderer } from 'three';
import type { Item } from '$lib/stores';

export type ViewportContext = {
  getScene: () => Scene | null;
  getCamera: () => PerspectiveCamera | null;
  getRenderer: () => WebGLRenderer | null;

  registerItem: (threeGeometryId: number, item: Item) => void;
  deregisterItem: (threeGeometryId: number) => void;
  getItemWithThreeGeometry: (threeGeometryId: number) => Item | null;
};

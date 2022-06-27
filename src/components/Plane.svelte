<script lang="ts">
	import * as SC from 'svelte-cubed';
  import { Vector3, MeshStandardMaterial, BufferGeometry, Float32BufferAttribute } from 'three';
  import { PlanarFace } from '$lib/core';

  // https://codeworkshop.dev/blog/2020-04-03-adding-orbit-controls-to-react-three-fiber/
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
  import { ConvexHull } from "three/examples/jsm/math/ConvexHull";
  class ConvexGeometry extends BufferGeometry {
    constructor( points = [] ) {
      super(); // buffers

      const vertices = [];
      const normals = [];

      const convexHull = new ConvexHull().setFromPoints( points ); // generate vertices and normals

      const faces = convexHull.faces;

      for ( let i = 0; i < faces.length; i ++ ) {

        const face = faces[ i ];
        let edge = face.edge; // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

        do {

          const point = edge.head().point;
          vertices.push( point.x, point.y, point.z );
          normals.push( face.normal.x, face.normal.y, face.normal.z );
          edge = edge.next;

        } while ( edge !== face.edge );

      } // build geometry


      this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
      this.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
    }
  }

  export let face: PlanarFace;
  export let color: number;

  const points = (() => {
    const p = [...face.points];
    if (p[0].x !== p[p.length-1].x || p[0].y !== p[p.length-1].y) {
      p.push(p[0]);
    }
    return p.map(pt => new Vector3(pt.x, pt.y, pt.z));
  })();
  console.log('POINTS', points);
</script>

<SC.Mesh
  geometry={new ConvexGeometry(points)}
  material={new MeshStandardMaterial({ color })}
/>

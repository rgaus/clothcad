<script lang="ts">
	import * as THREE from 'three';
	import * as SC from 'svelte-cubed';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

  function epsilon(value: number) {
    return Math.abs(value) < 1e-10 ? 0 : value;
  }

  function getCameraCSSMatrix(matrix: THREE.Matrix4) {
    const { elements } = matrix;

    return `matrix3d(
      ${epsilon(elements[0])},
      ${epsilon(-elements[1])},
      ${epsilon(elements[2])},
      ${epsilon(elements[3])},
      ${epsilon(elements[4])},
      ${epsilon(-elements[5])},
      ${epsilon(elements[6])},
      ${epsilon(elements[7])},
      ${epsilon(elements[8])},
      ${epsilon(-elements[9])},
      ${epsilon(elements[10])},
      ${epsilon(elements[11])},
      ${epsilon(elements[12])},
      ${epsilon(-elements[13])},
      ${epsilon(elements[14])},
      ${epsilon(elements[15])})`;
  }

  export let camera: any | undefined;
  let viewCubeTransform: string = '';

  const mat = new THREE.Matrix4();
	SC.onFrame(() => {
    if (camera) {
      mat.extractRotation(camera.object.matrixWorldInverse);
      viewCubeTransform = `translateZ(-300px) ${getCameraCSSMatrix(mat)}`;
    }
	});

  type Orientation = {
    offsetFactor: {
      x: number;
      y: number;
      z: number;
    };
    axisAngle: {
      x: number;
      y: number;
      z: number;
    };
  };

  const TOP: Orientation = {
    offsetFactor: {
      x: 0,
      y: 0,
      z: 1,
    },
    axisAngle: {
      x: 0,
      y: 0,
      z: 0,
    },
  };

  const BOTTOM: Orientation = {
    offsetFactor: {
      x: 0,
      y: 0,
      z: -1,
    },
    axisAngle: {
      x: Math.PI,
      y: 0,
      z: 0,
    },
  };

  const FRONT: Orientation = {
    offsetFactor: {
      x: 0,
      y: -1,
      z: 0,
    },
    axisAngle: {
      x: Math.PI / 2,
      y: 0,
      z: 0,
    },
  };

  const BACK: Orientation = {
    offsetFactor: {
      x: 0,
      y: 1,
      z: 0,
    },
    axisAngle: {
      x: -(Math.PI / 2),
      y: 0,
      z: Math.PI,
    },
  };

  const LEFT: Orientation = {
    offsetFactor: {
      x: -1,
      y: 0,
      z: 0,
    },
    axisAngle: {
      x: Math.PI / 2,
      y: -(Math.PI / 2),
      z: 0,
    },
  };

  const RIGHT: Orientation = {
    offsetFactor: {
      x: 1,
      y: 0,
      z: 0,
    },
    axisAngle: {
      x: Math.PI / 2,
      y: Math.PI / 2,
      z: 0,
    },
  };

  const tweenCamera = (orientation: Orientation) => {
    const { offsetFactor, axisAngle } = orientation;

    if (camera) {
      const offsetUnit = camera.object.position.length();
      const offset = new THREE.Vector3(
        offsetUnit * offsetFactor.x,
        offsetUnit * offsetFactor.y,
        offsetUnit * offsetFactor.z
      );

      const center = new THREE.Vector3();
      const finishPosition = center.add(offset);

      /* const positionTween = new TWEEN.Tween(cameraRef.current.position) */
      /*   .to(finishPosition, 300) */
      /*   .easing(TWEEN.Easing.Circular.Out); */
      camera.object.position.set(finishPosition.x, finishPosition.y, finishPosition.z);

      const euler = new THREE.Euler(axisAngle.x, axisAngle.y, axisAngle.z);

      // rotate camera too!
      const finishQuaternion = new THREE.Quaternion()
        .copy(camera.object.quaternion)
        .setFromEuler(euler);

      /* const quaternionTween = new TWEEN.Tween(camera.object.quaternion) */
      /*   .to(finishQuaternion, 300) */
      /*   .easing(TWEEN.Easing.Circular.Out); */
      camera.object.quaternion.set(finishQuaternion.w, finishQuaternion.x, finishQuaternion.y, finishQuaternion.z);

      console.log(finishPosition, finishQuaternion)
      dispatch('complete');

      /* positionTween.start(); */
      /* quaternionTween.start(); */
    }
  };
</script>

<style>
  .viewcube {
    width: 120px;
    height: 120px;
    margin: 10px;
    perspective: 400px;
    position: absolute;
    right: 40px;
    top: 20px;
    z-index: 2;
  }

  /* .cube { */
  /*   width: 100px; */
  /*   height: 100px; */
  /*   position: relative; */
  /*   transform-style: preserve-3d; */
  /*   transform: translateZ(-300px); */
  /*   text-transform: uppercase; */
  /* } */
  .cube__face {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    width: 120px;
    height: 120px;
    border: 2px solid #7d7d7d;
    line-height: 100px;
    font-size: 25px;
    font-weight: bold;
    color: #7d7d7d;
    text-align: center;
    background: #ddd;
    transition: all 0.2s;
    cursor: pointer;
    user-select: none;
  }
  .cube__face:hover {
    background: #7d7d7d;
    color: #fff;
  }
  .cube__face--front {
    transform: rotateX(270deg) translateZ(-60px);
  }
  .cube__face--right {
    transform: rotateY(90deg) rotateX(180deg) rotateZ(270deg) translateZ(-60px);
  }
  .cube__face--back {
    transform: rotateY(180deg) rotateX(90deg) translateZ(-60px);
  }
  .cube__face--left {
    transform: rotateY(-90deg) rotateX(180deg) rotateZ(90deg) translateZ(-60px);
  }
  .cube__face--top {
    transform: rotateX(180deg) translateZ(-60px);
    z-index: -1;
  }
  .cube__face--bottom {
    transform: translateZ(-60px);
    z-index: -1;
  }
</style>

<div class="viewcube" style:transform={viewCubeTransform} style:display={viewCubeTransform ? 'block' : 'none'}>
  <div
    class='cube__face cube__face--front'
    on:click={() => tweenCamera(FRONT)}
  >
    front
  </div>
  <div
    class='cube__face cube__face--back'
    on:click={() => tweenCamera(BACK)}
  >
    back
  </div>
  <div
    class='cube__face cube__face--right'
    on:click={() => tweenCamera(RIGHT)}
  >
    right
  </div>
  <div
    class='cube__face cube__face--left'
    on:click={() => tweenCamera(LEFT)}
  >
    left
  </div>
  <div
    class='cube__face cube__face--top'
    on:click={() => tweenCamera(TOP)}
  >
    top
  </div>
  <div
    class='cube__face cube__face--bottom'
    on:click={() => tweenCamera(BOTTOM)}
  >
    bottom
  </div>
</div>

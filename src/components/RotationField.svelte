<script lang="ts">
  export let value: number = 0;
  let oldValue = -1;

  let valueString = '';
  let valueStringInvalid = false;
  $: {
    if (value !== oldValue) {
      valueString = `${value}`;
      oldValue = value;
    }
  }
  $: valueStringInvalid = !/^[0-9]+(\.[0-9]*)?$/.test(valueString);

  function normalizeAngle(angle: number): number {
    while (angle < 0) {
      angle += 360;
    }
    while (angle >= 360) {
      angle -= 360;
    }
    return angle;
  }

const DRAG_DEGREES_PER_PIXEL = 0.5;
  let initialValue = 0, startX = 0, startY = 0;
  function onMouseMove(e) {
    const currentX = e.clientX;
    const currentY = e.clientY;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    const delta = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
    let deltaInDegrees = delta * DRAG_DEGREES_PER_PIXEL;

    // Take into account sign by looking at the major axis
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0) {
      deltaInDegrees *= -1;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      deltaInDegrees *= -1;
    }

    value = normalizeAngle(Math.round(initialValue + deltaInDegrees));
  }
  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
  }
</script>

<style>
  @import "../styles/variables.css";

  .rotationFieldWrapper {
    display: flex;
    border-radius: var(--border-radius-2);
    overflow: hidden;
  }

  .rotationFieldWrapper input {
    border: 0px;
    padding-left: var(--space-1);
    background-color: var(--white);
    font-family: var(--font-family);
    font-size: var(--font-size);

    border: 1px solid var(--gray-7);
    border-right: 0px;
    width: 48px;
  }
  .rotationFieldWrapper input:focus {
    border-color: var(--cyan-7);
    outline: none;
  }
  .rotationFieldWrapper input.invalid {
    border-color: var(--red-7);
  }

  .rotationHandleWrapper {
    width: var(--space-6);
    height: var(--space-6);

    background-color: var(--gray-6);
    border: 1px solid var(--gray-7);
    border-left: 0px;
    overflow: hidden;

    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: center;

    --rotation-handle-size: 6px;
    --rotation-handle-offset: var(--space-1);
  }

  .rotator {
    width: var(--space-4);
    height: var(--space-4);
    border-radius: 50%;
    background-color: var(--gray-5);
    position: relative;
  }
  .rotationHandleWrapper:active .rotator {
    opacity: 0.75;
  }

  .handle {
    position: absolute;
    top: calc(50% - (var(--rotation-handle-size) / 2) - var(--rotation-handle-offset));
    left: calc(50% - (var(--rotation-handle-size) / 2));
    width: var(--rotation-handle-size);
    height: var(--rotation-handle-size);
    border-radius: 50%;
    background-color: var(--cyan-7);
  }
</style>

<div class="rotationFieldWrapper">
  <input
    type="text"
    placeholder="90&deg;"
    class:invalid={valueStringInvalid}
    bind:value={valueString}
    on:blur={() => {
      if (valueStringInvalid) {
        return;
      }
      value = parseFloat(valueString);
    }}
  />
  <div
    class="rotationHandleWrapper"
    on:click={(evt) => {
      value = normalizeAngle(value + (evt.shiftKey ? 45 : 90));
    }}
    on:mousedown={(evt) => {
      if (evt.buttons !== 1) {
        return;
      }
      document.body.style.userSelect = 'none';
      initialValue = value;
      startX = evt.clientX;
      startY = evt.clientY;

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }}
  >
    <div class="rotator" style:transform={`rotate(${value}deg)`}>
      <div class="handle"></div>
    </div>
  </div>
</div>

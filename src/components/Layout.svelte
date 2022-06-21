<style>
  @import "../styles/variables.css";

  .outer {
    position: absolute;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;

    display: flex;
  }

  /* .sidebar { */
  /*   width: 300px; */
  /* } */

  .main {
    position: relative;
    flex-grow: 1;
    flex-shrink: 1;
    height: 100vh;
  }
</style>

<div class="outer">
  <div class="sidebar">
    <slot name="sidebar" />
  </div>
  <div class="main">
    <slot name="main" />
  </div>
</div>

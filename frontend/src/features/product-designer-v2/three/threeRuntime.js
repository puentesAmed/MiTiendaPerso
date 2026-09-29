let runtimePromise;

export function loadThreeRuntime() {
  runtimePromise ||= Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/controls/OrbitControls.js"),
  ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => ({ THREE, GLTFLoader, OrbitControls }));
  return runtimePromise;
}


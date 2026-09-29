import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((result) => {
        this.result = result;
        this.onloadend?.();
      }, (error) => this.onerror?.(error));
    }
  };
}

const scene = new THREE.Scene();
scene.name = "DevelopmentMugScene";

const printable = new THREE.MeshStandardMaterial({ name: "PrintableSurface", color: 0xffffff, roughness: 0.58, metalness: 0 });
const ceramic = new THREE.MeshStandardMaterial({ name: "CeramicDetail", color: 0xffffff, roughness: 0.5, metalness: 0, side: THREE.DoubleSide });

const bodyGeometry = new THREE.CylinderGeometry(1, 0.94, 1.6, 96, 1, true);
// CylinderGeometry places its UV seam at +Z. Rotating only the geometry puts
// that seam behind the mug while preserving a left-to-right readable front.
bodyGeometry.rotateY(Math.PI);
const body = new THREE.Mesh(bodyGeometry, printable);
body.name = "MugBody";
scene.add(body);

const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.94, 96), ceramic);
bottom.name = "MugBottom";
bottom.position.y = -0.8;
bottom.rotation.x = Math.PI / 2;
scene.add(bottom);

const interior = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.81, 1.38, 96, 1, true), ceramic);
interior.name = "MugInterior";
interior.position.y = 0.08;
scene.add(interior);

const innerBottom = new THREE.Mesh(new THREE.CircleGeometry(0.81, 96), ceramic);
innerBottom.name = "MugInnerBottom";
innerBottom.position.y = -0.61;
innerBottom.rotation.x = -Math.PI / 2;
scene.add(innerBottom);

const rim = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.07, 20, 96), ceramic);
rim.name = "MugRim";
rim.position.y = 0.8;
rim.rotation.x = Math.PI / 2;
scene.add(rim);

const handleCurve = new THREE.CubicBezierCurve3(
  new THREE.Vector3(1, 0.5, 0),
  new THREE.Vector3(1.75, 0.48, 0),
  new THREE.Vector3(1.75, -0.48, 0),
  new THREE.Vector3(1, -0.5, 0),
);
const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 64, 0.12, 20, false), ceramic);
handle.name = "MugHandle";
scene.add(handle);

const exporter = new GLTFExporter();
const binary = await exporter.parseAsync(scene, { binary: true, onlyVisible: true });
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(projectRoot, "public", "models", "mug-development-v1.glb");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.from(binary));
console.log(output);


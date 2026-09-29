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

const printable = new THREE.MeshStandardMaterial({ name: "PrintableSurface", color: 0xffffff, roughness: 0.62, metalness: 0 });
const ceramic = new THREE.MeshStandardMaterial({ name: "CeramicDetail", color: 0xf7f7f4, roughness: 0.52, metalness: 0 });

const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.6, 64, 1, true), printable);
body.name = "MugBody";
scene.add(body);

const bottom = new THREE.Mesh(new THREE.CircleGeometry(1, 64), ceramic);
bottom.name = "MugBottom";
bottom.position.y = -0.8;
bottom.rotation.x = Math.PI / 2;
scene.add(bottom);

const handle = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.14, 20, 48, Math.PI * 1.55), ceramic);
handle.name = "MugHandle";
handle.position.set(0.95, 0, 0);
handle.rotation.z = -Math.PI * 0.775;
scene.add(handle);

const exporter = new GLTFExporter();
const binary = await exporter.parseAsync(scene, { binary: true, onlyVisible: true });
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(projectRoot, "public", "models", "mug-development-v1.glb");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.from(binary));
console.log(output);


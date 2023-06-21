<template>
  <div id="map"></div>
</template>

<script setup>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { onMounted } from "vue";
import * as d3 from "d3";
onMounted(() => {
  const scene = new THREE.Scene();

  // const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);
  const ambientLight = new THREE.AmbientLight(0xd4e7fd, 4);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xe8eaeb, 0.2);
  directionalLight.position.set(0, 10, 5);
  const directionalLight2 = directionalLight.clone();
  directionalLight2.position.set(0, 10, -5);
  const directionalLight3 = directionalLight.clone();
  directionalLight3.position.set(5, 10, 0);
  const directionalLight4 = directionalLight.clone();
  directionalLight4.position.set(-5, 10, 0);
  scene.add(directionalLight);
  scene.add(directionalLight2);
  scene.add(directionalLight3);
  scene.add(directionalLight4);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 8;
  camera.position.z = 8;

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0px";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("map").appendChild(labelRenderer.domElement);

  const renderer = new THREE.WebGLRenderer({ alpha: true });

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("map").appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  animate();
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
  });

  const url = "https://geo.datav.aliyun.com/areas_v3/bound/330000_full.json";
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const map = createMap(data);
      scene.add(map);

      let intersect = null;
      window.addEventListener("pointerdown", (event) => {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster
          .intersectObjects(map.children)
          .filter((item) => item.object.type !== "Line");
        if (intersects.length > 0) {
          if (intersects[0].object.type === "Mesh") {
            if (intersect) isAplha(intersect, 1);
            intersect = intersects[0].object.parent;
            isAplha(intersect, 0.4);
          }
          if (intersects[0].object.type === "Sprite") {
            console.log(intersects[0].object);
          }
        } else {
          if (intersect) isAplha(intersect, 1);
        }
        function isAplha(intersect, opacity) {
          intersect.children.forEach((item) => {
            if (item.type === "Mesh") {
              item.material.opacity = opacity;
            }
          });
        }
      });
    });
});

const offsetXY = d3.geoMercator();

const createMap = (data) => {
  const map = new THREE.Object3D();
  const center = data.features[0].properties.centroid;
  offsetXY.center(center).translate([0, 0]);
  data.features.forEach((feature) => {
    const unit = new THREE.Object3D();
    const { centroid, center, name } = feature.properties;
    const { coordinates, type } = feature.geometry;
    const point = centroid || center || [0, 0];

    const color = new THREE.Color(`hsl(
      ${233},
      ${Math.random() * 30 + 55}%,
      ${Math.random() * 30 + 55}%)`).getHex();
    const depth = Math.random() * 0.3 + 0.3;

    const label = createLabel(name, point, depth);
    const icon = createIcon(center, depth);

    coordinates.forEach((coordinate) => {
      if (type === "MultiPolygon") coordinate.forEach((item) => fn(item));
      if (type === "Polygon") fn(coordinate);

      function fn(coordinate) {
        unit.name = name;
        const mesh = createMesh(coordinate, color, depth);
        const line = createLine(coordinate, depth);
        unit.add(mesh, ...line);
      }
    });
    map.add(unit, label, icon);
    setCenter(map);
  });
  return map;
};
const createMesh = (data, color, depth) => {
  const shape = new THREE.Shape();
  data.forEach((item, idx) => {
    const [x, y] = offsetXY(item);

    if (idx === 0) shape.moveTo(x, -y);
    else shape.lineTo(x, -y);
  });

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false,
  };
  const materialSettings = {
    color: color,
    emissive: 0x000000,
    roughness: 0.45,
    metalness: 0.8,
    transparent: true,
    side: THREE.DoubleSide,
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial(materialSettings);
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
};
const createLine = (data, depth) => {
  const points = [];
  data.forEach((item) => {
    const [x, y] = offsetXY(item);
    points.push(new THREE.Vector3(x, -y, 0));
  });
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const uplineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const downlineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

  const upLine = new THREE.Line(lineGeometry, uplineMaterial);
  const downLine = new THREE.Line(lineGeometry, downlineMaterial);
  downLine.position.z = -0.0001;
  upLine.position.z = depth + 0.0001;
  return [upLine, downLine];
};
const createLabel = (name, point, depth) => {
  const div = document.createElement("div");
  div.style.color = "#fff";
  div.style.fontSize = "12px";
  div.style.textShadow = "1px 1px 2px #047cd6";
  div.textContent = name;
  const label = new CSS2DObject(div);
  label.scale.set(0.01, 0.01, 0.01);
  const [x, y] = offsetXY(point);
  label.position.set(x, -y, depth);
  return label;
};
const createIcon = (point, depth) => {
  const url = new URL("../assets/icon.png", import.meta.url).href;
  const map = new THREE.TextureLoader().load(url);
  const material = new THREE.SpriteMaterial({
    map: map,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  const [x, y] = offsetXY(point);
  sprite.scale.set(0.3, 0.3, 0.3);

  sprite.position.set(x, -y, depth + 0.2);
  sprite.renderOrder = 1;

  return sprite;
};
const setCenter = (map) => {
  map.rotation.x = -Math.PI / 2;
  const box = new THREE.Box3().setFromObject(map);
  const center = box.getCenter(new THREE.Vector3());

  const offset = [0, 0];
  map.position.x = map.position.x - center.x - offset[0];
  map.position.z = map.position.z - center.z - offset[1];
};
</script>

<style>
#map {
  background-color: #d4e7fd;
}
</style>

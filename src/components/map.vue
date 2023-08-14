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
import * as TWEEN from "@tweenjs/tween.js";
import { onMounted } from "vue";
import Dmap from "./map.js";

onMounted(() => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 3;
  camera.position.z = 3;

  // 创建球体表示移动的点
  const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // 创建贝塞尔曲线
  const startPoint = new THREE.Vector3(-2, 0, 0);
  const endPoint = new THREE.Vector3(2, 0, 0);
  const controlPoint = new THREE.Vector3(0, 4, 0);
  const curve = new THREE.QuadraticBezierCurve3(
    startPoint,
    controlPoint,
    endPoint
  );
  const curvePoints = curve.getPoints(50);

  // 添加曲线路径线
  const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const curveMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const curveObject = new THREE.Line(curveGeometry, curveMaterial);
  scene.add(curveObject);

  // 使用Tween.js库控制球体的移动动画
  const targetPosition = { x: 0, y: 0, z: 0 };
  const tween = new TWEEN.Tween(targetPosition)
    .to(endPoint, 2000) // 动画持续时间
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      sphere.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
    })
    .start();
  const vertexShader = `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

  const fragmentShader = `
      varying vec3 vPosition;
      void main() {
        float intensity = 1.0 - length(vPosition) * 0.1;
        gl_FragColor = vec4(0.0, 0.7, 1.0, intensity);
      }
    `;

  const glowingMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
  });

  const glowingSphere = new THREE.Mesh(sphereGeometry, glowingMaterial);
  glowingSphere.scale.set(1.2, 1.2, 1.2); // 使流光的球体稍大一点，增强效果
  scene.add(glowingSphere);

  const url = "https://geo.datav.aliyun.com/areas_v3/bound/330000_full.json";
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const map = Dmap.Map(data);
      console.log(map);

      map.setIcon(
        [
          [119, 28],
          [120, 28],
          [119, 29],
        ],
        "../assets/icon.png"
      );
      map.setLabel([
        [119, 28, "杭州"],
        [120, 28, "上海"],
        [119, 29, "温州"],
      ]);
      scene.add(map.map);

      let intersect = null;
      window.addEventListener("pointerdown", (event) => {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster
          .intersectObjects(scene.children)
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
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
  {
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
  }

  const css2dRenderder = new CSS2DRenderer();
  css2dRenderder.domElement.style.position = "absolute";
  css2dRenderder.domElement.style.top = "0px";
  css2dRenderder.domElement.style.pointerEvents = "none";
  css2dRenderder.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("map").appendChild(css2dRenderder.domElement);

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("map").appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const animate = () => {
    TWEEN.update();
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    css2dRenderder.render(scene, camera);
  };
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    css2dRenderder.setSize(window.innerWidth, window.innerHeight);
  });
});
</script>

<style>
#map {
  background-color: #d4e7fd;
  background-color: #000;
}
</style>

import * as d3 from "d3";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
const offsetXY = d3.geoMercator();

export class Map {
  constructor(data) {
    this.map = this.init(data);
    this.setCenter();
  }
  init(data) {
    const map = new THREE.Object3D();
    const baseCoordinate = data.features[0].properties.centroid;
    offsetXY.center(baseCoordinate).translate([0, 0]);
    data.features.forEach((feature) => {
      const unit = new THREE.Object3D();
      const { centroid, center, name } = feature.properties;
      const { coordinates, type } = feature.geometry;

      const color = new THREE.Color(`hsl(
          ${233},
          ${Math.random() * 30 + 55}%,
          ${Math.random() * 30 + 55}%)`).getHex();
      const depth = 0.3;

      if (centroid) {
        const label = createLabel(centroid, name, depth);
        unit.add(label);
      }
      if (center) {
        const icon = createIcon(center, null, depth);
        unit.add(icon);
      }

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
      map.add(unit);
    });
    return map;
  }
  setCenter(point = [0, 0]) {
    const map = this.map;
    map.rotation.x = -Math.PI / 2;
    const box = new THREE.Box3().setFromObject(map);
    const center = box.getCenter(new THREE.Vector3());

    map.position.x = map.position.x - center.x - point[0];
    map.position.z = map.position.z - center.z - point[1];
  }
  setIcon(Coordinates, url) {
    const map = this.map;
    const group = new THREE.Group();
    Coordinates.forEach((item) => {
      const icon = createIcon(item, url, 0.3);
      group.add(icon);
    });
    map.add(group);
  }
  setLabel(Coordinates) {
    const map = this.map;
    const group = new THREE.Group();
    Coordinates.forEach((item) => {
      const label = createLabel([item[0], item[1]], item[2], 0.3);
      group.add(label);
    });
    map.add(group);
  }
}

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
const createLabel = (point, name, depth) => {
  const div = document.createElement("div");
  div.style.color = "#fff";
  div.style.fontSize = "12px";
  div.style.textShadow = "1px 1px 2px #047cd6";
  div.textContent = name;
  const label = new CSS2DObject(div);

  const [x, y] = offsetXY(point);
  label.position.set(x, -y, depth);
  return label;
};
const createIcon = (point, url, depth = 0) => {
  url = url || "../assets/icon.png";
  const map = new THREE.TextureLoader().load(
    new URL(url, import.meta.url).href
  );

  const material = new THREE.SpriteMaterial({
    map: map,
    transparent: true,
  });

  const sprite = new THREE.Sprite(material);
  console.log(point);
  const [x, y] = offsetXY(point);

  sprite.scale.set(0.3, 0.3, 0.3);

  const box = new THREE.Box3().setFromObject(sprite);
  const size = box.getSize(new THREE.Vector3());

  sprite.position.set(x, -y, depth + size.x / 2);
  sprite.renderOrder = 1;

  return sprite;
};

const Dmap = {
  Map: (data) => new Map(data),
};
export default Dmap;

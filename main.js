import * as THREE from "/three";
import { GLTFLoader } from "/three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "/three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "/three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "/three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "/three/examples/jsm/shaders/FXAAShader.js";
import * as dat from '/lil-gui';

import { CustomOutlinePass } from "./CustomOutlinePass.js";
import FindSurfaces from "./FindSurfaces.js";

const gui = new dat.GUI;

// Camera & Scene
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(5, 2.5, 4);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xD9EFEB); //0xD9EFEB
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("canvas"),
});
renderer.setSize(window.innerWidth, window.innerHeight);

const wholeScene = new THREE.Group();

scene.position.set(0.68, -0.04, -0.64);

var sc = gui.addFolder("scene");
sc.add(scene.position, "x").min(-20).max(20);
sc.add(scene.position, "y").min(-20).max(20);
sc.add(scene.position, "z").min(-20).max(20);
sc.add(wholeScene.rotation, "x").min(-20).max(20);
sc.add(wholeScene.rotation, "y").min(-20).max(20);
sc.add(wholeScene.rotation, "z").min(-20).max(20);

//Light
const light = new THREE.AmbientLight(0xffffff, 3);
scene.add(light);

const pointLight = new THREE.PointLight(0xffffff, 5);
pointLight.intensity = 350;
pointLight.position.x = -3;
pointLight.position.y = 20;
pointLight.position.z = -20;
scene.add(pointLight);

var pointLGui = gui.addFolder("PointLight");
pointLGui.add(pointLight, "intensity").min(0).max(500);
pointLGui.add(pointLight.position, "x").min(-20).max(20);
pointLGui.add(pointLight.position, "y").min(-20).max(20);
pointLGui.add(pointLight.position, "z").min(-20).max(20);

var lightGui = gui.addFolder("Light");
lightGui.add(light, "intensity").min(0).max(10);

// Post processing
const depthTexture = new THREE.DepthTexture();
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    depthTexture: depthTexture,
    depthBuffer: true,
  }
);

// Initial render pass
const composer = new EffectComposer(renderer, renderTarget);
const pass = new RenderPass(scene, camera);
composer.addPass(pass);

// Outline pass
var bGroup = new THREE.Group();

const customOutline = new CustomOutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
composer.addPass(customOutline);

// Antialias pass
const effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms["resolution"].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);
composer.addPass(effectFXAA);

const surfaceFinder = new FindSurfaces();

// Load model
const loader = new GLTFLoader();
const bottleM = "models/spray_bottle/scene.gltf";
const model = "models/sphere/scene.gltf";

//Bouteille
var bottle = "undefined";

loader.load(bottleM, (gltf) => {

  //bottle 
  surfaceFinder.surfaceId = 0;
  bottle = gltf.scene;
  bottle.position.y -= 1;
  bottle.rotation.x = 0.8;

  bGroup.rotation.y = 5.85;
  // bGroup.rotation.z = 6.26;
  bGroup.add(bottle);
  wholeScene.add(bGroup);

  var bFolder = gui.addFolder('Bottle');
  bFolder.add(bottle.rotation, 'x').min(0).max(10);
  bFolder.add(bottle.rotation, 'y').min(0).max(10);
  bFolder.add(bottle.rotation, 'z').min(0).max(10);
  var bbFolder = gui.addFolder('bottle group');
  bbFolder.add(bGroup.rotation, 'x').min(0).max(10);
  bbFolder.add(bGroup.rotation, 'y').min(0).max(10);
  bbFolder.add(bGroup.rotation, 'z').min(0).max(10);

  scene.traverse((node) => {
    if (node.type == "Mesh") {
      const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);

      node.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colorsTypedArray, 4)
      );
    }
  });
  // customOutline.updateMaxSurfaceId(surfaceFinder.surfaceId + 1);
});

//Bubbles
const bubbles = new THREE.Group();

for(let i=0; i<=30; i++){
  loader.load(model, (gltf) => {
    surfaceFinder.surfaceId = 0;
    scene.add(gltf.scene);

    scene.traverse((node) => {
      if ((node.type == "Mesh")&&(node.name == "Object_4")) {
        const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
        bubbles.add(node);

        //Pos & scale
        node.position.x = (Math.random()-0.5)*10;
        node.position.y = (Math.random()-0.5)*10;
        node.position.z = (Math.random()-0.5)*10;
        node.scale.x = 0.2;
        node.scale.y = 0.2;
        node.scale.z = 0.2;

        //Spécificités
        node.material.transparent = true;
        node.material.opacity = 0.4;
        node.material.metalness = 0.25;
        node.material.roughness = 0.2;

        // var bubblesGui = gui.addFolder("Bubbles")
        // bubblesGui.add(node.material, "metalness").min(0).max(1).step(0.01)
        // bubblesGui.add(node.material, "roughness").min(0).max(1).step(0.01)
        // bubblesGui.add(node.material, "alphaTest").min(0).max(1).step(0.01)

        node.geometry.setAttribute(
          "color",
          new THREE.BufferAttribute(colorsTypedArray, 4)
        );
      }
    });
  }); 
}
wholeScene.add(bubbles)

//Pop (bubble explosion)
var clickable = true;
function generatePop(){

    clickable = false;

    var randomAudio = Math.floor(Math.random() * (8 - 1 + 1) + 1);
    var audioElement = new Audio(`bubbles/bubble${randomAudio}.mp3`);
    audioElement.play();

    setTimeout(()=>{
      clickable = true;
    }, 200);
}

//Désactive le pop si la souris est au dessus du bouton
document.querySelector('.voirProduits>a').addEventListener('pointerenter', ()=>{
  clickable = false;
})

document.querySelector('.voirProduits>a').addEventListener('pointerout', ()=>{
  clickable = true;
})


//Interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove( event ) {
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = (- ( (event.clientY+window.scrollY) / window.innerHeight ) * 2 + 1);
}

window.addEventListener( 'pointermove', onPointerMove );
window.addEventListener( 'pointerdown', onPointerMove );

// OrbitControls
let controls = new OrbitControls(camera, renderer.domElement);
controls.update();
controls.enableZoom = false;
controls.enableRotate = false;
controls.enablePan = false;

////
scene.add(wholeScene);


// Loop
var isHovered = false;
var bubbleHovered = false;
var oldColor = "undefined";
var object;
var bubbleObject;
var clicked = false;
var bubbleClicked = false;

function update(){

  requestAnimationFrame(update);

  // Effet rotatif
  scene.rotation.y+=0.001;
  if(bGroup!="undefined"){
    bGroup.rotation.y-=0.001;
  }
  
  //Effet de hover de la bouteille
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects( scene.children );

  if ((intersects.length > 0)) {
    if(!isHovered&&intersects[0].object.name=="Object_2"){
      isHovered = true;
      object = intersects[0].object;

      oldColor = object.material.color.getHex();
      object.material.color.set(0xffffff);
    }
    if(!bubbleHovered&&intersects[0].object.name=="Object_4"){
      bubbleHovered = true;
      bubbleClicked = false;
      bubbleObject = intersects[0].object;
    }
  } else {
    if(isHovered){
      object.material.color.set(oldColor);
      oldColor = "undefined";
      isHovered = false;
    }
    if(bubbleHovered){
      bubbleHovered = false;
    }
  }

  //gère click sur bouteille
  window.addEventListener('click', salut)

  function salut(){
    if(isHovered&&!clicked){
      clicked = true;
    }
    if(bubbleHovered&&!bubbleClicked&&clickable){
      generatePop();
      bubbleObject.parent.remove(bubbleObject);
      bubbleClicked = true;
    }
  }

  //render
  composer.render();

}
update();

//Window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  effectFXAA.setSize(window.innerWidth, window.innerHeight);
  customOutline.setSize(window.innerWidth, window.innerHeight);
  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );
}
window.addEventListener("resize", onWindowResize, false);

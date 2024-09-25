import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water2.js';

class Bird {
    constructor(threeObject,direction,acceleration) {
        this.threeObject = threeObject
        this.direction = direction
        this.acceleration = acceleration
    }
    getPosition(){
        return this.threeObject.position
    }
  }

  
//create scene
const scene = new THREE.Scene();

const renderer = SetRenderer()
renderer.setAnimationLoop( animate );

//create light
const lightPV = new THREE.Vector3( 0, 100, 0 );
SetLight(lightPV,scene)

const sky = new Sky();
sky.scale.setScalar( 450000 );
scene.add( sky );

const effectController = {
    turbidity: 20,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
};


const moveSpeed = 1

function onKeyDown(event) {
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            camera.position.z -= moveSpeed; // Move camera forward
            break;
        case 'ArrowDown':
        case 's':
            camera.position.z += moveSpeed; // Move camera backward
            break;
        case 'ArrowLeft':
        case 'a':
            camera.position.x -= moveSpeed; // Move camera left
            break;
        case 'ArrowRight':
        case 'd':
            camera.position.x += moveSpeed; // Move camera right
            break;
        case 'q':
            camera.position.y += moveSpeed; // Move camera up
            break;
        case 'e':
            camera.position.y -= moveSpeed; // Move camera down
            break;
    }
}

window.addEventListener('keydown', onKeyDown);

const geometry = new THREE.PlaneGeometry( 100, 100 );
const material = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide, roughness: 0.8, metalness: 0.4  });
const plane = new THREE.Mesh( geometry, material );
plane.rotation.x = Math.PI * - 0.5
plane.position.z = 0
scene.add( plane );


const waterGeometry = new THREE.PlaneGeometry( 1000, 1000 );
const loader = new THREE.TextureLoader();
const water = new Water( waterGeometry, {
    color: '#fffff',
    scale: 1,
    flowDirection: new THREE.Vector2( 1, 1 ),
    textureWidth: 1024,
    textureHeight: 1024,
    normalMap0: loader.load( 'water/Water_1_M_Normal.jpg'),
    normalMap1: loader.load( 'water/Water_2_M_Normal.jpg')
} );

console.log(water.material.uniforms['flowDirection'].value);

water.position.y = -1;
water.rotation.x = Math.PI * - 0.5;
water.position.x = 0
scene.add( water );


const uniforms = sky.material.uniforms;
uniforms[ 'turbidity' ].value = effectController.turbidity;
uniforms[ 'rayleigh' ].value = effectController.rayleigh;
uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
const theta = THREE.MathUtils.degToRad( effectController.azimuth );

const sun = new THREE.Vector3();

sun.setFromSphericalCoords( 1, phi, theta );

uniforms[ 'sunPosition' ].value.copy( sun );

const xbounceright = 300
const xbounceleft = -300
const zbouncedeep = -100
const zbounceclose = -300
const ybounceup = 300
const ybouncedown = -50
//create camera, no it is fixed
const cameraPV = new THREE.Vector3( 0, 30, 0 );
const camera = SetCamera(cameraPV)


//create birds
const amount_floks = 100
const birds = [];
for (let i = 0; i < amount_floks; i++) {
    const trianglePV = new THREE.Vector3( randomBetween(xbounceleft,xbounceright), randomBetween(ybouncedown,ybounceup), randomBetween(zbounceclose,zbouncedeep) );
    let bird = SetTriangle(trianglePV,scene)
    birds.push(bird)
}

const cohereFactor = 0.3
const seperateFactor = 0.4
const allginFactor = 0.3




function randomBetween(min,max){
    return Math.random() * (max - min) + min;
}
function animate() {
    
    for (let i = 0; i < amount_floks; i++) {
        const bird = birds[i]
        

        let cohereDirection = cohere(bird, birds,10);
        let seperateDirection = seperate(bird, birds,5);
        let allignDirection = allign(bird,birds,5);
            //cohereDirection.multiplyScalar(cohereFactor).add(
        let directionVector = seperateDirection.multiplyScalar(seperateFactor).add(cohereDirection.multiplyScalar(cohereFactor)).add(allignDirection.multiplyScalar(allginFactor))
        
        //only change direction by a bit
        directionVector.multiplyScalar(0.1); // Adjust the scalar value as needed
        bird.direction.add(directionVector);
        bird.direction.normalize();

        const direction = bird.direction.clone();
        bird.getPosition().add(direction.multiplyScalar(bird.acceleration))
        // Calculate a point slightly ahead in the direction of movement
        const targetPosition = bird.getPosition().clone().add(direction.clone().multiplyScalar(10));
        bird.threeObject.lookAt(targetPosition);
        outbounce(bird)
        //checkCameraDirection()
    }
	renderer.render( scene, camera );
}

function outbounce(bird){
    let position = bird.getPosition()
    const direction = bird.direction.clone();

    if (position.x <= xbounceleft || position.x >=xbounceright ){
        position.sub(direction.multiplyScalar(bird.acceleration))
        bird.direction.x *= -1;
    }
    if (position.y <= ybouncedown || position.y >= ybounceup) {
        position.sub(direction.multiplyScalar(bird.acceleration))

        bird.direction.y *= -1;
    }
    if (position.z <= zbounceclose || position.z >= zbouncedeep){
        position.sub(direction.multiplyScalar(bird.acceleration))
        bird.direction.z *= -1;
    }
}   

function findTopNClosest(currentbird, birds, N) {
    // Get the current bird's position
    const currentbirdPosition = currentbird.getPosition();

    // Create an array of distances along with the bird's index
    const distances = birds.map((bird, index) => {
        return {
            index: index,
            distance: currentbirdPosition.distanceTo(bird.getPosition())
        };
    });

    // Sort the array by distance
    distances.sort((a, b) => a.distance - b.distance);

    // Return the indices of the top N closest birds
    return distances.slice(0, N).map(entry => entry.index);
}

function seperate(bird, birds, N) {
    // Find the N closest birds
    const closestBirds = findTopNClosest(bird, birds, N);

    // Compute the separation vector
    let separationVector = new THREE.Vector3(0, 0, 0);
    for (let j = 0; j < closestBirds.length; j++) {
        const otherBirdPosition = birds[closestBirds[j]].getPosition();
        const difference = new THREE.Vector3().subVectors(bird.getPosition(), otherBirdPosition);
        const distance = difference.length();

        // The closer the bird, the stronger the repulsion
        if (distance > 0) {
            difference.divideScalar(distance); // Normalize and scale by distance
            separationVector.add(difference);
        }
    }

    // Normalize the separation vector
    separationVector.normalize();
    
    // Return the direction away from the nearby birds
    return separationVector;
}
function cohere(bird, birds, N) {
    // Find the N closest birds
    const closestBirds = findTopNClosest(bird, birds, N);
    
    // Compute the average position vector of the closest birds
    let avg_pos_vector = new THREE.Vector3(0, 0, 0);
    for (let j = 0; j < closestBirds.length; j++) {
        avg_pos_vector.add(birds[closestBirds[j]].getPosition());
    }
    avg_pos_vector.divideScalar(N);
    
    // Compute the vector pointing from the bird's position to the average position
    const direction_to_avg = new THREE.Vector3().subVectors(avg_pos_vector, bird.getPosition());
    return direction_to_avg.normalize()
}

function allign(bird, birds, N) {
    // Find the N closest birds
    const closestBirds = findTopNClosest(bird, birds, N);
    
    // Compute the average position vector of the closest birds
    let avgDirectionVector = new THREE.Vector3(0, 0, 0);
    for (let j = 0; j < closestBirds.length; j++) {
        avgDirectionVector.add(birds[closestBirds[j]].direction);
    }
    avgDirectionVector.divideScalar(N);
    
    // Compute the vector pointing from the bird's position to the average position
    const newDirectionVector = new THREE.Vector3().subVectors(avgDirectionVector, bird.direction);
    return newDirectionVector.normalize()
}



function SetCamera(cameraPV){
    const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 2000000 );
    camera.position.copy(cameraPV);
    console.log(camera.position)
    return camera
}

function SetRenderer(){
    const renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    document.body.appendChild( renderer.domElement );
    return renderer
}

function SetLight(lightPV,scene) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.copy(lightPV);
    scene.add(directionalLight);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight); 
}

function checkCameraDirection() {
    const targetPosition = new THREE.Vector3(0, 0, -100); 
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    const vectorToTarget = targetPosition.clone().sub(camera.position).normalize();

    const dotProduct = cameraDirection.dot(vectorToTarget);
    
    if (dotProduct > 0.6) {  // Adjust the threshold as needed
        document.getElementById('input-container').style.display = 'block';
    } else {
        document.getElementById('input-container').style.display = 'none';
    }
}



function SetTriangle(conePV, scene) {
    const geometry = new THREE.ConeGeometry( 2, 10, 8 ); 
    
    const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const cone = new THREE.Mesh(geometry, material ); scene.add( cone );
    
    cone.position.copy(conePV);
    cone.geometry.rotateX(Math.PI * 0.5);
    // Add the triangle to the scene
    scene.add(cone);

    // Direction
    let direction = new THREE.Vector3();
    direction = direction.randomDirection();

    // Acceleration
    const acceleration = 1;
    let bird = new Bird(cone, direction, acceleration);
    return bird;
}



let boundaryPopup = document.getElementById('boundary-popup');
let boundaryCloseButton = document.getElementById('boundary-close-button');
boundaryCloseButton.addEventListener('click', function() {
  boundaryPopup.style.display = 'none';
});

let x, y, fence, userIcon;
let [ latMin, latMax, lonMin, lonMax ] = [ 60.19528, 60.20006, 25.13053, 25.13762 ];
let [ isInside, userLocationAvailable ] = [ false, false ];
let polygonsData, fences = [], images = [], audioFiles = [];
let imageSizes = [[611, 1058], [524, 479], [327, 290]];
let audioNames = ['test1.mp3', 'test2.mp3', 'test3.mp3'];
let audioTimers = new Array(audioNames.length);


function preload() {
  for (let i = 0; i < audioNames.length; i++) {
    audioFiles[i] = loadSound('./assets/' + audioNames[i], 
      () => { console.log('Audio loaded successfully'); }, 
      (err) => { console.error(err); }
    );
  }
  polygonsData = loadJSON("./assets/data-1.json", dataLoaded);
  images[0] = loadImage('./assets/area1.png'); 
  images[1] = loadImage('./assets/area2.png');
  images[2] =  loadImage('./assets/area3.png');
  userIcon = loadImage('./assets/bee-icon.svg');
}

function dataLoaded(data) {
  polygonsData = data.features;
}

function setup() {
  let canvas = createCanvas(500,800);
  canvas.parent("canvas-container");

  watchOptions = {
   enableHighAccuracy: true,
   timeout: 500,
   maximumAge: 0
  };
  
  watchPosition(positionChanged, watchOptions);
  
  polygonsData.forEach((polygon, index) => {
    let fence = new geoFencePolygon(
      polygon.geometry.coordinates[0], // Reverse the order of coordinates
      () => insideThePolygon(index),
      () => outsideThePolygon(index),
      'km'
    );
    fences.push({ points: polygon.geometry.coordinates[0], fence: fence });
  });

  // Add event listener to the HTML button for getting user interaction to start audio
  document.getElementById('audio-start-button').addEventListener('click', function() {
    userStartAudio();
    this.style.display = 'none';
  });

  // simulatePositionChange(60.19846, 25.13218); // A point inside a known geofence
}

function positionChanged(position) {
  if (!position) {
    console.log('Could not get position:', position);
    return;
  }

  let lat = position.latitude; //y
  let lon = position.longitude; //x
  console.log('User position: Latitude -', lat, 'Longitude -', lon);
  
// Check if the user is within the boundary
if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) {
  x = map(lon, lonMin, lonMax, 0, width);
  y = map(lat, latMin, latMax, height, 0);

  // Hide the popup
  boundaryPopup.style.display = 'none';
  userLocationAvailable = true;
} else {
  // User is outside the boundary
  boundaryPopup.style.display = 'flex';
  userLocationAvailable = false;
}

// Check if the user is inside any geofence
let insideAnyPolygon = false;
for (let i = 0; i < fences.length; i++) {
  if (fences[i].insideFence) {
    insideAnyPolygon = true;
    insideThePolygon(i); // Play sound corresponding to the polygon index
    console.log("User is inside geofence: " + i); 
    insideAnyPolygon = false
  } else {
    outsideThePolygon(i); // Stop playing sound for the polygon index
    console.log("User is not inside any geofence");
  }
}
}

function draw(){
  background("#ebdfc5"); 

  polygonsData.forEach((polygon, index) => {
    drawShapeFromJSON(polygon, index);
  });

  if(userLocationAvailable) {
    push();
    translate(x, y);
    imageMode(CENTER);
    image(userIcon, 0, 0, 20, 20);
    pop();
  }
}

function gpsToPixelX(valX) {
  return map(valX, lonMin, lonMax, 0, width); 
}

function gpsToPixelY(valY) {
  return map(valY, latMin, latMax, height, 0); 
}

function drawShapeFromJSON(data, index){
  noStroke();
  imageMode(CENTER);

  beginShape();
  let totalX = 0;
  let totalY = 0;
  
  for (let i = 0; i < data.geometry.coordinates[0].length; i++) {
    let lon = data.geometry.coordinates[0][i][0];
    let lat = data.geometry.coordinates[0][i][1];
    let px = gpsToPixelX(lon);
    let py = gpsToPixelY(lat);
    
    totalX += px;
    totalY += py;

    vertex(px, py);
  }
  endShape(CLOSE);
  
  //set the images at the centers of the polygons
  let centroidX = totalX / data.geometry.coordinates[0].length;
  let centroidY = totalY / data.geometry.coordinates[0].length;

  push();
  translate(centroidX, centroidY);
  let imgTranslationX = [12, 12, 5]; //manually adjust the sizes and locations of the images
  let imgTranslationY = [20, -1, 5];
  let imgScale = [0.37, 0.35, 0.54];
  translate(imgTranslationX[index % imgTranslationX.length], imgTranslationY[index % imgTranslationY.length]);
  
  let imgWidth = imageSizes[index % imageSizes.length][0] * imgScale[index % imgScale.length];
  let imgHeight = imageSizes[index % imageSizes.length][1] * imgScale[index % imgScale.length];
  image(images[index % images.length], 0, 0, imgWidth, imgHeight);
  pop(); 
}

let currentPlayingAudio = null;
let isAudioPlaying = new Array(audioFiles.length).fill(false);

function insideThePolygon(index) {
  // console.log("Inside Polygon: " + index);

  // Play audio corresponding to the polygon index
  if (audioFiles[index]) {
    audioFiles[index].play();

    if (!audioFiles[index].isPlaying()) {
      console.log("Failed to play audio: " + audioFiles[index]);
    }
  }
    // Stop the audio of other polygons if playing
    if (currentPlayingAudio !== null && currentPlayingAudio !== index) {
      audioFiles[currentPlayingAudio].stop();
      isAudioPlaying[currentPlayingAudio] = false;
    }
    currentPlayingAudio = index;
}

function outsideThePolygon(index){
  // console.log("Outside Polygon: " + index);

  if(audioFiles[index]){
    audioFiles[index].stop();
    isAudioPlaying[index] = false;
    currentPlayingAudio = null;
  }
}

//remove when tracking real user locations
// function simulatePositionChange() {
//   let latInput = select("#latitudeInput");
//   let lonInput = select("#longitudeInput");

//   let simulatedPosition = {
//     latitude: parseFloat(latInput.value()),
//     longitude: parseFloat(lonInput.value())
//   };

//   positionChanged(simulatedPosition); // update the position on the canvas
// }

let openButton = document.getElementById('open-button');
let closeButton = document.getElementById('close-button');
let popup = document.getElementById('popup');

openButton.addEventListener('click', function() {
  popup.style.display = 'flex';
});

closeButton.addEventListener('click', function() {
  popup.style.display = 'none';
});

let googleMapsLink = document.getElementById('google-maps-link');
googleMapsLink.href = 'https://goo.gl/maps/9CdiX8tEcJZjqnqN9?coh=178572&entry=tt';

// function simulatePositionChange(lat, lon) {
//   let simulatedPosition = {
//     latitude: lat,
//     longitude: lon
//   };
//   positionChanged(simulatedPosition); // update the position on the canvas
// }



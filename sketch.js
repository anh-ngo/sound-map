//[60.19995, 60.19580, 25.13810, 25.13002]
let x, y, fence, userIcon;
let [ latMin, latMax, lonMin, lonMax ] = [ 60.19528, 60.20006, 25.13053, 25.13762 ]
let [ isInside, userLocationAvailable ] = [ false, false ];
let polygonsData, fences = [], images = [], audioFiles = [];
let imageSizes = [[611, 1058], [524, 479], [327, 290]];
let audioNames = ['test1.mp3', 'test2.mp3', 'test3.mp3'];

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

  // Add button for getting user interaction to start audio
  let button = createButton('Click to start audio');
  button.mousePressed(() => {
    userStartAudio();
    button.hide();
  });
}


//update this function to track real user locations later
function positionChanged(position) {
  if (!position) {
    console.log('Could not get position:', position);
    return;
  }

  let lat = position.latitude;
  let lon = position.longitude;
  console.log('User position: Latitude -', lat, 'Longitude -', lon);
  
  // Check if the user is within the boundary
  if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) {
    // User is inside the boundary
    x = map(lon, lonMin, lonMax, 0, width);
    y = map(lat, latMin, latMax, height, 0);

    // Check if the user's position is inside any polygon
    fences.forEach((fenceObj, index) => {
      if (pointInPolygon(lon, lat, fenceObj.points)) {
        insideThePolygon(index);
      } else {
        outsideThePolygon(index);
      }
    });

    // Hide the popup
    boundaryPopup.style.display = 'none';

    userLocationAvailable = true;
  } else {
    // User is outside the boundary
    // Show the popup
    boundaryPopup.style.display = 'flex';

    userLocationAvailable = false;
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
  
  let centroidX = totalX / data.geometry.coordinates[0].length;
  let centroidY = totalY / data.geometry.coordinates[0].length;

  push();
  translate(centroidX, centroidY);

  let imgTranslationX = [12, 12, 3];
  let imgTranslationY = [20, -1, 5];
  let imgScale = [0.4, 0.37, 0.5];
  translate(imgTranslationX[index % imgTranslationX.length], imgTranslationY[index % imgTranslationY.length]);
  
  let imgWidth = imageSizes[index % imageSizes.length][0] * imgScale[index % imgScale.length];
  let imgHeight = imageSizes[index % imageSizes.length][1] * imgScale[index % imgScale.length];
  image(images[index % images.length], 0, 0, imgWidth, imgHeight);
  pop(); 
}

let currentPlayingAudio = null;
let isAudioPlaying = new Array(audioNames.length).fill(false);

function insideThePolygon(index){
  console.log("Inside Polygon: " + index);
  if (audioFiles[index]) {
    console.log("Loading audio: " + audioNames[index]);

    // Check if the audio file is loaded before playing it
    if(audioFiles[index].isLoaded()){
      console.log("Audio loaded successfully: " + audioNames[index]);

      // Play audio only if it is not already playing
      if (!isAudioPlaying[index]) {
        audioFiles[index].play();
        isAudioPlaying[index] = true;

        if (!audioFiles[index].isPlaying()) {
          console.log("Failed to play audio: " + audioNames[index]);
        }
      }

    } else {
      console.log("Audio file is not yet loaded: " + audioNames[index]);
    }
    
  } else {
    console.log("No audio file for index: " + index);
  }

  if (currentPlayingAudio !== null && currentPlayingAudio !== index) {
    audioFiles[currentPlayingAudio].stop();
    isAudioPlaying[currentPlayingAudio] = false;
  }

  currentPlayingAudio = index;
}


function outsideThePolygon(index){
  console.log("Outside Polygon: " + index);

  // Immediately stop the audio when the user leaves the polygon
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

//Important! check the initial state of user's location for the callbacks to work
function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i][0],
        yi = polygon[i][1];
    let xj = polygon[j][0],
        yj = polygon[j][1];
    let intersect = ((yi > y) != (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

let openButton = document.getElementById('open-button');
let closeButton = document.getElementById('close-button');
let popup = document.getElementById('popup');

openButton.addEventListener('click', function() {
  popup.style.display = 'flex';
});

closeButton.addEventListener('click', function() {
  popup.style.display = 'none';
});

let boundaryPopup = document.getElementById('boundary-popup');
let boundaryCloseButton = document.getElementById('boundary-close-button');
boundaryCloseButton.addEventListener('click', function() {
  boundaryPopup.style.display = 'none';
});

let googleMapsLink = document.getElementById('google-maps-link');
googleMapsLink.href = 'https://goo.gl/maps/9CdiX8tEcJZjqnqN9?coh=178572&entry=tt';




//popup pages
const boundaryPopup = document.getElementById('boundary-popup');
const boundaryCloseButton = document.getElementById('boundary-close-button');
window.addEventListener('DOMContentLoaded', () => {
  boundaryPopup.style.display = 'flex';
});
boundaryCloseButton.addEventListener('click', () => {
  boundaryPopup.style.display = 'none';
  userStartAudio();
});

const openButton = document.getElementById('open-button');
const closeButton = document.getElementById('close-button');
const popup = document.getElementById('popup');
openButton.addEventListener('click', () => popup.style.display = 'flex');
closeButton.addEventListener('click', () => popup.style.display = 'none');

//variables
let x, y, userIcon, userLocationAvailable = false;
let [ latMin, latMax, lonMin, lonMax ] = [ 60.19528, 60.20006, 25.13053, 25.13762 ];
let polygonsData, polygons = [], images = [], audioFiles = [];
const imageSizes = [[611, 1058], [524, 479], [327, 290]];
const audioNames = ['audio1.mp3', 'audio2.mp3', 'audio3.mp3'];
const polygonNames = ['Her Ocean', 'Emerald Prayer','Ethereality of Beloved'];
let soundText = "";

function preload() {
  polygonsData = loadJSON("./assets/data-1.json", dataLoaded);
  userIcon = loadImage('./assets/bee-icon.png');
  loadAudios();
  loadImages();
}

function loadAudios() {
  for (let i = 0; i < audioNames.length; i++) {
    audioFiles[i] = loadSound(`./assets/${audioNames[i]}`, 
      () => console.log('Audio loaded successfully'), 
      (err) => console.error(err)
    );
  }
}

function loadImages() {
  for(let i = 0; i < 3; i++) {
    images[i] = loadImage(`./assets/area${i+1}.png`);
  }
}

function dataLoaded(data) {
  polygonsData = data.features;
}

function setup() {
  let canvas = createCanvas(500,800);
  canvas.parent("canvas-container");

  watchOptions = {
   enableHighAccuracy: true,
   timeout: 1000,
   maximumAge: 500
  };
  
  watchPosition(positionChanged, watchOptions);
  
  polygonsData.forEach((polygon, index) => {
    let formattedCoordinates = polygon.geometry.coordinates[0].map(coord => ({ lon: coord[0], lat: coord[1] }));
    let polygonObj = {
      points: polygon.geometry.coordinates[0],
      audioFile: audioFiles[index],
      name: polygonNames[index],
      polygonImg: images[index],
      timer: 0,
      isTiming: false,
      fence: new geoFencePolygon(
        formattedCoordinates,
        () => insideThePolygon(polygonObj),
        () => outsideThePolygon(polygonObj),
        'km'
      )
    };
    polygons.push(polygonObj);
  });
}

function positionChanged(position) {
  if (!position) {
    console.log('Could not get position:', position);
    return;
  }
  let lat = position.latitude; //y
  let lon = position.longitude; //x
  console.log('User position: Latitude -', lat, 'Longitude -', lon);
  x = map(lon, lonMin, lonMax, 0, width);
  y = map(lat, latMin, latMax, height, 0);
  
  // // Check if the user is within the boundary
  // if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) {
  //   x = map(lon, lonMin, lonMax, 0, width);
  //   y = map(lat, latMin, latMax, height, 0);
  //   userLocationAvailable = true;
  // } else {
  //   userLocationAvailable = false;
  // }
}

function draw() {
  background("#ebdfc5"); 
  
  soundText ="";

  polygons.forEach((polygon) => {
    drawShapeFromPoints(polygon);
    if(polygon.isTiming){
      polygon.timer++;
      // console.log(polygon.name, polygon.timer);
      if(polygon.timer > 600){ //change to miliseconds
        polygon.audioFile.stop();
        polygon.isTiming = false;
      }
    }
    if(polygon.audioFile.isPlaying()){
      soundText = `🎵&nbsp;&nbsp;${polygon.name}`;
    }
  });
  
  document.getElementById('song-name').innerHTML = soundText;
  
  // if(userLocationAvailable) {
    // push();
    // translate(x, y);
    imageMode(CENTER);
    image(userIcon, x, y, 15, 15);
    // pop();
}

function gpsToPixelX(valX) {
  return map(valX, lonMin, lonMax, 0, width); 
}

function gpsToPixelY(valY) {
  return map(valY, latMin, latMax, height, 0); 
}

function drawShapeFromPoints(polygon) {
  let polygonPoints = polygon.points;
  noStroke();
  // noFill();
  imageMode(CENTER);

  beginShape();
  let totalX = 0;
  let totalY = 0;
  
  for (let i = 0; i < polygonPoints.length; i++) {
    let lon = polygonPoints[i][0];
    let lat = polygonPoints[i][1];
    let px = gpsToPixelX(lon);
    let py = gpsToPixelY(lat);
    
    totalX += px;
    totalY += py;

    vertex(px, py);
  }
  endShape(CLOSE);
  
  let centroidX = totalX / polygonPoints.length;
  let centroidY = totalY / polygonPoints.length;
  
  push();
  // Use the calculated centroid coordinates directly to draw the image.
  // let imgTranslationX = [20, 10, 3]; // Manually adjust the sizes and locations of the images
  // let imgTranslationY = [20, -1, 3];
  // translate(imgTranslationX[polygons.indexOf(polygon) % imgTranslationX.length], imgTranslationY[polygons.indexOf(polygon) % imgTranslationY.length]);
  let imgScale = [0.43, 0.36, 0.56];
  let imgWidth = imageSizes[polygons.indexOf(polygon) % imageSizes.length][0] * imgScale[polygons.indexOf(polygon) % imgScale.length];
  let imgHeight = imageSizes[polygons.indexOf(polygon) % imageSizes.length][1] * imgScale[polygons.indexOf(polygon) % imgScale.length];
  image(polygon.polygonImg, centroidX, centroidY, imgWidth, imgHeight);
  pop();
}

function insideThePolygon(polygon) {
  console.log("Inside Polygon: " + polygon.name);
  
  // If audio for this polygon is not already playing, play it
  if (!polygon.audioFile.isPlaying()) {
    if (polygon.audioFile) {
      polygon.audioFile.loop();
      console.log("Playing audio: " + polygon.audioFile.file);
    }
  }

  // Stop any other audio that might be playing
  polygons.forEach((otherPolygon) => {
    if (otherPolygon !== polygon && otherPolygon.audioFile.isPlaying()) {
      otherPolygon.audioFile.stop();
      console.log("Stopped audio: " + otherPolygon.audioFile.file);
    }
  });
  polygon.timer = 0;
  polygon.isTiming = false;
}

function outsideThePolygon(polygon) {
  console.log("Outside Polygon: " + polygon.name);
  polygon.isTiming = true;
}

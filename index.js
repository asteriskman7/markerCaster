'use strict';

class App {
  constructor() {
    console.log('init');

    this.statusDiv = document.getElementById('status');

    this.initMarkers();
    this.maxDist = 100;
    this.lastPos = undefined;

    document.getElementById('bstart').onclick = () => this.start();
    document.getElementById('bstop').onclick = () => this.stop();
    document.getElementById('bquiet').onclick = () => this.quiet();
    document.getElementById('inputDist').onchange = () => this.updateMaxDist();
  }

  setStatus(msg) {
    this.statusDiv.innerText = msg;
  }

  initMarkers() {
    this.setStatus('init');
    this.lastSpoken = undefined;

    fetch('./HMdb-Markers-NC.json')
      .then(response => response.json())
      .then(markers => {
        this.markers = markers;
        console.log('init complete');
        this.setStatus('ready');
      });
  }

  updateMaxDist() {
    this.maxDist = parseFloat(document.getElementById('inputDist').value);
  }

  start() {
    //this.intervalID = setInterval(() => this.tick(), 5000);
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };
    this.watchID = navigator.geolocation.watchPosition((position) => this.posSuccess(position), this.posError, options);
  }

  stop() {
    /*
    clearInterval(this.intervalID);
    this.intervalID = undefined;
    */
    navigator.geolocation.clearWatch(this.watchID);
    this.watchID = undefined;
  }

  speak(msg) {
    console.log('speak');
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(msg);
    synth.speak(utterance);
  }

  quiet() {
    window.speechSynthesis.cancel();
  }

  sortMarkers() {
    this.markers.forEach( m => {
      m.dist = this.posDist(this.curPos, m.pos);
    });

    this.markers.sort( (a, b) => a.dist - b.dist );

    document.getElementById('divclosest').innerHTML = this.markers.slice(0, 4).map(m => {
      return `ID: <a href='http://www.openstreetmap.org/?mlat=${m.pos[0]}&mlon=${m.pos[1]}#map=18/${m.pos[0]}/${m.pos[1]}&layers=C'>${m.id}</a>, TITLE: ${m.title}, DIST: ${m.dist.toFixed(2)}`;
    }).join`<br>`;
  }

  posSuccess(pos) {
    console.log(pos);
    const curTime = new Date(pos.timestamp);

    let posStep = -1;
    this.curPos = [pos.coords.latitude, pos.coords.longitude];

    if (this.lastPos !== undefined) {
      posStep = this.posDist(this.curPos, this.lastPos);
    }
    this.lastPos = this.curPos;

    document.getElementById('divpos').innerText = `@${curTime} ${pos.coords.latitude} ${pos.coords.longitude} delta=${posStep.toFixed(2)}`;
    this.sortMarkers();
    const closestMarker = this.markers[0];

    if (closestMarker.dist < this.maxDist) {
      if (this.lastSpoken !== closestMarker.id && !window.speechSynthesis.speaking) {
        this.lastSpoken = closestMarker.id;
        const msg = `Nearby marker found. Name: ${closestMarker.title}. Description: ${closestMarker.desc}`;
        this.speak(closestMarker.desc);
      }
    }

  }

  posError() {
    console.log('pos error');
  }

  updateGeolocation() {
    navigator.geolocation.getCurrentPosition(position => this.posSuccess(position), () => this.posError());
  }

  posDist(pos1, pos2) {
    //from https://movable-type.co.uk/scripts/latlong.html
    const [lat1, lon1] = pos1;
    const [lat2, lon2] = pos2;
    const R = 6371e3; // meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; //in meters
    return d;
  }

  tick() {
    this.updateGeolocation();
  }
}

const app = new App();

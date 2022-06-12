'use strict';

//TODO:
//strip html tags from descriptions
//strip html elements like &8234; 

class App {
  constructor() {
    console.log('init');

    this.statusDiv = document.getElementById('status');

    this.initMarkers();
    this.maxDist = 100;
    this.lastPos = undefined;
    this.markerQueue = [];
    this.speechEndTime = -Infinity;
    this.wakeLock = undefined;

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

  acquireWakeLock() {
    if (document.visibilityState === 'visible' && this.watchID !== undefined) {
      navigator.wakeLock.request('screen').then( lock => {
        console.log('wakelock acquire');
        this.wakeLock = lock;
        lock.onrelease = () => this.wakeLock = undefined;
        document.onvisibilitychange = this.acquireWakeLock;
      });
    }
  }

  start() {
    this.intervalID = setInterval(() => this.tick(), 1000);
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };
    this.watchID = navigator.geolocation.watchPosition((position) => this.posSuccess(position), this.posError, options);
    this.acquireWakeLock();
  }

  stop() {
    clearInterval(this.intervalID);
    this.intervalID = undefined;
    navigator.geolocation.clearWatch(this.watchID);
    this.watchID = undefined;
    if (this.wakeLock !== undefined) {
      this.wakeLock.release().then(() => {
        console.log('wakelock release');
        this.wakeLock = undefined;
      });
    }
  }

  speak(msg) {
    console.log('speak');
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.onend = () => this.speechEnd();
    synth.speak(utterance);
  }

  speechEnd() {
    console.log('speech end');
    this.speechEndTime = (new Date()).getTime();
  }

  quiet() {
    window.speechSynthesis.cancel();
    this.speechEndTime = (new Date()).getTime();
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

    document.getElementById('divpos').innerHTML = `@${curTime} <a href='http://www.openstreetmap.org/?mlat=${pos.coords.latitude}&mlon=${pos.coords.longitude}#map=18/${pos.coords.latitude}/${pos.coords.longitude}&layers=C'>${pos.coords.latitude} ${pos.coords.longitude}</a> delta=${posStep.toFixed(2)}`;
    this.sortMarkers();

    for (let i = 0; i < this.markers.length; i++) {
      const marker = this.markers[i];

      if (marker.dist < this.maxDist) {
        const timeSinceLastSeen = marker.lastSeen === undefined ? Infinity : (pos.timestamp - marker.lastSeen);
        const timeBetweenVisits = 60*60*1000; //1hr
        if (timeSinceLastSeen > timeBetweenVisits) {
          marker.lastSeen = pos.timestamp;
          const maxQueueSize = 5;
          if (this.markerQueue.length < maxQueueSize) {
            this.markerQueue.push(marker);
          }
        }
      } else {
        break;
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

  cleanDesc(rawStr) {
    return rawStr.replace(/<[^>]+>/g, '').replace(/&#\d+;/g, ' ');
  }

  tick() {
    const curTime = (new Date()).getTime();
    const speechDelayTime = 5000;
    if (this.markerQueue.length > 0) {
      if (!window.speechSynthesis.speaking) {
        if ((curTime - this.speechEndTime) > speechDelayTime) {
          const curMarker = this.markerQueue.shift();
          const msg = `Nearby marker found. Name: ${curMarker.title}. Description: ${this.cleanDesc(curMarker.desc)}`;
          this.speak(msg);
        }
      }
    }
  }
}

const app = new App();

'use strict';

class App {
  constructor() {
    console.log('init');
    document.getElementById('bstart').onclick = () => this.start();
    document.getElementById('bstop').onclick = () => this.stop();
  }

  start() {
    this.intervalID = setInterval(() => this.tick(), 5000);
  }

  stop() {
    clearInterval(this.intervalID);
    this.intervalID = undefined;
  }

  speak() {
    console.log('speak');
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance("Welcome to the webpage.");
    synth.speak(utterance);
  }

  posSuccess(pos) {
    console.log(pos);
    document.getElementById('log').innerText = `${pos.coords.latitude} ${pos.coords.longitude}`;
  }

  posError() {
    console.log('pos error');
  }

  updateGeolocation() {
    navigator.geolocation.getCurrentPosition(position => this.posSuccess(position), () => this.posError());
  }

  tick() {
    this.updateGeolocation();
  }
}

const app = new App();

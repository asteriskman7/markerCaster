#!/usr/bin/env node

const fs = require('fs');
const fetch = require('node-fetch');

//get input filename
const args = process.argv.slice(2);
const inputFile = args[0];

//read in csv file
const csvData = fs.readFileSync(inputFile, {encoding: 'utf8', flag: 'r'});
console.log(csvData.length);

const csvLines = csvData.split`\r\n`;
//remove header line
csvLines.shift();
//remove empty last line
csvLines.pop();
//remove source line
csvLines.pop();

function csvLineToList(line) {

  const result = [];
  let quoteState = false;
  let cell = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      quoteState = !quoteState;
      continue;
    }
    if (char === ',' && !quoteState) {
      result.push(cell);
      cell = '';
    } else {
      cell = cell + char;
    }
  }
  result.push(cell);

  return result;
}

//extract the interesting information
const markers = csvLines.map( line => csvLineToList(line) ).map( line => {
  return {
    id: parseInt(line[0]),
    title: line[2],
    pos: [parseFloat(line[7]), parseFloat(line[8])],
    url: line[15]
  };
});

const result = JSON.stringify(markers);
const fileParts = inputFile.split`.`;
fileParts.pop();
fileParts.push('pre');
fileParts.push('json');
const outputFile = fileParts.join`.`;

fs.writeFileSync(outputFile, result);
console.log('output written to ' + outputFile);


function sleep(t) {
  const p = new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, t);
  });
  return p;
}

function rndInRange(min, max) {
  return Math.random() * (max - min) + min;
}

//get text from url
(async () => {
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    console.log(`getting desc ${i+1} of ${markers.length}`);
    let failed = false;
    const response = await (fetch(m.url)).catch(() => failed = true);
    if (failed) {
      console.log('FAILED');
      i--;
      await sleep(1000);
      continue;
    }
    const page = await response.text();
    //extract text between div with id=inscription1 and </div>
    const match = page.match(/div .*?id=inscription1 .*?>(.*?)<\/div>/);
    const txt = match[1];
    m.desc = txt;
    await sleep(rndInRange(100, 200));
  }

  //write output file
  const result = JSON.stringify(markers);
  const fileParts = inputFile.split`.`;
  fileParts.pop();
  fileParts.push('json')
  const outputFile = fileParts.join`.`;

  fs.writeFileSync(outputFile, result);
  console.log('output written to ' + outputFile);
})();



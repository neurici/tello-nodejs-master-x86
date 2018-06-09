/*
    Based On
    
	Rzye Tello
	
	Scratch Ext 1.0.0.0

	http://www.ryzerobotics.com

	1/1/2018
*/

const readline = require('readline'),
  rl = readline.createInterface(process.stdin, process.stdout),
  prefix = 'Fisier Misiune Drona> ';


const trimNewlines = require('trim-newlines');
const fs = require('fs')
const commandErr = new Error('Eroare comanda Drona');

const PORT = 8889;
const HOST = '192.168.10.1';

var commandDelays = new Map([
  ['command', 500],
  ['takeoff', 5000],
  ['land', 5000],
  ['up', 7000],
  ['down', 7000],
  ['left', 5000],
  ['go', 7000],
  ['right', 5000],
  ['forward', 5000],
  ['back', 5000],
  ['cw', 5000],
  ['ccw', 5000],
  ['flip', 3000],
  ['speed', 3000],
  ['battery?', 500],
  ['speed?', 500],
  ['time?', 500]
]);

var dgram = require('dgram');

function telloMessage (message) {
    return new Promise(resolve => {
    let rx;
    var client = dgram.createSocket({type: 'udp4', reuseAddr: true}).bind(8001);
    
    client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
	  if (err) throw err;  
	});
	
    client.on('error', function(e) {
      throw e;
    });

	client.on('message', (msg,info) => {
		rx = trimNewlines (msg.toString());
		console.log('Data received from server: ' + rx);
		resolve(rx);
		client.close()
	});	
	});							
}

async function doTelloCommand (commandStr) {

  try {
     var result = await telloMessage(commandStr);
     console.log('Resolved to ' + result + ' for command ' + commandStr);
     if (result === 'error') { throw commandErr; }
     return result;
  } catch (err) {
      throw err;
  }

}

function wait (timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

async function doTelloCommandWithRetry (command) {
  const MAX_RETRIES = 3;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      if (i === 0) {
        console.log('Trimit comanda', command); } else {
        console.log('Reincerc trimitere comanda', command, i);
        }
      var message = await doTelloCommand(new Buffer(command));
//      console.log(message);
      break;
    } catch (err) {
      console.log(err.message);
      const timeout = 500 * Math.pow(2, i);
      console.log('Astept', timeout, 'ms');
      await wait(timeout);
    }
  }  
}

async function promptAfterDelay (delay) {
 await wait(delay);
 rl.prompt();
}

console.log('|--------------------------------------------------------------------|');
console.log('|     Procesor Linie Comanda Drona - Creeat de Cogian Sergiu         |');
console.log('| Introduceti denumirea fisierului misiunii pentru a fi initializata |');
console.log('|    Introduceti "inchide" s-au ctrl-c pentru a iesi din program     |');
console.log('|--------------------------------------------------------------------|');

function doMission (filename) {
	var commands = require('fs').readFileSync(filename, 'utf-8')
		.split('\n')
		.filter(Boolean);

	console.log(commands);

	var delay, commandCode, commandTimeEst;
	delay = 0;
	commandCode = commands[0].split(' ',1)[0];
	commandTimeEst = commandDelays.get(commandCode);
	doTelloCommandWithRetry (commands[0]);
	for (let i = 1, len = commands.length; i < len; i++) {
	   delay = delay + commandTimeEst;
	   setTimeout(doTelloCommandWithRetry,delay,commands[i]);
	   commandCode = commands[i].split(' ',1)[0];
	   commandTimeEst = commandDelays.get(commandCode);
	   console.log('Estimare Intarziere ', delay);
	}
    promptAfterDelay(delay + commandTimeEst); //give time for last command to finish
}

//doMission ('./telloNoFly.txt');

rl.on('line', (input) => {
  fileName = input.trim();
  switch(fileName) {
    case 'iesire':
    case 'Iesire':
	case 'Exit':
	case 'exit':
	  rl.close();
      break;
    default:
      console.log(`Nume Fisier: ${fileName}`);
      doMission (fileName);
      break;
  }
//  rl.prompt();
}).on('close', function() {
  console.log('La Revedere!');
  process.exit(0);
}).on('resume', function () {
  rl.prompt();
});
console.log(prefix + 'Specificati numele misiunii.');
rl.setPrompt(prefix, prefix.length);
rl.prompt();



/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */
var UI = require('ui');

var token = 'TOKEN',
    ajax = require('ajax'),
    api = 'https://api.lifx.com/v1/',
	selector = 'id:d073d511f5fa',
    errorCard = '',
	updateTimer = '',
    bulbsMenu = '',
	colorMenu = '',
	bulbConnected = true,
	brightnessMenu = '',
	currentPower = '',
	currentBrightness = '',
	currentColor = '',
	statusUpdateFrequency = 10000,
    Vibe = require('ui/vibe'),
    Settings = require('settings'),
	commandInProgress = false;

var colorNames = {
	2500: "Ultra Warm",
	2750: "Incandescent",
	3000: "Warm",
	3200: "Neutral Warm",
	3500: "Neutral",
	4000: "Cool",
	4500: "Cool Daylight",
	5000: "Soft Daylight",
	5500: "Daylight",
	6000: "Noon Daylight",
	6500: "Bright Daylight",
	7000: "Cloudy Daylight",
	7500: "Blue Daylight",
	8000: "Blue Overcast",
	8500: "Blue Water",
	9000: "Blue Ice"
};

init();

//Load bulbs, display "loading" card
function init(){
	bulbsMenu = new UI.Menu({
		sections: [{
			title: 'BedroomCeiling',
			items: [{
				title: 'Toggle',
				subtitle: 'Current: Not loaded'
			}, {
				title: 'Set Brightness',
				subtitle: 'Current: Not loaded'
			}, {
				title: 'Set Color',
				subtitle: 'Current: Not loaded'
			}]
		}]
	});
    bulbsMenu.show();
	setupMenuEvents();
    loadStatus();
}

function showError(body){
  errorCard = new UI.Card({
    title: "Error",
    body: body
  });
  errorCard.show();
}

function loadStatus() {
	var options = {
	  	url: api+'lights/'+selector,
	  	headers: {
			Authorization: 'Bearer '+token,
			'Content-Type': 'application/json'
	  	},
		type: 'json'
	};
	
	ajax(options, function(data){
		if(data[0]) {
			var bulb = data[0];
			bulbConnected = bulb.connected;
			currentPower = bulb.power;
			currentColor = bulb.color.kelvin;
			currentBrightness = parseFloat(bulb.brightness).toFixed(2);
			
			bulbsMenu.item(0, 0, {subtitle: 'Current: '+currentPower});
			bulbsMenu.item(0, 1, {subtitle: 'Current: '+currentBrightness*100+'%'});
			bulbsMenu.item(0, 2, {subtitle: 'Current: '+colorNames[currentColor]});
			
			startUpdateTimer();
		} else {
			showError("Something went wrong, make sure your token is correct under the configuration and your selected bulb is online.");
		}
	}, function(error){
		showError("Something went wrong, make sure your token is correct under the configuration and your selected bulb is online.");
	});
}

function updateStatus(callback) {
	var options = {
	  	url: api+'lights/'+selector,
	  	headers: {
			Authorization: 'Bearer '+token,
			'Content-Type': 'application/json'
	  	},
		type: 'json'
	};
	
	ajax(options, function(data){
		if (!commandInProgress) {
			if(data[0]) {
				var bulb = data[0];
				bulbConnected = bulb.connected;
				currentPower = bulb.power;
				currentColor = bulb.color.kelvin;
				currentBrightness = parseFloat(bulb.brightness).toFixed(2);

				bulbsMenu.item(0, 0, {subtitle: 'Current: '+currentPower});
				bulbsMenu.item(0, 1, {subtitle: 'Current: '+currentBrightness*100+'%'});
				bulbsMenu.item(0, 2, {subtitle: 'Current: '+colorNames[currentColor]});
				callback();
			}
		}
	});
}

function setupMenuEvents() {
	bulbsMenu.on('select', function(e) {
		if (!bulbConnected) {
			showError("Bulb isn't connected, so no commands may be sent.");
			return;
		}
		if (!commandInProgress) {
			clearInterval(updateTimer);
			if(e.itemIndex === 0) {
				commandInProgress = true;
				toggleLight(function(result) {
					if (result) {
						var newState;
						if (currentPower == 'off') {
							newState = 'Current: on';
						} else if (currentPower == 'on') {
							newState = 'Current: on';
						} else {
							newState = 'Current: Not loaded';
						}
						bulbsMenu.item(0, 0, {subtitle: newState});
					}
					commandInProgress = false;
					startUpdateTimer();
				});
			} else if (e.itemIndex === 2) {
				makeColorMenu(e);
			} else if (e.itemIndex === 1) {
				makeBrightnessMenu();
			}
		}
	});
}

function makeBrightnessMenu(e) {
	brightnessMenu = new UI.Menu();  
	genbrightnessMenu();
	brightnessMenu.show();
	brightnessMenu.on('hide', function(e) {
		brightnessMenu = '';
		startUpdateTimer();
	});
	brightnessMenu.on('select', function(e) {
		if (!commandInProgress) {
			var brightness = e.item.title.split("%")[0] / 100;
			currentBrightness = brightness;
			genbrightnessMenu();
			commandInProgress = true;
			bulbsMenu.item(0, 1, {subtitle: 'Current: '+e.item.title});
			setBrightness(brightness, function(data) {
				if(data.results[0].status == 'ok') {
					console.log('success');
					Vibe.vibrate('short');

					commandInProgress = false;
				} else {
					console.log(data.results[0].status);
					Vibe.vibrate('double');
					showError("Command failed. Bulb is probably switched off.");
				}
			});
		}
	});
}

function setBrightness(brightness, callback) {
	var url = api + 'lights/'+selector+'/state';
	  ajax({
		url : encodeURI(url),
		method : 'PUT',
		headers: {
		 authorization : 'Bearer ' + token
		},
		type : 'json',
		data : {
		  brightness :brightness
		}
	  }, function(data){
		  callback(data);
	  }, function(error){
		  console.log(JSON.stringify(error,null,3));
	  });
}

function genbrightnessMenu() {
	var section = {
		items: []
	};
	for (var i = 100; i >= 5; i-=5) { 
		var item = {title:i+"%"};
		if (currentBrightness*100 == i) {
			item.subtitle = "Selected";
		}
		section.items.push(item);
	}
	brightnessMenu.section(0, section);
}

function startUpdateTimer() {
	setTimeout(function() {
		console.log('update started');
		updateStatus(function(){
			console.log('update done');
			updateTimer = setInterval( function() {
				console.log('update started');
				updateStatus(function(){
					console.log('update done');
				});
			}, statusUpdateFrequency);
		});
	},1500);
}

function toggleLight(callback) {
	var options = {
	  	url: api+'lights/'+selector+'/toggle',
	  	headers: {
			Authorization: 'Bearer '+token,
			'Content-Type': 'application/json'
	  	},
		method: 'POST',
		type: 'json'
	};
	
	ajax(options, function(data){
		if(data.results[0].status == 'ok') {
			Vibe.vibrate('short');
			callback(true);
		} else {
			Vibe.vibrate('double');
			showError("Command failed. Bulb is probably switched off.");
			callback(false);
		}
	});
}

function makeColorMenu(e) {
	colorMenu = new UI.Menu();  
	genColorMenu();
	colorMenu.show();
	colorMenu.on('hide', function(e) {
		colorMenu = '';
		startUpdateTimer();
	});
	colorMenu.on('select', function(e) {
		if (!commandInProgress) {
			var color = e.item.subtitle.substr(0,4);
			currentColor = color;
			genColorMenu();
			commandInProgress = true;
			bulbsMenu.item(0, 2, {subtitle: 'Current: '+e.item.title});
			setColor(color, function(data) {
				if(data.results[0].status == 'ok') {
					console.log('success');
					Vibe.vibrate('short');

					commandInProgress = false;
				} else {
					console.log(data.results[0].status);
					Vibe.vibrate('double');
					showError("Command failed. Bulb is probably switched off.");
				}
			});
		}
	});
}

function setColor(color, callback) {
	color = "kelvin:"+color;
	
	var url = api + 'lights/'+selector+'/state';
	  ajax({
		url : encodeURI(url),
		method : 'PUT',
		headers: {
		 authorization : 'Bearer ' + token
		},
		type : 'json',
		data : {
		  color :color
		}
	  }, function(data){
		  callback(data);
	  }, function(error){
		  console.log(JSON.stringify(error,null,3));
	  });
}

function genColorMenu() {
	var section = {
		items: []
	};
	for (var key in colorNames) {
		if (colorNames.hasOwnProperty(key)) {
			var item = {title:colorNames[key], subtitle: key+" K"};
			if (currentColor == key) {
				item.title= "-- "+item.title;
			}
			section.items.push(item);
		}
	}
	colorMenu.section(0, section);
}

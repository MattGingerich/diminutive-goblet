var stage;
var radialMask;
var mapFront;
var mapBack;
var width;
var height;
var innerBorder;
var outerBorder;
var cities = [];
var roadLayer;
var interactionLayer;
var balance = 0.5;
var selectedCity = null;
var borders = [0,0];

var preloaded = 0;
var imageList = ["kingdom_layer2.png", "demon_layer2.png"];

// randomly orders the array "a" with a Fisher-Yates shuffle
function shuffle(a){
	for (var i=a.length-1; i > 0; i--){
		var j = Math.floor(Math.random()*(i+1));
		var swap = a[i];
		a[i] = a[j];
		a[j] = swap;
	}
}

function randomSelection(setSize, selectionSize){
	a = [];
	for (var i=0; i<setSize; i++) a.push(i);
	shuffle(a);
	return a.slice(0,selectionSize);
}

function city(x, y){
	this.x = x;
	this.y = y;
	this.roads = []
	this.cityRadius = 7;
	this.strokeColour = this.strokeColourKingdom = "rgb(80,80,0)";
	this.fillColour = this.fillColourKingdom = "rgb(230,230,210)";
	this.strokeColourDemon = "rgb(240,0,0)";
	this.fillColourDemon = "rgb(20,0,0)";
	this.isDemonic = false;
	this.shape = new createjs.Shape();
	this.hitArea = new createjs.Shape();
	this.shape.hitArea = this.hitArea;
	this.name = '';
	this.makeName();
	this.distanceFromHub = 0;
	this.influence = 0;
	(function(target){
		target.shape.onClick = function(evt){target.handleMouse(true, false)}
	})(this);
	(function(target){
		target.shape.onMouseOver = function(evt){target.handleMouse(false, true)}
	})(this);
	(function(target){
		target.shape.onMouseOut = function(evt){target.handleMouse(false, false)}
	})(this);
	stage.addChild(this.shape);
}

city.prototype.displayInfo = function(){
	document.getElementById('cityName').innerHTML = this.name;
	document.getElementById('cityAffiliation').innerHTML = this.isDemonic?"(Demonic)":"(Human)";
	if (this.distanceFromHub > borders[0] && this.distanceFromHub < borders[1]
		|| this.distanceFromHub == 0 && borders[0] < this.cityRadius){
		document.getElementById('demonToggleButton').style.display = "inline";
		document.getElementById('cityDescription').innerHTML = (this.isDemonic?"Goblet field ":"Demonic field") + " influence: " + Math.round(this.calculateInfluence()*100) + "%";
	}
	else{
		document.getElementById('demonToggleButton').style.display = "none";
		document.getElementById('cityDescription').innerHTML = "This city is out of " + (this.isDemonic?"human":"demon") + " range."
	}
}

city.prototype.handleMouse = function(isClick, isMouseOver){
	if (isClick) {
		selectedCity = this;
		this.displayInfo();
	}
	interactionLayer.graphics.clear();
	
	if (selectedCity != null) {
		interactionLayer.graphics.setStrokeStyle(0)
			.beginStroke("#000")
			.beginFill("rgba(100,100,100,0.5)")
			.drawCircle(selectedCity.x, selectedCity.y, selectedCity.cityRadius+15);
	}
		
	if (isMouseOver){
		interactionLayer.graphics.setStrokeStyle(0)
			.beginStroke("#000")
			.beginFill("rgba(200,200,200,0.5)")
			.drawCircle(this.x, this.y, this.cityRadius+15);
	}
	stage.update();
}

city.prototype.toggleDemonic = function(){
	this.isDemonic = !this.isDemonic;
	if (this.isDemonic){
		this.strokeColour = this.strokeColourDemon;
		this.fillColour = this.fillColourDemon;
	} else {
		this.strokeColour = this.strokeColourKingdom;
		this.fillColour = this.fillColourKingdom;
	}
	this.drawCity();
	updateBarriers();
	stage.update();
}

city.prototype.buildRoad = function(neighbour){
	if (this.roads.indexOf(neighbour) < 0){
		this.roads.push(neighbour);
		neighbour.roads.push(this);
		roadLayer.graphics.setStrokeStyle(1)
			.beginStroke("#000")
			.moveTo(this.x, this.y)
			.lineTo(neighbour.x, neighbour.y)
			.endStroke();
		stage.update();
	}
}

city.prototype.drawCity = function(){
	this.shape.graphics.clear().setStrokeStyle(2)
		.beginStroke(this.strokeColour)
		.beginFill(this.fillColour)
		.drawCircle(this.x, this.y, this.cityRadius);
		
	this.hitArea.graphics.clear()
		.setStrokeStyle(2)
		.beginStroke("#000")
		.beginFill("#000")
		.drawCircle(this.x, this.y, this.cityRadius+15);
		
	this.shape.hitArea = this.hitArea;
}

city.prototype.distance = function(cityB){
	return dist([this.x, this.y], [cityB.x, cityB.y]);
}

city.prototype.makeName = function(){
	var cityPrefixes = ['New ', 'San ', 'Fort ', 'Fort Mac', 'Los ']
	var cityPartA = ['On', 'Ana', 'Blen', 'Bern', 'Swiss', 'Cupo', 'Super', 'Mega', 'Ultra', 'Du', 'Sal', 'Cali',
						'Lon', 'Al','Fran','Hon','Fun', 'Gor', 'Taran', 'Zoid', 'Co'];
	var cityPartB = ['helm', 'heim', 'topia', 'ville', 'tario', 'tula', 'burg', 'tino', 'barn', 'place',
						'troit', 'fornia', 'don', 'berta', 'wa', 'tonio', 'lumbia', 'nin'];
	var unique = false;
	while (!unique){
		var name = ''
		if (Math.random()>0.7){
			name += cityPrefixes[Math.floor(Math.random()*cityPrefixes.length)]
		}
		name += cityPartA[Math.floor(Math.random()*cityPartA.length)]
		name += cityPartB[Math.floor(Math.random()*cityPartB.length)]
		unique = true;
		for (var i=0; i < cities.length; i++){
			if (cities[i].name==name){
				unique = false;
				break;
			}
		}
	}
	this.name = name;
}

city.prototype.calculateInfluence = function(){
	if (this.distanceFromHub == 0){
		return 0.5+0.5*(this.cityRadius/borders[1]-balance);
	}
	var cityPosition = (this.distanceFromHub-borders[0])/(borders[1]-borders[0]);
	this.influence = 0.5 + 0.5*(cityPosition - balance);
	if (this.isDemonic) this.influence = 1 - this.influence;
	return this.influence;
}

function preload() {
	for (var i = 0; i < imageList.length; i++) {
		var loadingImage = new Image();
		loadingImage.onload = incrementLoadCounter;
		loadingImage.src = imageList[i];
	}
}

function init(){
	stage = new createjs.Stage("testCanvas");
	stage.enableMouseOver();
	mapFront = new createjs.Bitmap("kingdom_layer2.png");
	mapBack = new createjs.Bitmap("demon_layer2.png");
	width = mapFront.image.width;
	height = mapFront.image.height;
	radialMask = new createjs.Shape();
	radialMask.cache(0,0,width,height);
	stage.addChild(mapBack);
	stage.addChild(mapFront);
	
	innerBorder = new createjs.Shape();
	outerBorder = new createjs.Shape();
	roadLayer = new createjs.Shape();
	interactionLayer = new createjs.Shape();
	stage.addChild(interactionLayer);
	stage.addChild(innerBorder);
	stage.addChild(outerBorder);
	stage.addChild(roadLayer);
	createCities();
	updateBarriers();
}

function incrementLoadCounter() {
	preloaded++;
	if (preloaded >= imageList.length) {
		init();
	}
}

function constructCityRing(ringRadius, numCities){
	var ring = [];
	var twoPI = 2*Math.PI;
	var thetaOffset = Math.random()*twoPI;
	var thetaStep = twoPI/numCities;
	var radiusOffsetStep = 25;
	var staggerCounter = 0;
	for (var i=0; i<numCities;i++){
		var stagger = Math.random()>0.5 ? 1 : 0;
		staggerCounter += stagger;
		if (i==numCities-1){		// ensure that each ring includes near/far cities (prevent impenetrable scenarios)
			if (staggerCounter<2)
				stagger = 1;
			else if (staggerCounter>numCities-3)
				stagger = 0;
		}
		var theta = (thetaOffset + thetaStep*i)%twoPI;
		var radius = ringRadius-stagger*radiusOffsetStep;
		var newCity = new city(Math.cos(theta)*radius+width/2, Math.sin(theta)*radius+height/2);
		newCity.distanceFromHub = radius;
		ring.push(newCity);
	}
	return ring;
}

function buildRingConnectionRoads(innerRing, outerRing){
	// Build roads outwards from inner ring to nearest cities
	for (var i=0; i<innerRing.length; i++){
		var shortestDistance = Infinity;
		var closestCity = null;
		for (var j=0; j<outerRing.length; j++){
			var x = innerRing[i].distance(outerRing[j]);
			if (x < shortestDistance){
				shortestDistance = x;
				closestCity = outerRing[j];
			}
		}
		innerRing[i].buildRoad(closestCity);
	}
	
	// Build roads inwards from outer ring to nearest cities
	for (var i=0; i<outerRing.length; i++){
		var shortestDistance = Infinity;
		var closestCity = null;
		for (var j=0; j<innerRing.length; j++){
			var x = outerRing[i].distance(innerRing[j]);
			if (x < shortestDistance){
				shortestDistance = x;
				closestCity = innerRing[j];
			}
		}
		outerRing[i].buildRoad(closestCity);
	}
}

function createCities(){
	cities[0] = new city(width/2,height/2); // first city is in the center (holding the diminutive goblet)
	cities[0].cityRadius = 20;				// center city is bigger than all the others
	cities[0].fillColour = cities[0].fillColourKingdom = "rgb(240,240,120)";
	document.getElementById('centralCityName').innerHTML = cities[0].name;
	var citiesPerRing = [1, 5, 7, 10, 15];
	var edgeOffset = 5;
	var numRings = citiesPerRing.length;
	var ringStep = (Math.min(width, height)/2-edgeOffset)/(numRings-1);
	var rings = [[cities[0]]];
	for (var i=1; i<numRings; i++){
		rings[i] = constructCityRing(ringStep*i, citiesPerRing[i]);
		for (var j=0; j<rings[i].length; j++){
			rings[i][j].buildRoad(rings[i][(j+1)%rings[i].length]);
		}
		buildRingConnectionRoads(rings[i-1], rings[i]);
		cities = cities.concat(rings[i]);
	}
	
	var initialDemons = randomSelection(citiesPerRing[numRings-1], 12);
	for (var i=0; i<initialDemons.length; i++){
		rings[rings.length-1][initialDemons[i]].toggleDemonic();
	}
	
	for (var i=0; i<cities.length; i++){
		cities[i].drawCity();
	}
	stage.update();
}

function drawBarriers(r1,r2,balance) {			
	radialMask.graphics.beginRadialGradientFill(["#000", "rgba(0,0,0,0.5)", "transparent"], [0,balance,1], width/2, height/2, r1, width/2, height/2, r2);
	radialMask.graphics.drawRect(0,0,width,height);
	radialMask.updateCache();
	radialMask.graphics.clear();
	
	mapFront.filters = [new createjs.AlphaMaskFilter(radialMask.cacheCanvas)];
	mapFront.cache(0,0,width,height);
	
	innerBorder.graphics.clear().setStrokeStyle(1)
		.beginStroke("rgb(250,250,0)")
		.drawCircle(width/2, height/2, r1);
	
	outerBorder.graphics.clear().setStrokeStyle(1)
		.beginStroke("rgb(180,0,0)")
		.drawCircle(width/2, height/2, r2);
	
	stage.update();
}

function updateBarriers(){
	var longestNonDemonicDistance = 0;
	var shortestDemonicDistance = dist([0,0], [width/2,height/2]);
	for (var i=0; i<cities.length; i++){
		var tempDistance = cities[0].distance(cities[i]);
		if (longestNonDemonicDistance < tempDistance && !cities[i].isDemonic){
			longestNonDemonicDistance = tempDistance;
		}
		if (shortestDemonicDistance > tempDistance && cities[i].isDemonic){
			shortestDemonicDistance = tempDistance;
		}
	}
	
	var r1 = Math.max(shortestDemonicDistance-55, cities[0].cityRadius-1);
	var r2 = Math.max(longestNonDemonicDistance+55, shortestDemonicDistance+5);
	var demonSum = 0, kingdomSum = 0, demonNeutralSum = 0, kingdomNeutralSum = 0;
	var gradientBalance = 0.01;
	for (var i=0; i<cities.length; i++) {
		var tempDistance = cities[0].distance(cities[i]);
		if (cities[i].isDemonic){
			demonSum++;
			if (tempDistance >= r1 && tempDistance <= r2)
				demonNeutralSum++;
		}
		else {
			kingdomSum++;
			if (tempDistance >= r1 && tempDistance <= r2)
				kingdomNeutralSum++;
		}
	}
	if (cities[0].isDemonic)
		r2 = r1+1;
	else if (demonSum==0){
		r2 = 1000;
		gradientBalance = balance = 0.99;
	}
	else {
		balance = kingdomSum/(demonSum+kingdomSum);
		gradientBalance = kingdomNeutralSum/(demonNeutralSum+kingdomNeutralSum);
	}
	drawBarriers(r1, r2, balance);
	borders = [r1, r2];
	if (selectedCity != null)
		selectedCity.displayInfo();
}

function dbgToggleAll(demon){
for (var i=0; i<cities.length; i++){
	if (cities[i].isDemonic!=demon)
		cities[i].toggleDemonic()
}
updateBarriers();
}

function dbgToggleRandom(){
for (var i=0; i<cities.length; i++){
	if (cities[i].distanceFromHub>150 && Math.random()>0.5)
		cities[i].toggleDemonic()
}
updateBarriers();
}
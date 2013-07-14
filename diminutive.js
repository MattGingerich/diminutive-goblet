// diminutive.js - Matt Gingerich, 2013 - A fan pre-production prototype of the MASSIVE CHALICE concept by Double Fine Productions.

var stage;			// main drawing area
var width;
var height;
var radialMask;		// shape object for creating radial blur between human/demon lands
var mapFront;		// top layer of the map (human territory)
var mapBack;		// bottom layer of the map (demon territory)
var innerBorder;
var outerBorder;
var cities = [];	// list of all city objects
var roadLayer;
var interactionLayer;	// layer for showing highlights around cities and other interface elements
var balance = 0.5;		// controls the midpoint of the gradient between human/demon territory
var selectedCity = null;
var borders = [0,0];	// radii of the borders of the neutral zone

var preloaded = 0;		// counts number of images successfully loaded
var imageList = ["kingdom_layer2.png", "demon_layer2.png"];	// images to preload before init

// randomly orders the array "a" with a Fisher-Yates shuffle
function shuffle(a){
	for (var i=a.length-1; i > 0; i--){
		var j = Math.floor(Math.random()*(i+1));
		var swap = a[i];
		a[i] = a[j];
		a[j] = swap;
	}
}

// select selectionSize indices randomly from setSize indices
function randomSelection(setSize, selectionSize){
	a = [];
	for (var i=0; i<setSize; i++) a.push(i);
	shuffle(a);
	return a.slice(0,selectionSize);
}

// The city object construct takes a city's x and y coordinates.
// The city object contains its own shape/hitArea objects for drawing
// and sets event handlers for clicks.
function city(x, y){
	this.x = x;
	this.y = y;
	this.roads = []			// Array of neighbouring cities
	this.cityRadius = 7;	// Radius of the city graphic
	this.strokeColour = this.strokeColourKingdom = "rgb(80,80,0)";
	this.fillColour = this.fillColourKingdom = "rgb(230,230,210)";	// City colour when not possessed
	this.strokeColourDemon = "rgb(240,0,0)";
	this.fillColourDemon = "rgb(20,0,0)";		// City colour when possessed by demons
	this.isDemonic = false;						// True when city is possessed
	this.shape = new createjs.Shape();
	this.hitArea = new createjs.Shape();
	this.shape.hitArea = this.hitArea;
	this.name = '';								// City name (auto-generated)
	this.makeName();							// Sets city name
	this.distanceFromHub = 0;					// City distance from map center
	this.influence = 0;							// Amount of opposition influence experienced by city
	(function(target){		// Event handlers
		target.shape.onClick = function(evt){target.handleMouse(true, false)}
	})(this);
	(function(target){
		target.shape.onMouseOver = function(evt){target.handleMouse(false, true)}
	})(this);
	(function(target){
		target.shape.onMouseOut = function(evt){target.handleMouse(false, false)}
	})(this);
	stage.addChild(this.shape);	// Adds city to drawing context
}

// Writes information about city to side panel
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

// Selects cities on click and shows mouseouver/mouseout highlights
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

// Switches allegiance of city and updates neutral zone barriers
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

// Connects a city to another and draws road on map
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

// Draws a city and sets its hit area for user interaction
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

// Calculates distance to another city (along direct line)
city.prototype.distance = function(cityB){
	return dist([this.x, this.y], [cityB.x, cityB.y]);
}

// Randomly generates a city name by mixing and matching a bunch of pieces
city.prototype.makeName = function(){
	var cityPrefixes = ['New ', 'San ', 'Fort ', 'Fort Mac', 'Los ']
	var cityPartA = ['On', 'Ana', 'Blen', 'Bern', 'Swiss', 'Cupo', 'Super', 'Mega', 'Ultra', 'Du', 'Sal', 'Cali',
						'Lon', 'Al','Fran','Hon','Fun', 'Gor', 'Taran', 'Zoid', 'Co'];
	var cityPartB = ['helm', 'heim', 'topia', 'ville', 'tario', 'tula', 'burg', 'tino', 'barn', 'place',
						'troit', 'fornia', 'don', 'berta', 'wa', 'tonio', 'lumbia', 'nin'];
	var unique = false;
	while (!unique){	// Disallows multiple identical names for the same map
		var name = ''	// Keeps trying until a unique name is found (don't create a bazillion cities or this will loop forever)
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

// Calculates the force exerted by the opposition's magical field on this city
city.prototype.calculateInfluence = function(){
	if (this.distanceFromHub == 0){
		return 0.5+0.5*(this.cityRadius/borders[1]-balance);
	}
	var cityPosition = (this.distanceFromHub-borders[0])/(borders[1]-borders[0]);
	this.influence = 0.5 + 0.5*(cityPosition - balance);
	if (this.isDemonic) this.influence = 1 - this.influence;
	return this.influence;
}

// Preload images
function preload() {
	for (var i = 0; i < imageList.length; i++) {
		var loadingImage = new Image();
		loadingImage.onload = incrementLoadCounter;
		loadingImage.src = imageList[i];
	}
}

// Count completed loads
function incrementLoadCounter() {
	preloaded++;
	if (preloaded >= imageList.length) {
		init(); // Run init when everything is done loading
	}
}

// Does intialization stuff <-- getting lazy at commenting
// It's pretty self-explanatory though, right?
//
// This might be a good time to mention that comments about the lack of clarity of this
// code (or anything else about it) are welcome on the MASSIVE CHALICE forum:
// http://www.doublefine.com/forums/viewthread/9905/
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

// Creates numCities city objects arranged in a ring on the map.
function constructCityRing(ringRadius, numCities){
	var ring = [];
	var twoPI = 2*Math.PI;
	var thetaOffset = Math.random()*twoPI;	// Each ring is randomly rotated
	var thetaStep = twoPI/numCities;
	// Some of the cities on the ring are bumped inwards by a fixed amount. This allows the neutral zone barrier to
	// divide cities along each ring. I refer to this inward bump as both a "radius offset step" and "stagger" in the
	// comments below.
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
		var newCity = new city(Math.cos(theta)*radius+width/2, Math.sin(theta)*radius+height/2); // MATH
		newCity.distanceFromHub = radius;					// ^-- Converts polar coordinates to cartesian
		ring.push(newCity);
	}
	return ring;
}

// Connects city roads. The resulting graph is guaranteed to be connected (there is
// a path connecting any pair of vertices), it's generally the case that edges won't
// cross (although that's not guaranteed and can be broken if the input rings are
// irregular), and edges are selected to be short to yield sensible road networks.
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
		for (var j=0; j<innerRing.length; j++){		// I iterate through things a lot
			var x = outerRing[i].distance(innerRing[j]);	// this could probably be optimized
			if (x < shortestDistance){						// but it doesn't need to be
				shortestDistance = x;						// and so it won't be
				closestCity = innerRing[j];
			}
		}
		outerRing[i].buildRoad(closestCity);
	}
}

// Places all cities on the map
function createCities(){
	cities[0] = new city(width/2,height/2); // first city is in the center (holding the diminutive goblet)
	cities[0].cityRadius = 20;				// center city is bigger than all the others
	cities[0].fillColour = cities[0].fillColourKingdom = "rgb(240,240,120)";	// it's also yellow, because why not
	document.getElementById('centralCityName').innerHTML = cities[0].name;		// this bit adds the generated name into my intro paragraph
	var citiesPerRing = [1, 5, 7, 10, 15];
	var numberOfInitialDemonTowns = 12;
	var edgeOffset = 5;		// gives a tiny (diminutive, even) border at the edge of the canvas so cities don't go all the way to the edge
	var numRings = citiesPerRing.length;
	var ringStep = (Math.min(width, height)/2-edgeOffset)/(numRings-1);	// gap between rings (not considering stagger)
	var rings = [[cities[0]]];
	for (var i=1; i<numRings; i++){
		rings[i] = constructCityRing(ringStep*i, citiesPerRing[i]);
		for (var j=0; j<rings[i].length; j++){
			rings[i][j].buildRoad(rings[i][(j+1)%rings[i].length]);
		}
		buildRingConnectionRoads(rings[i-1], rings[i]);
		cities = cities.concat(rings[i]);
	}
	
	// Randomly set some towns to be demonic in the outer ring
	var initialDemons = randomSelection(citiesPerRing[numRings-1], numberOfInitialDemonTowns);
	for (var i=0; i<initialDemons.length; i++){
		rings[rings.length-1][initialDemons[i]].toggleDemonic();
	}
	
	for (var i=0; i<cities.length; i++){
		cities[i].drawCity();
	}
	stage.update();
}

// Draws circular neutral zone borders and updates the gradient transition between human/demon land
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

// Calculates and redraws borders of neutral zone (called when cities change allegiance)
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

// TESTING/DEBUGGING FUNCTIONS
// Turns all cities demonic (if demon=true) or human (if demon=false)
function dbgToggleAll(demon){
	for (var i=0; i<cities.length; i++){
		if (cities[i].isDemonic!=demon)
			cities[i].toggleDemonic()
	}
	updateBarriers();
}

// Randomly toggle the cities that are more than 150 pixels away from the goblet
function dbgToggleRandom(){
	for (var i=0; i<cities.length; i++){
		if (cities[i].distanceFromHub>150 && Math.random()>0.5)
			cities[i].toggleDemonic()
	}
	updateBarriers();
}
function dist(a, b){
	return Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2));
}

function checkCollision(a, b, ra, rb){
	return dist(a, b)-(ra+rb) <= 0;
}

function getRandomPoint(width, height, offsetX, offsetY){
	var x = Math.random()*width+offsetX;
	var y = Math.random()*height+offsetY;
	return [x,y];
}
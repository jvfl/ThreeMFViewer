function generateSlices( centeredMesh, sliceSize ){

	var boundingBox = centeredMesh.geometry.boundingBox;

	var sliceMaterial = new THREE.MeshPhongMaterial( { specular: 0x111111, shininess: 200 } );
    var sliceGeometry = new THREE.BoxGeometry( boundingBox.max.x + Math.abs( boundingBox.min.x ), sliceSize, boundingBox.max.z + Math.abs( boundingBox.min.z ) );
	var slicerMesh = new THREE.Mesh( sliceGeometry, sliceMaterial );

	var slices = [];

	var maxY = boundingBox.max.y + 1;
	var minY = boundingBox.min.y;
	var numberOfSlices = ( ( maxY ) + Math.abs( minY ) ) / sliceSize;
	numberOfSlices = Math.ceil( numberOfSlices );
	var count = 1;

	var t0 = performance.now();
	var meshCSG = THREE.CSG.toCSG( centeredMesh );
	var t1 = performance.now();
	console.log("Model transformation took " + (t1 - t0) + " milliseconds.");

	for ( var i = minY; i <= maxY ; i += sliceSize ) {

		slicerMesh.position.set( 0, i, 0 );
		var boxCSG = THREE.CSG.toCSG( slicerMesh );

		t0 = performance.now();
		var interCSG = meshCSG.intersect( boxCSG );
		t1 = performance.now();
		console.log("Call to intersect took " + (t1 - t0) + " milliseconds.");

		var threeCSG = THREE.CSG.fromCSG( interCSG );

		slicedMesh = new THREE.Mesh( threeCSG, sliceMaterial );
		slicedMesh.geometry.mergeVertices();

		slices.push( slicedMesh );

		//Console feedback
		console.log( "Slice " + count + " of " + numberOfSlices + " computed. " );
		count ++;

	}

	return slices;

}

function displaySlices( scene, slices, delay, onEnd ){

	if ( slices.length === 0 ) {

		//All slices have been displayed.
		if ( onEnd !== undefined ) { 
			onEnd();
		}
		
		return;

	}

	slice = slices[0];
	scene.add( slice );
	setTimeout( function(){ displaySlices( scene, slices.slice(1), delay, onEnd ) }, delay);

}
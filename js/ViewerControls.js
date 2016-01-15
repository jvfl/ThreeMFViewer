var models = [
	{
		name : "Tetrahedron", url : "./3mf-examples/basic/pyramid.3mf",
		objectScale: new THREE.Vector3( 0.02, 0.02, 0.02 ),
		sliceSize: 0.1,
	},
	{
		name : "Rhombicuboctahedron", url : "./3mf-examples/basic/rhombicuboctahedron.3mf",
		objectScale: new THREE.Vector3( 0.02, 0.02, 0.02 ),
		sliceSize: 0.1,
	},
	{
		name : "Dodeca Chain Loop", url : "./3mf-examples/basic/dodeca_chain_loop.3mf",
		objectScale: new THREE.Vector3( 0.03, 0.03, 0.03 ),
		sliceSize: 0.5,
	},
	{
		name : "Heart Gears", url : "./3mf-examples/basic/heart_gears.3mf",
		objectScale: new THREE.Vector3( 0.04, 0.04, 0.04 ),
		sliceSize: 0.3,
	},
];

var currentModel;
var currentlySlicing;
var selectedModelIndex;

function buildModelList() {

	var elt = document.getElementById( 'models_list' );

	while ( elt.hasChildNodes() ) {

		elt.removeChild( elt.lastChild );

	}

	var i, len = models.length;

	for ( i = 0; i < len; i ++ ) {

		option = document.createElement( "option" );
		option.text = models[ i ].name;
		elt.add( option );

	}

}

function selectModel() {

	var select = document.getElementById( "models_list" );

	if ( select.selectedIndex >= 0 && !currentlySlicing) {

		selectedModelIndex = select.selectedIndex;

		if ( currentModel !== undefined ) {

			scene.remove( currentModel.mesh );

		}
		
		currentModel = models[selectedModelIndex];

		if ( currentModel.mesh !== undefined ) {

			scene.add( currentModel.mesh );

		} else {

			loadModel( currentModel );

		}

	} else {

		select.selectedIndex = selectedModelIndex;

	}

}

function loadModel( model ) { 

	var loader = new THREE.ThreeMFLoader();
	loader.setScriptsLocation("js/");

	var t0 = performance.now();
	loader.load( model.url, function ( meshesInfo ) {
		var t1 = performance.now();
		console.log("3mf model loading took " + (t1 - t0) + " milliseconds.");

		meshesInfo.forEach( function( meshInfo ) {

			var textures = meshInfo.textures;
			var geometry = meshInfo.geometry;
			console.log("Geometry has " + geometry.faces.length + " triangles.");

			geometry.center();
			geometry.scale( model.objectScale.x, model.objectScale.y, model.objectScale.z );
			geometry.mergeVertices();

			var material = getTexturesMaterial( textures );

			mesh = new THREE.Mesh( geometry, material );

			mesh.castShadow = true;
			mesh.receiveShadow = true;
			
			scene.add( mesh );

			model.mesh = mesh;

		});

	});


	function getTexturesMaterial( textures ) {

		var material;

		if ( textures instanceof THREE.Texture ) { 

			material = new THREE.MeshPhongMaterial( { map: textures , specular: 0x111111, shininess: 200, vertexColors: THREE.FaceColors } );
		
		} else if ( textures.length > 1 ) {

			var materials = [];

			for ( var i = 0; i < textures.length; i ++ ) {

				var subMaterial = new THREE.MeshPhongMaterial( { map: textures[ i ] , specular: 0x111111, shininess: 200, vertexColors: THREE.FaceColors } );
				materials.push( subMaterial );

			}

			material = new THREE.MeshFaceMaterial( materials );

		} else {

			material = new THREE.MeshPhongMaterial( { specular: 0x111111, shininess: 200, vertexColors: THREE.FaceColors } );

		}

		return material;

	}

}

function sliceCurrentModel(){

	if ( currentModel !== undefined ){

		if ( currentModel.slices === undefined ) {

			currentModel.slices = generateSlices( currentModel.mesh, currentModel.sliceSize );

		}

		scene.remove( currentModel.mesh );
		currentlySlicing = true;
		displaySlices( scene, currentModel.slices, 500, removeSlices );

	} else {

		alert( "No model loaded." );

	}

	function removeSlices(){

		var slices = currentModel.slices;
		currentlySlicing = false;

		scene.add( currentModel.mesh );

		for ( var i = 0; i < slices.length; i ++ ) {

			scene.remove( slices[ i ] );

		}

	}

}
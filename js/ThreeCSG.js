/*
	THREE.CSG
	@author Chandler Prall <chandler.prall@gmail.com> http://chandler.prallfamily.com
	
	Wrapper for Evan Wallace's CSG library (https://github.com/evanw/csg.js/)
	Provides CSG capabilities for Three.js models.
	
	Provided under the MIT License

	Updated by jvfl <https://github.com/jvfl>.
*/

THREE.CSG = {
	toCSG: function ( three_model, offset, rotation ) {

		var i, geometry, offset, polygons, vertices, rotation_matrix;
		
		if ( !CSG ) {
			throw 'CSG library not loaded. Please get a copy from https://github.com/evanw/csg.js';
		}
		
		if ( three_model instanceof THREE.Mesh ) {
			geometry = three_model.geometry;
			offset = offset || three_model.position;
			rotation = rotation || three_model.rotation;
		} else if ( three_model instanceof THREE.Geometry ) {
			geometry = three_model;
			offset = offset || new THREE.Vector3( 0, 0, 0 );
			rotation = rotation || new THREE.Euler( 0, 0, 0 );
		} else {
			throw 'Model type not supported.';
		}
		rotation_matrix = new THREE.Matrix4( ).makeRotationFromEuler( rotation );
		
		var polygons = [];
		for ( i = 0; i < geometry.faces.length; i++ ) {

			if ( geometry.faces[i] instanceof THREE.Face3 ) {
				
				vertices = [];
				vertices.push( new CSG.Vertex( transformVector3 ( geometry.vertices[geometry.faces[i].a].clone( ), offset, rotation_matrix ) ) );
				vertices.push( new CSG.Vertex( transformVector3 ( geometry.vertices[geometry.faces[i].b].clone( ), offset, rotation_matrix ) ) );
				vertices.push( new CSG.Vertex( transformVector3 ( geometry.vertices[geometry.faces[i].c].clone( ), offset, rotation_matrix ) ) );
				polygons.push( new CSG.Polygon( vertices ) );
				
			} else {

				throw 'Model contains unsupported face.';

			}

		}
		
		return CSG.fromPolygons( polygons );

		function transformVector3( threeJsVector, offset, rotationMatrix ) { 

			var transformedVector = threeJsVector.add( offset ).applyMatrix4( rotation_matrix );
			return CSG.Vector3D.Create( transformedVector.x, transformedVector.y, transformedVector.z );

		}

	},
	
	fromCSG: function( csgModel ) {

		var i, j, vertices, face,
			threeGeometry = new THREE.Geometry( ),
			polygons = csgModel.toPolygons( );
		
		if ( !CSG ) {
			throw 'CSG library not loaded. Please get a copy from https://github.com/Spiritdude/OpenJSCAD.org';
		}
		
		for ( i = 0; i < polygons.length; i++ ) {
			
			// Vertices
			vertices = [];
			for ( j = 0; j < polygons[i].vertices.length; j++ ) {
				vertices.push( this.getGeometryVertice( threeGeometry, polygons[i].vertices[j].pos ) );
			}
			if ( vertices[0] === vertices[vertices.length - 1] ) {
				vertices.pop( );
			}
			
			for (var j = 2; j < vertices.length; j++) {
				face = new THREE.Face3( vertices[0], vertices[j-1], vertices[j], new THREE.Vector3( ).copy( polygons[i].plane.normal ) );
				threeGeometry.faces.push( face );
			}
		}
		
		threeGeometry.computeBoundingBox();
		
		return threeGeometry;

	},
	
	getGeometryVertice: function getGeometryVertice ( geometry, vertice_position ) {

		geometry.vertices.push( new THREE.Vector3( vertice_position.x, vertice_position.y, vertice_position.z ) );
		return geometry.vertices.length - 1;

	}
};
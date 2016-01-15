/**
 * @author jvfl / https://github.com/jvfl
 *
 * Description: A THREE loader for 3mf files. Done according to the specs in http://www.3mf.io/what-is-3mf/3mf-specification/.
 *
 * Limitations:
 *  No support for alpha channel on ColorGroups.
 *  No support for BaseMaterials, CompositeMaterials and MultiProperties tags.
 *
 * Usage:
 *  var loader = new THREE.ThreeMFLoader();
 *  loader.load( './models/3mf/textured/sphere_logo.3mf', function ( meshesInfo ) {
 *
 *    // Several 3mf objects might be loaded at once
 *    for ( var i = 0; i < meshesInfo.length; i ++ ) {
 *
 *      var meshInfo = meshesInfo[ i ];
 *
 *      var geometry = meshInfo.geometry;
 *      var textures = meshInfo.textures;
 *
 *      // For one texture.
 *      // The vertexColors attribute is only needed if the 3mf is colored.
 *      // To check if it's colored, simply check geometry.hasColors.
 *      var meshMaterial = new THREE.MeshPhongMaterial( { map: textures , vertexColors: THREE.FaceColors } );
 *
 *      // For more than one texture, add materials as needed.
 *      var material = new THREE.MeshPhongMaterial( { map: textures[ 0 ] , vertexColors: THREE.FaceColors } );
 *		var material2 = new THREE.MeshPhongMaterial( { map: textures[ 1 ] , vertexColors: THREE.FaceColors } );
 *		var meshMaterial = new THREE.MeshFaceMaterial( [ material, material2 ] );
 *
 *      scene.add( new THREE.Mesh( geometry, meshMaterial ) );
 *
 *    }
 *
 *
 *  });
 *
 */

THREE.ThreeMFLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.ThreeMFLoader.prototype = {

	constructor: THREE.ThreeMFLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setCrossOrigin( this.crossOrigin );
		loader.setResponseType( 'blob' );
		var t0 = performance.now();
		loader.load( url, function ( file ) {
			var t1 = performance.now();
			console.log("Downloading 3MF took " + (t1 - t0) + " milliseconds.");

			scope.parse3mf( file, onLoad );

		}, onProgress, onError );

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	setScriptsLocation: function ( location ) {

		zip.workerScriptsPath = location;

	},

	parse3mf: function ( file, onLoad ) {

		var zipProcessor = ( function () {

			return {

				getEntries : function ( file, onend ) {

					zip.createReader( new zip.BlobReader( file ), function ( zipReader ) {

						zipReader.getEntries( onend );

					}, function ( message ) {

						console.log( message );

					} );

				},
				getEntryData : function ( entry, myme, onend ) {

					var filePath = entry.filename;
					var fileName = filePath.slice( filePath.lastIndexOf( '/' ) + 1, filePath.length );

					entry.getData( new zip.BlobWriter(), function ( blob ) {

						onend( blob, fileName );

					} );

				}

			};

		} )();

		var modelBlobURL;
		var textures = {};
		var filesToLoad = 0;

		var t0 = performance.now();
		zipProcessor.getEntries( file, function ( entries ) {

			for ( var i = 0; i < entries.length; i ++ ) {

				var entry = entries[ i ];
				var filePath = entry.filename;

				var re = /(.model)$/;
				if ( ( capture = re.exec( filePath ) ) !== null ) {

					filesToLoad ++;
					zipProcessor.getEntryData( entry, "text/xml", loadModel );

				}

				re = /(.jpg)|(.jpeg)|(.png)$/;
				if ( ( capture = re.exec( filePath ) ) !== null ) {

					filesToLoad ++;
					var imageType = capture[ 0 ];

					if ( imageType === ".jpg" ) {

						imageType = "jpeg";

					}

					zipProcessor.getEntryData( entry, "image/" + imageType, loadTexture );

				    }

			   }

		} );

		function loadModel( blob ) {

			var t1 = performance.now();
			console.log("Unzipping took " + (t1 - t0) + " milliseconds.");
			var URL =  window.mozURL || window.URL;
			modelBlobURL = URL.createObjectURL( blob );
			tryLoad();

		}

		function loadTexture( blob, fileName ) {

			var URL =  window.mozURL || window.URL;
			var imageURL = URL.createObjectURL( blob );

			texture = THREE.ImageUtils.loadTexture( imageURL );
			texture.minFilter = THREE.LinearFilter;

			textures[ fileName ] = texture;
			tryLoad();

		}

		function tryLoad() {

			filesToLoad --;

			if ( filesToLoad > 0 ) {

				return;

			}

			xmlhttp = new XMLHttpRequest();
			xmlhttp.onload = function () {

				 if ( this.status === 200 && this.responseXML !== null ) {

					xmlDoc = this.responseXML;
					processXML( xmlDoc );

				 } else if ( this.status === 200 && this.response !== null ) {

					parser = new DOMParser();
					xmlDoc = parser.parseFromString( this.response, "text/xml" );
					processXML( xmlDoc );

				 } else {

					console.log( "Error loading the model." );

				 }

			};
			xmlhttp.open( "GET", modelBlobURL );
			xmlhttp.send();

		}

		function processXML( xmlDoc ) {

			var t0 = performance.now();
			var textureTags = xmlDoc.getElementsByTagName( "texture2d" );
			var colorGroupsNodes = xmlDoc.getElementsByTagName( "colorgroup" );
			var texture2DGroupsNodes = xmlDoc.getElementsByTagName( "texture2dgroup" );
			var objects = xmlDoc.getElementsByTagName( "object" );
			var meshesInfo = [];

			var mappedTextures = mapTextures( textureTags, textures );
			var colorGroups = parseColorGroups( colorGroupsNodes );
			var texture2DGroups = parseTexCoordGroups( texture2DGroupsNodes, mappedTextures );

			fillGeometries( objects, colorGroups, texture2DGroups, meshesInfo );
			var t1 = performance.now();
			console.log("XML parsing took " + (t1 - t0) + " milliseconds.");
			onLoad( meshesInfo );

		}

		function fillGeometries( objects, colorGroups, texture2DGroups, meshesInfo ) {

			for ( var i = 0; i < objects.length; i ++ ) {

				var geometry = new THREE.Geometry();
				var materials = { "textures" : [] };

				parseObject( objects[ i ], colorGroups, texture2DGroups, geometry, materials );

				var textures = materials.textures;
				if ( textures.length === 1 ) {

					textures = textures[ 0 ];

				}

				geometry.computeBoundingBox();
				geometry.computeBoundingSphere();

				meshesInfo.push( { "geometry" : geometry, "textures" : textures } );

			}

		}

		function mapTextures( textureTags, textures ) {

			var mappedTextures = {};

			for ( var i = 0; i < textureTags.length; i ++ ) {

				var textureTag = textureTags[ i ];
				var textureId = textureTag.getAttribute( "id" );
				var texturePath = textureTag.getAttribute( "path" );

				var textureName = texturePath.slice( texturePath.lastIndexOf( '/' ) + 1, texturePath.length );
				mappedTextures[ textureId ] = textures[ textureName ];

			}

			return mappedTextures;

		}

		function parseTexCoordGroups( texture2DGroups, mappedTextures ) {

			var texCoordGroups = {};

			for ( var i = 0; i < texture2DGroups.length; i ++ ) {

				var texture2DGroup = texture2DGroups[ i ];

				var texture2DGroupId = texture2DGroup.getAttribute( "id" );
				var texture2DCoords = texture2DGroup.getElementsByTagName( "tex2coord" );

				var textureId = texture2DGroup.getAttribute( "texid" );
				var texture = mappedTextures[ textureId ];

				texCoordGroups[ texture2DGroupId ] = { "texture" : texture, "textureId" : textureId, "textureCoords" : texture2DCoords };

			}

			return texCoordGroups;

		}

		function parseColorGroups( colorGroups ) {

			var colorGroupsHash = {};

			for ( var i = 0; i < colorGroups.length; i ++ ) {

				var colorGroup = colorGroups[ i ];
				var elementId = colorGroup.getAttribute( "id" );

				colorGroupsHash[ elementId ] = colorGroup.getElementsByTagName( "color" );

			}

			return colorGroupsHash;

		}

		function parseObject( object, colorGroups, texture2DGroups, geometry, materials ) {

			//If the attribute does not exist, the variables become NaN.
			var defaultPid = parseInt( object.getAttribute( "pid" ) );
			var defaultPindex = parseInt( object.getAttribute( "pindex" ) );

			var vertices = object.getElementsByTagName( "vertex" );
			var triangles = object.getElementsByTagName( "triangle" );
			var geometryLength = geometry.vertices.length;

			for ( var i = 0; i < vertices.length; i ++ ) {

				var vertex = vertices[ i ];
				geometry.vertices.push( parseVertex( vertex ) );

			}

			for ( i = 0; i < triangles.length; i ++ ) {

				var triangle = triangles[ i ];

				var v1 = parseInt( triangle.getAttribute( "v1" ) );
				var v2 = parseInt( triangle.getAttribute( "v2" ) );
				var v3 = parseInt( triangle.getAttribute( "v3" ) );

				var vertex1 = parseVertex( vertices[ v1 ] );
				var vertex2 = parseVertex( vertices[ v2 ] );
				var vertex3 = parseVertex( vertices[ v3 ] );

				var pid = triangle.getAttribute( "pid" );
				//pid might be null
				pid = pid ? pid : defaultPid;

				//As above, if the attribute does not exist, the variables become NaN.
				var p1 = parseInt( triangle.getAttribute( "p1" ) );
				var p2 = parseInt( triangle.getAttribute( "p2" ) );
				var p3 = parseInt( triangle.getAttribute( "p3" ) );

				//p1 will remain NaN if the defaultPindex does not exist.
				p1 = isNaN( p1 ) ? defaultPindex : p1;

				var colors = [];
				var texLocalId = 0;

				if ( isNaN( p1 ) ) {

					insertNullTexVertex( geometry, 0 );

				} else if ( pid in texture2DGroups ) {

					var tex2DGroup = texture2DGroups[ pid ];
					texLocalId = nextTexLocalId( tex2DGroup, materials );
					var uvs = createUVsFromTexCoords( tex2DGroup.textureCoords, p1, p2, p3 );
					geometry.faceVertexUvs[ 0 ].push( uvs );

				} else if ( pid in colorGroups ) {

					colors = createColorsFromColorOptions( colorGroups[ pid ], p1, p2, p3 );
					geometry.hasColors = true;
					insertNullTexVertex( geometry, 0 );

				}

				var normal = faceNormal( vertex1, vertex2, vertex3 );
				var face = new THREE.Face3( geometryLength + v1, geometryLength + v2, geometryLength + v3, normal, colors, texLocalId );
				geometry.faces.push( face );

			}

		}

		function nextTexLocalId( tex2DGroup, materials ) {

			if ( materials[ tex2DGroup.textureId ] === undefined ) {

				materials.textures.push( tex2DGroup.texture );
				var texLocalId = materials.textures.length - 1;
				materials[ tex2DGroup.textureId ] = texLocalId;

			}

			return materials[ tex2DGroup.textureId ];

		}

		function createUVsFromTexCoords( texCoords, p1, p2, p3 ) {

			var uv1 = parseUV( texCoords[ p1 ] );

			if ( p2 && p3 ) {

				var uv2 = parseUV( texCoords[ p2 ] );
				var uv3 = parseUV( texCoords[ p3 ] );

				return [ uv1, uv2, uv3 ];

			}

			return [ uv1, uv1, uv1 ];

		}

		function createColorsFromColorOptions( colorOptions, p1, p2, p3 ) {

			var color1 = parseColor( colorOptions[ p1 ] );

			if ( p2 && p3 ) {

				var color2 = parseColor( colorOptions[ p2 ] );
				var color3 = parseColor( colorOptions[ p3 ] );

				return [ color1, color2, color3 ];

			}

			return [ color1, color1, color1 ];

		}

		function parseUV( uvNode ) {

			var u = parseFloat( uvNode.getAttribute( "u" ) );
			var v = parseFloat( uvNode.getAttribute( "v" ) );

			return new THREE.Vector2( u, v );

		}

		function parseColor( colorNode ) {

			var color = colorNode.getAttribute( "color" );

			if ( color.length > 7 ) {

				color = color.slice( 0, color.length - ( color.length - 7 ) );

			}

			return new THREE.Color( color );

		}

		function parseVertex( vertexNode ) {

			var x = parseFloat( vertexNode.getAttribute( "x" ) );
			var y = parseFloat( vertexNode.getAttribute( "y" ) );
			var z = parseFloat( vertexNode.getAttribute( "z" ) );

			return new THREE.Vector3( x, y, z );

		}

		function faceNormal( a, b, c ) {

			var ab = new THREE.Vector3();
			var ac = new THREE.Vector3();
			ab.subVectors( a, b );
			ac.subVectors( a, c );

			var normal = new THREE.Vector3();
			normal.crossVectors( ab, ac );
			return normal;

		}

		function insertNullTexVertex( geometry ) {

			var nullTextureCoords = new THREE.Vector2( 0, 0 );
			geometry.faceVertexUvs[ 0 ].push( [ nullTextureCoords, nullTextureCoords, nullTextureCoords ] );

		}

	}

};

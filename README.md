## Description
A THREE loader for 3mf files. Done according to the specs in http://www.3mf.io/what-is-3mf/3mf-specification/.

## Limitations
No support for alpha channel on ColorGroups. No support for BaseMaterials, CompositeMaterials and MultiProperties tags.
 
## Usage

```Javascript
   var loader = new THREE.ThreeMFLoader();
   loader.load( './models/3mf/textured/sphere_logo.3mf', function ( meshesInfo ) {
 
     // Several 3mf objects might be loaded at once
     for ( var i = 0; i < meshesInfo.length; i ++ ) {
 
       var meshInfo = meshesInfo[ i ];
 
       var geometry = meshInfo.geometry;
       var textures = meshInfo.textures;
 
       // For one texture.
       // The vertexColors attribute is only needed if the 3mf is colored.
       // To check if it's colored, simply check geometry.hasColors.
       var meshMaterial = new THREE.MeshPhongMaterial( { map: textures , vertexColors: THREE.FaceColors } );
 
       // For more than one texture, add materials as needed.
       var material = new THREE.MeshPhongMaterial( { map: textures[ 0 ] , vertexColors: THREE.FaceColors } );
 		var material2 = new THREE.MeshPhongMaterial( { map: textures[ 1 ] , vertexColors: THREE.FaceColors } );
 		var meshMaterial = new THREE.MeshFaceMaterial( [ material, material2 ] );
 
       scene.add( new THREE.Mesh( geometry, meshMaterial ) );
 
     }
 
 
   });
```

## Acknowledgments

The research results reported in this paper have been partly funded by a R&D project between HP Brazil R&D division and UFPE originated from tax exemption (IPI -Law number 8.248, of 1991 and later updates).
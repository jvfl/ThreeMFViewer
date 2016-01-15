(function(obj){


	(function(){
		var fileInput = document.getElementById("file-input");

if (fileInput != null){
		fileInput.addEventListener('change', function() {
				var loader = new THREE.ThreeMFLoader();
				console.log(fileInput.files[0]);
				loader.parse3mf(fileInput.files[0], function(geometries){
					console.log(geometries);
				});
			}, false);
	}
	})();

})(this);
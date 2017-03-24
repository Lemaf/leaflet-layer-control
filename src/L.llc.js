L.llc = {

};


(function () {

	var D2R = Math.PI / 180,
		R_MAJOR = 6378137,
		R_MINOR = 6356752;

	var R = (R_MAJOR * R_MINOR) / 2;

	// Refe: https://github.com/Leaflet/Leaflet.draw/blob/master/src/ext/GeometryUtil.js
	function areaOf(latlngs) {
		var area = 0, latlng1, latlng2;

		if (latlngs.length > 2) {

			for (var i = 0; i < latlngs.length; i++) {
				latlng1 = latlngs[i];
				latlng2 = latlngs[(i + 1) % latlngs.length];

				area += ((latlng2.lng - latlng1.lng) * D2R) * (2 + Math.sin(latlng1.lat * D2R) + Math.sin(latlng2.lat * D2R));
			}

			area *= R;
		}

		return Math.abs(area);
	}


	L.llc.areaOf = function (layer) {
		var area = 0;

		if (layer instanceof L.FeatureGroup) {

			layer.eachLayer(function (layer) {
				area += L.llc.areaOf(layer);
			});

		} else if (layer instanceof L.Polygon) {

			var latlngs = layer.getLatLngs();

			if (Array.isArray(latlngs[0])) {
				// shell and holes
				area += areaOf(latlngs[0]);
				latlngs.slice(1).forEach(function (latlngs) {
					area -= areaOf(latlngs);
				});

			} else {

				area = areaOf(latlngs);

			}
		}

		return area;
	};

})();
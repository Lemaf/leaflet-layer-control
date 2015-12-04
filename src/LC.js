L.Control.LC = L.Control.extend({

	includes: L.Mixin.Events,

	options: {
		position: 'bottomright',
		layers: {
			showAreas: true,

			formatArea: function (area) {
				if (area >= 1000) {
					return L.Util.formatNum(area / 1e4, 4) + 'ha';
				} else {
					return L.Util.formatNum(area, 4) + 'm';
				}
			},

			groups: []
		},
		parentElement: null
	},

	initialize: function (options) {
		var layerOptions = L.extend({}, this.options.layers, options && options.layers);

		options = L.extend({}, this.options, options || {}, {
			layers: layerOptions
		});

		L.Control.prototype.initialize.call(this, options);
	},

	addLayer: function (layer) {
		this._toInvoke('addLayer', layer);
		return this;
	},

	addLegend: function (legend) {
		this._toInvoke('addLegend', legend);
		return this;
	},

	hideLayer: function (layer) {
		this._toInvoke('hideLayer', layer);
		return this;
	},

	showLayer: function (layer) {
		this._toInvoke('showLayer', layer);
		return this;
	},

	onAdd: function (map) {
		this._viewLayers = L.Control.LC.viewLayers(map, this.options.layers);

		var button = L.DomUtil.create('div', 'llc llc-button');

		L.DomEvent
			.on(button, 'click', this._onButtonClick, this)
			.on(button, 'click', L.DomEvent.stop)
			.on(button, 'dblclick', L.DomEvent.stop)
			.on(button, 'mousedown', L.DomEvent.stop);

		this._invokeInvokes();

		this._map.eachLayer(function (layer) {
			this._viewLayers.addLayer(layer, true);
		}, this);

		return button;
	},

	updateAreas: function () {
		this._toInvoke('updateAreas');
		return this;
	},

	_invokeInvoke: function (invoke) {
		if (this._viewLayers) {
			this._viewLayers[invoke.method].apply(this._viewLayers, invoke.args);
		}
	},

	_invokeInvokes: function() {
		if (this._invokes) {
			for (var i=0; i < this._invokes.length; i++) {
				this._invokeInvoke(this._invokes[i]);
			}
		}
	},

	_onButtonClick: function () {
		var position = this.getPosition();
		this._viewLayers.show(this._container, this.getPosition());
	},

	_toInvoke: function (method) {
		var args = Array.prototype.slice.call(arguments, 1);

		if (!this._invokes) {
			this._invokes = [];
		}

		var invoke = {method: method, args: args};
		this._invokes.push(invoke);

		this._invokeInvoke(invoke);
	}

});

L.Control.lc = function (options) {
	return new L.Control.LC(options);
};


(function () {

	var D2R = L.LatLng.DEG_TO_RAD,
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

		return area;
	}


	L.Control.LC.areaOf = function (layer, format) {
		var area = 0;
		if (layer instanceof L.FeatureGroup) {

			layer.eachLayer(function (layer) {
				area += L.Control.LC.areaOf(layer);
			});
		} else if (layer instanceof L.Polygon) {
			var latlngs = layer.getLatLngs();

			if (Array.isArray(latlngs[0])) {
				// shell and holes
				area += areaOf(latlngs[0]);
				latlngs.slice(0).forEach(function (latlngs) {
					area -= areaOf(latlngs);
				});
			} else {
				area = areaOf(latlngs);
			}
		}

		return area;
	};

})();
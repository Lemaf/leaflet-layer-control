/**
 * @requires View.js
 */
L.llc.Control = L.Control.extend({

	includes: L.Mixin.Events,

	options: {
		position: 'bottomright',
		layers: {

			animationTime: 500,

			showAreas: true,

			formatArea: function (area) {
				if (area >= 1000) {
					return L.Util.formatNum(area / 1e4, 4) + 'ha';
				} else {
					return L.Util.formatNum(area, 4) + 'm';
				}
			},

			groups: [],

			defaultGroup: null
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

	addLegend: function (layer, legend) {
		this._toInvoke('addLegend', layer, legend);
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
		this._viewLayers = L.llc.view(map, this.options.layers);

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
	return new L.llc.Control(options);
};
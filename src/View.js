/**
 * @requires Layers.js
 */
L.llc.View = L.Class.extend({

	includes: L.Mixin.Events,

	initialize: function (map, options) {
		this._map = map;
		L.setOptions(this, options);

		var containerEl = this._containerEl = L.DomUtil.create('div', 'llc-container');

		L.extend(containerEl.style, {
			overflow: 'hidden'
		});

		var canvasEl = this._canvasEl = L.DomUtil.create('div', 'llc-canvas', containerEl);

		var headerEl = this._headerEl = L.DomUtil.create('div', 'llc-header', canvasEl);
		var closeEl = this._closeEl = L.DomUtil.create('div', 'llc-close', headerEl);

		this._groupsRootEl = L.DomUtil.create('div', 'llc-groups', canvasEl);
		this._fragments = {
			layers: new L.llc.Layers(this._groupsRootEl, map)
		};

		if (this.options.groups) {
			this.options.groups.forEach(this._addGroup, this);
		}

		L.DomEvent
			.on(containerEl, 'click', L.DomEvent.stopPropagation)
			.on(containerEl, 'dblclick', L.DomEvent.stopPropagation)
			.on(containerEl, 'mousedown', L.DomEvent.stopPropagation)
			.on(containerEl, 'wheel', L.DomEvent.stopPropagation)
			.on(closeEl, 'click', this._onCloseClick, this);

		this._layers = {};
		this._hidedLayers = [];
	},

	addLayer: function (layer, auto) {
		this._fragments.layers.addLayer(layer, auto);
		return this;
	},

	addLegend: function (legend) {
		if (!Array.isArray(legend)) {

			this.addLayer(legend.layer);

			var layerInfo = this._layers[L.stamp(legend.layer)];

			L.extend(layerInfo.legendEl.style, legend.style);

		} else {
			legend.forEach(this.addLegend, this);
		}

		return this;
	},

	close: function () {
		if (this._visible) {
			this._close();
		}
	},

	hideLayer: function (layer) {
		this._fragments.layers.hideLayer(layer);
		return this;
	},

	show: function (fromEl, position) {
		if (!this._visible) {
			this._visible = true;

			this._show(fromEl, position);
		}
	},

	updateAreas: function () {
		var layerInfo;

		for (var id in this._layers) {
			layerInfo = this._layers[id];

			if (layerInfo.areaEl) {
				layerInfo.areaEl.innerHTML = this.options.formatArea(L.Control.LC.areaOf(layerInfo.layer, true));
			}
		}
	},

	_addGroup: function (group) {
		this._fragments.layers.addGroup(group);
	},

	_close: function () {
		delete this._visible;

		// TODO: Anim
		
		this._containerEl.parentNode.removeChild(this._containerEl);
		this._fromEl.style.display = 'block';
	},

	_onCloseClick: function () {
		this.close();
	},

	_onLayerAdd: function (evt) {
		this.addLayer(evt.layer, true);
	},

	_onLayerRemove: function (evt) {
		this.removeLayer(evt.layer);
	},

	_onItemClick: function () {
	},

	_show: function (fromEl, position) {

		L.extend(this._canvasEl.style, {
			opacity: 0
		});

		var cssPosition = {};

		if (position.indexOf('bottom') === 0) {
			cssPosition.bottom = (fromEl.offsetParent.offsetHeight - (fromEl.offsetTop + fromEl.offsetHeight)) + 'px';
		} else {
			cssPosition.top = fromEl.offsetTop + 'px';
		}

		if (position.indexOf('right') >= 0) {
			cssPosition.right = (fromEl.offsetParent.offsetWidth - (fromEl.offsetLeft + fromEl.offsetWidth)) + 'px';
		} else {
			cssPosition.left = fromEl.offsetLeft + 'px';
		}

		this._cssPosition = cssPosition;

		L.extend(this._containerEl.style, {
			height: fromEl.offsetHeight + 'px',
			position: 'absolute',
			width: fromEl.offsetWidth + 'px'
		}, this._cssPosition);

		fromEl.parentNode.appendChild(this._containerEl);
		fromEl.style.display = 'none';
		this._fromEl = fromEl;

		this._containerEl.style.background = '#ffffff';

		var player = this._containerEl.animate([
			{
				height: fromEl.offsetHeight + 'px',
				width: fromEl.offsetWidth + 'px'
			}, {
				height: this._containerEl.scrollHeight + 'px',
				width: this._containerEl.scrollWidth + 'px',
				easing: 'ease-in-out'
			}
		], 500);

		L.DomEvent
			.on(player, 'finish', function () {
				L.extend(this._containerEl.style, {
					height: this._containerEl.scrollHeight + 'px',
					width: this._containerEl.scrollWidth + 'px'
				});
			}, this);

		player = this._canvasEl.animate([
			{opacity: 0},
			{opacity: 1}
		], 500);

		L.DomEvent
			.on(player, 'finish', function () {
				L.extend(this._canvasEl.style, {
					opacity: 1
				});
			}, this);
	}
});

L.llc.view = function (map, options) {
	return new L.llc.View(map, options);
};

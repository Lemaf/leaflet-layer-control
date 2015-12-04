L.Control.LC.ViewLayers = L.Class.extend({

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

		if (this.options.groups) {
			this.options.groups.forEach(this._addGroup, this);
		}

		map
			.on('layeradd', this._onLayerAdd, this)
			.on('layerremove', this._onLayerRemove, this);

		L.DomEvent
			.on(containerEl, 'click', L.DomEvent.stopPropagation)
			.on(containerEl, 'dblclick', L.DomEvent.stopPropagation)
			.on(containerEl, 'mousedown', L.DomEvent.stopPropagation)
			.on(closeEl, 'click', this._onCloseClick, this);

		this._layers = {};
		this._hidedLayers = [];
	},

	addLayer: function (layer, auto) {

		if (!layer.options) {
			return;
		}

		var id = L.stamp(layer);

		if (!this._layers[id]) {

			var layerInfo = this._layers[id] = {
				layer: layer
			};

			var showLayer = this._hidedLayers.indexOf(id) === -1;

			var group = this._getGroup(layer.options.group);
			if (!showLayer) {
				this._maybeShow(group);
			}

			var liEl = L.DomUtil.create('li', 'llc-item', showLayer && group.el);

			var legendEl = L.DomUtil.create('div', 'llc-item-legend', liEl);

			var visibilityCheckEl = L.DomUtil.create('input', 'llc-item-visibility', liEl);
			var labelVisibilityEl = L.DomUtil.create('label', 'llc-item-opacity-label', liEl);
			visibilityCheckEl.id = 'llc-' + L.stamp(visibilityCheckEl);
			labelVisibilityEl.setAttribute('for', visibilityCheckEl.id);

			// var span = L.DomUtil.create('span', 'llc-item-title', liEl);
			// span.innerHTML = layer.options.title;
			
			labelVisibilityEl.innerHTML = layer.options.title;

			liEl._layerID = id;
			layerInfo.group = group;
			layerInfo.liEl = liEl;
			layerInfo.legendEl = legendEl;
			layerInfo.visibilityCheckEl = visibilityCheckEl;


			visibilityCheckEl._layerID = id;

			if (group.unique) {
				visibilityCheckEl.type = 'radio';
				visibilityCheckEl.name = group.name;
			} else {
				visibilityCheckEl.type = 'checkbox';
			}

			L.DomEvent
				.on(liEl, 'click', this._onItemClick, this)
				.on(visibilityCheckEl, 'click', this._onItemVisibilityCheck, this);

			if (layer.setOpacity) {
				var opacityEl = L.DomUtil.create('input', 'llc-item-opacity', liEl);
				opacityEl.type = 'range';
				opacityEl.min = 0;
				opacityEl.max = 100;
				opacityEl._layerID = id;
				layerInfo.opacityEl = opacityEl;

				L.DomEvent
					.on(opacityEl, 'change', this._onOpacityChange, this);
			}

			if (this.options.showAreas) {
				if (layer instanceof L.Polygon || layer instanceof L.FeatureGroup) {
					var areaEl = L.DomUtil.create('span', 'llc-item-area', liEl);
					layerInfo.areaEl = areaEl;
				}
			}
		}

		if (!auto) {
			this._layers[id].user = true;
		}

		this._layers[id].inMap = this._map.hasLayer(layer);

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

		var layerID = L.stamp(layer);

		if (this._hidedLayers.indexOf(layerID) === -1) {
			this._hidedLayers.push(layerID);
		}

		var layerInfo;
		if ((layerInfo = this._layers[layerID])) {
			if (layerInfo.liEl.parentNode) {
				layerInfo.liEl.parentNode.removeChild(layerInfo.liEl);

				this._maybeShow(layerInfo.group);
			}
		}

	},

	removeLayer: function (layer, remove) {
		var id = L.stamp(layer);
		var layerInfo = this._layers[id];

		if (layerInfo) {

			delete layerInfo.inMap;

			if (remove) {
				layerInfo.liEl.parentNode.removeChild(layerInfo.liEl);
				delete this._layers[id];
			}
		}

	},

	show: function (fromEl, position) {
		if (!this._visible) {
			this._visible = true;

			this._show(fromEl, position);
		}
	},

	updateAreas: function () {
		var layerInfo, area;

		for (var id in this._layers) {
			layerInfo = this._layers[id];

			if (layerInfo.areaEl) {
				layerInfo.areaEl.innerHTML = this.options.formatArea(L.Control.LC.areaOf(layerInfo.layer, true));
			}
		}
	},

	_addGroup: function (group) {

		if (!this._groups) {
			this._groups = {};
			this._groupsOrder = [];
		}

		if (this._groups[group.name]) {
			return;
		}

		var groupObj = this._groups[group.name] = {
			name: group.name,
			unique: !!group.unique,
			el: L.DomUtil.create('ul', 'llc-group', this._groupsRootEl)
		};

		this._groupsOrder.push(groupObj);

		var li = L.DomUtil.create('li', 'llc-group-title', groupObj.el);
		var spanTitle = L.DomUtil.create('span', null, li);

		spanTitle.innerHTML = group.name;
	},

	_close: function () {
		delete this._visible;

		// TODO: Anim
		
		this._containerEl.parentNode.removeChild(this._containerEl);
		this._fromEl.style.display = 'block';
	},

	_getGroup: function (groupName) {
		if (!this._groups) {
			this._groups = {};
		}

		var group = this._groups[groupName];
		if (!group) {
			this._addGroup({name: 'default'});
			group = this._groups['default'];
		}

		return group;
	},

	_maybeShow: function (group) {
		if (!group.showAlways && group.el.childNodes.length === 1) {
			group.el.parentNode.removeChild(group.el);
		}
	},

	_onCloseClick: function (event) {
		this.close();
	},

	_onLayerAdd: function (evt) {
		this.addLayer(evt.layer, true);
	},

	_onLayerRemove: function (evt) {
		this.removeLayer(evt.layer);
	},

	_onItemClick: function (evt) {
	},

	_onItemVisibilityCheck: function (event) {

		var layerInfo = this._layers[event.currentTarget._layerID];
		if (layerInfo) {

			var group = layerInfo.group, otherLayerInfo;

			if (group.unique) {

				if (layerInfo.inMap) {
					return;
				}

				for (var id in this._layers) {
					otherLayerInfo = this._layers[id];

					if (otherLayerInfo !== layerInfo && otherLayerInfo.group === group) {
						if (otherLayerInfo.inMap) {
							this._map.removeLayer(otherLayerInfo.layer);
						}
					}
				}

				this._map.addLayer(layerInfo.layer);

			} else {
				if (layerInfo.inMap) {
					this._map.removeLayer(layerInfo.layer);
				} else {
					this._map.addLayer(layerInfo.layer);
				}
			}
		}
	},

	_onOpacityChange: function (event) {
		var opacity = parseInt(event.target.value) / 100;
		var layerInfo = this._layers[event.target._layerID];

		if (layerInfo) {
			layerInfo.layer.setOpacity(opacity);
		}
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

L.Control.LC.viewLayers = function (map, options) {
	return new L.Control.LC.ViewLayers(map, options);
};

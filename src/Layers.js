L.llc.Layers = L.Class.extend({

	includes: L.Mixin.Events,

	options: {

	},

	initialize: function (rootEl, map, options) {
		L.setOptions(this, options);

		this._rootEl = rootEl;
		this._map = map;

		this._groups = {};
		this._groupsOrder = [];

		this._layers = {};
		this._hidedLayers = [];

		map
			.on('layeradd', this._onLayerAdd, this)
			.on('layerremove', this._onLayerRemove, this);
	},

	addGroup: function (group) {

		if (this._groups[group.name]) {
			return;
		}

		var groupInfo = this._groups[group.name] = {
			name: group.name,
			unique: !!group.unique,
			withOpacity: !group.noOpacity,
			el: L.DomUtil.create('ul', 'llc-group', this._rootEl)
		};

		this._groupsOrder.push(groupInfo);

		var li = L.DomUtil.create('li', 'llc-group-title', groupInfo.el);
		var spanTitle = L.DomUtil.create('span', null, li);
		spanTitle.innerHTML = group.name;

		return this;
	},

	addLayer: function (layer, auto) {

		if (!layer.options) {
			return this;
		}

		var layerID = L.stamp(layer);
		var layerInfo = this._layers[layerID];

		if (!layerInfo) {

			layerInfo = this._layers[layerID] = {
				layer: layer
			};

			var showLayer = this._hidedLayers.indexOf(layerID) === -1;

			var group = this._getGroup(layer.options.group);

			if (!showLayer) {
				this._maybeHideGroup(group);
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

			liEl._layerID = layerID;
			layerInfo.group = group;
			layerInfo.liEl = liEl;
			layerInfo.legendEl = legendEl;
			layerInfo.visibilityCheckEl = visibilityCheckEl;


			visibilityCheckEl._layerID = layerID;

			if (group.unique) {
				visibilityCheckEl.type = 'radio';
				visibilityCheckEl.name = group.name;
			} else {
				visibilityCheckEl.type = 'checkbox';
			}

			L.DomEvent
				.on(visibilityCheckEl, 'click', this._onVisibilityClick, this);

			if (group.withOpacity && layer.setOpacity) {
				var opacityEl = L.DomUtil.create('input', 'llc-item-opacity', liEl);
				opacityEl.type = 'range';
				opacityEl.min = 0;
				opacityEl.max = 100;
				opacityEl.value = 100;
				opacityEl._layerID = layerID;
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
			this._layers[layerID].user = true;
		}

		if (layer.options.legend) {
			L.extend(layerInfo.legendEl.style, layer.options.legend);
		}

		layerInfo.inMap = this._map.hasLayer(layer);
		layerInfo.visibilityCheckEl.checked = layerInfo.inMap;

		return this;
	},

	addLegend: function (layer, legend) {
		var layerInfo = this._layers[L.stamp(layer)];

		if (!layerInfo) {
			this.addLayer(layer);
			layerInfo = this._layers[L.stamp(layer)];
		}

		if (layerInfo) {
			L.extend(layerInfo.legendEl.style, legend);
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

				this._maybeHideGroup(layerInfo.group);
			}
		}

		return this;
	},

	removeLayer: function (layer, auto) {
		var layerID = L.stamp(layer);
		var layerInfo = this._layers[layerID];

		if (layerInfo) {

			layerInfo.inMap = this._map.hasLayer(layer);
			layerInfo.visibilityCheckEl.checkbox = layerInfo.inMap;

			if (!auto) {
				layerInfo.liEl.parentNode.removeChild(layerInfo.liEl);
				delete this._layers[layerID];
			}
		}

	},

	updateAreas: function () {
		var layerInfo;
		if (this.options.showAreas) {
			for (var layerID in this._layers) {
				layerInfo = this._layers[layerID];

				if (layerInfo.areaEl) {
					layerInfo.areaEl.textContent = this.options.formatArea(L.llc.areaOf(layerInfo.layer));
				}
			}
		}
	},

	_maybeHideGroup: function (group) {
		if (!group.showAlways && group.el.childNodes.length === 1) {
			group.el.parentNode.removeChild(group.el);
		}
	},

	_getGroup: function (groupName) {
		var group = this._groups[groupName];

		if (!group) {
			// TODO: What?
			this._addGroup({name: 'default'});
			group = this._groups['default'];
		}

		return group;
	},

	_onLayerAdd: function (evt) {
		this.addLayer(evt.layer, true);
	},

	_onLayerRemove: function (evt) {
		this.removeLayer(evt.layer, true);
	},

	_onOpacityChange: function (event) {
		var opacity = parseInt(event.currentTarget.value) / 100;
		var layerInfo = this._layers[event.currentTarget._layerID];

		if (layerInfo) {
			layerInfo.layer.setOpacity(opacity);
		}
	},

	_onVisibilityClick: function (event) {

		var layerInfo = this._layers[event.currentTarget._layerID];
		if (layerInfo) {

			var group = layerInfo.group, otherLayerInfo;

			if (group.unique) {

				if (layerInfo.inMap) {
					return;
				}

				for (var layerID in this._layers) {
					otherLayerInfo = this._layers[layerID];

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
});
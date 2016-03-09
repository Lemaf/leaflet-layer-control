L.llc = {

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

		var parentElement, isSubGroup = false, superGroup;

		if (group.superGroup && (superGroup = this._groups[group.superGroup])) {

			if (!superGroup.subRootEl) {
				superGroup.subRootEl = L.DomUtil.create('div', 'llc-subgroups');

				if (superGroup.el.nextSibling) {
					superGroup.el.parentNode.insertBefore(superGroup.subRootEl, superGroup.el.nextSibling);
				} else {
					superGroup.el.parentNode.appendChild(superGroup.subRootEl);
				}
			}

			parentElement = superGroup.subRootEl;

			isSubGroup = true;

		} else {
			parentElement = this._rootEl;
		}

		var groupInfo = this._groups[group.name] = {
			name: group.name,
			unique: !!group.unique,
			withOpacity: !group.noOpacity,
			el: L.DomUtil.create('ul', isSubGroup ? 'llc-subgroup' :  'llc-group', parentElement)
		};

		this._groupsOrder.push(groupInfo);

		var li = L.DomUtil.create('li', 'llc-group-title', groupInfo.el);
		var spanTitle = L.DomUtil.create('span', '', li);
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

			var group = this._getGroup(layer.options.group);

			if (!group) {
				return this;
			}

			layerInfo = this._layers[layerID] = {
				layer: layer
			};

			var showLayer = this._hidedLayers.indexOf(layerID) === -1;

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

	_getGroup: function (groupName) {
		var group = this._groups[groupName];

		if (!group) {
			group = this._groups[this.options.defaultGroup];
		}

		return group;
	},

	_maybeHideGroup: function (group) {
		if (!group.showAlways && group.el.childNodes.length === 1) {
			group.el.parentNode.removeChild(group.el);
		}
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

/**
 * @requires Layers.js
 */
L.llc.View = L.Class.extend({

	includes: L.Mixin.Events,

	options: {

	},

	initialize: function (map, options) {
		this._map = map;
		L.setOptions(this, options.layers);

		var containerEl = this._containerEl = L.DomUtil.create('div', 'llc-container');

		L.extend(containerEl.style, {
			overflow: 'hidden'
		});

		var canvasEl = this._canvasEl = L.DomUtil.create('div', 'llc-canvas', containerEl);

		var headerEl = this._headerEl = L.DomUtil.create('div', 'llc-header', canvasEl);

		var titleEl = this._titleEl = L.DomUtil.create('div', 'llc-title', headerEl);

		var spanTitle = L.DomUtil.create('span', '', titleEl);
		spanTitle.innerHTML = options.llcTitle ? options.llcTitle:'';

		this._groupsRootEl = L.DomUtil.create('div', 'llc-groups', canvasEl);
		var footerEl = this._footerEl = L.DomUtil.create('div', 'llc-footer', canvasEl);
		var closeEl;

		if (options.position.indexOf('bottomright') === 0) {
			closeEl = this._closeEl = L.DomUtil.create('div', 'llc-close-right', footerEl);
		} else if (options.position.indexOf('topright') === 0) {
			closeEl = this._closeEl = L.DomUtil.create('div', 'llc-close-right', headerEl);
		} else if (options.position.indexOf('bottomleft') === 0) {
			closeEl = this._closeEl = L.DomUtil.create('div', 'llc-close-left', footerEl);
		} else if (options.position.indexOf('topleft') === 0) {
			closeEl = this._closeEl = L.DomUtil.create('div', 'llc-close-left', headerEl);
		}			

		this._fragments = {
			layers: new L.llc.Layers(this._groupsRootEl, map, {
				showAreas: this.options.showAreas,
				formatArea: this.options.formatArea
			})
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
	},

	addLayer: function (layer, auto) {
		this._fragments.layers.addLayer(layer, auto);
		return this;
	},

	addLegend: function (layer, legend) {
		this._fragments.layers.addLegend(layer, legend);
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
		this._fragments.layers.updateAreas();
	},

	_addGroup: function (group) {
		this._fragments.layers.addGroup(group);
	},

	_close: function () {

		var containerEl = this._containerEl,
		    fromEl = this._fromEl,
		    canvasEl = this._canvasEl;

		L.extend(this._fromEl.style, {
			opacity: 0,
			display: 'block'
		});

		var player = canvasEl.animate([
			{opacity: 1}, {opacity: 0}
		], this.options.animationTime / 2);

		L.DomEvent.on(player, 'finish', function () {
			canvasEl.style.display = 'none';
		});

		player = containerEl.animate([
			{
				height: containerEl.offsetHeight + 'px',
				width: containerEl.offsetWidth + 'px',
				opacity: 1
			}, {
				height: fromEl.offsetHeight + 'px',
				width: fromEl.offsetWidth + 'px',
				opacity: 0,
				easing: 'ease-in-out'
			}
		], this.options.animationTime);

		L.DomEvent.on(player, 'finish', function () {
			containerEl.parentNode.removeChild(containerEl);
		});

		player = fromEl.animate([
			{
				opacity: 0
			},
			{
				opacity: 1
			}
		], this.options.animationTime);

		L.DomEvent.on(player, 'finish', function () {
				delete this._visible;
				L.extend(fromEl.style, {
					display: 'block',
					opacity: ''
				});
			}, this);
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

	_show: function (fromEl, position) {

		L.extend(this._canvasEl.style, {
			display: 'block',
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
		this._fromEl = fromEl;

		var player = this._containerEl.animate([
			{
				height: fromEl.offsetHeight + 'px',
				width: fromEl.offsetWidth + 'px',
				opacity: 0
			}, {
				height: this._containerEl.scrollHeight + 'px',
				width: this._containerEl.scrollWidth + 'px',
				opacity: 1,
				easing: 'ease-in-out'
			}
		], this.options.animationTime / 2);

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
		], this.options.animationTime);

		L.DomEvent
			.on(player, 'finish', function () {
				L.extend(this._canvasEl.style, {
					opacity: 1
				});
			}, this);


		player = fromEl.animate([
			{opacity: 1}, {opacity: 0}
		], this.options.animationTime);

		L.DomEvent.on(player, 'finish', function () {
			fromEl.style.display = 'none';
		});
	}
});

L.llc.view = function (map, options) {
	return new L.llc.View(map, options);
};


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
				if (area >= 1e3) {
					return L.Util.formatNum(area / 1e4, 4) + 'ha';
				} else {
					return L.Util.formatNum(area, 4) + 'm²';
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
		this._viewLayers = L.llc.view(map, this.options);

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

if (!L.Path.prototype.setOpacity) {

	(function () {

		if (L.Path.SVG || L.Path.VML) {

			L.Path.include({

				setOpacity: function (opacity) {
					this._opacity = opacity;
					if (this._container) {
						this._container.style.opacity = opacity;
					}

				}, _updateOpacity: function () {
					if (this._opacity !== undefined) {
						this.setOpacity(this._opacity);
					}
				}
			});

			L.Path.addInitHook(function () {
				this.on('add', this._updateOpacity);
			});

		} else if (L.Path.CANVAS) {

			// TODO: Arrrghhh!

			L.Path.include({

				setOpacity: function (opacity) {
					this._opacity = opacity;
					this.redraw();
				},

				_updatePath: function () {

					if (this._checkIfEmpty()) { 
						return;
					}

					var ctx = this._ctx,
					    options = this.options,
					    opacity = this._opacity !== undefined ? this._opacity : 1;

					this._drawPath();
					ctx.save();
					this._updateStyle();


					if (options.fill) {
						ctx.globalAlpha = options.fillOpacity * opacity;
						ctx.fill(options.fillRule || 'evenodd');
					}

					if (options.stroke) {
						ctx.globalAlpha = options.opacity * opacity;
						ctx.stroke();
					}
					ctx.restore();

				}
			});
		}


	})();

}

if (!L.FeatureGroup.prototype.setOpacity) {

	L.FeatureGroup.include({

		setOpacity: function(opacity) {

			this.eachLayer(function(layer) {

				if(layer.setOpacity) {
					layer.setOpacity(opacity);
				}

			});

		}

	});

}
//# sourceMappingURL=llc.js.map

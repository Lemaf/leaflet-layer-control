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

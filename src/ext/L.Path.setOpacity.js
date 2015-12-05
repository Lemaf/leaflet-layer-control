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
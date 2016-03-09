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
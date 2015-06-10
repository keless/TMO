//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/framework/Graphics.js
//#include js/framework/ResourceProvider.js

/**
 * Tiled map .json loader and renderer
 *   also reads physics rectangles with the format:
 * 
 */
 var TiledMap = Class.create({
	initialize: function( path, outputW, outputH ) {
		this.path = path.substring(0, path.lastIndexOf("/")+1);
		this.width = outputW;
		this.height = outputH;
		this.isLoaded = false;
		
		this.renderLayers = [];
		//this.imgLayers = [];
		//this.tileLayers = [];
		this.groundRects = [];
		this.wallRects = [];
		this.spawnPts = [];
		
		this.pPhysics = null;
		this.physicsBodies = [];
		
		this.tileWidth = 0;
		this.tileHeight = 0;
		this.tileSets = [];
		this.tiles = [];
		
		this.debugShowBoxes = false;
	},
	
		//called by ResourceProvider
	LoadFromJson: function( dataJson ) {
		var rp = Service.get("rp");
		this.data = dataJson;
		
		this.tiles.push({img:null, file:"empty", tileset:null});
		for( var tilesetIdx=0; tilesetIdx < this.data.tilesets.length; tilesetIdx++ ) {
			var tileSet = this.data.tilesets[tilesetIdx];
			this.tileSets.push(tileSet);
			
			rp.loadImage(this.path + tileSet.image);
			
			var tileIdx = tileSet.firstgid;
			if(tileIdx != this.tiles.length) {
				console.warn("wrong tileIdx offset " + tileIdx + " expected " + this.tiles.length);
			}
			
			var tilesWide = Math.floor(tileSet.imagewidth / tileSet.tilewidth);
			var tilesHigh = Math.floor(tileSet.imageheight / tileSet.tileheight);
			for( var i=0; i< tilesWide * tilesHigh; i++) {
				this.tiles.push({ img:null, tileset:tileSet });
			}
			tileSet.tilesWide = tilesWide;
			tileSet.tilesHigh = tilesHigh;
		}
		
		for( var layerIdx=0; layerIdx < this.data.layers.length; layerIdx++ ) {
			var layer = this.data.layers[layerIdx];
			if( layer.type == "imagelayer" ) {
				//image layer
				this.renderLayers.push( layer );
				
				//preload image
				rp.loadImage(this.path + layer.image);
			}
			else if( layer.type == "tilelayer" ) {
				//tile layer
				this.renderLayers.push(layer);
			}
			else if( layer.type == "objectgroup" && layer.name == "wall") {
				//object layer
				for( var objIdx=0; objIdx < layer.objects.length; objIdx++ ) {
					var object = layer.objects[objIdx];
					object.rect = new Rect2D( object.x, object.y, object.width, object.height );
					this.wallRects.push(object);
				}
			}
			else if( layer.type == "objectgroup" && layer.name == "spawn") {
				//object layer
				for( var objIdx=0; objIdx < layer.objects.length; objIdx++ ) {
					var object = layer.objects[objIdx];
					object.rect = new Rect2D( object.x, object.y, object.width, object.height );
					this.spawnPts.push(object);
				}
			}
		}
		this.isLoaded = true;
	},
	
	Draw: function( gfx, offsetX, offsetY ) {
		if(!this.isLoaded) return;
		
		var rp = Service.get("rp");
		for( var layerIdx=0; layerIdx < this.renderLayers.length; layerIdx++ ) {
			var layer = this.renderLayers[layerIdx];
			if( layer.type == "imagelayer" ) {
				//draw image layer
				var layerImg = layer.img;
				if(!layerImg) {
					layer.img = rp.getImage(this.path + layer.image);
					layerImg = layer.img;
				}
				
				if(layerImg) {
					gfx.drawImage(layerImg, offsetX + layer.x, offsetY + layer.y);
				}
			}else {
				//draw tile layer
				var tileImg = null, tile = null;
				var tileIdx = 0, tx = 0, ty = 0, tw = 0, th = 0, sx = 0, sy = 0;
				for( var ty=0; ty<layer.height; ty++) {
					var tyStep = ty*layer.width;
					for( var tx=0; tx<layer.width; tx++) {
						tileIdx = layer.data[tx + tyStep]; 
						if(tileIdx == 0) continue;
						
						tile = this.tiles[tileIdx];
						
						tileImg = tile.img;
						if(!tileImg) {
							tile.img = rp.getImage(this.path + tile.tileset.image);
							tileImg = tile.img;
						}
						
						if(tileImg) {
							tw = tile.tileset.tilewidth;
							th = tile.tileset.tileheight;
							tileIdx = tileIdx - tile.tileset.firstgid;
							sy = Math.floor( tileIdx / tile.tileset.tilesWide );
							sx = tileIdx - (sy * tile.tileset.tilesWide);
							gfx.drawImageSub(tileImg, offsetX + layer.x + tx*tw, offsetY + layer.y + ty*th, sx*tw, sy*th, tw, th);
						}
						
					}
				}
			}

		}
		
		if(this.debugShowBoxes) {
			var object;
			//draw physics boxes
			for( var objIdx=0; objIdx < this.groundRects.length; objIdx++ ) {
					object = this.groundRects[objIdx];
					gfx.drawRect(offsetX + object.x, offsetY + object.y, object.width, object.height);
			}
			for( var objIdx=0; objIdx < this.wallRects.length; objIdx++ ) {
					object = this.wallRects[objIdx];
					gfx.drawRect(offsetX + object.x, offsetY + object.y, object.width, object.height);
			}
			//draw spawn points
			for( var objIdx=0; objIdx < this.spawnPts.length; objIdx++ ) {
					object = this.spawnPts[objIdx];
					gfx.drawRect(offsetX + object.x, offsetY + object.y, object.width, object.height);
			}
		}
	},
	
	GetSpawnPoint: function( idx ) {
		return this.spawnPts[idx];
	},
	GetRandomSpawn: function() {
		var min = 0;
		var max = this.spawnPts.length - 1;
		var idx = Math.floor(Math.random() * (max - min)) + min;
		return this.spawnPts[idx];
	},
	GetSpawnFurthestFrom: function( x,y ) {
		var dist = 0;
		var idx = 0;
		for(var i=0; i<this.spawnPts.length; i++) {
			var thisDistEst = Math.abs(this.spawnPts.x - x) + Math.abs(this.spawnPts.y - y);
			if(thisDistEst > dist) idx = i;
		}
		
		return this.spawnPts[idx];
	}
 });
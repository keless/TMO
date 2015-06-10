//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/framework/EventBus.js


var TopDownWorldModel = Class.create({
	initialize: function( ) {
		this.entities = {};
		this.map = null;
		this.isLoaded = false;
	},
	LoadMap: function( strMapFile, fnOnLoad ) {
		var RP = Service.get("rp");

		this.map = new TiledMap(strMapFile);
		var self = this;
		RP.getJson(strMapFile, function(e){
			self.map.LoadFromJson(e.res);

			self.isLoaded = true;
			
			if(fnOnLoad) fnOnLoad();
		});
	},
	
	/// @param wall - Rect2D  (expected vel - 0,0)
	/// @param obj - Rect2D
	/// @return - {col:bool, collPt:Vec2D }
	checkWallCollision: function( dt, wall, obj ) {
		//WORK IN PROGRESS
		//var origin = new Vec2D( obj.x, obj.y );
		var projected = new Rect2D( obj.pos.x + obj.velX, obj.y - obj.velY, obj.width, obj.height );
		if(wall.isRectOverlapped(projected)) {
			/*
			var resolveImmediately = false;
			if(resolveImmediately) {
				//HEURISTIC 1
				//determine which side of the wall we entered from

				//find closest corner
				var yCorner = (obj.y < origin.y) ? Rect2D.TOP : Rect2D.BOTTOM;
				var xCorner = (obj.x < origin.x) ? Rect2D.LEFT : Rect2D.RIGHT;
				
				//find largest axis delta
				var origToWall = wall.getCenter().getVecSub(origin); 
				var xDelta = Math.abs(origToWall.x);
				var yDelta = Math.abs(origToWall.y);
				
				var closestSide = xCorner;
				if(xDelta < yDelta) {
					closestSide = yCorner;
				}

				//this is the side, snap backwards to it
				switch(closestSide) {
					case Rect2D.TOP:
						 
					break;
				}
			}
			*/
			return true;
		}
		return false;
	},
	
	AddEntity: function( entity , hack) {
		this.entities[entity.uuid] = entity;
	},
	
	RemoveEntity: function( entity ) {
		if(this.entities.hasOwnProperty(entity.uuid)) {
			delete this.entities[entity.uuid];
		}
	},
	
	Draw: function( gfx, x,y ) {
		if(this.map) {
			this.map.Draw(gfx, x,y);
		}
		for(var uuid in this.entities) {
			var entity = this.entities[uuid];
			entity.Draw(gfx, x,y);
		}
	},
	Update: function( dt, ct ) {
		this.gameTime += dt;

		//physics step -- todo: break into smaller equal sized time slices?
		this.physicsStep(dt); 		

		
		for(var uuid in this.entities) {
			var entity = this.entities[uuid];
			entity.Update(dt, ct);
		}
	},
	
	physicsStep: function(dt) {
		var entity = null;
		var vel = new Vec2D();
		for(var uuid in this.entities) {
			entity = this.entities[uuid];
			vel.x = entity.vel.x * dt;
			vel.y = entity.vel.y * dt;
			
			//check collision
			for(var w=0; w<this.map.wallRects.length; w++ ) {
				var wallRect = this.map.wallRects[w].rect;
				
				//TODO: collect ALL collided walls, then perform resolution against closest
				if(this.checkWallCollision(wallRect, entity)) {
					vel.x = 0;
					vel.y = 0;
				}
			}
			
			entity.pos.x += vel.x;
			entity.pos.y += vel.y;
		}
	},
	
	SerializeWorldState: function() {
		return {};
	}
	
});
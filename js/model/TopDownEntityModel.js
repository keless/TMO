//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/framework/Graphics.js



var EntityModel = Class.create({
	initialize: function( _uuid ) {
		this.uuid = _uuid || uuid.v4();
		this.sprite = null;
		this.animInstance = null;
		this.pos = new Vec2D();
		this.vel = new Vec2D();
		this.width = 0;
		this.height = 0;
		this.isDead = false;
		this.deadTime = 0;
		this.ownerUUID = "";
		
		this.facing = EntityModel.FACING_UP;
	},
	
	FACING_UP : 0,
	FACING_RIGHT : 1,
	FACING_DOWN : 2,
	FACING_LEFT : 3,
	
	SerializeState: function() {
		var stateJson = {
			uuid:this.uuid,
			owner:this.ownerUUID,
			x:this.pos.x,
			y:this.pos.y,
			velX:this.vel.x,
			velY:this.vel.y,
			dead:this.isDead,
			deadTime:this.deadTime,
			facing:this.facing,
			
			//todo: write animation state	
		};
		
		return stateJson;
	},
	UpdateFromSeralizedState: function(fromTime, currentTime, stateJson) {
		//TODO: extrapolate xy(ct) from xy(ft) + velXY(ct-ft)
		 /// but what if the motion would have resulted in a collision??? 
		 
		if(this.body) {
			this.pos.x = stateJson.x;
			this.pos.y = stateJson.y;
			
			//todo: extrapolate / coordinate with physics engine
			this.vel.x = stateJson.velX;
			this.vel.y = stateJson.velY;
		}
		
		this.facing = stateJson.facing;
		this.isDead = stateJson.dead;
		this.deadTime = stateJson.deadTime;
		
		//todo: sync animation state
	},
	
	AttachAnimation: function( animation, updateSize ) {
		updateSize = updateSize || true;
		this.animInstance = animation.CreateInstance();
		
		if(updateSize) {
			this.width = this.animInstance.getCurrentSprite().getWidth();
			this.height = this.animInstance.getCurrentSprite().getHeight();
		}
	},
	
	AttachSprite: function( sprite, updateSize ) {
		updateSize = updateSize || true;
		this.sprite = sprite;
		
		if(updateSize) {
			this.width = sprite.getWidth();
			this.height = sprite.getHeight();
		}
	},

	Die: function(ct, physics) {
		if(this.isDead) {
			console.warn("already died");
			return;
		}
		this.isDead = true;
		this.deadTime = ct;
		this.DetatchPhysics(physics);
		if(this.animInstance) this.animInstance.event(ct, "dead");
	},
	Resurrect: function(ct, x,y, physics) {
		if(!this.isDead) {
			console.warn("already alive");
			return;
		}
		this.isDead = false;
		this.pos.x = x;
		this.pos.y = y;
		this.animInstance.startAnim(ct, "idle");
	},
	
	AnimEvent: function( ct, animState ) {
		if(this.animInstance) {
			return this.animInstance.event(ct, animState);
		}
		return false;
	},
	
	Draw: function( gfx, offsetX, offsetY ) {
		if(this.animInstance) {
			this.animInstance.draw(gfx, offsetX + this.pos.x, offsetY + this.pos.y, !this.facingRight );
		}
		else if(this.sprite) {
			this.sprite.drawFrame(gfx, offsetX + this.pos.x, offsetY + this.pos.y, 9); //xxx: hardcoded frame index
		}
		else {
			gfx.drawCircle(offsetX + this.pos.x, offsetY + this.pos.y, this.width/2);
		}
	},
	Update: function( dt, ct ) {		
		if(this.animInstance) {
			this.animInstance.update(ct);
		}
	}
});
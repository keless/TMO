//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/model/EntityModel.js


/**
 * Class for controlling entities
 */
var EntityController = Class.create({
	initialize: function( targetEntity ) {
		this.pEntity = targetEntity;
		
		this.isGrounded = false;
		this.doubleJumped = false;
		
		this.joystick = { r:false, u:false, d:false, l:false,
				getX:function() {
					var v = 0;
					if(this.r) v += 1;
					if(this.l) v -= 1;
					return v;
				},
				getY:function() { 
					var v = 0;
					if(this.d) v += 1;
					if(this.u) v -= 1;
					return v;
				},
				
				draw: function(g, x,y) {
					if(this.u) g.drawRect(x + 10, y + 10,10,10);
					if(this.d) g.drawRect(x + 10, y + 30,10,10);
					if(this.l) g.drawRect(x +  0, y + 20,10,10);
					if(this.r) g.drawRect(x + 20, y + 20,10,10);
				}
	 };
		
	},
	
	resurrectionTime: 3.0, //3 seconds
	
	update: function(ct) {
		if(this.pEntity.isDead) {
			if(this.pEntity.deadTime + this.resurrectionTime < ct) {
				//time to resurrect
				var app = Service.get("app");
				var physics = Service.get("physics");
				
				//var spawnPt = app.ssWorld.map.GetSpawnFurthestFrom(this.pEntity.x, this.pEntity.y);
				//this.pEntity.Resurrect(ct, spawnPt.x, spawnPt.y, physics);
			}
			return;
		}
		
		var joystick = this.joystick;
		
		var derpSpeed = 200;
		this.pEntity.vel.x = joystick.getX() * derpSpeed;
		this.pEntity.vel.y = joystick.getY() * derpSpeed;
		

		//determine facing to render sprite flipping later
		//if(cv.x < -0.1) this.pEntity.facingRight = false;
		//if(cv.x > 0.1) this.pEntity.facingRight = true;
		
	}
	
});
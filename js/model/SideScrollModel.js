//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/framework/EventBus.js


var SideScrollModel = Class.create({
	initialize: function( physics ) {
		
		//this.entities = [];
		this.entities = {};
		this.physics = physics;
		this.map = null;
		this.isLoaded = false;
		
		this.p1score = 0;
		this.p2score = 0;
		
		this.gameTime = 0;
		
		EventBus.game.addListener("physDyDyCollision", this.OnPlayerCollision.bind(this));
	},
	
	LoadMap: function( strMapFile, fnOnLoad ) {
		var RP = Service.get("rp");

		this.map = new TiledMap(strMapFile);
		var self = this;
		RP.getJson(strMapFile, function(e){
			self.map.LoadFromJson(e.res);
			
			self.map.AttachPhysics(self.physics);
			
			self.isLoaded = true;
			
			if(fnOnLoad) fnOnLoad();
		});
	},
	
	UnloadMap: function( strMapFile ) {
		this.map.DetatchPhysics();
	},
	
	AddEntity: function( entity , hack) {
		this.entities[entity.uuid] = entity;
		
		entity.AttachPhysics(this.physics, hack);
	},
	
	RemoveEntity: function( entity ) {
		if(this.entities.hasOwnProperty(entity.uuid)) {
			entity.DetatchPhysics(this.physics);
			
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
		for(var uuid in this.entities) {
			var entity = this.entities[uuid];
			entity.Update(dt, ct);
		}
	},
	
	OnPlayerCollision: function(e) {
		//dispatchEvent({"evtName":"physDyDyCollision", "contact":contact, "impulse":impulse,"bodyA":bodyA, "bodyB":bodyB});
		var bodyA = e.bodyA;
		var bodyB = e.bodyB;
		//var contact = e.contact;
		//var impulse = e.impulse;
		
		var bodyWinner = null, bodyLoser = null;
		
		var epsilon = 0.5;
		var pA = bodyA.GetPosition();
		var pB = bodyB.GetPosition();
		if(pA.y < pB.y - epsilon ) {  //a is above b
			bodyWinner = bodyA;
			bodyLoser = bodyB;
		}
		else if( pB.y < pA.y - epsilon) { //b is above a
			bodyWinner = bodyB;
			bodyLoser = bodyA;
		}
		else { 									//tie
	//e.contact.SetEnabled(false);
			return;
		}
		
		//var entWinner = bodyWinner.GetUserData().objLink;
		var entLoser = bodyLoser.GetUserData().objLink;
		entLoser.Die(this.gameTime, e.physics);
	},
	
	SerializeWorldState: function( ct ) {
		var mp = Service.get("mp");
		var myUUID = mp.getUUID();
		
		var stateJson = {};
		stateJson.time = ct;
		stateJson.entities = [];
		for(var uuid in this.entities) {
			var entity = this.entities[uuid];
			
			if(entity.ownerUUID != myUUID ) continue; //only send entities we own
			
			var entityJson = entity.SerializeState();
			stateJson.entities.push(entityJson);
		}
		
		return stateJson;
	},
	
	UpdateFromSerializedWorldState: function( ct, stateJson ) {
		var RP = Service.get("rp");
		var fromTime = stateJson.time;
		for(var i=0; i<stateJson.entities.length; i++ ) {
			var entityJson = stateJson.entities[i];
			var entity;
			if(! this.entities.hasOwnProperty(entityJson.uuid)) {
				console.log("received new entity update");
				//instanciate new entity, with given uuid
				entity = new EntityModel( entityJson.uuid );
				entity.x = entityJson.x;
				entity.y = entityJson.y;
				entity.AttachAnimation(RP.getResource("derpyAnim"));
				entity.AnimEvent(0, "idle");
				this.AddEntity(entity, true);
				entity.UpdateFromSeralizedState(fromTime, ct, entityJson);
				
				var app = Service.get("app");
				app.player2 = entity;
				
			}
			else {
				//update existing entity
				entity = this.entities[entityJson.uuid];
				entity.UpdateFromSeralizedState(fromTime, ct, entityJson);
			}
		}
	}
	
});
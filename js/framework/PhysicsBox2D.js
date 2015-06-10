//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include js/framework/Service.js


	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	var b2BodyDef = Box2D.Dynamics.b2BodyDef;
	var b2Body = Box2D.Dynamics.b2Body;
	var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
	var b2Fixture = Box2D.Dynamics.b2Fixture;
	var b2World = Box2D.Dynamics.b2World;
	var b2MassData = Box2D.Collision.Shapes.b2MassData;
	var b2ContactListener = Box2D.Dynamics.b2ContactListener;
	var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
	var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
	var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
	
	var b2Scale = 30;



var PhysicsBox2D = Class.create({
	initialize: function() {
		this.verbose = true;
		this.world = new b2World(new b2Vec2(0, 100), true);
		Service.add("physics", this);
		
		this.bodiesToDestroy = [];
		
		//setup collistion listener
		this.collisionListener = new b2ContactListener();
		
		var self = this;
		this.collisionListener.PreSolve = function (contact, impulse) {
			self.PreSolve(contact, impulse);
		}
		this.world.SetContactListener(this.collisionListener);
		
		//setup debug draw
		var canvas = jQuery('#content')[0]; //hardcoded canvas id, but dont care because its just for debug porpoises
		this.debugDraw = new b2DebugDraw();
		this.debugDraw.SetSprite(canvas.getContext('2d'));
		this.debugDraw.SetDrawScale(b2Scale);
		this.debugDraw.SetFillAlpha(0.5);
		this.debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
		this.world.SetDebugDraw(this.debugDraw);
		
		this.createStaticBody(0,800-20, 1024,20);
	},
	DrawDebug: function() {
		this.world.DrawDebugData();
	},
	Tick: function(dt) {
		//perform physics step
		// TODO: perform multiple steps within a time limit?
		var stepPeriod = 1/30;
		var iterations = 60;
		var numSteps = Math.floor(dt / stepPeriod);
		var remainder = dt - (stepPeriod * numSteps);
		if(remainder > stepPeriod/2) numSteps++;
		for( var i=0; i< numSteps; i++) {
			this.world.Step(stepPeriod, iterations,iterations);
		}
		
		this.world.ClearForces();
		
		//process pending bodies to remove
		for( var i=0; i< this.bodiesToDestroy.length; i++ ) {
			var body = this.bodiesToDestroy[i];
			this.world.DestroyBody(body);
		}
		//reset array
		this.bodiesToDestroy.length = 0;
	},
	destroyBody: function( body ) {
		console.log("Destroy body");
		this.bodiesToDestroy.push(body);
	},
	
	/// collision listener handlers
	
	///PreSolve - called on collision every frame before resolution
	// @param: contact 	type b2Contact
	PreSolve: function(contact, impulse) {
		
		if(!contact.IsTouching()) return;
		
		var bodyA = contact.GetFixtureA().GetBody();
    var bodyB = contact.GetFixtureB().GetBody();
		
		var typeA = bodyA.GetType();
		var typeB = bodyB.GetType();
		
		if(typeA == typeB && typeA == b2Body.b2_dynamicBody)
		{
			this.PreSolveDyDyCollision(contact, impulse, bodyA, bodyB);
		}
		else if(typeA == b2Body.b2_dynamicBody)
		{
			this.PreSolveDtStCollision(contact, impulse, bodyA, bodyB);
		}
		else if(typeB == b2Body.b2_dynamicBody)
		{
			this.PreSolveDtStCollision(contact, impulse, bodyB, bodyA);
		}
		//static -> static shouldnt ever happen
	},
	
	//dynamic -> dynamic collision (could be player vs player, or player vs bullet/elevator/etc )
	PreSolveDyDyCollision: function( contact, impulse, bodyA, bodyB) {
		EventBus.game.dispatch({"evtName":"physDyDyCollision", "contact":contact, "impulse":impulse,"bodyA":bodyA, "bodyB":bodyB, "physics":this});		
	},
	//dynamic -> static collision ( player/bullet/elevator/etc vs world )
	PreSolveDtStCollision: function( contact, impulse, bodyD, bodyS) {
		var isGrounded = bodyD.isGrounded();
		//console.log("isGrounded " + bodyD.GetUserData().isGrounded)

		var dataS = bodyS.GetUserData();
		if(dataS && dataS.isWall) return; //walls collide normally
		
		//the following logic is specific to grounds, not walls
		var cv = bodyD.GetLinearVelocity();
		if( cv.y < 0 ) { 
			//moving up, ignore world collision
			contact.SetEnabled(false);
		}
		else {//if( cv.y == 0 ) {
			//if pony is not 'on top of' object, ignore it
			var bodyBounds = bodyD.GetFixtureList().GetAABB();
			var groundBounds = bodyS.GetFixtureList().GetAABB();
			var epsilon = 1;
			if( bodyBounds.upperBound.y > groundBounds.lowerBound.y + epsilon ) {
				//dynamic objects 'bottom' is below the static object's top
				contact.SetEnabled(false);
			}
		}
	},
	
	/// temp creation functions
	createStaticBody: function( x,y, width, height ) {
		var fixDef = new b2FixtureDef();
		fixDef.density = 1;
		fixDef.friction = 1;
		var bodyDef = new b2BodyDef();
		bodyDef.type = b2Body.b2_staticBody;
		bodyDef.position.x = (x + (width/2)) / b2Scale;
		bodyDef.position.y = (y + (height/2)) / b2Scale;
		fixDef.shape = new b2PolygonShape();
		fixDef.shape.SetAsBox( (width/2) / b2Scale, (height/2) / b2Scale );
		var body = this.world.CreateBody(bodyDef);
		var fixture = body.CreateFixture(fixDef);
		return body;
	},
	createDynamic: function( x,y, width,height, allowRotation, objLink ) {
		var fixDef = new b2FixtureDef();
		fixDef.density = 1;
		fixDef.friction = 1;
		var bodyDef = new b2BodyDef();
		bodyDef.type = b2Body.b2_dynamicBody;
		bodyDef.position.x = (x + (width/2)) / b2Scale;
		bodyDef.position.y = (y + (height/2)) / b2Scale;
		fixDef.shape = new b2CircleShape( (width/2) / b2Scale );
		/*
		fixDef.shape = new b2PolygonShape();
		fixDef.shape.SetAsBox( (width/2) / b2Scale, (height/2) / b2Scale );
		*/
		var body = this.world.CreateBody(bodyDef);
		body.SetFixedRotation(!allowRotation || true);
		body.SetUserData({"objLink":objLink, "grounded":false});
		body.isGrounded = function() { return this.GetUserData().grounded; }
		body.CreateFixture(fixDef);
		
		if(this.verbose) {
			var p = body.GetPosition();
			console.log("created physical entity at " +(p.x*b2Scale)+","+(p.y*b2Scale) );
			var cv = body.GetLinearVelocity();
			console.log("          with velocity of " +(cv.x*b2Scale)+","+(cv.y*b2Scale) );
			console.log("          with radius of " +(width/2) );
		}
		
		return body;
	}
});
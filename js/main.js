
var bShowDebug = false;

var Requirements = Class.create({
	initialize: function(reqName) {
		this.name = reqName;
		this.reqList = [];
	},
	Add: function(reqName) {
		this.reqList.push(reqName);
	},
	AddList: function( reqs ) {
		if(!Array.isArray(reqs)) return;
		this.reqList = this.reqList.concat(reqs);
	},
	Solved: function(resName) {
		for(var i=0; i<this.reqList.length; i++) {
			if(this.reqList[i] == resName) {
				this.reqList.splice(i, 1);
				break;
			}
		}
		if(this.reqList.length == 0) {
			EventBus.game.dispatch({evtName:"reqSolved", reqName:this.name});
		}
	}
});

app_create = function()
{
	var app = new Application("TMO", "content", '4l9tgzw50r90ms4i');
	window.app = app;
	
	app.sentLastUpdate = false;
	
	var RP = Service.get("rp");
	//RP.loadImage("gfx/derpy.png");
	//RP.loadImage("css/images/comment.png");
	//RP.loadJson("data/fez1.json");
	//RP.loadSprite("gfx/derpy_walk.sprite");
	//RP.loadSprite("gfx/derpy_idle.sprite");
	
	var requirements = new Requirements("resCompleted");
	requirements.Add("data/test.json");
	//requirements.Add("gfx/axeman.sprite"); //xxx
	requirements.Add("gfx/derpy.anim");
	requirements.Add("derpyAnim");
	
	EventBus.game.addListener("reqSolved", function(e){
		switch(e.reqName) {
			case "resCompleted":
				console.log("resource loading complete");
				
				var mp = Service.get("mp");
				mp.StartPeerSession();
				
				var RP = Service.get("rp");
				//spawn player
				var entity = new EntityModel();
				entity.ownerUUID = mp.getUUID();
				app.player1 = entity;
				var spawnPt = app.ssWorld.map.GetRandomSpawn();
				entity.pos.x = spawnPt.x;
				entity.pos.y = spawnPt.y;
				entity.AttachAnimation(RP.getResource("derpyAnim"));
				entity.AnimEvent(0, "idle");
				app.ssWorld.AddEntity(entity);
				
				var entityController = new EntityController(entity);
				app.p1c = entityController;
				
						app.Play();
			 break;
		}
	});
	
	RP.loadSprite("gfx/derpy_walk.sprite", function(e){
		requirements.Solved("gfx/derpy_walk.sprite");
	});
	
	var physics = Service.get("physics");
	app.ssWorld = new TopDownWorldModel(physics);
	app.ssWorld.LoadMap("data/test.json", function() {
		requirements.Solved("data/test.json");
		
		RP.getJson("gfx/derpy.anim", function(e){
			requirements.Solved("gfx/derpy.anim");
			var derpyAnim = new Animation();
			derpyAnim.LoadFromJson(e.res);
			derpyAnim.QuickAttach("gfx/derpy_", ".sprite", function(){
				
				RP.setResource("derpyAnim", derpyAnim);
				requirements.Solved("derpyAnim");
				
			});
		});
	});
	
	app.OnDraw = function( g, dtSeconds, ctSeconds ) {
		
		var RP = Service.get("rp");
		
		app.ssWorld.Draw(g, 0,0);
		
		//draw joystick state
		if(app.player1) {
			app.p1c.joystick.draw(g, 10,10);
			/*
			var velocity = app.player1.body.GetLinearVelocity();
			g.drawTextEx("player1: "+velocity.x +","+velocity.y, 10, 70, "12px Arial", "#FFFFFF");
			g.drawTextEx(" isGrounded: "+ app.player1.body.isGrounded(), 10, 85, "12px Arial", "#FFFFFF");
			*/
		}
		
		var px = Service.get("physics");
		if(bShowDebug) px.DrawDebug();
	};
	
	app.OnUpdateBegin = function( dt, ct ) {
		
		//apply joystick as impulse to player1
		if( app.p1c ) {
			app.p1c.update(ct);
		}
		if( app.p2c ) {
			//app.p2c.update(ct);
		}

		app.ssWorld.Update(dt, ct);
		
		if(!app.sentLastUpdate) {
			//xxx todo: send world update
			var serializedWorldState = app.ssWorld.SerializeWorldState(app.GetTimeElapsed());
			var mp = Service.get("mp");
			mp.SendDataAll({cmd:"worldUpdate", data:serializedWorldState});
			app.sentLastUpdate = true;
		}
	}
	
	app.OnMouseDown = function(e, x, y) {
		//which button?
	}
	
	app.OnKeyDown = function(e) {
		if(!app.player1) return;
		switch(e.keyCode) {
			case KEY_RIGHT: 
				app.p1c.joystick.r = true; 
				break;
			case KEY_LEFT: 
				app.p1c.joystick.l = true; 
				break;
			case KEY_UP: 
				app.p1c.joystick.u = true; 
				break;
			case KEY_DOWN: 
				app.p1c.joystick.d = true; 
				break;
			case 'O'.charCodeAt(0):
				//bShowDebug = !bShowDebug;
				app.ssWorld.map.debugShowBoxes = !app.ssWorld.map.debugShowBoxes;
				break;
			case 'P'.charCodeAt(0):
				bShowDebug = !bShowDebug;
				break;
			case 'I'.charCodeAt(0):
				var t = new EntityModel();
				t.width = 10;
				t.height = 10;
				t.x = app.player1.x + 10;
				t.y = app.player1.y + 10;
				app.ssWorld.AddEntity(t);
				break;
			/*
			case 'S'.charCodeAt(0):
				app.p2c.joystick.l = true; 
				break;
			case 'D'.charCodeAt(0):
				app.p2c.joystick.d = true; 
				break;
			case 'F'.charCodeAt(0):
				app.p2c.joystick.r = true; 
				break;
			case 'E'.charCodeAt(0):
				app.p2c.joystick.u = true; 
				break;
				*/
		}
	};
	
	app.OnKeyUp = function(e) {
		if(!app.player1) return;
		switch(e.keyCode) {
			case KEY_RIGHT: 
				app.p1c.joystick.r = false; 
				break;
			case KEY_LEFT: 
				app.p1c.joystick.l = false; 
				break;
			case KEY_UP: 
				app.p1c.joystick.u = false; 
				break;
			case KEY_DOWN: 
				app.p1c.joystick.d = false; 
				break;
				
				/*
			case 'S'.charCodeAt(0):
				app.p2c.joystick.l = false; 
				break;
			case 'D'.charCodeAt(0):
				app.p2c.joystick.d = false; 
				break;
			case 'F'.charCodeAt(0):
				app.p2c.joystick.r = false; 
				break;
			case 'E'.charCodeAt(0):
				app.p2c.joystick.u = false; 
				break;
				*/
		}
	};
	
	EventBus.net.addListener("onPeerOpen", function(e) {
		var peerId = e.myPeerId;
		
		document.querySelector("input#myID").value = peerId;
		
		var peerRequestID = getURLParameter("peer");
		if(peerRequestID) {
			var mp = Service.get("mp");
			console.log("page loaded with peer request id " + peerRequestID);
			console.log("auto connecting...");
			mp.StartConnectionTo(peerRequestID);
		}
	});
	EventBus.net.addListener("onConnectionClose", function(e) {
		var mp = Service.get("mp");
		if(mp.getNumConnections() > 0) {
			//still connected to at least one peer
			document.querySelector('input#peerID').value = "peers connected "+ mp.getNumConnections();
		}else {
			document.querySelector('input#peerID').value = 'not connected';
			document.querySelector('input#peerID').disabled = false;
		}
	});
	EventBus.net.addListener("onConnectionOpened", function(e) {
		var mp = Service.get("mp");
		document.querySelector('input#peerID').value = "peers connected "+ mp.getNumConnections();
		document.querySelector('input#peerID').disabled = true;
		
		document.querySelector('input#btnConnect').value = 'Disconnect';

		//send world update to new client
		console.log("todo: start synching world updates");

		app.sentLastUpdate = true;
		var serializedWorldState = app.ssWorld.SerializeWorldState(app.GetTimeElapsed());
		mp.SendDataTo(e.peerId, {cmd:"worldUpdate", data:serializedWorldState});
	});
	EventBus.net.addListener("onConnectionReceiveData", function(e) {
		var mp = Service.get("mp");
		switch(e.data.cmd) {
			case "worldUpdate":{
				app.sentLastUpdate = false;
				var serializedWorldState = e.data.data;
				app.ssWorld.UpdateFromSerializedWorldState(app.GetTimeElapsed(), serializedWorldState);
			} break;
		}
	});
	
	//app.Play(); //wait until peer is connected to start simulation
};

function onBtnConnect() {
	var mp = Service.get("mp");
	if(document.querySelector('input#btnConnect').value == "Connect") {
		var connectTo = document.querySelector("input#peerID").value;
		mp.StartConnectionTo(connectTo);
	}else {
		console.warn("send disconnect to all peers");
		mp.DisconnectAllPeers();
	}
}

function onBtnHelp() {
	var mp = Service.get("mp");
	var connectURL = window.location.href + "?peer="+ mp.getMyPeerId();
	window.open(connectURL);
}
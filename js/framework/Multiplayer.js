//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format

/**
 * Multiplayer class represents a peer to peer network connection using PeerJS API
 *
 * PeerJS API quick reference (http://peerjs.com/docs/):
			//peer.id  - str peer id for connecting to other peers
			//peer.connections  - hash of connections associated with this peer, keyed by remote peer ID
			//  ^^ dont use this, use this.connections instead
			//peer.disconnected - bool  'is disconnected'  //can try peer.reconnect() if true
			//peer.destroyed - bool  'is destroyed'	//can NOT try peer.reconnect if true
			
			//conn.open - bool 'is open'
			//conn.peer - str peer id associated with this connection
			//conn.reliable - bool 'is reliable mode'
			//conn.serialization - str serialization mode ['binary, 'binary-utf8', 'json', 'none'];
			//conn.bufferSize - int  number of messages queued to send when browser buffer is no longer full
 * 
 * sends events on EventBus.net:
 * 	onPeerServerDisconnected - disconnected from the peer lookup server, cannot connect to new peers, 
					but current connections still valid	
 * onPeerError(error) - received an error from peer lookup server
 		@param errr is a PeerJS peer error
 * onPeerOpen(myPeerId) - connected to PeerJS, can start connecting with peers
 		@param myPeerId is a PeerJS peerId which other peers can use to connect to us
 * onPeerClose - this client has disconnected from the peer lookup server
 * onPeerReceiveConnection(peerId) - connected to a peer
 		@param peerId is the peerId of the peer we connected to
 * onPeerReceiveConnectionDenied(peerId) - got a peer connection but we're at LIMIT_PEERS,
 		 so we denied the connection.
 * onConnectionReceiveData(data, peerId) - received data from a peer
 		@param data - the data received
		@param peerId - the id of the peer the data was received from
 * onConnectionError(peerId) - one of the connections had an error
   	@param peerId - the id of the peer the error was received from
 * onConnectionCloseUntracked - received connection closed from a peer we werent tracking
 * onConnectionClose(peerId) - received connection closed from a peer
 		@param peerId - the id of the peer whose connection just closed
 * onConnectionCloseAll - when all connected peers have been disconnected 
 * onConnectionOpened(peerId) - a new connection was opened with a peer
		@param peerId - the id of the peer that just connected
 *
 * Peer Data packet types:
 	1. "BYE" - disconnect
	2. {c:<sendCount>, pd:payloadJson} - ordered payload, ignore if out of order
 */

var Multiplayer = Class.create({
	initialize: function( peerJS_APIKey ) {
		this.API_KEY = peerJS_APIKey;
		this.DEBUG_LEVEL = 2; //3 = everything, 0 = nothing
		this.LIMIT_PEERS = 1; //artificial limit on number of peers we connect to

		this.connections = {};
		
		this.sendOrderCount = 0;
		this.uuid = uuid.v4();
		
		Service.add("mp", this);
	},
	
	StartPeerSession: function() {
		if(this.peer) {
			this.peer.destroy();
			this.peer = null;
		}
		
		this.peer = new Peer({key:this.API_KEY, secure:false, debug:this.DEBUG_LEVEL});
		var peer = this.peer;
		peer.on('connection', this.onPeerReceiveConnection);
		peer.on('disconnected', this.onPeerServerDisconnected);
		peer.on('error', this.onPeerError);
		peer.on('open', this.onPeerOpen);
		peer.on('close', this.onPeerClose);
	},
	
	StartConnectionTo: function( destPeerID ) {
		console.log("begin connecting to peer " + destPeerID);
		var conn = this.peer.connect(destPeerID);
		this._registerConnectionHandlers(conn);
	},
	DisconnectAllPeers: function() {
		if(this.getNumConnections() == 0) {
			console.warn("no peers to disconnect, ignoring..");
			return;
		}
		
		for(var c in this.connections) {
			var conn = this.connections[c];
			conn.send("BYE");
			conn.close();
		}
		
	},
	
	SendDataTo: function(peerId, data) {
		var peerConn = this.connections[ peerId ];
		if(!peerConn) {
			console.error("trying to send data to untracked peer " + peerId);
			return;
		}
		this.sendOrderCount++;
		console.log("send data["+this.sendOrderCount+"] to " + peerId);
		peerConn.send({c:this.sendOrderCount, pd:data});
	},
	SendDataAll: function(data) {
		this.sendOrderCount++;
		for(var peerId in this.connections) {
			var peerConn = this.connections[ peerId ];
			console.log("send data["+this.sendOrderCount+"] to " + peerId);
			peerConn.send({c:this.sendOrderCount, pd:data});
		}
	},

	//utility functions
	// use this for tagging player-specific objects
	getUUID: function() {
		return this.uuid;
	},
	// use this for peer-to-peer communications only (use getUUID instead)
	getMyPeerId: function() {
		return this.peer.id;
	},
	getNumConnections: function() {
		return dicLength(this.connections);
	},
	
	_registerConnectionHandlers: function(conn) {
		conn.on('data', this.onConnectionReceiveData);
		conn.on('error', this.onConnectionError);
		conn.on('close', this.onConnectionClose);
		conn.on('open', this.onConnectionOpened);
		
		conn._rcvCount = 0;
		
		this.connections[ conn.peer ] = conn;
		
		this._dumpConnectedPeers();
	},
	
	_dumpConnectedPeers: function() {
		console.log("tracked peers: ")
		for(var c in this.connections) {
			console.log(" peer: " + c);
		}
	},
	
	//peer event handlers
	onPeerServerDisconnected: function() {
		console.warn("disconnected to peer server, wont be able to connect to new peers. current connections remain open");
		EventBus.net.dispatch({evtName:"onPeerServerDisconnected"});
	},
	
	onPeerError: function(err) {
		console.error("peer error: " + err.type ? err.type : err.message);
		EventBus.net.dispatch({evtName:"onPeerError", error:err});
	},
	
	onPeerOpen: function(id) {
		console.log('My peer ID is: ' + id);
		EventBus.net.dispatch({evtName:"onPeerOpen", myPeerId:id});
		
		/*
		document.querySelector("input#myID").value = id;
		
		var peerRequestID = getURLParameter("peer");
		if(peerRequestID) {
			console.log("page loaded with peer request id " + peerRequestID);
			console.log("will connect immediately");
			this.startConnectionTo(peerRequestID);
		}
		*/
	},
	
	onPeerClose: function() {
		console.warn("local peer closed. should we reopen?");
		EventBus.net.dispatch({evtName:"onPeerClose"});
		//todo: should we attempt to reopen? did we mean to close?
	},
	
	onPeerReceiveConnection: function(conn) {
		console.log("peer connection received from " + conn.peer);
		
		var self = Service.get("mp");
		if(self.getNumConnections() >= self.LIMIT_PEERS) {
			console.warn("received connection while at max peers, SHUT IT DOWN");
			conn.send("MAX PEERS REACHED");
			conn.close();
			EventBus.net.dispatch({evtName:"onPeerReceiveConnectionDenied", peerId:conn.peer});
			return;
		}
		
		self._registerConnectionHandlers(conn);
	},
	
	// connection event methods
	onConnectionReceiveData: function(data) {
		var conn = this;
		console.log("received data from connection " + conn.peer);
		
		if(data == "BYE" ) {
			console.log("received BYE command, closing connection");
			conn.close();
			return;
		}
		else if( data.hasOwnProperty("pd") ) {
			var incSendCount = data.c;
			if( incSendCount <= conn._rcvCount) {
				console.warn("received outdated send from peer " + conn.peer);
				return;
			}
			conn._rcvCount = incSendCount;
			data = data.pd;
			console.log("received ordered payload "+incSendCount+" from peer " + conn.peer);
		}

		EventBus.net.dispatch({evtName:"onConnectionReceiveData", data:data, peerId:conn.peer});
	},
	
	onConnectionError: function(err) {
		var conn = this;
		console.error("connection "+conn.peer+" error: " + err.type ? err.type : err.message);
		
		EventBus.net.dispatch({evtName:"onConnectionError", error:err, peerId:conn.peer});
	},
	
	onConnectionClose: function() {
		var conn = this;
		console.log("connection closed " + conn.peer);
		
		var self = Service.get("mp");

		if(!self.connections.hasOwnProperty(conn.peer)) {
			console.warn("close received from an untracked peer");
			self._dumpConnectedPeers();
			EventBus.net.dispatch({evtName:"onConnectionCloseUntracked"});
			return;
		}
		
		delete self.connections[conn.peer];
		EventBus.net.dispatch({evtName:"onConnectionClose", peerId:conn.peer});
		
		if(self.getNumConnections() > 0) {
			//still connected to at least one peer
			console.log("  but still connected to at least one peer");
			//document.querySelector('input#peerID').value = "peers connected "+ self.getNumConnections();
		}else {
			EventBus.net.dispatch({evtName:"onConnectionCloseAll"});
			//document.querySelector('input#peerID').value = 'not connected';
			//document.querySelector('input#peerID').disabled = false;
		}
	},
	
	onConnectionOpened: function() {
		var conn = this;
		console.log("connection opened " + conn.peer);
		
		EventBus.net.dispatch({evtName:"onConnectionOpened", peerId:conn.peer});
		/*
		document.querySelector('input#peerID').value = "peers connected "+ self.getNumConnections());
		document.querySelector('input#peerID').disabled = true;
		
		document.querySelector('textarea#input').value = "";
		document.querySelector('textarea#output').value = "";
		*/
	}
	
});
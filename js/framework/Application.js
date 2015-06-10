//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/framework/Service.js

var KEY_LEFT = 37;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;

var Application = Class.create({
	initialize: function( strAppName, strCanvas2DName, peerJSkey ) {
		
		this.appName = strAppName;
		
		//setup canvas keypress handlers
		var appSelf = this;
		var jqCanvas = jQuery('#'+strCanvas2DName);
		jqCanvas.bind({
			keydown: function(e) {
			    appSelf.OnKeyDown(e);
			},
			keyup: function(e) {
				appSelf.OnKeyUp(e);
			},
			focusin: function(e) {
			    jqCanvas.addClass("selected");
			},
			focusout: function(e) {
			    jqCanvas.removeClass("selected");
			},
			mousedown: function(e) {
				var mouseX = e.pageX - jqCanvas.offset().left;
				var mouseY = e.pageY - jqCanvas.offset().top;
				appSelf.OnMouseDown(e, mouseX, mouseY);
			}
		});
		jqCanvas.focus();
		
		//update loop vars
		this.lastUpdateTick = 0;
		this.elapsedTime = 0;
		
		Service.add("app", this);
		this.instanciateSingletons( strCanvas2DName, peerJSkey );
	},
	
	instanciateSingletons: function( strCanvas2DName, peerJSkey  ) {
			new ResourceProvider();
			new Graphics(strCanvas2DName);
			new AudioManager();
			//new Physics();
			
			if(peerJSkey) {
				new Multiplayer(peerJSkey);
			}
	},
	
	Play: function()
	{
		this._runUpdateLoop();
	},
	Pause: function()
	{
		this._stopUpdateLoop();
	},
	IsPaused: function()
	{
		return ( this.UpdateLoopInterval == null ); 
	},
	GetTimeElapsed: function() 
	{
		return this.elapsedTime;
	},
	
	_runUpdateLoop: function() {
		if( this.UpdateLoopInterval != null ) return; //already running
		this.lastUpdateTick = (new Date()).getTime();
		this.UpdateLoopInterval = setInterval( this._updateLoop.bind(this), 30 );
	},
	_stopUpdateLoop: function() {
		if( this.UpdateLoopInterval == null ) return; //already stopped
		clearInterval( this.UpdateLoopInterval.bind(this) ); 
		this.UpdateLoopInterval = null;
	},
	
	_updateLoop: function() {
		//arguments.callee.minTickPeriod = 1;
		
		var ct = (new Date()).getTime();  //have to call new each frame to get current time
  	var dt = ct - this.lastUpdateTick;
		this.lastUpdateTick = ct;

		var dtSeconds = dt / 1000.0;
		this.elapsedTime += dtSeconds;
		
		this.OnUpdateBegin( dtSeconds, this.elapsedTime );
		
		//xxx: todo: run simulation steps
		
		this.OnUpdateEnd( dtSeconds, this.elapsedTime );
		
		var gfx = Service.get("gfx");
		
		gfx.begin(true);
		
		this.OnDraw( gfx, dtSeconds, this.elapsedTime );
	},
	
	OnLoad: function() {
			console.log("override me: Application.onApplicationLoaded()");
	},
	
	/// @param: dtSeconds - delta time for current frame from last frame
	/// @param: ctSeconds - current elapsed app time in seconds
	OnUpdateBegin: function( dtSeconds, ctSeconds ) {
		//override me
	},
	/// @param: dtSeconds - delta time for current frame from last frame
	/// @param: ctSeconds - current elapsed app time in seconds
	OnUpdateEnd: function( dtSeconds, ctSeconds ) {
		//override me
	},
	
	/// @param: dtSeconds - delta time for current frame from last frame
	/// @param: ctSeconds - current elapsed app time in seconds
	OnDraw: function( gfx, dtSeconds, ctSeconds ) {
		//override me
	},
	
	/// @param: e - event object, read key value from e.keyCode
	OnKeyDown: function(e) {
		//override me
	},
	/// @param: e - event object, read key value from e.keyCode
	OnKeyUp: function(e) {
		//override me
	},
	OnMouseDown: function(e, mouseX, mouseY) {
		//override me
	}
	
	//ex: load game -- json = JSON.parse( localStorage.getItem("sudoku.save") );
	
});
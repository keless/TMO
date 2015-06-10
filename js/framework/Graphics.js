//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: $() is reserved for Prototype, jQuery must use jQuery() format
//#include js/framework/Service.js

var Graphics = Class.create({
	initialize: function( strCanvasName ) {
		this.canvas = jQuery('#'+strCanvasName)[0];
		this.fillStyle = "#FF0000";
		this.font = "30px Arial";
		
		this.ctx = null;
		
		Service.add("gfx", this);
	},
	
	getWidth: function() {
		return this.canvas.clientWidth;
	},
	getHeight: function() {
		return this.canvas.clientHeight;
	},
	
	begin: function( bShouldClear ) {
		this.ctx = this.canvas.getContext("2d");
		if(bShouldClear) {
			this.clearAll();
		}
	},
	clearAll: function() {
		this.ctx.clearRect(0,0, this.getWidth(), this.getHeight());
	},
	
	///note: origin (0,0) is top left
	drawRect: function( x,y,w,h ) {
		this.ctx.fillStyle = this.fillStyle;
		this.ctx.fillRect(x,y,w,h);
	},
	drawLine: function(x1,y1, x2,y2) {
		this.ctx.moveTo(x1,y1);
		this.ctx.lineTo(x2,y2);
		this.ctx.stroke();
	},
	drawCircle: function(x,y, r) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = this.fillStyle;
    this.ctx.fill();
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#003300';
    this.ctx.stroke();
	},
	drawText: function(strText, x,y ) {
		this.ctx.font = this.font;
		this.ctx.fillStyle = this.fillStyle;
		this.ctx.fillText(strText,x,y);
	},
	drawTextEx: function(strText, x,y, font, fillStyle ) {
		this.ctx.font = font;
		this.ctx.fillStyle = fillStyle;
		this.ctx.fillText(strText,x,y);
	},
	drawImage: function(img, x,y) {
		this.ctx.drawImage(img, x,y);
	},
	/// dx,dy are destination (on screen) coordinates
	/// srcx,srcy are source image (in texture) coordinates
	/// srcw,srch are source image width and height to capture
	/// this function forces 1:1 scale of source w,h to dest w,h
	drawImageSub: function(img, dx,dy,  srcx, srcy, srcw, srch, hFlip) {
		this.ctx.save();
		
		if(!hFlip) {
			this.ctx.drawImage(img, srcx,srcy,srcw,srch, dx,dy, srcw,srch);
		}else {
			//this.ctx.save();
			this.ctx.scale(-1,1);
			this.ctx.drawImage(img, srcx,srcy,srcw,srch, (dx*-1) - srcw ,dy, srcw,srch);
			//this.ctx.restore();
			
			//todo: reset scale 1,1 instead of save/restore
		}
		this.ctx.restore();
		
	}
});

/**
 * Sprite class represents a series of frames inside of an atlas texture
 * @image - texture atlas image to use as source image for drawing frames
 * @format - "xywh" for individual rect information per frame, or "grid" for equally spaced grid of frames
 * @width - sprite width (note: in "xywh" format, individual frames are not guaranteed to have the same width)
 * @width - sprite width (note: in "xywh" format, individual frames are not guaranteed to have the same height)
 * @paddingX - optional; space between source edges and interior size
 * @paddingY - optional; space between source edges and interior size
 * @frames - if format is "xywh"; contains all the frame rectangles as an array of arrays
 *  data = {"image":"imageName.png", "format":"xywh", "width":96, "height":96, "frames":[  [x,y,w,h],[x,y,w,h],[x,y,w,h],[x,y,w,h] ]}
 *  data = {"image":"derpy.png", "format":"grid", "width":96, "height":96, "paddingX":5, "paddingY":5 }
 */
var Sprite = Class.create({
	initialize: function( path ) {
		this.fullPath = path;
		this.path = path.substring(0, path.lastIndexOf("/")+1);
		this.img = null;
		this.data = null;
		this.isLoaded = false;
	},
	
	verbose: false,
	
	//called by ResourceProvider
	_load: function( dataJson, fnOnLoad ) {
		var resourceProvider = Service.get("rp");
		this.data = dataJson;
		this.format = dataJson["format"] || "xywh";
		
		var self = this;
		this.img = resourceProvider.getImage(this.path + dataJson["image"], function(e){
			if(!self.isLoaded) {
				self.img = e.res;
				self.isLoaded = true; //deferred load
				if(this.verbose) console.log("sprite loaded late: " + self.fullPath);
				if(fnOnLoad) fnOnLoad();
			}
		});
		if(this.img) {
			this.isLoaded = this.img.isLoaded; //check for immediate load
			if(this.verbose) console.log("sprite loaded immediately: " + self.fullPath)
			if(this.isLoaded && fnOnLoad) fnOnLoad();
		}
	},
	
	getWidth: function() {
		return this.data.width - this.getPaddingX()*2;
	},
	getHeight: function() { 
		return this.data.height - this.getPaddingY()*2;
	},
	getPaddingX: function() {
		return this.data.paddingX || 0;
	},
	getPaddingY: function() {
		return this.data.paddingY || 0;
	},
	getFPS: function() {
		return this.data.fps || 30;
	},
	getNumFrames() {
		if( this.format == "xywh" || this.format == "gridSub" ) {
			return this.data.frames.length;
		}
		else if( this.format == "grid" ) {
			var frameW = this.data.width;
			var frameH = this.data.height;
			var texW = this.img.width;
			var framesPerRow = Math.floor(texW / frameW);
			var numRows = Math.floor(this.img.height / frameH);
			return numRows * framesPerRow;
		}
		return 0;
	},
	
	drawFrame: function( gfx, x, y, frameIdx, hFlip ) {
		if( this.format == "xywh") {
			var frameData = this.data.frames[frameIdx];
			gfx.drawImageSub( this.img, x - this.getPaddingX(), y - this.getPaddingY(),  frameData[0], frameData[1], frameData[2], frameData[3], hFlip);
		}
		else if( this.format == "grid" || this.format == "gridSub") {
			
			if(this.format == "gridSub") {
				//get sub-grid indexed frames
				frameIdx = this.data.frames[frameIdx];
			}
			
			var frameW = this.data.width;
			var frameH = this.data.height;
			var texW = this.img.width;
			var framesPerRow = Math.floor(texW / frameW);
			var row = frameIdx % framesPerRow;
			var col = (frameIdx - row) / framesPerRow;
			gfx.drawImageSub(this.img, x - this.getPaddingX(), y - this.getPaddingY(), row*frameW, col*frameH, frameW, frameH, hFlip);
		}

	}
});

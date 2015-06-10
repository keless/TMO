//#include https://ajax.googleapis.com/ajax/libs/prototype/1.7.2.0/prototype.js

var Vec2D = Class.create({
  initialize: function( x, y ){
		this.x = x || 0;
		this.y = y || 0;
	},
	initializeWithPos: function( posObj ) {
		this.x = posObj.x;
		this.y = posObj.y;
	},
	getUnitized: function() {
		var mag = this.getMag();
		return new Vec2D( this.x / mag, this.y / mag );
	},
	getMagSq: function() {
		return (this.x*this.x) + (this.y*this.y);
	},
	getMag: function() {
		return Math.sqrt((this.x*this.x) + (this.y*this.y));
	},
	getScalarMult: function( scalar ) {
		return new Vec2D( this.x * scalar, this.y * scalar );
	},
	getVecAdd: function( vec2 ) {
		return new Vec2D( this.x + vec2.x, this.y + vec2.y );
	},
	getVecSub: function( vec2 ) {
		return new Vec2D( this.x - vec2.x, this.y - vec2.y );
	}
});

var Segment2D = Class.create({
	initialize: function( startVec, endVec ) {
		this.s = startVec;
		this.e = endVec;
	},
	
	SegmentWithValues: function( x1,y1, x2,y2 ) {
		return new Segment2D( new Vec2D(x1,y1), new Vec2D(x2,y2) );
	},
	
	isSegmentIntersected: function( bySegment, outIntersectionPt ) {
		return Segment2D.SegmentIntersectsSegment( this.s, this.e, bySegment.s, bySegment.e, outIntersectionPt); 
	},
	
	/// a1 is line1 start, a2 is line1 end, b1 is line2 start, b2 is line2 end
	/// returns true if intersect, sets outIntersectionPt to point of intersect
	SegmentIntersectsSegment : function( a1, a2, b1, b2, outIntersectionPt)
	{
	    outIntersectionPt = new Vec2D();
	
	    var b = a2.getVecSub(a1);
	    var d = b2.getVecSub(b1);
	    var bDotDPerp = b.x * d.y - b.y * d.x;
	
	    // if b dot d == 0, it means the lines are parallel so have infinite intersection points
	    if (bDotDPerp == 0)
	        return false;
	
	    var c = b1.getVecSub(a1);
	    var t = (c.x * d.y - c.y * d.x) / bDotDPerp;
	    if (t < 0 || t > 1)
	        return false;
	
	    var u = (c.x * b.y - c.y * b.x) / bDotDPerp;
	    if (u < 0 || u > 1)
	        return false;
	
	    outIntersectionPt = a1.getVecAdd( b.getScalarMult(t) ) ;
	
	    return true;
	}
});

var Rect2D = Class.create({
	initialize: function( x, y, w, h ) {
		this.x = x || 0;
		this.y = y || 0;
		this.w = w || 0;
		this.h = h || 0;
	},
	
	TOP : 0,
	RIGHT : 1,
	BOTTOM : 2,
	LEFT : 3,
	
	getCenter: function() {
		return new Vec2D( this.x + this.w/2, this.y + this.h/2 );
	},
	
	getSegmentTop: function() { 
		return Segment2D.SegmentWithValues( this.x, this.y, this.x + this.w, this.y);
	},
	getSegmentBottom: function() { 
		return Segment2D.SegmentWithValues( this.x, this.y + this.h, this.x + this.w, this.y + this.h);
	},
	getSegmentLeft: function() { 
		return Segment2D.SegmentWithValues( this.x, this.y, this.x, this.y + this.h);
	},
	getSegmentRight: function() { 
		return Segment2D.SegmentWithValues( this.x, this.y + this.h, this.x + this.w, this.y + this.h);
	},
	
	isPointInside: function( v2d ) {
		if( v2d.x < this.x ) return false;
		if( v2d.y < this.y ) return false;
		if( v2d.x > this.x + this.w ) return false;
		if( v2d.y > this.y + this.h ) return false;
		return true;
	},
	
	isRectOverlapped: function( r2d ) {
		if( r2d.x > this.x + this.w ) return false;
		if( r2d.y > this.y + this.h ) return false;
		if( r2d.x + r2d.w < this.x ) return false;
		if( r2d.y + r2d.h < this.y ) return false;
		return true;
	}
});
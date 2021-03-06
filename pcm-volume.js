if (Meteor.isServer) {
	var Transform = Meteor.npmRequire('stream').Transform;
	var util = Meteor.npmRequire('util');

	var Volume = function() {
		this.setVolume(1.0);
		Transform.call(this);
	};
	util.inherits(Volume, Transform);

	Volume.prototype.setVolume = function(volume) {
		this.volume = volume;
		// c.f. https://dsp.stackexchange.com/questions/2990/how-to-change-volume-of-a-pcm-16-bit-signed-audio/2996#2996
		//this.multiplier = Math.pow(10, (-48 + 54*this.volume)/20);

		// c.f. http://www.ypass.net/blog/2010/01/pcm-audio-part-3-basic-audio-effects-volume-control/
		this.multiplier = Math.tan(this.volume);
	};

	Volume.prototype._transform = function(buf, encoding, callback) {
		// create a new Buffer for the transformed data
		var out = new Buffer(buf.length);

		// Iterate the 16bit chunks
		for (i = 0; i < buf.length; i+=2) {
		  // read Int16, multiply with volume multiplier and round down
		  var uint = Math.floor(this.volume*buf.readInt16LE(i));

		  // higher/lower values exceed 16bit
		  uint = Math.min(32767, uint);
		  uint = Math.max(-32767, uint);

		  // write those 2 bytes into the other buffer
		  out.writeInt16LE(uint, i);
		}

		// return the buffer with the changed values
		this.push(out);
		callback();
	};
}
if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault("volume", 50);

  Meteor.startup(function () {
          setInterval(function () {
              Meteor.call("getServerTime", function (error, result) {
                  Session.set("time", result);
              });
              Meteor.call("getServerDate", function (error, result) {
                  Session.set("date", result);
              });
          }, 1000);
      });

      Template.hello.time = function () {
          return Session.get("time");
      };
      Template.hello.date = function () {
          return Session.get("date");
      };
      
  Template.hello.helpers({
    volume: function () {
        return Session.get("volume");
    },
	  info: function () {
	      return Infos.findOne();
	  },
	  isPlaying: function() {
			return Infos.findOne() ? Infos.findOne().status === 'playing' : false;
		},
		isStopped: function() {
			return Infos.findOne() ? Infos.findOne().status === 'stopped' : true;
		}
  });

  Template.hello.events({
    'click button[name=btnStartStop]': function () {
      startStop();
    },
    'click button[name=btnVolUp]': function () {
 	 	  var vol = Session.get("volume");
			if(vol <=95) {
				vol += 5;
			}
			Session.set("volume", vol);
			Meteor.call('setVolume', vol);
    },
    'click button[name=btnVolDn]': function () {
 	 	  var vol = Session.get("volume");
			if(vol >=5) {
				vol -= 5;
			}
			Session.set("volume", vol);
			Meteor.call('setVolume', vol);
    }
  });

  startStop = function play(user, callback) {
    Meteor.call('startStop', user, callback);
  }
}

Infos = new Mongo.Collection("infos");

if (Meteor.isServer) {
  var player_status = 'stopped';
  var Lame = null, Icecast = null, Speaker = null, Volume = null;

  var currentVolume = null;
  var currentVolumeValue = 0.5;
  var client = null;

  var stationName = '';

  Meteor.startup(function () {
    
	// set up database
	Infos.remove({});
	Infos.insert({ status: "stopped", title: "", station: "", volume: 50 });
		
	// code to run on server at startup
	Lame = Meteor.npmRequire('lame');
	Icecast = Meteor.npmRequire('icecast');
	Speaker = Meteor.npmRequire('speaker');
	Volume = Meteor.npmRequire("pcm-volume");
	
  });

  Meteor.methods({
    'getServerTime': function () {
                var _time = (new Date).toTimeString().substr(0,5);
                return _time;
            },
    'getServerDate': function () {
                        var _date = (new Date).toLocaleDateString();
                        return _date;
                    },
   'setVolume' : function setVolume(volume) {
		  currentVolumeValue = volume / 10;
		  if(currentVolume != null) {
				currentVolume.setVolume(currentVolumeValue);
			}
    },
   'startStop': function startStop(user) {

	   url = "http://pub4.di.fm:80/di_vocalchillout";
	  
	   Infos.update({}, { status: "stopped", title: "", station: stationName });
   
   	   if(client) {
		   stationName='';
		   Infos.update({}, { status: "stopped", title: "", station: stationName });
   		   client.abort();
		   client = null;
   	   } else {
   
	   // connect to the remote stream
	   client = Icecast.get(url, Meteor.bindEnvironment(function (res) {

	     // log the HTTP response headers
	     // console.error(res.headers);

	     console.log(res.headers);
	     console.info("Station: " + res.headers['icy-name']);
		 stationName = res.headers['icy-name'];
		 
	     // log any "metadata" events that happen
	     res.on('metadata', Meteor.bindEnvironment(function (metadata) {
	       var parsed = Icecast.parse(metadata);
	       console.log(parsed);
         console.info("Playing: " + parsed.StreamTitle );
  	   	   Infos.update({}, { status: "playing", title: parsed.StreamTitle, station: stationName });
	     }));
		 
	   	
	     currentVolume = new Volume();
	     currentVolume.setVolume(currentVolumeValue);

	     // Let's play the music (assuming MP3 data).
	     // lame decodes and Speaker sends to speakers!
	     res.pipe(new Lame.Decoder())
            .pipe(currentVolume)
	        .pipe(new Speaker());
	   }));
   	  }
    }
  });
}

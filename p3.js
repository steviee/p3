if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault("counter", 0);

  Template.hello.helpers({
    counter: function () {
      return Session.get("counter");
    },
    status: function() {
      Meteor.call('status', user, callback, function(result) {
        return result;  
      });
    }
  });

  Template.hello.events({
    'click button': function () {
      // increment the counter when button is clicked
      // Session.set("counter", Session.get("counter") + 1);
      play();
    }
  });

  play = function play(user, callback) {
    Meteor.call('play', user, callback);
  }
}

if (Meteor.isServer) {
  var meteor_root = Npm.require('fs').realpathSync( process.cwd() + '/../../../../../' );
  var Player = null;
  var player = null;
  var player_status = 'stopped';

  Meteor.startup(function () {
    // code to run on server at startup
    Player = Meteor.npmRequire('player');
  });

  Meteor.methods({
    'status' : function() {
      return player_status;
    },
    'play': function play(user) {

      if (player != null) {
        player.stop();
        player_status = "stopped";
      }

      player = new Player(meteor_root + '/public/music/submerged.mp3');
      player.on('playing',function(item){
        player_status = "playing";
        console.log('im playing... src:' + item);
      });

      // event: on playend
      player.on('playend',function(item){
        player_status = "stopped";
        // return a playend item
        console.log('src:' + item + ' play done, switching to next one ...');
      });

      // event: on error
      player.on('error', function(err){
        player_status = "error: " + err;
        // when error occurs
        console.log(err);
      });

      player.play();

    }
  });
}

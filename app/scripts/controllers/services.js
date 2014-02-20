/**
 * Created by balmasi on 19/02/14.
 */


/**
 * Created by balmasi on 19/02/14.
 */
'use strict';

angular.module('youtubeApiApp.services', [])
  .factory('FireRef', ['FBURL', 'Firebase',
    function(FBURL, Firebase) {
      return {
        channels: function() {
          return new Firebase(FBURL+'/channels');
        }
      };
    }]
  )
  .factory('channelService', ['angularFireCollection', 'FireRef',
    function(angularFireCollection, FireRef) {
      return {
        collection: function(cb) {
          return angularFireCollection(FireRef.channels(),cb);
        }
        , find: function(channelId) {
          return FireRef.channels().child('/'+channelId);
        }
        , create: function(channel) {
          return FireRef.leagues().push(channel);
        }
        , removeChannel: function(channelId) {
          var channel = FireRef.channels().child('/'+channelId);
          channel.remove();
        }
      };
    }]);

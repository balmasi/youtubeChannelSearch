/**
 * Created by balmasi on 19/02/14.
 */
'use strict';

angular.module("youtubeApiApp.services.channels", ["youtubeApiApp.services.fireRef"])
  .factory('channelService', ['FireRef', "$firebase",
    function(FireRef, $firebase) {
      return {
        getRef: function() {
          return FireRef.channels();
        },

        deadCollection: function() {
          return $firebase(FireRef.deadChannels());
        },
        deadFind: function(channelId) {
          return FireRef.deadChannels().child('/'+channelId);
        },

        collection: function() {
          return $firebase(FireRef.channels());
        }
        , find: function(channelId) {
          return FireRef.channels().child('/'+channelId);
        }
        , create: function(channel) {
          return FireRef.channels().push(channel);
        }
        , removeChannel: function(channelId) {
          var channel = FireRef.channels().child('/'+channelId);
          channel.remove();
        }
      };
    }]);

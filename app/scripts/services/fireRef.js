angular.module('youtubeApiApp.services.fireRef',[])
  .factory('FireRef', ['FBURL', 'Firebase',
    function(FBURL, Firebase) {
      return {
        channels: function() {
          return new Firebase(FBURL+'/channels');
        },
        deadChannels: function() {
          return new Firebase(FBURL+'/deadChannels');
        }
      };
    }]
  );
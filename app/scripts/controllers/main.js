'use strict';

angular.module('youtubeApiApp')
  .service('googleService', ['$http', '$rootScope', '$q', function ($http, $rootScope, $q) {
    var clientId = '888692197820.apps.googleusercontent.com',
      apiKey = 'AIzaSyAynQVlpxxYZr7TJWytodnDhruwKwpveII',
      scopes = '{SCOPES}',
      domain = 'localhost',
      deferred = $q.defer();

    this.login = function () {
      gapi.auth.authorize({
        client_id: clientId,
        scope: scopes,
        immediate: false,
        hd: domain
      }, this.handleAuthResult);

      return deferred.promise;
    }

    this.handleClientLoad = function () {
      var d = $q.defer();
      gapi.client.setApiKey(apiKey);
      gapi.client.load('youtube', 'v3', function(error) {
        if (angular.isUndefined(error)) d.resolve("Locked and Loaded");
        d.reject(error);
      });
      return d.promise;
    };

    this.checkAuth = function() {
      gapi.auth.authorize({
        client_id: clientId,
        scope: scopes,
        immediate: true,
        hd: domain
      }, this.handleAuthResult);
    };

    this.handleAuthResult = function(authResult) {
      if (authResult && !authResult.error) {
        var data = {};
        gapi.client.load('oauth2', 'v2', function () {
          var request = gapi.client.oauth2.userinfo.get();
          request.execute(function (resp) {
            data.email = resp.email;
          });
        });
        deferred.resolve(data);
      } else {
        deferred.reject('error');
      }
    };

    this.handleAuthClick = function(event) {
      gapi.auth.authorize({
        client_id: clientId,
        scope: scopes,
        immediate: false,
        hd: domain
      }, this.handleAuthResult);
      return false;
    };

  }])
  .controller('MainCtrl', ['$scope', 'googleService', '$window', 'channelService', '$q',
    function ($scope, googleService, $window, channelService, $q) {

      /*
      * Private Functions
      * */
      function extractEmails(descr) {
        return descr.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]{3,}\.[a-zA-Z0-9._-]{2,3})/gi);
      }

      function searchYoutube(params) {
        var deferred = $q.defer();

        gapi.client.youtube.search.list(params).execute(
          function(data) {
            var channel = null;

            // Check for any errors
            if  ( angular.isDefined(data.error) ) {
              deferred.reject(data.error);
              return;
            }

            $scope.$apply(function(){

              $scope.pagination.next = data.nextPageToken;
              $scope.pagination.prev = data.prevPageToken;

              data.items.forEach(function(v){
                var id = v.id.channelId;
                // If this channel is in database, dont hit Youtube
                if ($scope.channels[id]) {
                  $scope.resultChannels[id] = $scope.channels[id];
                }
                // Not in Database. If not a dead channel, hit Youtube
                else if (!$scope.deadChannels[id]){
                  channel = {
                    shortDescription: v.snippet.description.slice(0,100)+"...",
                    description: v.snippet.description,
                    channelTitle: v.snippet.channelTitle,
                    title: v.snippet.title,
                    image: v.snippet.thumbnails.default.url
                  };
                  loadChannelInfo(channel, id);
                }
              });
            });

            deferred.resolve(data.nextPageToken || null);
          }
        );

        return deferred.promise;
      }

      function loadChannelInfo(channel, cId) {
        gapi.client.youtube.channels.list({
          id: cId,
          part: 'contentDetails,statistics, status,snippet',
          fields: 'items(contentDetails,statistics,status,snippet)'
        }).execute(function(data){
            $scope.$apply(function() {
              var d  = data.items[0];

              if (!angular.isUndefined(d.contentDetails.googlePlusUserId)){
                channel.gPlus = d.contentDetails.googlePlusUserId;
              }
              channel.numSubscribers = d.statistics.subscriberCount;
              channel.numViews = d.statistics.viewCount;
              channel.description = d.snippet.description;

              var emails = extractEmails(channel.description);
              if ( emails && emails.length ) {
                channel.email = emails;
                $scope.channels[cId] = channel;
                $scope.resultChannels[cId] = $scope.channels[cId];
                $scope.channels.$save(cId);
              }
              else {
                $scope.deadChannels[cId] = {
                  subscribers: channel.numSubscribers
                };
                $scope.deadChannels.$save(cId);
              }
            });
          });
      }

      /*
      * Private variables (No need for scope access);
      * */

      $scope.loaded = false;
      $scope.uiOptions = {
        order: ['relevance', 'date','rating','title','videoCount','viewCount']
      }
      $scope.searchOptions = {
        query: null,
        order: $scope.uiOptions.order[0],
        subscribers: null,
        views: null,
        fields: 'items(id,snippet),nextPageToken,prevPageToken,tokenPagination',
        maxResultsPerQuery: 5,
        minSearchResults: 5
      };

      $scope.pagination = {
        next: null,
        prev: null,
        reset: function() {
          this.next = null;
          this.prev = null;
        }
      };

      $scope.channels= channelService.collection();
      $scope.deadChannels = channelService.deadCollection();
      $scope.resultChannels = null;

      $scope.clear = function(){
        $scope.resultChannels = {};
        $scope.pagination.reset();
      };


      $scope.search = function(){
        var params = {
          q: $scope.searchOptions.query,
          part: 'snippet',
          order: $scope.searchOptions.order,
          type: 'channel',
          fields: $scope.searchOptions.fields,
          maxResults: $scope.searchOptions.maxResultsPerQuery
        };

        if ($scope.pagination.next !== null) {
          params.pageToken = $scope.pagination.next;
        }

        console.info("searching...");
        searchYoutube(params).then(
          function success(nextPageToken) {
            console.info("success");

            if (nextPageToken !== null){
              $scope.pagination.next = nextPageToken;
              if (Object.keys($scope.resultChannels).length < $scope.searchOptions.minSearchResults) {
                $scope.search();
              }
            }

          }

        );

      };


      $window.handleClientLoad = function(){
        googleService.handleClientLoad().then(function(msg){
          $scope.loaded = true;
        });
      }

      /* INITIALIZE google API Javascript Library*/
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://apis.google.com/js/client.js?onload=handleClientLoad';
      document.body.appendChild(script);

    }]);

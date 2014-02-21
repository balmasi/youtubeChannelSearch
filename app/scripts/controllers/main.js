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

              pagination.next = data.nextPageToken;
              pagination.prev = data.prevPageToken;
              pagination.numResults = data.pageInfo.totalResults;

              data.items.forEach(function(v){
                var id = v.id.channelId;
                // If this channel is in database, dont hit Youtube
                if (liveChannels[id]) {
                  $scope.resultChannels[id] = liveChannels[id];
                }
                // Not in Database. If not a dead channel, hit Youtube
                else if (!deadChannels[id]){
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
                liveChannels[cId] = channel;
                $scope.resultChannels[cId] = liveChannels[cId];
                liveChannels.$save(cId);
              }
              else {
                deadChannels[cId] = {
                  subscribers: channel.numSubscribers
                };
                deadChannels.$save(cId);
              }
            });
          });
      }

      /*
       * Private Controller variables (No need for scope access);
       * */

      var liveChannels= channelService.collection(),
        deadChannels = channelService.deadCollection();

      var pagination = {
        next: null,
        prev: null,
        timesQueried: 0,
        numResults: 0,
        reset: function() {
          this.next = null;
          this.prev = null;
          this.timesQueried = 0;
          this.numResults = 0;
        }
      };

      var settings = {
        // Minimum Number of results per round of calls to API
        minResultsPerQuery: 10,
        // Maximum number of times to call server before deciding to wait
        maxTriesPerLoad: 10,
        // Number of channels to ask for on each API call [0,50] inclusive
        resultsPerRequest: 10
      }

      /*
       * Scope Variables
       * */

      $scope.loading = true;
      $scope.notEnoughResults = false;
      $scope.uiOptions = {
        order: ['relevance', 'date','rating','title','videoCount','viewCount']
      };

      $scope.searchOptions = {
        query: null,
        order: $scope.uiOptions.order[0],
        fields: 'items(id,snippet),nextPageToken,prevPageToken,tokenPagination,pageInfo'
      };

      $scope.resultChannels = {};
      $scope.hasResults = function() {
        return !angular.equals($scope.resultChannels, {});
      };

      $scope.clear = function(){
        $scope.resultChannels = {};
        $scope.notEnoughResults = false;
        pagination.reset();
      };

      $scope.scrolled = function () {
        $scope.search();
      }


      $scope.search = function(){
        var params = {
          q: $scope.searchOptions.query,
          part: 'snippet',
          order: $scope.searchOptions.order,
          type: 'channel',
          fields: $scope.searchOptions.fields,
          maxResults: settings.resultsPerRequest
        };

        if (pagination.next !== null) {
          params.pageToken = pagination.next;
        }

        pagination.timesQueried += 1;
        $scope.loading = true;
        searchYoutube(params).then(
          function success(nextPageToken) {

            if ( pagination.numResults < 500 && (pagination.timesQueried ==1 || pagination.timesQueried >= 5)) {
              alert("Not Enough Results. Try a better query.");
              $scope.notEnoughResults = true;

            }
            // If there is a next page token and we haven't queried Youtube too many times
            else if (nextPageToken !== null && pagination.timesQueried < settings.maxTriesPerLoad){
              var numResults = Object.keys($scope.resultChannels).length;

              if ( numResults < settings.minResultsPerQuery) {
                pagination.next = nextPageToken;
                $scope.search();
              }
            }
            $scope.loading = false;
          },
          function failure(error) {
            $scope.loading = false;
            console.error(error);
          }
        );

      };


      $window.handleClientLoad = function(){
        googleService.handleClientLoad().then(function(msg){
          $scope.loading = false;
        });
      }

      /* INITIALIZE google API Javascript Library*/
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://apis.google.com/js/client.js?onload=handleClientLoad';
      document.body.appendChild(script);

    }]);

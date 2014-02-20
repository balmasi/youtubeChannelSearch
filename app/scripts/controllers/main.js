'use strict';

var gapi = window.gapi;

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
  .controller('MainCtrl', ['$scope', 'googleService', '$window', function ($scope, googleService, $window) {

    $scope.loaded = false;
    $scope.options = {
      order: ['relevance', 'date','rating','title','videoCount','viewCount']
    }
    $scope.searchOptions = {
      query: null,
      order: $scope.options.order[0],
      subscribers: null,
      views: null,
      fields: 'items(id,snippet),nextPageToken,prevPageToken,tokenPagination'
    };

    $scope.pagination = {
      next: null,
      prev: null
    };

    $scope.channels= null;

    $scope.clear = function(){
      $scope.channels = null;
    };

    $scope.search = function(){
      gapi.client.youtube.search.list({
        q: $scope.searchOptions.query,
        part: 'snippet',
        order: $scope.searchOptions.order,
        type: 'channel',
        fields: $scope.searchOptions.fields
      }).execute(function(data) {
          $scope.$apply(function(){
            $scope.pagination.next = data.nextPageToken;
            $scope.pagination.prev = data.prevPageToken;

            if (null === $scope.channels) $scope.channels = {};

            data.items.forEach(function(v){
              var id = v.id.channelId;
              if (!$scope.channels[id]){
                $scope.channels[id] = {
                  description: v.snippet.description,
                  channelTitle: v.snippet.channelTitle,
                  title: v.snippet.title,
                  image: v.snippet.thumbnails.default.url
                };
              }

              $scope.loadChannelInfo(id);
            });
          });
        });
    };

    $scope.loadChannelInfo = function(c) {

      gapi.client.youtube.channels.list({
        id: c,
        part: 'contentDetails,statistics, status',
        fields: 'items(contentDetails,statistics,status)'
      }).execute(function(data){
          $scope.$apply(function() {
            var ch = $scope.channels[c],
              d  = data.items[0];
            if (!angular.isUndefined(d.contentDetails.googlePlusUserId)){
              ch.gPlus = d.contentDetails.googlePlusUserId;
            }
            ch.numSubscribers = d.statistics.subscriberCount;
            ch.numViews = d.statistics.viewCount;

          });
        });
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

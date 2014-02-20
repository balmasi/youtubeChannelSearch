'use strict';

var app = angular.module('youtubeApiApp', ['ngResource', 'ngRoute'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }).constant('FBURL', 'https://yousearch.firebaseio.com/');

app.run(['FBURL', '$rootScope',
  function(FBURL, $rootScope) {
    $rootScope.FBURL = FBURL;
  }]);

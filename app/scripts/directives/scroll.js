/**
 * Created by balmasi on 21/02/14.
 */
'use strict';

angular.module('scroll',[])
  .directive('when-scrolled', function() {
    return {
      restrict: 'A',
      link:
        function(scope, elm, attr){
//          var raw = elm[0];
//
//          elm.on('scroll', function() {
//            if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
//              scope.$apply(attr.whenScrolled);
//            }
//          });
          alert(elm);
        }
    };
  });
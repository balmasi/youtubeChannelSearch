/**
 * Created by balmasi on 21/02/14.
 */
'use strict';

angular.module('scroll',[])
  .directive('scrollever', function() {
    return {
      restrict: 'A',
      link:
        function(scope, elm, attr){
          $(document).on('scroll', function(e) {
            var raw = document.body;
            if (raw.scrollTop + $(window).height() >= raw.scrollHeight) {
              scope.$apply(attr.scrollever);
            }
          });
        }
    };
  });
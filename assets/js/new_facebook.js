"use strict"
angular.module('elephantpost', [])
  .run(['$rootScope', '$window',
    function($rootScope, $window) {
    $rootScope.user = {};
    $window.fbAsyncInit = function() {
      FB.init({
        appId: '1425705567684153',
        channelUrl: 'app/channel.html',
        status: true,
        cookie: true,
        xfbml: true
      });
      $rootScope.rdyfb = true;
      $rootScope.$apply();
    };

    (function(d){
      // load the Facebook javascript SDK
      var js,
      id = 'facebook-jssdk',
      ref = d.getElementsByTagName('script')[0];
      if (d.getElementById(id)) { return; }
      js = d.createElement('script');
      js.id = id;
      js.async = true;
      js.src = "//connect.facebook.net/en_US/all.js";
      ref.parentNode.insertBefore(js, ref);
    }(document));
  }])
  .config(['$interpolateProvider'
  , function($interpolateProvider, FacebookProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');

  }])
  .directive('ngEnter', function () {
    return function (scope, element, attrs) {
      element.bind("keydown keypress", function (event) {
        if(event.which === 13) {
          scope.$apply(function (){
            scope.$eval(attrs.ngEnter);
          });

          event.preventDefault();
        }
      });
    };
  })
  .controller('FacebookCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {
    $scope.user = {};
    $scope.friends = {};
    $scope.selectedFriends = [];
    $scope.showbutton = false;
    $rootScope.$watch('rdyfb', function() {
      if ($rootScope.rdyfb && FB) {
        $scope.showbutton = true;
        $scope.login(true);
      };
    });

    $scope.save = function() {
      var friends = $scope.selectedFriends;
      for (var i = 0, len = friends.length; i < len; i++) {
        if (friends[i].hasOwnProperty('birthday')) {
          var today = new Date();
          var birthday = friends[i].birthday;
          if (birthday.split("/").length < 3) { //missing year
            birthday += "/" + today.getFullYear();
          }
          birthday = new Date(birthday);
          birthday.setFullYear(today.getFullYear());
          if (birthday < today) {
            birthday.setFullYear(today.getFullYear() + 1);
          }
          friends[i].eventDate = birthday.getFullYear() + "-" +
            ((birthday.getMonth() < 9) ? "0" : "") + (birthday.getMonth() + 1) + "-" +
            ((birthday.getDate() < 10) ? "0" : "") + birthday.getDate();
        } else {
          friends[i].eventDate = '';
        }
        friends[i].eventName = friends[i].first_name + "'s Birthday";
        console.log(friends[i].name, friends[i].birthday, friends[i].eventDate);
      }
      console.log("To Post: ", $scope.selectedFriends);
    }

    $scope.addFriend = function(friend) {
      $scope.selectedFriends.push(friend);
      for (var i = 0, len = $scope.friends.data.length; i < len; i++) {
        if (friend.id == $scope.friends.data[i].id) {
          $scope.friends.data.splice(i, 1);
          break;
        }
      }
    };

    $scope.removeFriend = function(friend) {
      $scope.friends.data.push(friend);
      for (var i = 0, len = $scope.selectedFriends.length; i < len; i++) {
        if (friend.id == $scope.selectedFriends[i].id) {
          $scope.selectedFriends.splice(i, 1);
          break;
        }
      }
    };

    $scope.selectRelationship  = function() {
      FB.api('/me/friends?fields=birthday,name,id,picture,first_name', function(response) {
        $scope.friends = response;
        if ($scope.user.significant_other && $scope.user.significant_other.id) {
          FB.api("/" + $scope.user.significant_other.id +"?fields=birthday,name,id,picture,first_name", function(response) {
            // $scope.selectedFriends = $scope.selectedFriends.concat([response]);
            $scope.addFriend(response);
            FB.api('/me/family?fields=birthday,name,id,picture,first_name', function(response) {
              console.log(">>> Gotcha friends", response);

             // $scope.selectedFriends = $scope.selectedFriends.concat(response.data);
              for (var i = 0, len = response.data.length; i < len; i++) {
                $scope.addFriend(response.data[i]);
              }
              $scope.$apply();
            });
          });
        }

      });
    };

    $scope.getInfo = function() {
      FB.api('/me', function(response) {
        console.log('Good to see you, ' + response.name + '.');
        $scope.$apply(function() {
          $scope.user = response;
          $scope.showbutton = false;
          $scope.selectRelationship();
        });
      });

    };

    $scope.logout = function() {
      FB.api("/me/permissions", 'DELETE');
    }

    $scope.login = function(fromload) {
      FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
          var uid = response.authResponse.userID;
          var accessToken = response.authResponse.accessToken;
          $scope.getInfo();
        } else {
          if (!fromload) {
            FB.login(function(response) {
              if (response.authResponse) {
                console.log('Welcome!  Fetching your information.... ');
                $scope.getInfo();
              } else {
               console.log('User cancelled login or did not fully authorize.');
              }
            }, {scope: 'email, friends_birthday, user_birthday, user_relationships, user_relationship_details'});
          }
        }
      });
    }
  }])
  .controller('LoginCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {
    $scope.user = {};
    $scope.modalTitle = "Register";
    $scope.fromFb = false;
    $scope.hidebutton = true;
    $rootScope.$watch('rdyfb', function() {
      if ($rootScope.rdyfb && FB) {
        $scope.hidebutton = false;
      };
    });

    $scope.saveCustomer = function() {
      $("#regModal #create_customer").submit();
    }

    $scope.tryLogin = function() {
      FB.api("/me", function(response) {
        $scope.me = response;
      });
    }
    $scope.thanksContact = function() {
      alert("Thanks for contacting us! We'll get back to you as soon as possible.");
    }
    $scope.saveCustomerFromFb = function(auth) {
      FB.api('/me', function(response) {
        console.log('Good to see you, ' + response.name + '.');
        $scope.$apply(function() {
          $scope.customer = {
            email: response.email,
            password: response.id,
            first_name: response.first_name,
            last_name: response.last_name
          }
        });
        console.log(auth.authResponse.accessToken.substr(0,20));
        $.post(
          "http://api.myelephantpost.com/v1/user/add",
          $('#regModal').find('form').serialize(), function(data) {
            console.log(data);
            if (!data.error) {
              $.post(
                "http://api.myelephantpost.com/v1/user/login",
                $('#regModal').find('form').serialize(), function(data) {
                  console.log("success");
                  $("#regModal #create_customer").submit();
                }
              );
            } else {
              $scope.login(true);
            }
          }
        );
      });
    }
    $scope.reset = function() {
      $scope.customer = {};
      $scope.showAlert = false;
    }
    $scope.login = function(fromfb) {
      $.post(
        "http://api.myelephantpost.com/v1/user/login",
        $('#logModal').find('form').serialize(), function(data) {
          console.log("success");
          console.log(data);
          if (data.error && fromfb) {
            $scope.$apply(function() {
              $scope.customer.password = "";
              $scope.showAlert = true;
            });
            $("#logModal").modal('show');
          } else {
            $("#logModal #customer_login").submit();
          }
        }
      );
    };

    $scope.logout = function() {
      FB.api("/me/permissions", 'DELETE');
    }

    $scope.test =function() {
      console.log("enter");
    }

    $scope.loginFb = function(fromload) {
      FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
          var uid = response.authResponse.userID;
          var accessToken = response.authResponse.accessToken;
          $scope.saveCustomerFromFb(response);
        } else {
          if (!fromload) {
            FB.login(function(response) {
              if (response.authResponse) {
                console.log('Welcome! Creating Shopify Account');
                $scope.saveCustomerFromFb(response);
              } else {
               console.log('User cancelled login or did not fully authorize.');
              }
            }, {scope: 'email, friends_birthday, user_birthday, user_relationships, user_relationship_details'});
          }
        }
      });
    }
  }]);;

angular.element(document).ready(function() {
  angular.bootstrap(document, ['elephantpost']);
});
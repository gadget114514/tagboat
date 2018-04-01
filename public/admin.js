//console.log("AAAA");
// declare a new module called 'myApp', and make it require the `ng-admin` module as a dependency
var myApp = angular.module('myApp', ['ng-admin', 'ngWebsocket']);
// declare a function to run when the module bootstraps (during the 'config' phase)

////
myApp.controller('ConsoleControl', ['$websocket', function($websocket) {
  var ws = $websocket.$new('ws://192.168.116.206:3009/');
  ws.$on('$open', function() {
    ws.$emit('hello', 'world');
  }).$on('incoming event', function(message) {
    console.log('something incoming from the server' + message);
  });
}]);
/////

myApp.service('sshConsoleService', ['$websocket', function($websocket) {
  var consoledata = "";
  var msgcbs = null;
  function getmsg() {
    return consoledata;
  }
  function setcb(cbs) {
    msgcbs = cbs;
  }
  function addmsg(msg) {
    if (typeof msg == "string") {
      consoledata += msg;
    } else {
      consoledata += JSON.stringify(msg);
    }
//    console.log("addmsg consoledata 1", JSON.stringify(msg));
//    console.log("addmsg consoledata 2", consoledata);
    return consoledata;
  }
  function getSshConsoleStdout(id, cb) {
    var resdata = consoledata;
    cb(null, resdata, null);
  }
  function resetSshConsoleStdout() {
    consoledata = "";
  }
  var ws;
  ws = $websocket.$new('ws://192.168.116.206:3009/');  
//  console.log(ws);
  console.log("service init");
    ws.$on('$open', function() {
//      console.log("ws on");
      ws.$emit('hello', 'world');
    }).$on('$message', function(message) {
//      console.log("ws $message", message);
      addmsg(message);
      if (msgcbs) msgcbs.on_message();
    }).$on('incoming event', function(message) {
//      console.log("ws incoming");    
//      console.log('something incoming from the server' + message);
    }).$on('hello', function(message) {
//      console.log("ws hello");    
//      console.log('something incoming from the server' + message);
    });

//  connectWs();
  return {ws: ws, addmsg:addmsg, consoledata:consoledata, getmsg:getmsg,setcb:setcb,getSshConsoleStdout:getSshConsoleStdout, resetSshConsoleStdout:resetSshConsoleStdout };
/*
  // Open a WebSocket connection
  var dataStream = $websocket.$new('ws://192.168.116.206:3009/');
//  console.log("MyData", dataStream);
  
  var collection = [];

  dataStream.onMessage(function(message) {
    collection.push(JSON.parse(message.data));
  });

  var methods = {
    collection: collection,
    get: function() {
      dataStream.send(JSON.stringify({ action: 'get' }));
    }
  };

  return methods;
*/
}]);


myApp.service('myNetService', ['$http', function($http){
  return {
    msearch: function(cb){
      $http.get('/msearch').then(function(err) {
//	console.log('msearch success');
	cb(null);
      },
				 function(err) {
//				   console.log('msearch error');
				   cb('error');
				 })
    },
    execJob: function(entry, cb){
//	console.log("execJob", entry);
	var jobid = entry.values.id;
      $http.get('/execjob/'+jobid).then(function(err) {
//	console.log('success');
	cb(null);
      },
				 function(err) {
//				   console.log('error');
				   cb('error');
				 }) 
    },
    getJoblogStdout: function(joblogid, cb){
//      console.log("getjoblogstdout", joblogid);
      $http.get('/getjoblogstdout/'+joblogid).then(
	function(response) {
	  cb(null, response.data, response);
//	  console.log('success');
	},
	function(response) {
	  cb("error");
	}) 
    },
    getTasklogStdout: function(cb){
      $http.get('/tasklogstdout/').then(
	function(response) {
	  cb(null, response.data, response);
	},
	function(response) {
	  cb("error");
	}) 
     } 
  };
}]);

myApp.directive('mSearch', ['$location', 'myNetService', function ($location, myNetService) {
    return {
      restrict: 'E',
      link: function postLink(scope, element, attrs, ctrl){
//	console.log('link');
	scope.searchMachine = function(arg) {
//	  console.log("search machine");
//	  console.log(arg);
	  myNetService.msearch(function(err){ if (err) console.log("error: server access"); });
	}
      },
      template: '<a class="btn btn-default" ng-click="searchMachine()">Search machine</a>'
    };
  }]);

myApp.directive('execJob', ['$location', 'myNetService', function ($location, myNetService) {
    return {
      restrict: 'E',
      link: function postLink(scope, element, attrs, ctrl){
//	console.log('link');
	scope.execJob = function(arg) {
//	  console.log(arg);
	  myNetService.execJob(arg,
			       function(err){ if (err) console.log("error: server access"); }
			      );
	}
      },
      template: '<a class="btn btn-default" entry="entry" ng-click="execJob(entry)">Exec Job</a>'
    };
  }]);


myApp.config(function ($stateProvider) {
  $stateProvider.state('show-joblog', {
    parent: 'ng-admin',
    url: '/showJoblog/:id',
    params: { id: null },
    controller: showJoblogController,
    controllerAs: 'controller',
    template: showJoblogControllerTemplate
  });
});

function showJoblogController($stateParams, $scope, $sce, $timeout, notification, myNetService) {
  var id = $stateParams.id;
  this.postId = $stateParams.id;
  // notification is the service used to display notifications on the top of the screen
  this.notification = notification;
  this.data = "joblog stdout #";
  myNetService.getJoblogStdout(id, function(err, resdata, response) {
    if (err) {
      notification.log("error: server access"); 
      return ;
    }
//    console.log("joblog stdout " + resdata, this);
    setTimeout(function() {
      $scope.$apply(function() {
//	this.data = "joblog stdout " + resdata;
//	resdata = resdata.replace("\n", "<br>");
//	console.log("joblog stdout 2 " + resdata);		
	$scope.data = $sce.trustAsHtml('<pre>'+resdata+'</pre>');
      })
    }, 0);
  });  
};
showJoblogController.inject = ['$stateParams', '$scope', '$sce', '$timeout', 'notification', 'myNetService'];
showJoblogController.prototype.showJoblog = function() {
  this.notification.log('sent to ' + this);
};

var showJoblogControllerTemplate =
    '<div class="row"><div class="col-lg-12">' +
    '<ma-view-actions><ma-back-button></ma-back-button></ma-view-actions>' +
    '<div class="page-header">' +
    '<h1>Output of Joblog #{{ controller.postId }}</h1>' +
    '</div>' +
    '</div></div>' +
    '<div ng-bind-html="data"></div>';
//    '<div class="row">' +
//    '<div class="col-lg-5"><input type="text" size="10" ng-model="controller.email" class="form-control" placeholder="name@example.com"/></div>' +
//    '<div class="col-lg-5"><a class="btn btn-default" ng-click="controller.showJoblog()">Send XXX</a></div>' +
//    '</div>';

myApp.directive('showJoblogOutputPage', ['$location', function ($location) {
  return {
    restrict: 'E',
    scope: { post: '&' },
    link: function (scope) {
      scope.showJoblogOutput = function () {
//	console.log("showjoblog", scope.post().values.id);
	$location.path('/showJoblog/' + scope.post().values.id);
      };
    },
    template: '<a class="btn btn-default" ng-click="showJoblogOutput()">Output</a>'
  };
}]);

/////////////
myApp.config(function ($stateProvider) {
  $stateProvider.state('ssh-console', {
    parent: 'ng-admin',
    url: '/sshConsole/:id',
    params: { id: null },
    controller: sshConsoleController,
    controllerAs: 'controller',
    template: sshConsoleControllerTemplate
  });
});



function sshConsoleController($stateParams, $scope, $sce, $timeout, $interval, notification,
			      /*sshConsoleService*/ myNetService) {
  if (false) {
  var id = $stateParams.id;
  this.postId = $stateParams.id;
  // notification is the service used to display notifications on the top of the screen
  this.notification = notification;
  this.data = "joblog stdout #";
  sshConsoleService.setcb({on_message: function() {
//    console.log("on_message");
    var text = sshConsoleService.getmsg();	    
    $scope.sshconsolemessage = text;
  }})
  $interval(function() {
    sshConsoleService.getSshConsoleStdout(id, function(err, resdata, response) {
//      console.log("sshconsole stdout");
      //      $scope.data = $sce.trustAsHtml('<pre>'+resdata+'</pre>');
      $scope.data = $sce.trustAsHtml(resdata);      
    });
  }, 10000);
  }
  myNetService.getTasklogStdout(function(err, resdata) {
    if (err) {
      notification.log("error: server access");
      return ;
    }
    $scope.data = $sce.trustAsHtml(resdata);      
  });
};

sshConsoleController.inject = ['$stateParams', '$scope', '$sce', '$timeout', '$interval', 'notification',
			       /*'sshConsoleService'*/
			      'myNetService'];
sshConsoleController.prototype.sshConsole = function() {
  this.notification.log('sent to ' + this);
};

var sshConsoleControllerTemplate =
    '<div class="row"><div class="col-lg-12">' +
    '<ma-view-actions><ma-back-button></ma-back-button></ma-view-actions>' +
    '<div class="page-header">' +
    '<h1>Console</h1>' +
    '</div>' +
    '</div></div>' +
    '<div ng-bind-html="data"></div>';


myApp.directive('sshConsoleOutputPage', ['$location', function ($location) {
  return {
    restrict: 'E',
    scope: { post: '&' },
    link: function (scope) {
      scope.sshConsoleOutput = function () {
//	console.log("send", scope.post().values.id);
	$location.path('/sshConsole/' + scope.post().values.id);
      };
    },
    template: '<a class="btn btn-default" ng-click="sshConsoleOutput()">Output</a>'
  };
}]);
/////////////

function moment2localtime(value, entry) // see ng-admin field map function spec
{
//  console.log("moment2localtime=",value);
  var d = moment(value);
//  console.log("date=", d);  
  var s = d.format('YYYY-MM-DD HH:mm:ss');
//  console.log(s);
  return s;
}

myApp.config(['NgAdminConfigurationProvider', function (nga) {
  // create an admin application
  var admin = nga.application('My First Admin');

//  console.log("myapp");
  
  //  admin.baseApiUrl('http://jsonplaceholder.typicode.com/'); // main API endpoint
//  admin.baseApiUrl('http://192.168.116.206:3009/'); // main API endpoint

  var jobs = nga.entity('jobs');
  jobs.listView().fields([
    nga.field('name'),
    nga.field('command'),
    nga.field('nodes', 'reference_many')
      .targetEntity(nga.entity('machines'))
      .targetField(nga.field('name'))
      .singleApiCall(names => ({"name[]": names } ))
  ]);
  jobs.listView().listActions(['<exec-job></exec-job>','show','edit']).sortField('starttime').sortDir('DESC');
  
  jobs.editionView().fields([
    nga.field('name'),
    nga.field('command', 'text'),
    nga.field('nodes', 'reference_many')
      .targetEntity(nga.entity('machines'))
      .targetField(nga.field('name'))
      .singleApiCall(names => ({"name": names } ))
/*    
      .targetReferenceField('machine_id')
      .targetFields([
	nga.field('id'),
	nga.field('name'),
	nga.field('ipaddr')])
      .sortField('ipaddr')
      .sortDir('DESC')
      .listActions(['edit']);
*/
  ]);
  jobs.editionView().title("Edit");
//  jobs.editionView().actions(['list', 'delete']);
  jobs.editionView().actions(['filter', 'create', 'export', 'list', 'delete']);
  
  jobs.creationView().fields([
    nga.field('name'),
    nga.field('command', 'text'),
    nga.field('nodes', 'reference_many')
      .targetEntity(nga.entity('machines'))
      .targetField(nga.field('name'))
      .singleApiCall(names => ({"name[]": names } ))
  ]);
  
  jobs.showView().title("Show");
  jobs.showView().fields([
    nga.field('name'),
    nga.field('command', 'text'),
    nga.field('nodes', 'reference_many')
      .targetEntity(nga.entity('machines'))
      .targetField(nga.field('name'))
      .singleApiCall(names => ({"name[]": names } ))
  ]);
  jobs.showView().actions(['<exec-job></exec-job>', 'edit']);  
  // By default, it is:

  admin.addEntity(jobs)


  
  var machine = nga.entity('machines');

  machine.listView().actions([ '<m-search></m-search>']).sortField('name').sortDir('ASC');

  
  machine.listView().fields([
    nga.field('name'),
    nga.field('ipaddr'),
  ]);
  machine.editionView().fields([
    nga.field('name'),
    nga.field('ipaddr')
  ]);
  admin.addEntity(machine);  

  admin.menu(nga.menu()
	     .addChild(nga.menu(jobs))
	     .addChild(nga.menu(machine))
	    );


  var joblogs = nga.entity('joblogs');

  joblogs.listView().fields([
    nga.field('starttime').map(moment2localtime),
    nga.field('jobname')    
    /*
    nga.field('tasks', 'reference_many')
      .targetEntity(nga.entity('tasklogs'))
      .targetField(nga.field('id'))
      .singleApiCall(ids => ({"id[]": ids } )) */
  ]).sortField('starttime').sortDir('DESC');
  joblogs.listView().listActions(['show']);


  joblogs.showView().title("Show Joblog");
  joblogs.showView().fields([
    nga.field('jobname'),
    nga.field('starttime').map(moment2localtime),
    nga.field('endtime').map(moment2localtime),            
    nga.field('id'),
    nga.field('jobid'),
    nga.field('custom_action')
      .label('')
      .template('<show-joblog-output-page post="entry"></show-joblog-output-page>')
  ]);
//  joblogs.showView().actions(['edit']);  
  
  admin.addEntity(joblogs);


  var tasklogs = nga.entity('tasklogs');

  tasklogs.listView().fields([
    nga.field('starttime').map(moment2localtime),
    nga.field('id')    
//    nga.field('joblogs')    
  ]).sortField('starttime').sortDir('ASC');
  tasklogs.listView().listActions(['show']);
  
  tasklogs.showView().title("Show Tasklog");
  tasklogs.showView().fields([
    nga.field('starttime').map(moment2localtime),    
    nga.field('id'),
    nga.field('jobid'),
    nga.field('joblogid'),        
  ]);

  admin.addEntity(tasklogs);



  
  admin.menu(nga.menu()
	     .addChild(nga.menu(jobs))
	     .addChild(nga.menu(machine))
	     .addChild(nga.menu(joblogs))
	     .addChild(nga.menu(tasklogs))
	     .addChild(nga.menu().title('Console').link('/sshConsole/0'))
	    );
  
  nga.configure(admin);


//  var mydate = MyData;

}]);





  



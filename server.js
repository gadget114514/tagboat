//Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var interceptor = require('express-interceptor');
var underscore = require("underscore");
var nedb = require('nedb');
var async = require('async');


//App level config
var app = express();
var expressWs = require('express-ws')(app);

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
app.use(cors());
app.use(errorInterceptor);
app.use(express.static('public'));
app._ = underscore;
var xdb = function (opts) {
  this.dbs = {}
  this.addCollection = function (name) {
//    console.log("addcol", name);    
    this.dbs[name] = new nedb({filename:name+'.db', autoload:true, inMemoryOnly: false});
    return this.dbs[name];    
  };
  this.getCollection = function (name) {
//    console.log("getcol",  name);
    return this.dbs[name];
  };
  this.loadDatabase = function(opts, cb) {
//    console.log("load");
    for (var k in this.dbs) {
      this.dbs[k].loadDatabase(function(err) {
	if (err)
	  console.log("load", k, err);
      });
    }
    cb();
  }  
  this.saveDatabase = function() {
    // console.log("save");
  }
}

var db = new xdb();
dbinit(db);

var machinesdat = [];
var q = async.queue(function (task , callback) {
//  console.log("queued");
  updatemachines(task.name, task.ipaddr, callback);
}, 1);

var genuuid = require('short-uuid').uuid;

function updatenode(col, n, cb)
{
//  console.log("updatenode", n);
  col.findOne({'name': n.name}, function(err, obj) {
//    console.log("update", err, obj);
    if (obj) {
//      console.log("found");
      n['meta'] = obj['meta'];
      n['id'] = obj['id'];
      n['_id'] = obj['_id'];      
      col.update({'name': n.name}, {$set:n}, {}, function(err, count) {
//	console.log("update2", err, count);
	cb();});
    } else {
//      console.log("not found", "add", n);      
      n.id = genuuid();
      col.insert(n, function(err, newdoc) {
//	console.log("update3", err, newdoc);
	cb();});

    }
  });
}

function addUtilFunc(db,col)
{
  col.findOne({ id: '__autoid__' },
	      function(err, doc) {
		if (doc == null) {
		  col.insert({ id: '__autoid__',  seq: (new Date()).getTime() });
		}
	      });
  col.getAutoincrementId = function (cb) {
      col.update({ id: '__autoid__' },
		 { $inc: { seq: 1 } },
		 { upsert: true },		 
		 function (err, autoid) {
		   if (autoid) {
		     cb && cb(err, autoid.seq);
		   } else {
		     cb && cb(err, (new Date()).getTime());
		   }
		 }
		);
    }
}

function dbinit(db)
{
//  console.log("dbinit");
  if (!db.getCollection('machines')) {
    var x = db.addCollection('machines', {});
    //    q.ensureIndex({fieldName: 'name', unique: true}, function(err){});
//    addUtilFunc(x);    
  }
  if (!db.getCollection('jobs')) {
    var x = db.addCollection('jobs', {});
    //    q.ensureIndex({fieldName: 'name', unique: true}, function(err){});
//    addUtilFunc(x);    
  }
  if (!db.getCollection('joblogs')) {
    var x = db.addCollection('joblogs', {});
    //    q.ensureIndex({fieldName: 'name', unique: true}, function(err){});
//    addUtilFunc(x);    
  }
  if (!db.getCollection('tasklogs')) {
    var x = db.addCollection('tasklogs', {});
    //    q.ensureIndex({fieldName: 'name', unique: true}, function(err){});
//    addUtilFunc(db,x);
  }
  if (!db.getCollection('misc')) {
    var x = db.addCollection('misc', {});
    addUtilFunc(db,x);    
    return this;
  };
}


function updatemachines(dname, ipaddr, cb)
{
  var machines = db.getCollection('machines');
  if (!machines) machines = db.addCollection('machines');
  updatenode(machines, {"name": dname, "ipaddr": ipaddr}, cb);
}

function startMsearch()
{
//  console.log("msearch");
  machinesdat = [];
  var ssdp = require('node-ssdp').Client;
  var client = new ssdp({
    //    unicastHost: '192.168.11.63'
  })

  client.on('notify', function () {
    //console.log('Got a notification.')
  })
  const hdr_dname = "01-DNAME";
  const hdr_ipaddr = "01-IPADDR";

  client.on('response', function inResponse(headers, code, rinfo) {
//    console.log('### Got a response to an m-search:\n%d\n%s\n%s', code, JSON.stringify(headers, null, '  '), JSON.stringify(rinfo, null, '  '));
//    console.log(headers);
    var dname = headers[hdr_dname];
    var ipaddr = headers[hdr_ipaddr];
    if (!dname || !ipaddr) return;
//    console.log("###", dname, ipaddr);
    if (dname) {
      if (ipaddr) {
//	console.log("machine", hdr_dname, dname, hdr_ipaddr, ipaddr);
	//	machinesdat.push({"name": dname, "ipaddr": ipaddr});
//	console.log("push");
	q.push({"name": dname, "ipaddr": ipaddr}, function(err){});
      }
    }
  })

  // client.search('urn:schemas-upnp-org:service:ContentDirectory:1')

  // Or maybe if you want to scour for everything after 5 seconds
  setTimeout(function() {
    client.search('ssdp:all')
  }, 1000)

  // And after 10 seconds, you want to stop
  setTimeout(function () {
    client.stop()
//    console.log("stop");
  }, 10000)
}

function startServer() {
  db.loadDatabase({}, function (result) {
    //	console.log("xyz", db, result);
    //All controller routes

    require('./router/routes')(app,db);
    require('./router/execroutes')(app,db);
    require('./router/any.controller')(app, db, 'machines');
    require('./router/any.controller')(app, db, 'jobs');    
    require('./router/any.controller')(app, db, 'joblogs');
    require('./router/any.controller')(app, db, 'tasklogs');

    
    startMsearch(db);
    
    // put your log call here.
    var server = app.listen(3009, function () {
      console.log("We have started our server on port 3009");
    });
  });
}

//Interceptor
function errorInterceptor(err, req, res, next) {
    // Do logging and user-friendly error message display
    console.error(err);
    res.status(500).send({status: 500, message: 'internal error', type: 'internal'});
};

const miss = require('./clussh/node_modules/mississippi')

var websock = null;
app.stdout = process.stdout;
app.ws('/', function(ws, req) {
  websock = ws;
  ws.on('message', function(msg) {
//    console.log("websocket", msg);
    ws.send(msg);
  });

  var stream = require('stream');  
  var wis = miss.to.obj(function(data,enc,done) {
//    console.log("wis");
    done();
//    console.log('writing', data.toString())
    if (websock) {
      websock.send(data.toString());
    }
  }).on('end', function () {
//    console.log('finished')
  }).on ('data', function(data) {
    //    cb()
//    console.log("wis data", data);
  });

  app.stdout = new stream.PassThrough();  
  app.stdout.pipe(wis);
});



startServer();

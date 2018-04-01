var async = require('async');
var genuuid = require('short-uuid').uuid;
var moment  = require('moment');
// require('date-utils');

function nowstr() {
  var dt = moment();
  return dt.toISOString();
}
function now() {
  return new Date().getTime();
}
/*
var Connection = require('ssh2');

var Sshc = function() {
  this.c = new Connection();
  this.c.on('connect', function() {
//    console.log('Connection :: connect');
  });
  this.c.on('ready', function() {
//    console.log('Connection :: ready');
    this.c.exec(this.cmd, function(err, stream) {
      if (err) throw err;
      stream.on('data', function(data, extended) {
//	console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')		    + data);
      });
      stream.on('end', function() {
//	console.log('Stream :: EOF');
      });
      stream.on('close', function() {
//	console.log('Stream :: close');
      });
      stream.on('exit', function(code, signal) {
//	console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
	c.end();
      });
    });
  });
  this.c.on('error', function(err) {
//    console.log('Connection :: error :: ' + err);
  });
  this.c.on('end', function() {
//    console.log('Connection :: end');
  });
  this.c.on('close', function(had_error) {
//    console.log('Connection :: close');
    this.cb();
  });
// require('fs').readFileSync('/here/is/my/key')
  this.doconnect = function (ipaddr, uname, keystr, cmd, cb) {
    this.cmd = cmd;
    this.cb = cb;
    this.c.connect({
      host: ipaddr,
      port: 22,
      username: uname,
      privateKey: keystr
    });
  }
}

function connect2srv(ipaddr, uname, cmd) {
  var ssh  = new Sshc();
  ssh.doconnect(ipaddr, uname, cmd);
}

var execqueue = async.queue(function (task , callback) {
//  console.log("exec queued");
  var machines=db.getColletion('machines');
  async.each(task.nodes, function(mid, cb){
    machines.findOne({id: mid}, function(err, doc){
      connect2srv(doc.ipaddr, "share", task.command);
    })
  });
}, 1);
*/

var joborder = 0;
if (0) {
const leazyJsonStream = require('../clussh/lib/leazy-ndjson-stream.js')
const miss = require('../clussh/node_modules/mississippi')
var clussh = require('../clussh/index.js');

var execStream = require("exec-stream");

function xclussh(config)
{
  return execStream("node", "../clussh/bin/clussh.js");
}

  
function runtask(app, db, joblog, job, mach, finishcb)
{
//  console.log("runtask=", job, mach);
  var worker = "ssh://share@" + mach.ipaddr + "/";
//  console.log("dispatch ", task);
  
  var config = {}
  var stream = require('stream');

  var bstream = new stream.PassThrough();
  bstream.pipe(leazyJsonStream())
    .pipe(xclussh(config))
    .pipe(miss.through.obj(function (data, enc, done) {
//      console.log("finish=", data);

      this.push(JSON.stringify(data) + '\n');

      if (data.type == 'exit') {
	var id = data.task.id;
	var tasklogs = db.getCollection("tasklogs");
	tasklogs.update({id: id}, {$set: {endtime:nowstr()}}, function(err,doc){});
      } 
      var tasklogs = db.getCollection("tasklogs");
      var taskid = 0;
      if (data.task) taskid = data.task.id;
      var misc = db.getCollection("misc");
      misc.getAutoincrementId(
	function(err, taskorder) {
	  tasklogs.insert({id:genuuid(),
			   time: now(),			   
			   worker:worker,
			   taskid: taskid,
			   order:taskorder,
			   joblogid: joblog.id,
			   jobid: job.id,		       
			   data:data});
	});
      done();
    }))
    .pipe(app.stdout)

  var tasklogs = db.getCollection("tasklogs");
  var misc = db.getCollection("misc");
  misc.getAutoincrementId(function(err, taskorder) {  
    var uuid = genuuid();
    var tasklog = { id: uuid,
		    time: now(),
		    starttime: nowstr(),
		    endtime: "",
		    worker:worker,
		    order:taskorder,
		    joblogid: joblog.id,
		    jobid: job.id,		       
		    job:job,
		    taskid:uuid,
		    machine:mach };
    tasklogs.insert(tasklog, function(err,doc){});
  });
  
  var task = {
    id: uuid,
    cmd: job.command,
    worker: worker
  };
  
  bstream.push(JSON.stringify(task));
  bstream.push(null);
}
}

var fs = require('fs');
var pidFile = fs.createWriteStream("test.txt");

function runtask(app, db, joblog, job, mach, finishcb)
{
//  console.log("runtask=", job, mach);
  var worker = "ssh://share@" + mach.ipaddr + "/";
  
  var config = {}
  var execNode = require("../exec-node");
  var ss = require("string-to-stream");
  var ndjson = require('ndjson');
  var options = {};

  options.cb = function (st, chunk, enc, done) {
    pidFile.write("@@@ " + JSON.stringify(chunk) + "\n\n");
    pidFile.write("XXX " + chunk.toString() + "\n\n");
    try {
      st.push(chunk)
    } catch(e){}
    ss(chunk.toString()).pipe(ndjson.parse()).on('data', function(data) {
      if (data && data.type == 'exit') {
	var id = data.task.id;
	var tasklogs = db.getCollection("tasklogs");
	tasklogs.update({id: id}, {$set: {endtime:nowstr()}}, function(err,doc){});
      } 
      var tasklogs = db.getCollection("tasklogs");
      var misc = db.getCollection("misc");      
      var taskid = 0;
      if (data.task) taskid = data.task.id,
      misc.getAutoincrementId(function(err, taskorder) {        
	tasklogs.insert({id:genuuid(),
			 worker:worker,
			 time: now(),
			 taskid: taskid,
			 order:taskorder,
			 joblogid: joblog.id,
			 jobid: job.id,		       
			 data:data});
      });
      pidFile.write("ZZZ " + JSON.stringify(data) + "\n\n");      
    }).on('end', function() {
      pidFile.write("AAA \n");
      done();
    });
  }    
  options.stdout = app.stdout;
  options.timeout = 100000;
//  options.stdout = process.stdout;
  
  var tasklogs = db.getCollection("tasklogs");
  var misc = db.getCollection("misc");
  var uuid = genuuid();  
  misc.getAutoincrementId(function(err, taskorder) {  
    var tasklog = { id: uuid,
		    time: now(),
		  starttime: nowstr(),
		  endtime: "",
		  worker:worker,
		  order:taskorder,
		  joblogid: joblog.id,
		  jobid: job.id,		       
		  job:job,
		  taskid:uuid,
		  machine:mach };
    tasklogs.insert(tasklog, function(err,doc){});
  });
  var task = {
    id: uuid,
    cmd: job.command,
    worker: worker
  };
//  console.log("execNode", task, options);
  execNode(task, finishcb, options);  
}


module.exports = function (app, db) {
  app.get('/execjob/:id', function (req, res) {
//    console.log('execjob');
    var emp = req.body;
//    console.log("db=", db);
    var jobs = db.getCollection('jobs');
    jobs.findOne({id:req.params.id}, function (err, job) {
      if (!job) return;
      var nodes = job.nodes;
//      console.log("nodes=", nodes);
      var machines = db.getCollection('machines');

      var joblogs = db.getCollection("joblogs");
      var uuid = genuuid();
      var misc = db.getCollection("misc");      
      misc.getAutoincrementId(
	function(err, joborder) {
	  var joblog = { id:uuid, starttime: nowstr(), jobid:job.id,
			 jobname: job.name,
			 order:joborder,
			 job:job};
	  joblogs.insert(joblog, function(err,doc){});
	  //      console.log("nodes=", nodes);
	  async.each(nodes,
		     function(mid, cb){
		       //		   console.log("async ", mid);		   
		       machines.findOne({id: mid}, function(err, mach){
			 //                     console.log("runtask", mid);
			 runtask(app, db, joblog, job, mach, function() {
			   //		       console.log("finish");
			   cb() });
		       })
		     },
		     function (err) {
		       //		   console.log("async finish");
		       joblogs.update({id:uuid},
				      {$set: {endtime:nowstr()}},
				      function(err,doc){});
		       res.send("OK");		   
		     }
		    );
	}
      );
    });
  });
  app.get('/getjoblogstdout/:id', function (req, res) {
    var joblogid = req.params.id;
    var tasklogs = db.getCollection("tasklogs");
    tasklogs.find({joblogid:joblogid}).sort({"time":1,"order":1}).exec(function(err, docs) {
      if (err) {
	res.send("joblog not found");	
	return;
      }
      console.log("docs=",docs);
      var i = 0;
      var text = [];
      while (i < docs.length) {
	var doc = docs[i];
	if (doc.data && doc.data.type == 'stdout') {
	  text[doc.order] = doc.data.msg;
	}
	i++;
      }
      var txt = text.filter(function(n){ return n != undefined }).join("\n");
//      console.log("text=",txt);
      res.header('Content-Type', 'text/plain;charset=utf-8');
      res.send(txt);
    })
  });
  app.get('/tasklogstdout', function (req, res) {
//    var joblogid = req.params.id;
    var tasklogs = db.getCollection("tasklogs");
    tasklogs.find({}).sort({"time":1,"order":1}).exec(function(err, docs) {
      if (err) {
	res.send("error");
	return;
      }
//      console.log("docs=",docs);
      var i = 0;
      var text = [];
      /*
      while (i < docs.length) {
	var doc = docs[i];
	if (doc.data && doc.data.type == 'stdout') {
	  text[doc.order] = doc.data.msg;
	}
	i++;
	}*/
      while (i < docs.length) {
	var doc = docs[i];
	if (doc.data && doc.data.type == 'stdout') {
//	  console.log(doc, doc.data.msg);	  
	  text.push(moment(doc.data.time).toISOString() + " " + doc.data.worker + " " + doc.data.msg);      	  
	}
	i++;
      }
      var txt = text.filter(function(n){ return n != undefined }).join("<br>\n");
//      console.log("text=",txt);
      res.header('Content-Type', 'text/plain;charset=utf-8');
      res.send(txt);
    })
  });
};

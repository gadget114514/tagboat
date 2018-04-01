var execStream = require("./my-exec-stream");
const miss = require('./clussh/node_modules/mississippi')
var stream = require("stream");
const leazyJsonStream = require('./clussh/lib/leazy-ndjson-stream.js')

function execNode(task, finishcb, options) {
  console.log("exec node");
  if (!options) options = {};
  
  function exec_clussh(config)
  {
    var p = execStream;
    var xs = execStream("/usr/local/bin/clussh", []);
    /*
    var fs = require("fs");
    if (xs.proc) {
      pidFile = fs.createWriteStream("test.txt");
      pidFile.write(JSON.stringify(xs.proc.pid));
      pidFile.end();
    } else {
      fs.writeFileSync("test.txt", xs.proc);
    }*/
    return xs;
  }

  var config ={};
  if (options.config) config = options.config;

  if (!task) {
    var genuuid = require('short-uuid').uuid;    
    var worker = "ssh://share@192.168.116.208/";    
    task = {
      id: genuuid(),
      cmd: "ls",
      worker: worker
    };
  }
  
  if (!options.stdout)
    options.stdout = process.stdout;

  var callback = function (st,data, enc, done) {
    st.write(data);
    done();
  };
  if (options.cb) callback = options.cb;
  
  var bstream = new stream.PassThrough();
  var xs = exec_clussh(config)
  xs.on("end", function() {
    //    if (options.finishcb) options.finishcb();
    console.log("end");
    if (finishcb) {
      var cb = finishcb;
      finishcb = null      ;
      cb();
    }
  });
  bstream.pipe(xs)
    .pipe(miss.through.obj(function (data, enc, done) {
      callback(this,data,enc,done);
    })).pipe(options.stdout);

  if (options.timeout && options.timeout >= 0) {
    setTimeout(function() {
      // you can even pipe after the scheduler has had time to do other things
      //  a.pipe(process.stdout)
      if (xs.proc)
	xs.proc.kill();
    }, options.timeout);
  }

  bstream.write(JSON.stringify(task));
  bstream.end();
  
  return xs;
}

module.exports = execNode;

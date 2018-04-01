var genuuid = require('short-uuid').uuid;

function updatenode(col, n)
{
//  console.log("updatenode", n, col);
  col.find({'name': n.name}, function(err, obj) {
//    console.log("update", err, obj);
    if (obj.length != 0) {
//      console.log("found");
      var o = obj[0];
      n['meta'] = o['meta'];
      n['id'] = o['id'];
      col.update({'name': n.name}, {$set:n}, {}, function(err, count) { console.log("update2", err, count)});
    } else {
      console.log("not found");      
      n.id = genuuid();
      col.insert(n, function(err, newdoc) { console.log("update3", err, newdoc); });
    }
  });
}


module.exports = function (app, db, modelname) {
  return {
    get: function () {
      return new Promise(function (fulfill, reject) {
        try {
          var collection = db.getCollection(modelname);
	  collection.find({}, function(err, docs) {
            fulfill(docs);
	  });
        } catch (ex) {
          reject(ex);
        }
      });
    },
    getWith: function (query) {
      var _page = parseInt(query['_page']);
      var _perPage = parseInt(query['_perPage']);
      var _sortDir = query['_sortDir'];
      var _sortField = query['_sortField'];
      var _filter =  query['_filters'];
//      console.log("getWith", query);
      return new Promise(function (fulfill, reject) {
        try {
	  var sortdir = (_sortDir == "DESC" ? -1:1);
          var collection = db.getCollection(modelname);
	  collection.count({}, function(eerr, count) {
	    var sortcond = {};
	    sortcond[_sortField] = sortdir;
	    sortcond["order"] = 1;
	    var cond = {};
	    if (_filter)
	      cond = JSON.parse(_filter);
//	    console.log("search", cond, sortcond, _perPage, _page);
	    collection.find(cond).sort(sortcond).skip(_perPage*(_page-1)).limit(_perPage).exec(function(err, docs) {
	      docs.totalCount = count;
              fulfill(docs);
	    });
	  });
        } catch (ex) {
          reject(ex);
        }
      });
    },
    getById: function (id) {
      return new Promise(function (fulfill, reject) {
        try {
          var collection = db.getCollection(modelname);
          var emp = collection.findOne({id: id }, function(err,doc) {
            fulfill(doc);
	  });
        } catch (ex) {
          reject(ex);
        }
      });

    },
    putById: function (id, emp) {
      return new Promise(function (fulfill, reject) {
        try {
          var collection = db.getCollection(modelname);
	  emp.id = id;
	  updatenode(collection, emp)		
          db.saveDatabase();
          fulfill(emp);
        } catch (ex) {
          reject(ex);
        }
      });

    },
    post: function (emp) {
      return new Promise(function (fulfill, reject) {
        try {
          var collection = db.getCollection(modelname);
//	  console.log("post=", emp);
	  emp.id = genuuid();
          collection.insert(emp, function(err, doc) {
            db.saveDatabase();
            fulfill(doc);
	  });
        } catch (ex) {
          reject(ex);
        }
      });
    },
    delete: function () {
      return new Promise(function (fulfill, reject) {
        try {
          var collection = db.getCollection(modelname);
          collection.remove({id: req.params.id});
          db.saveDatabase();
          fulfill(collection);
        } catch (ex) {
          reject(ex);
        }
      });
    }
  }
};

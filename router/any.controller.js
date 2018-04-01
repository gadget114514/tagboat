module.exports = function (app, db, modelname) {
  var empService = require("../any.service")(app, db, modelname);

  app.get('/' + modelname, function (req, res) {
//    console.log(req);
    var _page = req.query['_page'];
    var _perPage = req.query['_perPage'];
    var _sortDir = req.query['_sortDir'];
    var _sortField = req.query['_sortField'];
    if (_page && _perPage && _sortDir && _sortField) {
      empService.getWith(req.query).then(function (obj) {
//	console.log("get", obj);
	if (obj.totalCount) {
          res.setHeader("X-Total-Count", obj.totalCount);
	  obj.totalCount = undefined;
	}
	res.send(obj);
      });
    } else {
      empService.get().then(function (obj) {
//	console.log("get", obj);
	res.send(obj);
      });
    }
  });
  
  app.get('/' + modelname + '/:id', function (req, res) {
        empService.getById(req.params.id).then(function (obj) {
            res.send(obj);
        });
    });
    app.put('/' + modelname + '/:id', function (req, res) {
      var emp = req.body;
//      console.log(emp);
      empService.putById(req.params.id, emp).then(function (obj) {
            res.send(obj);
        });
    });
    app.post('/' + modelname, function (req, res) {
      var emp = req.body;
//      console.log(emp);
        empService.post(emp).then(function (obj) {
            res.send(obj.data);
        });
    });
    app.delete('/' + modelname + '/:id', function (req, res) {
        empService.getById(req.params.id).then(function (obj) {
            res.send(obj.data);
        });
    });
};

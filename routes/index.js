var express = require('express');
var router = express.Router();
var fs = require('fs');
var jsonfile = require('jsonfile')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'NER Tagger' });
});

router.get('/list', function(req, res, next) {
	var myJsonString = ""
	fs.readdir('data/raw', function(err, items) {
		myJsonString = JSON.stringify(items);
		res.json({data: myJsonString});	
	});
  	
});

router.post('/save', function(req, res, next) {
	fileName = req.body.name;
	data = req.body.data;
	jsonfile.writeFile("data/ann/"+fileName+".json", data, function (err) {
		if(err == null){
			res.json({"data": "success"});
		}
		else{
  			res.json({"data": "error"});
  		}
	});

});

module.exports = router;

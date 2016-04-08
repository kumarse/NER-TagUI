var express = require('express');
var router = express.Router();
var fs = require('fs');

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


module.exports = router;

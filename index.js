var express = require('express');
var path = require('path');
var uuid = require('uuidv4');
var router = express.Router();

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/uploader', function (req, res) {
  var fs = require('fs');
  console.log(req.body, req.files);
  var orifilename = req.files.upload.name;
  var srvfilename = uuid() + path.extname(orifilename);
  var newPath = __dirname + '/../public/uploads/' + srvfilename;
  fs.writeFile(newPath, req.files.upload.data, function (err) {
    if (err) console.log({ err: err });
    else {
      html = "{\"filename\" : \"" + orifilename + "\", \"uploaded\" : 1, \"url\": \"/uploads/" + srvfilename + "\"}"
      console.log(html)
      res.send(html);
    }
  });
});

module.exports = router;

require("dotenv").config();
let http = require('http');
let express = require('express');
var bodyParser = require('body-parser');
const axios = require('axios');
// express 외장 모듈을 이용하여 app 객체 생성
let app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const fileUpload = require('express-fileupload');
app.use(fileUpload()); // Don't forget this line!

app.set('port', 3000);

//app 객체 이용하여 서버객체 생성
let server = http.createServer(app).listen(app.get('port'), ()=>{
    console.log('app객체 이용해 express 이용 서버 실행');

    //DB 연결 및 기본 설정 관련 함수
    connectDB();
});

//view 엔진 설정
//view 템플릿의 위치 설정
app.set('views',__dirname+'/views');

//view엔진 설정, ejs, pug, ......
app.set('view engine','ejs');
console.log('뷰 엔진을 ejs로 설정함');

// mysql 연결 코드 구성
let mysql = require('mysql');
let pool = null;
function connectDB() {
    pool = mysql.createPool({
        connectionLimit:10,
        host : 'localhost',
        user:'root',
        port : process.env.SQL_PORT || 3307,
        password:'111111',
        database:'nodedb'
    });
    if (pool != null){
        console.log("createPool 성공");
        //pool 객체를 다른 모듈에서 사용하기 위해서
        //'pool' 이름으로 객체를 저장함
        //app.get('pool')로 사용가능하다.
        app.set('pool', pool);
    }
}

//미들웨어에서 post 방식 전송데이터 처리
//application/x-www-form-urlencoded
app.use(express.urlencoded());
// application/json
app.use(express.json());

// 미들웨어에서 특정폴더를 url로 접근위한 처리
let static = require('serve-static');
let path = require('path');

// 현재폴더(__dirname) + public 폴더
let pathName = path.join(__dirname, 'public')
console.log(`path : ${pathName}`)

//localhost:3000/public/login.html 로 public 폴더 접근
app.use('/public', static(pathName));

//localhost:3000/login.html 로 접근
app.use(static(pathName));

// router 설정
let router = express.Router();

// 매우 중요 '/'가 들어오면 객체 연결
app.use('/', router);

// 외부 모듈을 사용해 라우터 구현
//---> 사용자 로그인 라우터 처리
let map = require('./routes/mapRoutes.js');

//라우터 외부 모듈 호출 부분
//전체 글 목록 보기 라우터 처리
router.route('/process/favoriteMapProc').all(map.favoriteMapProc);
router.route('/process/favoriteUpdateMap').all(map.favoriteUpdateMap);
router.route('/process/favoriteUpdateMapProc').all(map.favoriteUpdateMapProc);
router.route('/process/favoriteDetailMap').all(map.favoriteDetailMap);
router.route('/process/favoriteDelete').all(map.favoriteDelete);
router.route('/process/insertNew').all(map.insertNew);


router.route('/process/loginMap').all(map.loginMap);
router.route('/process/loginCallbackMap').all(map.loginCallbackMap);

router.route('/process/imgUpload').all(map.imgUpload);
router.route('/process/getMapProc').all(map.getMapProc);

app.all('*', (req, res)=>{
    console.log('err 처리');
    res.status(404).send('요청한 페이지 못찾지롱 404나 먹어라 뿡');
});
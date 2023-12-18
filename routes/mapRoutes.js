const { application } = require('express');
var request = require('request');
let client_id = process.env.login_id
let client_secret = process.env.login_secret
var state = "RAMDOM_STATE";
var redirectURI = encodeURI("http://localhost:3000/process/loginCallbackMap");
var api_url = "";
let path = require('path');
var { v4 } = require('uuid');
const uuid = () => {
    const tokens = v4().split('-')
    return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4];
}

// 로그인 페이지
let loginMap = (req, res) => {
    console.log('loginMap() 처리 중');
    let pool = req.app.get('pool');

    pool.getConnection((err,conn)=> {
        if(err){
            console.log(`getConnection() err ${err}`);
            if(conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection() success');

        api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectURI + '&state=' + state;
        let context = {client_id:process.env.login_id, client_secret:process.env.login_secret, api_url:api_url}
        res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
        req.app.render('mainMap', context, (err, html)=> {
            if(err){
                res.send(`render err ${err}`);
            }
            res.end(html);
        })
    })
}

// 로그인 콜백
let loginCallbackMap = (req, res) =>{
    code = req.query.code;
    state = req.query.state;
    api_url = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id='
     + client_id + '&client_secret=' + client_secret + '&redirect_uri=' + redirectURI + '&code=' + code + '&state=' + state;
    
    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
     };

    request.get(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
        var token = JSON.parse(body).access_token;
        console.log("loginMemberMap");
        // res.end(body);
        loginMemberMap(req, res,token);
        
      } else {
        res.status(response.statusCode).end();
        console.log('error = ' + response.statusCode);
      }
    });
}

// 멤버 확인
let loginMemberMap = (req, res, token) =>{
    var header = "Bearer " + token; // Bearer 다음에 공백 추가
    
     var api_url = 'https://openapi.naver.com/v1/nid/me';
     var options = {
         url: api_url,
         headers: {'Authorization': header}
      };
      
     request.get(options, function (error, response, body) {
        
        if (!error && response.statusCode == 200) {
         res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
         
         console.log(`id : ${JSON.parse(body).response.id}`);
         res.end(body);
       } else {
         console.log('error');
         if(response != null) {
           res.status(response.statusCode).end();
           console.log('error = ' + response.statusCode);
         }
       }
     });
}


// 주소 가져오기
let getMapProc =  (req, res) => {

    let inputVal = req.body.inputVal;
    let m_api_url = "";
    let k_api_url = "";
    let length = 0;
    let tempArray = [];
    let addrX = [];
    let addrY = [];
    var fSubway = {};
    let fFood;
    let fPlace;
    let fDirection = [];

    if (typeof inputVal === "string") {
        tempArray.push( inputVal );
    }else if(typeof inputVal === "object"){
        tempArray = tempArray.concat(inputVal);
    }
    console.log(length);
    console.log(`getMapProc() ==> ${inputVal}`);
    console.log(`getMapProc() ==> ${inputVal.length}`);
    console.log(process.env.map_id);
    console.log(process.env.map_secret);
    
    console.log('getMapProc() --> ');
    let pool = req.app.get('pool');
    pool.getConnection((err, conn)=>{
        if(err){
            console.log(`getConnection() err : ${err}`);
            if(conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection() success');

        let cnt = 0;
        let count = 0;
        let lox = 0;
        let loy = 0;
        for (let i=0; i< tempArray.length; i++){
            m_api_url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURI(tempArray[i])}`;
            var options = {
                url: m_api_url,
                headers: {'X-NCP-APIGW-API-KEY-ID':process.env.map_id, 'X-NCP-APIGW-API-KEY': process.env.map_secret}
             };
            request.get(options, async function (error, response, body) {
                count ++ ;
                
                if (!error && response.statusCode == 200) {
                //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
                try {
                    addrX.push(JSON.parse(body).addresses[0].x);
                    addrY.push(JSON.parse(body).addresses[0].y);
                    lox += Number(JSON.parse(body).addresses[0].x);
                    loy += Number(JSON.parse(body).addresses[0].y);
                    cnt ++;
                } catch (error) {
                
                }
                 // res.end(JSON.parse(body).addresses);
                //   console.log(`y : ${JSON.parse(body).addresses}`);
                } else {
                  console.log('error');
                  if(response != null) {
                    res.status(response.statusCode).end();
                    console.log('error = ' + response.statusCode);
                  }
                }
                if (tempArray.length <= count) {
                    lox = lox/cnt;
                    loy = loy/cnt;
                    console.log(`${lox},${loy}`);
                    fSubway = await findSubway(lox, loy);

                    fFood = await findFood(lox,loy);

                    fPlace = await findPlay(lox,loy);

                    for (i=0; i < tempArray.length; i++){
                        fDirection.push(await findDirection(lox, loy, addrX, addrY, i));
                    }


                    let context = {inputVal : tempArray, 'fSubway' : fSubway, 'fFood' : fFood, 'fPlace' : fPlace, 'fDirection' : fDirection };
                    req.app.render('resultMap', context, (err, html)=> {
                        if(err){
                            res.send(`render() err : ${err}`);
                            return;
                        }
                        console.log('render() success');
                        // console.log(html);
                        res.end(html);
                    });
                }
            });
        }    
    })
}

// 함수랑 메서드 = 동사, 변수 = 명사
// 지하철 역 찾기
let findSubway = (lox, loy) => {
    return new Promise (function (resolve, reject) {
        let k_api_url = `https://dapi.kakao.com/v2/local/search/category.json?category\_group\_code=SW8&x=${lox}&y=${loy}&radius=1000`;
        var options = {
            url: k_api_url,
            headers: {Authorization: `KakaoAK ${process.env.k_key}`}
        };

        request.get(options, function (error, response, body) {
            
            if (!error && response.statusCode == 200) {
            //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
                try {
                    let ssub = {name : JSON.parse(body).documents[0].place_name, x : JSON.parse(body).documents[0].x, y : JSON.parse(body).documents[0].y}
                    resolve(ssub);
                } catch (error) {
                    
                }
            } else {
            console.log('error');
            if(response != null) {
                res.status(response.statusCode).end();
                console.log('error = ' + response.statusCode);
            }
            }
        });
    });
}

// 지하철 역 근처 맛집
let findFood = (lox, loy) => {
    return new Promise (function (resolve, reject) {
        let place_name = [];
        let road_address_name = [];
        let phone = [];
        let place_url = [];
        let hotFood = {};
        let k_api_url = `https://dapi.kakao.com/v2/local/search/category.json?category\_group\_code=FD6&x=${lox}&y=${loy}&radius=1000`;
        var options = {
            url: k_api_url,
            headers: {Authorization: `KakaoAK ${process.env.k_key}`}
        };
    
        request.get(options, function (error, response, body) {
            
            if (!error && response.statusCode == 200) {
            //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
                try {
                    console.log('food=====>')
                    // console.log(body);
                    for (i=0; i <(JSON.parse(body).documents.length >= 10 ? 10 : JSON.parse(body).documents.length); i++){
                        place_name.push(JSON.parse(body).documents[i].place_name);
                        road_address_name.push(JSON.parse(body).documents[i].road_address_name);
                        phone.push(JSON.parse(body).documents[i].phone);
                        place_url.push(JSON.parse(body).documents[i].place_url);
                    }
                    hotFood = {pName : place_name, rName : road_address_name, phone : phone, pUrl : place_url};
                    
                    resolve(hotFood);

                } catch (error) {
                
                }
            } else {
              console.log('error');
              if(response != null) {
                res.status(response.statusCode).end();
                console.log('error = ' + response.statusCode);
              }
            }
        });
    });
}

// 지하철 역 근처 놀거리
let findPlay = (lox, loy) => {
    return new Promise (function (resolve, reject) {
        let place_name = [];
        let road_address_name = [];
        let phone = [];
        let place_url = [];
        let hotPlace = {};
        let k_api_url = `https://dapi.kakao.com/v2/local/search/category.json?category\_group\_code=CT1&x=${lox}&y=${loy}&radius=1000`;
        var options = {
            url: k_api_url,
            headers: {Authorization: `KakaoAK ${process.env.k_key}`}
        };

        request.get(options, function (error, response, body) {
            
            if (!error && response.statusCode == 200) {
            //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
                try {
                    console.log('play=======>');
                    for (i=0; i <(JSON.parse(body).documents.length >= 10 ? 10 : JSON.parse(body).documents.length); i++){
                        place_name.push(JSON.parse(body).documents[i].place_name);
                        road_address_name.push(JSON.parse(body).documents[i].road_address_name);
                        phone.push(JSON.parse(body).documents[i].phone);
                        place_url.push(JSON.parse(body).documents[i].place_url);
                    }
                    hotPlace = {pName : place_name, rName : road_address_name, phone : phone, pUrl : place_url};
                    
                    resolve(hotPlace);
                } catch (error) {
                }
            } else {
            console.log('error');
            if(response != null) {
                res.status(response.statusCode).end();
                console.log('error = ' + response.statusCode);
            }
            }
        });
    });
}

// 지하철 역까지의 거리 (사용자 별)
let findDirection = (lox, loy, addrX, addrY, i) => {
    return new Promise (function (resolve, reject) {
        let totalTime = "";
        let mode = [];
        let s_name = [];
        let e_name = [];
        let route = [];
        let allDirection = {};
        const headerInfo = {
            accept: 'application/json',
            'content-type': 'application/json',
            appKey: 'e8wHh2tya84M88aReEpXCa5XTQf3xgo01aZG39k5'
        };
    
        const option = {
            url : "https://apis.openapi.sk.com/transit/routes"
            ,headers : headerInfo
            ,body : JSON.stringify({
                startX: addrX[i],
                startY: addrY[i],
                endX: lox,
                endY: loy,
                format: 'json',
                count: 1,
                searchDttm: '202301011200'
            })
        }
    
        request.post(option, function(error, response, body){
            if (!error && response.statusCode == 200) {
                //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
                    try {
                        console.log('direction======>');
                        for (i=0; i <JSON.parse(body).metaData.plan.itineraries[0].legs.length; i++){
                            mode.push(JSON.parse(body).metaData.plan.itineraries[0].legs[i].mode);
                            s_name.push(JSON.parse(body).metaData.plan.itineraries[0].legs[i].start.name);
                            e_name.push(JSON.parse(body).metaData.plan.itineraries[0].legs[i].end.name);
                            if (JSON.parse(body).metaData.plan.itineraries[0].legs[i].route === undefined) {
                                route.push("");
                            }else {
                                route.push(JSON.parse(body).metaData.plan.itineraries[0].legs[i].route);
                            }
                        }
                        console.log(route);
                        totalTime = JSON.parse(body).metaData.plan.itineraries[0].totalTime;

                        allDirection = {tTime : totalTime, mode : mode, sName : s_name, eName : e_name, route:route};
                        
                        resolve(allDirection);
                    } catch (error) {
                    }
                } else {
                console.log('error');
                if(response != null) {
                    res.status(response.statusCode).end();
                    console.log('error = ' + response.statusCode);
                }
            }

        } )
    });
}



// 즐겨찾기 전체 확인
let favoriteMapProc = (req, res) => {
    console.log('favoriteMapProc() --> ');
    let pool = req.app.get('pool');
    pool.getConnection((err, conn)=>{
        if(err){
            console.log(`getConnection() err : ${err}`);
            if(conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection() success');

        conn.query('select * from favorites', (err, results)=> {
            if(err){
                console.log(`query() err : ${err}`);
                return;
            }
            console.log('query() success');
            if(results.length > 0){
                console.log('ejs view template --> ');
                let context = {favoriteList : results};
                console.log(context);
                req.app.render('favoriteMap', context, (err, html)=> {
                    if(err){
                        res.send(`render() err : ${err}`);
                        return;
                    }
                    console.log('render() success');
                    // console.log(html);
                    res.end(html);
                });
            }
            else {
                res.send('no data');
            }
        })
    })
}

// 즐겨찾기 하나 확인
let favoriteDetailMap = (req, res) => {
    console.log('favoriteDetailMap() --> ');
    let num = req.body.num || req.query.num;
    let pool = req.app.get('pool');
    pool.getConnection((err, conn)=>{
        if(err){
            console.log(`getConnection() err : ${err}`);
            if(conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection() success');

        conn.query('select * from favorites where num=?',[num], (err, results)=> {
            if(err){
                console.log(`query() err : ${err}`);
                return;
            }
            console.log('query() success');
            if(results.length > 0){
                console.log('ejs view template --> ');
                let context = {favoriteList : results};
                console.log(context);
                req.app.render('favoriteDetail', context, (err, html)=> {
                    if(err){
                        res.send(`render() err : ${err}`);
                        return;
                    }
                    console.log('render() success');
                    // console.log(html);
                    res.end(html);
                });
            }
            else {
                res.send('no data');
            }
        })
    })
}

// 즐겨찾기 추가
let insertNew = (req, res) => {
    console.log("process/insertNew 처리중");

    let location = req.body.pName || req.query.pName;
    let address = req.body.rName || req.query.rName;

    // db 연결 처리
    let pool = req.app.get('pool');

    pool.getConnection((err, conn)=> {
        if(err){
            console.log(`getConnection err ${err}`);
            if(conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection() 연결 성공');
        let data = {location:location, address:address};
        conn.query('insert into favorites set ?', data, (err,results)=>{
            if(err){
                console.log(`query err ${err}`);
                return;
            }
            console.log('query success');
            if (results){
                // 새로운 데이터가 추가된 리스트 보여주기
                res.redirect('/process/favoriteMapProc');
            }
            else {
                res.send('Failed to add new data');
            }
        })
    })
}

// 즐겨찾기 수정
let favoriteUpdateMap = (req, res) => {
    console.log('favoriteUpdate() --> ');
    let num = req.body.num || req.query.num;
    let pool = req.app.get('pool');
    pool.getConnection((err, conn)=>{
        if(err){
            console.log(`getConnection() err : ${err}`);
            if(conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection() success');

        conn.query('select * from favorites where num=?',[num], (err, results)=> {
            if(err){
                console.log(`query() err : ${err}`);
                return;
            }
            console.log('query() success');
            if(results.length > 0){
                console.log('ejs view template --> ');
                let context = {favoriteList : results };
                console.log(context);
                req.app.render('favoriteUpdateMap', context, (err, html)=> {
                    if(err){
                        res.send(`render() err : ${err}`);
                        return;
                    }
                    console.log('render() success');
                    // console.log(html);
                    res.end(html);
                });
            }
            else {
                res.send('no data');
            }
        })
    })
}

let favoriteUpdateMapProc = (req, res) => {
    console.log('modifyBoardProc 처리 중');
    let num = req.body.num || req.query.num;
    let location = req.body.location || req.query.location;
    let address = req.body.address || req.query.address;
    let content = req.body.content || req.query.content;

    console.log(`n : ${num}, l :${location}, a :${address}, c : ${content}`);

    let pool = req.app.get('pool');
    pool.getConnection((err,conn) => {
        if(err){
            console.log(`getConnection err ${err}`);
            if (conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection success');
        conn.query('update favorites set content=? where num=?', [content, num], (err,results)=> {
            if(err) {
                console.log(`query err ${err}`);
                return;
            }
            console.log('query success');
            if(results){
                res.redirect('/process/favoriteMapProc');
            }
            else {
                res.send('Failed to modify data');
            }
        });
        
    })

}

// img upload
let imgUpload = (req, res) => {
    // 이미지 업로드
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
}

// delete
let favoriteDelete = (req, res) => {
    console.log(' favoriteDelete 처리 중');
    let num = req.body.num || req.query.num;

    console.log(`n : ${num}`);

    let pool = req.app.get('pool');
    pool.getConnection((err,conn) => {
        if(err){
            console.log(`getConnection err ${err}`);
            if (conn){
                conn.release();
            }
            return;
        }
        console.log('getConnection success');
        conn.query('delete from favorites where num=?', [num], (err,results)=> {
            if(err) {
                console.log(`query err ${err}`);
                return;
            }
            console.log('query success');
            if(results){
                res.redirect('/process/favoriteMapProc');
            }
            else {
                res.send('Failed to delete data');
            }
        });
        
    })
}

// 로그인
module.exports.loginMap = loginMap;
module.exports.loginCallbackMap = loginCallbackMap;
module.exports.loginMemberMap = loginMemberMap;

// 지도
module.exports.getMapProc = getMapProc;

// 즐겨찾기
module.exports.favoriteMapProc = favoriteMapProc;
module.exports.favoriteUpdateMap = favoriteUpdateMap;
module.exports.favoriteUpdateMapProc = favoriteUpdateMapProc;
module.exports.favoriteDetailMap = favoriteDetailMap;
module.exports.imgUpload = imgUpload;
module.exports.favoriteDelete = favoriteDelete;
module.exports.insertNew = insertNew;

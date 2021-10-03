const { render } = require('@testing-library/react');
const { Console } = require('console');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});

const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://Radu:masina123@chessdb.vifvf.mongodb.net/login?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// link ID1 and linkID2 offer the id from an existing room
var linkID1 = {};
var linkID2 = {};
var gameInfo = {};
var id = '';
var adresa = '';
var history;
// waiting room for players
var jucatori = [ [], [], [], [], [], [], [], [], [], [], [], [] ];
var cod;
var roomInfo = {};
var timpID1 = {};
var timpID2 = {};
io.on('connection', (socket) => {
  socket.on('newUser', (userInformation) =>{
    client.connect(err => {
      const db = client.db("Users").collection("UEP");
      db.insertOne(
        { "Username" : userInformation.username,
          "Email": userInformation.email,
          "Password": userInformation.password
        }
      );
      // perform actions on the collection object
    });
  });
  socket.on('link', (cod) => {
    timpID1[cod] = 0;
    timpID2[cod] = 0;
    socket.join(cod);
    var room = io.sockets.adapter.rooms.get(cod).size;
    var ids = io.sockets.adapter.rooms.get(cod);//.has(linkID1[cod])
    console.log(ids);
    if(socket.id == linkID1[cod]){
      io.to(linkID1[cod]).emit('link', {info: gameInfo[cod], youAre: 'p1'});
    }
    if(socket.id == linkID2[cod]){
      io.to(linkID2[cod]).emit('link', {info: gameInfo[cod], youAre: 'p2'});
    }
    if(socket.id != linkID1[cod] && socket.id != linkID2[cod]){
     //checking who LEFT
     if(!io.sockets.adapter.rooms.get(cod).has(linkID1[cod])){
        linkID1[cod] = socket.id;
        io.to(linkID1[cod]).emit('roomInformation', {info: roomInfo[cod], youAre: gameInfo[cod].player1});
     }
     if(!io.sockets.adapter.rooms.get(cod).has(linkID2[cod])){
        linkID2[cod] = socket.id;
        io.to(linkID2[cod]).emit('roomInformation', {info: roomInfo[cod], youAre: gameInfo[cod].player2});
     }
    }
  });
  socket.on('mutarecod', (link) => {
    adresa = link;
  });
  socket.on('mutare', (info) => {
    var room = io.sockets.adapter.rooms.get(adresa).size;
    roomInfo[adresa] = info;
    if(socket.id == linkID1[adresa] && room == 2)
    io.to(linkID2[adresa]).emit('mutare', info);
    if(socket.id == linkID2[adresa] && room == 2)
    io.to(linkID1[adresa]).emit('mutare', info);
  });
  socket.on('timer', (miliseconds) => {
    if(socket.id == linkID1[adresa]){
    timpID2[adresa] = miliseconds;
    console.log("albul are in plus " + miliseconds);
    //porneste timer ul negrului, deci timpID1 este plusul de la timpul negrului
    io.to(linkID1[adresa]).emit('timer', {time : timpID1[adresa], firstop: true});
    io.to(linkID2[adresa]).emit('timer', {time : timpID1[adresa], firstop: false});
    }else{
      //porneste timer ul albului, deci timpID2 este plusul de la timpul albului
      console.log("negrul are in plus " + miliseconds);
      timpID1[adresa] = miliseconds;
      io.to(linkID1[adresa]).emit('timer', {time : timpID2[adresa], firstop: false});
      io.to(linkID2[adresa]).emit('timer', {time : timpID2[adresa], firstop: true});
    }
  })
  socket.on('history', (data) =>{
    adresa = data.link;
    history = data.archive;
    if(linkID1[adresa] == socket.id){
      io.to(linkID2[adresa]).emit('history', history);
    }
    if(linkID2[adresa] == socket.id){
      io.to(linkID1[adresa]).emit('history', history);
    }
  });
  //searching for potential opponent
  socket.on('cautare', (gameInformation) =>{
    id2 = socket.id;
    var id1 = 'da';
    var color = gameInformation.color;
    var time = gameInformation.time;
    var gameType = whatGame(color, time);
    var foundOpponent = false;
    //find out the color
    if(gameType < 4){
      //if player is random color, look for random, white, or black color opponent of the same time
        //looking for random color opponent
        if(jucatori[gameType].length > 0)     
          foundOpponent = true, id1 = jucatori[gameType].shift(), joinGame(id1, id2, gameType, 'r', 'r');  //get both ids and redirect them to the game, same for next 2 ifs
        //looking for white color opponent
        if(jucatori[gameType + 4].length > 0)
          foundOpponent = true, id1 = jucatori[gameType + 4].shift(), joinGame(id1, id2, gameType, 'w', 'b');
        //looking for black color opponent
        if(jucatori[gameType + 8]. length > 0)
          foundOpponent = true, id1 = jucatori[gameType + 8].shift(), joinGame(id1, id2, gameType, 'b', 'w');
      }else{
        //if player is white, look for white or random opponent of the same time
        if(gameType < 8){
          //looking for random color opponent
          if(jucatori[gameType - 4].length > 0)     
            foundOpponent = true, id1 = jucatori[gameType - 4].shift(), joinGame(id1, id2, gameType, 'b', 'w');  //get both ids and redirect them to the game, same for next if
          //looking for black color opponent
          if(jucatori[gameType + 4].length > 0)
            foundOpponent = true, id1 = jucatori[gameType + 4].shift(), joinGame(id1, id2, gameType, 'b', 'w');
        //if player is black, look for white or random opponent of the same time
        }else{
          //looking for white color opponent
          if(jucatori[gameType - 4].length > 0)     
            foundOpponent = true, id1 = jucatori[gameType - 4].shift(), joinGame(id1, id2, gameType, 'w', 'b');  //get both ids and redirect them to the game, same for next if
          //looking for random color opponent
          if(jucatori[gameType - 8].length > 0)     
            foundOpponent = true, id1 = jucatori[gameType - 8].shift(), joinGame(id1, id2, gameType, 'w', 'b'); 
        }
      }
      if(foundOpponent == false){
        jucatori[gameType].push(id2);
      }
  });
});
function joinGame(id1, id2, timeFormat, colorPlayer1, colorPlayer2){
  cod = genereaza();
  linkID1[cod] = id1;
  linkID2[cod] = id2;
  if(colorPlayer1 == 'r' && colorPlayer2 == 'r'){
    var colors = transformRandom(colorPlayer1, colorPlayer2);
    colorPlayer1 = colors[0];
    colorPlayer2 = colors[1];
  }
  colorPlayer1 = colorString(colorPlayer1);
  colorPlayer2 = colorString(colorPlayer2);
  console.log(timeFormat);
  var time = changeFormat(timeFormat);
  gameInfo[cod] = {player1: colorPlayer1, player2: colorPlayer2, time: time}
  io.to(id1).emit('gasit', cod);
  io.to(id2).emit('gasit', cod);
  //console.log(id1);
  //console.log(id2);
}
function transformRandom(color1, color2){
  var decider = Math.random();
  var colors = [];
  if(decider < 0.5){
    color1 = 'w'; color2 = 'b'; colors[0] = color1; colors[1] = color2; return colors;
  }
  if(decider > 0.5){
    color1 = 'b'; color2 = 'w'; colors[0] = color1; colors[1] = color2; return colors;
  }
}
function colorString(colorPlayer){
  if(colorPlayer == 'w'){
    colorPlayer = 'white';
  }
  if(colorPlayer == 'b'){
    colorPlayer = 'black';
  }
  return colorPlayer;
}
function changeFormat(timeFormat){
  var time;
  if(timeFormat % 4 == 0){
    time = 1; return time;
  }
  if(timeFormat % 4 == 1){
    time = 5; return time;
  }
  if(timeFormat % 4 == 2){
    time = 10; return time;
  }
  if(timeFormat % 4 == 3){
    time = 30; return time;
  }
}
function whatGame(color, time){
  var number;
  if(color == 'r'){
    if(time == '1'){
      number = 0; return number;
    }
    if(time == '5'){
      number = 1; return number;
    }
    if(time == '10'){
      number = 2; return number;
    }
    if(time == '30'){
      number = 3; return number;
    }
  }else{
    if(color == 'w'){
      if(time == '1'){
        number = 4; return number;
      }
      if(time == '5'){
        number = 5; return number;
      }
      if(time == '10'){
        number = 6; return number;
      }
      if(time == '30'){
        number = 7; return number;
      }
    }else{
      if(time == '1'){
        number = 8; return number;
      }
      if(time == '5'){
        number = 9; return number;
      }
      if(time == '10'){
        number = 10; return number;
      }
      if(time == '30'){
        number = 11; return number;
      }
    }
  }
}
function genereaza() {
  var link1 = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 1; i <= 10; i++) {
    link1 += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return link1;
}
server.listen(4000, () => {
  console.log('listening on *:4000');
});
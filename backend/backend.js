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

  //NOTE: Web Workers wrap the response in an object.
var linkID1 = {};
var linkID2 = {};
var id = '';
var adresa = '';
var history;
var jucatori = [ [], [], [], [], [], [], [], [], [], [], [], [] ];
var cod;
var tot = {};
var timpID1 = {};
var timpID2 = {};
io.on('connection', (socket) => {
  var ip = socket.conn.remoteAddress;
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
    id = socket.id;
    var room = io.sockets.adapter.rooms.get(cod).size;
    if(!(cod in linkID1)){
      linkID1[cod] = id;
    }
    if(!(cod in linkID2) && room == 2){
      linkID2[cod] = id;
      if(cod in tot)
      io.to(linkID2[cod]).emit('mutare', tot[cod]);
    }
    if(room == 2 && (id == linkID1[cod] || id == linkID2[cod])){
      var culoare = 'negru';
      io.to(linkID1[cod]).emit('link', cod);
      io.to(linkID2[cod]).emit('link', cod);
      io.to(linkID2[cod]).emit('link', culoare);
    }

    if( room < 3 && id != linkID1[cod] && id != linkID2[cod]){
      var once = 1;
      if(!io.sockets.adapter.rooms.get(cod).has(linkID1[cod])){
        linkID1[cod] = id;
        io.to(linkID1[cod]).emit('tabla', tot[cod]);
        once = 0;
      }
      if(!io.sockets.adapter.rooms.get(cod).has(linkID2[cod]) && once == 1){
        var culoare = 'negru';
        linkID2[cod] = id;
        io.to(linkID2[cod]).emit('link', culoare);
        io.to(linkID2[cod]).emit('tabla', tot[cod]);
      }
    }
  });
  socket.on('mutarecod', (link) => {
    adresa = link;
  });
  socket.on('mutare', (move) => {
    var room = io.sockets.adapter.rooms.get(adresa).size;
    tot[adresa] = move;
    if(socket.id == linkID1[adresa] && room == 2)
    io.to(linkID2[adresa]).emit('mutare', move);
    if(socket.id == linkID2[adresa] && room == 2)
    io.to(linkID1[adresa]).emit('mutare', move);
  });
  socket.on('timer', (miliseconds) => {
    if(socket.id == linkID1[adresa]){
    timpID1[adresa] = miliseconds;
    console.log("albul are in plus " + miliseconds);
    //porneste timer ul negrului, deci timpID1 este plusul de la timpul negrului
    io.to(linkID1[adresa]).emit('timer', {time : timpID2[adresa], firstop: true});
    io.to(linkID2[adresa]).emit('timer', {time : timpID2[adresa], firstop: false});
    }else{
      //porneste timer ul albului, deci timpID2 este plusul de la timpul albului
      console.log("negrul are in plus " + miliseconds);
      timpID2[adresa] = miliseconds;
      io.to(linkID1[adresa]).emit('timer', {time : timpID1[adresa], firstop: false});
      io.to(linkID2[adresa]).emit('timer', {time : timpID1[adresa], firstop: true});
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
    id1 = socket.id;
    var id2;
    var color = gameInformation.color;
    var time = gameInformation.time;
    var gameType = whatGame(color, time);
    if(jucatori[gameType].length == 0){
      jucatori[gameType].push(id1);
      console.log('a intrat primul');
    }else{
      id2 = jucatori[gameType].shift();
      cod = genereaza();
      linkID1[cod] = id1;
      linkID2[cod] = id2;
      console.log('a intrat al doilea');
      io.to(id1).emit('gasit', cod);
      io.to(id2).emit('gasit', cod);
    }
  });
});
server.listen(4000, () => {
  console.log('listening on *:4000');
});
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
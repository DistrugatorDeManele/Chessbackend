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
var linkID1 = {};
var linkID2 = {};
var id = '';
var adresa = '';
var history;
var jucatori = [];
var cod;
var tot = {};
io.on('connection', (socket) => {
  socket.on('link', (cod) => {
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
    console.log(linkID1[cod]);
    console.log(linkID2[cod]);
    console.log(room);
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
  socket.on('cautare', (nimic) =>{
    id1 = socket.id;
    if(jucatori.length == 0){
      jucatori.push(id1);
    }else{
      var id2 = jucatori.shift();
      cod = genereaza();
      linkID1[cod] = id1;
      linkID2[cod] = id2;
      io.to(id1).emit('gasit', cod);
      io.to(id2).emit('gasit', cod);
    }
  });
});
server.listen(4000, () => {
  console.log('listening on *:4000');
});
function genereaza() {
  var link1 = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 1; i <= 10; i++) {
    link1 += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return link1;
}
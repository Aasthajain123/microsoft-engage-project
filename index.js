const express = require('express');
const app = express();
const server = require('http').Server(app);
const path = require('path'); 
const { v4: uuidv4 } = require('uuid');
const io = require('socket.io')(server);
const PORT = process.env.PORT || 3030;
// Peer
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
// server side realtime database 
const admin = require('firebase-admin');
var serviceAccount = require('./engage-project-9d8d3-firebase-adminsdk-vpacj-2bc49d6a67.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://engage-project-9d8d3-default-rtdb.firebaseio.com"
});



// app started
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/peerjs', peerServer);


app.get( '/teams-webrtc', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get( '/main+:room', (req, res) => {
  res.render('main',{ roomId: req.params.room });
});

app.get( '/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId ,userName,state) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit('user-connected', userId , state);
      
    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message , userName, userId);
    });
    
    if(state ==="in-meet")
    { 
      // firebase code
      var meetParticipantsRef =admin.database().ref(roomId).child("meetParticipants").child(userName);
      meetParticipantsRef.push().set({
        "tempo_id": userId,
        "arrival-time": (new Date()).getTime()
    });
      
    var currentParticipants= admin.database().ref(`${roomId}/currentParticipants/${userName}`);
    currentParticipants.push().set({
     "name": userName
  });
      //firebase code
      socket.on("disconnect", (reason)=>{
        meetParticipantsRef.push().set({
          "tempo_id": userId,
          "disconnected-time": (new Date()).getTime()
      });
        socket.broadcast.emit("user-disconnected", userId ); 
        admin.database().ref(`${roomId}/currentParticipants/${userName}`).remove();
    });
     
      socket.on('waved', (userId) => {
      io.to(roomId).emit('toggleWave', userId);
    });

    socket.on('screen-closed', (screenId) => {
      io.to(roomId).emit('remove-screen', screenId);
    });

  }
  
  });
});

server.listen( PORT , () => console.log(`Server listening to port ${PORT}`));
const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words"); // to filter out the bad words
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// server (emit) --> client (receive)  -- countUpdated
// client (emit) --> server (receive)  -- increment

io.on("connection", (socket) => {
  console.log("Connected to socket");

  // socket.emit("message", generateMessage("Welcome!"));                               // message goes to everyone

  // socket.broadcast.emit("message", generateMessage("A new user has joined!"));       // message goes to everyone except the current user (who joined)

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room); // used to join the room

    socket.emit("message", generateMessage("Admin", "Welcome!"));

    // socket.emit , io.emit , socket.broadcast.emit
    // io.to.emit (emit message to everyone in specific room)
    // socket.broadcast.to.emit  (send message to everyone except current connection in a specific room)

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  // Message functionality
  socket.on("sendMessage", (message, callback) => {
    console.log("Sent message: " + message);

    const user = getUser(socket.id);

    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed");
    }

    // io.emit("message", generateMessage(message));
    io.to(user.room).emit("message", generateMessage(user.username, message));

    callback();
  });

  // Location Functionality
  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  // Disconnect functionality (When user leave the room)
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left..!!`)
      );

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});

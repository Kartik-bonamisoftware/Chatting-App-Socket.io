let socket = io();

// server (emit) --> client (receive)  -- acknowledgement --> server
// client (emit) --> server (receive)  -- acknowledgement --> client

// Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options

// used for to extract the username and room from the url
let qs = (function (a) {
  if (a == "") return {};
  let b = {};
  for (let i = 0; i < a.length; ++i) {
    let p = a[i].split("=", 2);
    if (p.length == 1) b[p[0]] = "";
    else b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split("&"));

const autoScroll = () => {
  // New message element

  const $newMessage = $messages.lastElementChild;

  // Height of the new message element

  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height

  const visibleHeight = $messages.offsetHeight;

  // Height of message container

  const containerHeight = $messages.scrollHeight;

  // How far havre I scrolled?

  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

// Send chat message to everyone in the same chat room
socket.on("message", (message) => {
  console.log("........!!!!", message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
});

// Send location message to everyone in the same chat room
socket.on("locationMessage", (message) => {
  console.log(message);
  const html = Mustache.render(locationMessageTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
});

// For sidebar , show room name and no of person who joined the room
socket.on("roomData", ({ room, users }) => {
  console.log(room);
  console.log(users);
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });

  document.querySelector("#sidebar").innerHTML = html;
});

// Send message functionality on send message button
$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // disable
  $messageFormButton.setAttribute("disabled", "disabled");

  const message = e.target.elements.message.value;

  // e.target.elements.message.value = "";

  socket.emit("sendMessage", message, (error) => {
    // enable
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();

    if (error) {
      return console.log(error);
    }

    console.log("The message was delivered!");
  });
});

// Send location message functionality on send location button
$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser.");
  }

  $sendLocationButton.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
        console.log("Location shared!");
      }
    );
  });
});

// Send back user to home page (join page) if any error will occur like username is already exists
socket.emit("join", { username: qs["username"], room: qs["room"] }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});

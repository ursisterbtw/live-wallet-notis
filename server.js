const express = require('express')
const path = require('path')
const socketIO = require('socket.io');
const PORT = process.env.PORT || 5000
const fetch = require('node-fetch');

// start the express server with the appropriate routes for our webhook and web requests
var app = express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(express.json())
  .post('/alchemyhook', (req, res) => { notificationReceived(req); res.status(200).end() })
  .get('/*', (req, res) => res.sendFile(path.join(__dirname + '/index.html')))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

// start the websocket server
const io = socketIO(app);

let transactions = []; // store the last 5 transactions

// listen for client connections/calls on the WebSocket server
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
  socket.on('register address', (msg) => {
    //send address to Alchemy to add to notification
    addAddress(msg);
  });
});

// notification received from Alchemy from the webhook. Let the clients know.
function notificationReceived(req) {
  console.log("notification received!");
  transactions.unshift(JSON.stringify(req.body)); // add new transaction to the top
  if (transactions.length > 5) {
    transactions.pop(); // remove the oldest transaction if there are more than 5
  }
  io.emit('notification', transactions);
}

// add an address to a notification in Alchemy
async function addAddress(new_address) {
  console.log("adding address " + new_address);
  const body = { webhook_id: process.env.ALCHEMY_WEBHOOK_ID, addresses_to_add: [], addresses_to_remove: [] };
  try {
    fetch('https://dashboard.alchemyapi.io/api/update-webhook-addresses', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      headers: { 'X-Alchemy-Token': process.env.X_ALCHEMY_TOKEN }
    })
      .then(res => res.json())
      .then(json => console.log(json));
  }
  catch (err) {
    console.error(err);
  }
}
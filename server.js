const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const CHOICES = ['yes', 'no', 'unsure'];

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Voting machine running on http://localhost:${PORT}`);
});

const io = new Server(server);

// Single source of truth for the current round. Kept in memory only -
// there is no need to persist votes across server restarts.
const state = {
  question: '',
  active: false,
  votes: new Map(), // deviceId -> choice
};

function computeResults() {
  const counts = { yes: 0, no: 0, unsure: 0 };
  for (const choice of state.votes.values()) {
    counts[choice]++;
  }
  return { counts, total: state.votes.size };
}

function publicState() {
  return { question: state.question, active: state.active };
}

function broadcastResults() {
  io.to('host').emit('results', computeResults());
}

function broadcastState() {
  io.emit('state', publicState());
  broadcastResults();
}

io.on('connection', (socket) => {
  socket.on('join', ({ role, deviceId }) => {
    socket.data.role = role;
    socket.data.deviceId = deviceId;
    socket.join(role === 'host' ? 'host' : 'voters');

    socket.emit('state', publicState());
    if (role === 'host') {
      socket.emit('results', computeResults());
    } else if (deviceId && state.votes.has(deviceId)) {
      socket.emit('yourVote', state.votes.get(deviceId));
    }
  });

  socket.on('host:newQuestion', (text) => {
    if (socket.data.role !== 'host') return;
    state.question = String(text || '').slice(0, 300);
    state.active = true;
    state.votes.clear();
    broadcastState();
  });

  socket.on('host:closeVoting', () => {
    if (socket.data.role !== 'host') return;
    state.active = false;
    broadcastState();
  });

  socket.on('host:reopenVoting', () => {
    if (socket.data.role !== 'host') return;
    state.active = true;
    broadcastState();
  });

  socket.on('host:resetVotes', () => {
    if (socket.data.role !== 'host') return;
    state.votes.clear();
    broadcastResults();
  });

  socket.on('voter:vote', ({ deviceId, choice }) => {
    if (!state.active) return;
    if (!deviceId || !CHOICES.includes(choice)) return;
    state.votes.set(deviceId, choice);
    socket.emit('yourVote', choice);
    broadcastResults();
  });
});

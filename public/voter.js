(function () {
  const deviceId = getDeviceId();
  const socket = io();

  const questionEl = document.getElementById('question');
  const statusEl = document.getElementById('status');
  const buttons = Array.from(document.querySelectorAll('.choice-btn'));

  let active = false;
  let myVote = null;

  function getDeviceId() {
    let id = localStorage.getItem('votingDeviceId');
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem('votingDeviceId', id);
    }
    return id;
  }

  function render() {
    buttons.forEach((btn) => {
      btn.disabled = !active;
      btn.classList.toggle('selected', myVote === btn.dataset.choice);
    });
    if (!active && !myVote) {
      statusEl.textContent = 'ההצבעה סגורה כרגע';
    } else if (!active && myVote) {
      statusEl.textContent = 'ההצבעה נסגרה. הקול שלך נקלט.';
    } else if (myVote) {
      statusEl.textContent = 'הקול שלך נקלט. אפשר לשנות עד לסגירת ההצבעה.';
    } else {
      statusEl.textContent = 'בחר/י תשובה';
    }
  }

  socket.on('connect', () => {
    socket.emit('join', { role: 'voter', deviceId });
  });

  socket.on('state', (state) => {
    questionEl.textContent = state.question || 'ממתינים לשאלה מהמנחה...';
    active = state.active;
    if (!state.question) myVote = null;
    render();
  });

  socket.on('yourVote', (choice) => {
    myVote = choice;
    render();
  });

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!active) return;
      socket.emit('voter:vote', { deviceId, choice: btn.dataset.choice });
    });
  });

  render();
})();

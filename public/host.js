(function () {
  const socket = io();

  const questionEl = document.getElementById('question');
  const closedBanner = document.getElementById('closedBanner');
  const totalEl = document.getElementById('total');
  const questionInput = document.getElementById('questionInput');
  const voteUrlEl = document.getElementById('voteUrl');

  const bars = {
    yes: document.getElementById('bar-yes'),
    no: document.getElementById('bar-no'),
    unsure: document.getElementById('bar-unsure'),
  };

  voteUrlEl.textContent = `${location.protocol}//${location.host}/`;

  socket.on('connect', () => {
    socket.emit('join', { role: 'host' });
  });

  socket.on('state', (state) => {
    questionEl.textContent = state.question || 'אין שאלה פעילה';
    closedBanner.style.display = state.active ? 'none' : 'block';
    if (!questionInput.matches(':focus')) {
      questionInput.value = state.question || '';
    }
  });

  socket.on('results', ({ counts, total }) => {
    totalEl.textContent = `סה"כ הצביעו: ${total}`;
    for (const choice of Object.keys(bars)) {
      const count = counts[choice] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      bars[choice].style.width = `${pct}%`;
      bars[choice].textContent = `${count} (${pct}%)`;
    }
  });

  document.getElementById('newQuestionBtn').addEventListener('click', () => {
    socket.emit('host:newQuestion', questionInput.value.trim());
  });

  document.getElementById('closeBtn').addEventListener('click', () => {
    socket.emit('host:closeVoting');
  });

  document.getElementById('reopenBtn').addEventListener('click', () => {
    socket.emit('host:reopenVoting');
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('לאפס את כל התוצאות?')) {
      socket.emit('host:resetVotes');
    }
  });
})();

widget.useState({ time: '', day: '', date: '' });
widget.render();

function tick() {
  const now = new Date();
  widget.setState({
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    day: now.toLocaleDateString([], { weekday: 'long' }),
    date: now.toLocaleDateString([], { day: 'numeric', month: 'long' }),
  });
}

tick();
setInterval(tick, 1000);

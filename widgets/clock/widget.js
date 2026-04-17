widget.useState({ time: '', day: '', date: '' });
widget.render();

function tick() {
  const now = new Date();
  let time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let period = '';

  if (time.match(/\d{2}:\d{2} [P|A]M/g)) {
    period = time.slice(6);
    time = time.slice(0, 5);
  }

  widget.setState({
    time,
    day: now.toLocaleDateString([], { weekday: 'long' }),
    date: now.toLocaleDateString([], { day: 'numeric', month: 'long' }),
    period,
  });
}

tick();
widget.onRefresh(tick, 1000);

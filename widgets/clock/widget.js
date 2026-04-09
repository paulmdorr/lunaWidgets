widget.useState({ time: '' });
widget.render();

function tick() {
  widget.setState({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

tick();
setInterval(tick, 1000);

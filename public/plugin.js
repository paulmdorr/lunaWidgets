widget.onRefresh(async () => {
  console.log('onRefresh called');
  widget.setData({ text: 'Hello from plugin — ' + new Date().toLocaleTimeString() });
});

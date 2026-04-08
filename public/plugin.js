widget.onRefresh(async () => {
  console.log('plugin.js loaded');

  let state = {
    groups: [
      {
        name: 'Todo',
        items: [
          { id: '1', title: 'Buy milk' },
          { id: '2', title: 'Walk dog' },
        ],
      },
      { name: 'Done', items: [{ id: '3', title: 'Write tests' }] },
    ],
  };

  widget.onAction('moveItem', ({ itemId, targetGroup }) => {
    let item;
    state.groups = state.groups.map(g => {
      const found = g.items.find(i => i.id === itemId);
      if (found) item = found;
      return { ...g, items: g.items.filter(i => i.id !== itemId) };
    });
    state.groups = state.groups.map(g =>
      g.name === targetGroup ? { ...g, items: [...g.items, item] } : g
    );
    widget.setData(state);
  });

  widget.onRefresh(() => {
    widget.setData(state);
  });
});

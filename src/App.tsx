import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function App() {
  const [autostartEnabled, setAutostartEnabled] = useState(false);

  useEffect(() => {
    invoke<boolean>('get_autostart').then(setAutostartEnabled);
  }, []);

  async function toggleAutostart() {
    const newValue = !autostartEnabled;
    try {
      await invoke('change_autostart', { open: newValue });
      setAutostartEnabled(newValue);
    } catch {
      // no-op: change_autostart errors if state is already correct
    }
  }

  return (
    <div className="settings">
      <div className="setting-row">
        <span className="setting-label">Launch at login</span>
        <button
          className={`toggle${autostartEnabled ? ' on' : ''}`}
          onClick={toggleAutostart}
          role="switch"
          aria-checked={autostartEnabled}
        />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function App() {
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [widgetsDir, setWidgetsDir] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    invoke<boolean>('get_autostart').then(setAutostartEnabled);
    invoke<string>('get_widgets_dir').then(setWidgetsDir);
    invoke<string>('get_app_version').then(setVersion);
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

      <div className="setting-row">
        <span className="setting-label">Reload widgets</span>
        <button className="btn" onClick={() => invoke('reload_widgets')}>
          Reload
        </button>
      </div>

      <div className="setting-row setting-row--column">
        <div className="setting-row-header">
          <span className="setting-label">Widget folder</span>
          <button className="btn" onClick={() => invoke('open_widgets_dir')}>
            Open
          </button>
        </div>
        <span className="setting-path">{widgetsDir}</span>
      </div>

      <div className="settings-footer">
        <span className="version">Luna Widgets v{version}</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import io from 'socket.io-client';
import './App.css';

// Use polling transport for more reliable connection
const socket = io('http://localhost:5000', {
  transports: ['polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

function App() {
  const [view, setView] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [recipient, setRecipient] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration
  const register = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setStatus(data.message);
    setLoading(false);
    if (res.ok) setView('login');
  };

  // Login
  const login = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setToken(data.token);
      socket.emit('join', username);
      setView('transfer');
    } else {
      setStatus(data.message);
    }
  };

  // File upload and transfer
  const sendFile = async () => {
    if (!file || !recipient) return setStatus('Select file and recipient');
    setProgress(0);
    setStatus('Uploading...');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setStatus('Transferring...');
      setProgress(80);
      socket.emit('send-file', { file: data, to: recipient }, (ack) => {
        if (ack && ack.success) {
          setStatus('File sent successfully!');
          setProgress(100);
        } else {
          setStatus('File transfer failed. Recipient may not be online.');
          setProgress(0);
        }
      });
    } catch (err) {
      setStatus('Error: ' + err.message);
      setProgress(0);
    }
    setLoading(false);
  };

  // Debugging script for socket events
  socket.on('connect_error', (err) => {
    setStatus('Socket connection error: ' + err.message);
  });
  socket.on('error', (err) => {
    setStatus('Socket error: ' + err);
  });
  socket.on('disconnect', () => {
    setStatus('Socket disconnected.');
  });

  socket.on('receive-file', ({ file, from }) => {
    setStatus(`Received file ${file.filename} from ${from}`);
    setProgress(100);
  });

  return (
    <div className="container pro-ui">
      <div className="glass-card">
        <h1 className="gradient-text">File Transfer App</h1>
        {view === 'login' && (
          <form className="auth-box pro-form" onSubmit={e => { e.preventDefault(); login(); }}>
            <div className="form-title">Login</div>
            <input className="pro-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input className="pro-input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="pro-btn" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            <button className="pro-btn secondary" type="button" onClick={() => setView('register')}>Register</button>
            <div className="status-text">{status}</div>
          </form>
        )}
        {view === 'register' && (
          <form className="auth-box pro-form" onSubmit={e => { e.preventDefault(); register(); }}>
            <div className="form-title">Register</div>
            <input className="pro-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input className="pro-input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="pro-btn" type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
            <button className="pro-btn secondary" type="button" onClick={() => setView('login')}>Back to Login</button>
            <div className="status-text">{status}</div>
          </form>
        )}
        {view === 'transfer' && (
          <form className="transfer-box pro-form" onSubmit={e => { e.preventDefault(); sendFile(); }}>
            <div className="form-title">Send File</div>
            <input className="pro-input" placeholder="Recipient Username" value={recipient} onChange={e => setRecipient(e.target.value)} />
            <input className="pro-input" type="file" onChange={e => setFile(e.target.files[0])} />
            <button className="pro-btn" type="submit" disabled={loading || !file || !recipient}>{loading ? 'Transferring...' : 'Send File'}</button>
            <div className="progress-bar pro-progress">
              <div className="progress-inner" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="status-text">{status}</div>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;

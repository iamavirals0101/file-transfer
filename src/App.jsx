import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import Modal from './Modal';
import Skeleton from './Skeleton';
import TransferChart from './TransferChart';

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
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('light');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, user: null });
  const toastRef = useRef();

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  useEffect(() => {
    if (view === 'transfer' && username) {
      fetch(`http://localhost:5000/api/history/${username}`)
        .then(res => res.json())
        .then(setHistory);
    }
  }, [view, username]);

  useEffect(() => {
    if (view === 'transfer') {
      setLoadingUsers(true);
      fetch('http://localhost:5000/api/users')
        .then(res => res.json())
        .then(setUsers)
        .finally(() => setLoadingUsers(false));
      socket.on('online-users', (online) => {
        setOnlineUsers(online);
        fetchUsers(); // Refresh user list when online status changes
      });
      return () => {
        socket.off('online-users');
      };
    }
  }, [view]);

  useEffect(() => {
    if (view === 'transfer' && username) {
      const interval = setInterval(() => {
        fetch(`http://localhost:5000/api/history/${username}`)
          .then(res => res.json())
          .then(setHistory);
      }, 2000); // Poll every 2 seconds for updates
      return () => clearInterval(interval);
    }
  }, [view, username]);

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

  // Refresh transfer history after sending file
  const refreshHistory = () => {
    if (username) {
      fetch(`http://localhost:5000/api/history/${username}`)
        .then(res => res.json())
        .then(setHistory);
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
          showToast('File sent successfully!', 'success');
          refreshHistory();
        } else {
          setStatus('File transfer failed. Recipient may not be online.');
          setProgress(0);
          showToast('File transfer failed', 'error');
          refreshHistory();
        }
      });
    } catch (err) {
      setStatus('Error: ' + err.message);
      setProgress(0);
    }
    setLoading(false);
  };

  const showToast = (msg, type = 'info') => {
    if (toastRef.current) {
      toastRef.current.textContent = msg;
      toastRef.current.className = `toast toast-${type}`;
      toastRef.current.style.opacity = 1;
      setTimeout(() => {
        if (toastRef.current) toastRef.current.style.opacity = 0;
      }, 3000);
    }
  };

  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) return "🖼️";
    if (["pdf"].includes(ext)) return "📄";
    if (["doc","docx","txt","rtf"].includes(ext)) return "📝";
    if (["zip","rar","7z"].includes(ext)) return "🗜️";
    if (["mp3","wav","ogg"].includes(ext)) return "🎵";
    if (["mp4","avi","mov","mkv"].includes(ext)) return "🎬";
    return "📁";
  }

  function getAvatar(username) {
    // Simple avatar: use first letter and color
    const colors = ["#1976d2", "#388e3c", "#f44336", "#ff9800", "#8e24aa", "#0097a7"];
    const color = colors[username.charCodeAt(0) % colors.length];
    return (
      <span style={{
        display: 'inline-block',
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.1em',
        textAlign: 'center',
        lineHeight: '32px',
        marginRight: 8
      }}>{username[0].toUpperCase()}</span>
    );
  }

  // Update status and show toast for socket events
  socket.on('connect_error', (err) => {
    setStatus('Socket connection error: ' + err.message);
    showToast('Socket connection error', 'error');
  });
  socket.on('error', (err) => {
    setStatus('Socket error: ' + err);
    showToast('Socket error', 'error');
  });
  socket.on('disconnect', () => {
    setStatus('Socket disconnected.');
    showToast('Socket disconnected', 'error');
  });
  socket.on('receive-file', ({ file, from }) => {
    setStatus(`Received file ${file.filename} from ${from}`);
    setProgress(100);
    showToast(`File received: ${file.filename}`, 'success');
    refreshHistory();
  });

  // Drag-and-drop upload handlers
  const fileInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      showToast(`File selected: ${e.dataTransfer.files[0].name}`, 'info');
    }
  };

  const handleClickInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Multi-step registration form
  const [regStep, setRegStep] = useState(1);
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('');

  const handleRegisterNext = () => {
    if (regStep === 1 && username) setRegStep(2);
    else if (regStep === 2 && password) setRegStep(3);
    else if (regStep === 3) register();
  };

  const handleUserContextMenu = (e, user) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, user });
  };
  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, user: null });

  // Accessibility panel
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  useEffect(() => {
    document.body.style.fontSize = fontSize + 'px';
    document.body.classList.toggle('high-contrast', highContrast);
  }, [fontSize, highContrast]);

  // Layout toggle
  const [layout, setLayout] = useState('compact');

  // Internationalization (simple demo)
  const [lang, setLang] = useState('en');
  const t = {
    en: {
      users: 'Users',
      transferHistory: 'Transfer History',
      transferAnalytics: 'Transfer Analytics',
      sendFile: 'Send File',
      recipient: 'Recipient Username',
      dragDrop: 'Drag & drop a file here or click to select',
      noUsers: 'No users found.',
      noTransfers: 'No transfers yet.',
      register: 'Register',
      login: 'Login',
      darkMode: '🌙 Dark Mode',
      lightMode: '☀️ Light Mode',
      gridView: 'Grid View',
      compactView: 'Compact View',
      fontUp: 'A+',
      fontDown: 'A-',
      highContrast: 'High Contrast',
      normalContrast: 'Normal Contrast',
    },
    hi: {
      users: 'उपयोगकर्ता',
      transferHistory: 'स्थानांतरण इतिहास',
      transferAnalytics: 'स्थानांतरण विश्लेषण',
      sendFile: 'फ़ाइल भेजें',
      recipient: 'प्राप्तकर्ता उपयोगकर्ता नाम',
      dragDrop: 'यहाँ फ़ाइल खींचें या चयन के लिए क्लिक करें',
      noUsers: 'कोई उपयोगकर्ता नहीं मिला।',
      noTransfers: 'कोई स्थानांतरण नहीं।',
      register: 'पंजीकरण करें',
      login: 'लॉगिन',
      darkMode: '🌙 डार्क मोड',
      lightMode: '☀️ लाइट मोड',
      gridView: 'ग्रिड दृश्य',
      compactView: 'कॉम्पैक्ट दृश्य',
      fontUp: 'A+',
      fontDown: 'A-',
      highContrast: 'हाई कंट्रास्ट',
      normalContrast: 'नॉर्मल कंट्रास्ट',
    }
  };

  return (
    <div className="container pro-ui">
      <div ref={toastRef} className="toast" style={{position:'fixed',top:20,right:20,opacity:0,zIndex:999}}></div>
      <div className="glass-card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
          <img src="/src/assets/react.svg" alt="logo" style={{height:48,marginRight:12}} />
          <h1 className="gradient-text" style={{margin:0}}>File Transfer App</h1>
        </div>
        <img src="/src/assets/divider.svg" alt="divider" style={{width:'100%',marginBottom:16}} />
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8,gap:8}}>
          <button className="pro-btn secondary" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? t[lang].darkMode : t[lang].lightMode}
          </button>
          <button className="pro-btn secondary" type="button" onClick={() => setFontSize(fontSize + 2)}>{t[lang].fontUp}</button>
          <button className="pro-btn secondary" type="button" onClick={() => setFontSize(fontSize - 2)}>{t[lang].fontDown}</button>
          <button className="pro-btn secondary" type="button" onClick={() => setLayout(layout === 'compact' ? 'grid' : 'compact')}>
            {layout === 'compact' ? t[lang].gridView : t[lang].compactView}
          </button>
          <select className="pro-input" style={{width:100}} value={lang} onChange={e => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        {view === 'login' && (
          <form className="auth-box pro-form" onSubmit={e => { e.preventDefault(); login(); }}>
            <div className="form-title">{t[lang].login}</div>
            <input className="pro-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input className="pro-input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="pro-btn" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            <button className="pro-btn secondary" type="button" onClick={() => setView('register')}>{t[lang].register}</button>
            <div className="status-text">{status}</div>
          </form>
        )}
        {view === 'register' && (
          <form className="auth-box pro-form" onSubmit={e => { e.preventDefault(); handleRegisterNext(); }}>
            <div className="form-title">{t[lang].register}</div>
            {regStep === 1 && (
              <>
                <input className="pro-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <button className="pro-btn" type="button" onClick={handleRegisterNext} disabled={!username}>Next</button>
              </>
            )}
            {regStep === 2 && (
              <>
                <input className="pro-input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                <button className="pro-btn" type="button" onClick={handleRegisterNext} disabled={!password}>Next</button>
              </>
            )}
            {regStep === 3 && (
              <>
                <input className="pro-input" placeholder="Email (optional)" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                <input className="pro-input" placeholder="Avatar URL (optional)" value={regAvatar} onChange={e => setRegAvatar(e.target.value)} />
                <button className="pro-btn" type="submit">{t[lang].register}</button>
              </>
            )}
            <button className="pro-btn secondary" type="button" onClick={() => { setView('login'); setRegStep(1); }}>{t[lang].login}</button>
            <div className="status-text">{status}</div>
          </form>
        )}
        {view === 'transfer' && (
          <>
            {/* User List */}
            <div className="user-list">
              <div className="form-title">{t[lang].users}</div>
              <input className="pro-input" placeholder={t[lang].users + '...'} value={search} onChange={e => setSearch(e.target.value)} />
              {loadingUsers ? <Skeleton height={32} /> : (
                <div className={`user-list${layout === 'grid' ? ' grid-layout' : ''}`}> 
                  <ul>
                    {filteredUsers.length === 0 ? (
                      <li style={{ color: '#888' }}>{t[lang].noUsers}</li>
                    ) : (
                      filteredUsers.map(u => (
                        <li key={u.username} style={{display:'flex',alignItems:'center'}} onContextMenu={e => handleUserContextMenu(e, u)}>
                          {getAvatar(u.username)}
                          {u.username}
                          <span className={onlineUsers.includes(u.username) ? 'online' : 'offline'}>
                            {onlineUsers.includes(u.username) ? ' (Online)' : ' (Offline)'}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
            {/* Transfer History */}
            <div className="history-list">
              <div className="form-title">{t[lang].transferHistory}</div>
              <ul>
                {history.length === 0 ? (
                  <li style={{ color: '#888' }}>{t[lang].noTransfers}</li>
                ) : (
                  history.map((h, i) => (
                    <li key={i}>
                      <span style={{fontSize:'1.5em'}}>{getFileIcon(h.filename)}</span>
                      <strong>{h.sender === username ? 'Sent' : 'Received'}:</strong> {h.filename} <br/>
                      <span style={{ color: '#1976d2' }}>{h.sender} → {h.recipient}</span> <br/>
                      <span style={{ color: h.status === 'Delivered' ? '#4caf50' : '#f44336' }}>{h.status}</span> <br/>
                      <span style={{ color: '#888' }}>{new Date(h.time).toLocaleString()}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            {/* Transfer Analytics Chart */}
            <div className="history-list" style={{marginBottom:16}}>
              <div className="form-title">{t[lang].transferAnalytics}</div>
              <TransferChart history={history} />
            </div>
            {/* File Transfer Form */}
            <form className={`transfer-box pro-form${dragActive ? ' drag-active' : ''}`}
              onSubmit={e => { e.preventDefault(); sendFile(); }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <div className="form-title">{t[lang].sendFile}</div>
              <input className="pro-input" placeholder={t[lang].recipient} value={recipient} onChange={e => setRecipient(e.target.value)} />
              <div className="drag-drop-area" onClick={handleClickInput} style={{border: dragActive ? '2px dashed #1976d2' : '2px dashed #e0e7ff', padding: '18px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: dragActive ? '#e3f2fd' : '#f5f7fa', marginBottom: '12px'}}>
                {file ? `Selected: ${file.name}` : t[lang].dragDrop}
                <input ref={fileInputRef} className="pro-input" type="file" style={{display:'none'}} onChange={e => setFile(e.target.files[0])} />
              </div>
              <button className="pro-btn" type="submit" disabled={loading || !file || !recipient}>{loading ? 'Transferring...' : t[lang].sendFile}</button>
              <div className="progress-bar pro-progress">
                <div className="progress-inner" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="status-text">{status}</div>
            </form>
            <div className="fab" onClick={handleClickInput} title="Upload File">+</div>
          </>
        )}
        {contextMenu.visible && (
          <div style={{position:'fixed',top:contextMenu.y,left:contextMenu.x,zIndex:1001,background:'#fff',borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,0.15)',padding:'8px 0',minWidth:140}} onClick={closeContextMenu}>
            <div style={{padding:'8px 16px',cursor:'pointer'}} onClick={() => {setRecipient(contextMenu.user.username);closeContextMenu();}}>Send File</div>
            <div style={{padding:'8px 16px',cursor:'pointer'}} onClick={closeContextMenu}>View Profile</div>
          </div>
        )}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>{modalContent}</Modal>
      </div>
    </div>
  );
}

export default App;

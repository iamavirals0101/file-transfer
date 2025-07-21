import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 5e7 // 50MB
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const users = [];
const onlineUsers = new Set();
const transferHistory = [];
const SECRET = 'supersecretkey';

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// User registration
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const hashed = bcrypt.hashSync(password, 8);
    users.push({ username, password: hashed });
    res.json({ message: 'Registration successful' });
});

// User login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Get all users and online status
app.get('/api/users', (req, res) => {
  res.json(users.map(u => ({ username: u.username, online: onlineUsers.has(u.username) })));
});

// Get transfer history for a user
app.get('/api/history/:username', (req, res) => {
  const { username } = req.params;
  const history = transferHistory.filter(h => h.sender === username || h.recipient === username);
  res.json(history);
});

// Socket.io for file transfer
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', (reason) => {
        for (const username of onlineUsers) {
            if (io.sockets.adapter.rooms.has(username)) continue;
            onlineUsers.delete(username);
        }
        io.emit('online-users', Array.from(onlineUsers));
        console.log('Socket disconnected:', socket.id, 'Reason:', reason);
    });

    socket.on('send-file', ({ file, to }, callback) => {
        // Use sender from socket.join event
        const sender = socket.rooms.size > 1 ? Array.from(socket.rooms)[1] : 'unknown';
        const record = {
          sender,
          recipient: to,
          filename: file.filename,
          time: new Date().toISOString(),
          status: io.sockets.adapter.rooms.has(to) ? 'Delivered' : 'Failed'
        };
        transferHistory.push(record);
        if (io.sockets.adapter.rooms.has(to)) {
            io.to(to).emit('receive-file', { file, from: sender });
            callback && callback({ success: true });
        } else {
            callback && callback({ success: false });
        }
    });

    socket.on('join', (username) => {
        socket.join(username);
        onlineUsers.add(username);
        io.emit('online-users', Array.from(onlineUsers));
        console.log('Socket', socket.id, 'joined room', username);
    });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    // For demo, just return file buffer and name
    res.json({ filename: req.file.originalname, buffer: req.file.buffer });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

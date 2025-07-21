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

// Socket.io for file transfer
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', socket.id, 'Reason:', reason);
    });

    socket.on('send-file', ({ file, to }, callback) => {
        // Forward file to recipient
        const sent = io.sockets.adapter.rooms.has(to);
        if (sent) {
            io.to(to).emit('receive-file', { file, from: socket.id });
            callback && callback({ success: true });
        } else {
            callback && callback({ success: false });
        }
    });

    socket.on('join', (username) => {
        socket.join(username);
        console.log('Socket', socket.id, 'joined room', username);
    });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    // For demo, just return file buffer and name
    res.json({ filename: req.file.originalname, buffer: req.file.buffer });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

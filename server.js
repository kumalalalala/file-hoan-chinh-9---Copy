const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(bodyParser.json());

const usersFile = './users.json';

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Thiếu tên đăng nhập hoặc mật khẩu');
    }

    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};
    if (users[username]) {
        return res.status(400).send('Tên đăng nhập đã tồn tại');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users[username] = { password: hashedPassword };

    fs.writeFileSync(usersFile, JSON.stringify(users));
    res.status(200).send('Đăng ký thành công');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Thiếu tên đăng nhập hoặc mật khẩu');
    }

    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};

    if (!users[username] || !bcrypt.compareSync(password, users[username].password)) {
        return res.status(401).send('Sai tên đăng nhập hoặc mật khẩu');
    }

    res.status(200).send('Đăng nhập thành công');
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('offer', (data) => {
        socket.broadcast.emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data);
    });

    socket.on('candidate', (candidate) => {
        socket.broadcast.emit('candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

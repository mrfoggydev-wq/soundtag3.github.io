const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Раздает файлы из папки public

const CFG_PATH = path.join(__dirname, 'users', 'users.cfg');

// Автоматически создаем папку и файл базы данных, если их нет
if (!fs.existsSync(path.dirname(CFG_PATH))) {
    fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true });
}
if (!fs.existsSync(CFG_PATH)) {
    fs.writeFileSync(CFG_PATH, '', 'utf-8');
}

// Хелпер для чтения файла конфигурации пользователей
function readUsers() {
    try {
        const data = fs.readFileSync(CFG_PATH, 'utf-8');
        const users = {};
        data.split('\n').forEach(line => {
            if (!line.trim()) return;
            const [username, password] = line.split(':');
            if (username && password) {
                users[username.toLowerCase()] = { username: username.trim(), password: password.trim() };
            }
        });
        return users;
    } catch (e) {
        console.error("Ошибка чтения users.cfg:", e);
        return {};
    }
}

// 1. АПИ РЕГИСТРАЦИИ
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля!' });
    }

    const users = readUsers();
    if (users[username.toLowerCase()]) {
        return res.status(400).json({ error: 'Такой пользователь уже существует.' });
    }

    // Дописываем пользователя в файл users.cfg
    fs.appendFileSync(CFG_PATH, `${username.trim()}:${password.trim()}\n`, 'utf-8');
    res.json({ success: true });
});

// 2. АПИ ВХОДА (АВТОРИЗАЦИИ)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const found = users[username.toLowerCase()];

    if (found && found.password === password.trim()) {
        res.json({ success: true, username: found.username });
    } else {
        res.status(400).json({ error: 'Неверное имя пользователя или пароль!' });
    }
});

// 3. АПИ ПОЛУЧЕНИЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ПОИСКА
app.get('/api/users', (req, res) => {
    const users = readUsers();
    const list = Object.values(users).map(u => u.username);
    res.json(list);
});

// Запуск сервера на 3000 порту
app.listen(3000, () => {
    console.log('==================================================');
    console.log(' Сервер мессенджера успешно запущен!');
    console.log(' Открой в браузере: http://localhost:3000');
    console.log('==================================================');
});
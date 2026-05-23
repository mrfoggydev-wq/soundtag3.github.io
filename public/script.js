let currentUser = null;       // Имя вошедшего пользователя
let activeChatUser = null;    // С кем открыт чат прямо сейчас
let allUsers = [];            // Все зарегистрированные пользователи для поиска

// 1. НАЖАТИЕ КНОПКИ "ВОЙТИ"
async function handleLogin() {
    const userInp = document.getElementById('auth-username');
    const passInp = document.getElementById('auth-password');
    
    const username = userInp.value.trim();
    const password = passInp.value.trim();

    if (!username || !password) {
        alert("Введите имя пользователя и пароль!");
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = data.username; // Берём имя в правильном регистре с сервера
            userInp.value = '';
            passInp.value = '';
            showAppScreen();
        } else {
            alert(data.error || "Ошибка авторизации.");
        }
    } catch (err) {
        alert("Не удалось связаться с сервером. Убедитесь, что server.js запущен!");
    }
}

// 2. НАЖАТИЕ КНОПКИ "РЕГИСТРАЦИЯ"
async function handleRegister() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) {
        alert("Заполните поля для регистрации!");
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`Пользователь ${username} успешно создан! Теперь вы можете нажать кнопку 'Войти'.`);
        } else {
            alert(data.error || "Ошибка регистрации.");
        }
    } catch (err) {
        alert("Ошибка сети. Проверьте работу сервера.");
    }
}

// Переключение экрана авторизации на главный экран мессенджера
async function showAppScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    document.getElementById('my-name').innerText = currentUser;
    
    // Загружаем список людей
    await loadUsers();
}

// 3. ПОЛУЧЕНИЕ И ФИЛЬТРАЦИЯ СПИСКА ЛЮДЕЙ
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        
        // Убираем самого себя из списка, чтобы не писать самому себе
        allUsers = users.filter(u => u.toLowerCase() !== currentUser.toLowerCase());
        
        filterUsers(); // Отображаем список на экране
    } catch (e) {
        console.error("Не удалось загрузить пользователей", e);
    }
}

// Функция, срабатывающая при вводе букв в поле поиска
function filterUsers() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allUsers.filter(u => u.toLowerCase().includes(query));
    
    const container = document.getElementById('users-list');
    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = '<div style="color: #888; padding: 10px; text-align:center;">Никого не найдено</div>';
        return;
    }

    filtered.forEach(username => {
        const div = document.createElement('div');
        // Если чат с ним активен — красим в синий цвет (класс active)
        div.className = `user-item ${activeChatUser === username ? 'active' : ''}`;
        div.innerText = username;
        div.onclick = () => selectChat(username);
        container.appendChild(div);
    });
}

// 4. ВЫБОР ЧЕЛОВЕКА ДЛЯ ПЕРЕПИСКИ
function selectChat(username) {
    activeChatUser = username;
    
    document.getElementById('chat-header').innerText = `Переписка с: ${username}`;
    
    // Включаем поле ввода сообщений и кнопку отправки
    document.getElementById('msg-text').disabled = false;
    document.getElementById('send-btn').disabled = false;

    filterUsers(); // Перерисовываем список слева для смены активной подсветки
    renderChat();  // Достаем историю сообщений из LocalStorage
}

// Хелпер: создает уникальный ключ в localStorage для пары собеседников (например, chat_alice_bob)
function getChatStorageKey(userA, userB) {
    const sorted = [userA.toLowerCase(), userB.toLowerCase()].sort();
    return `chat_${sorted[0]}_${sorted[1]}`;
}

// 5. ОТПРАВКА СООБЩЕНИЯ В LOCALSTORAGE
function sendMessage() {
    const input = document.getElementById('msg-text');
    const text = input.value.trim();
    
    if (!text || !activeChatUser) return;

    const storageKey = getChatStorageKey(currentUser, activeChatUser);
    let history = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Формируем новое сообщение
    const newMsg = {
        sender: currentUser,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    history.push(newMsg);
    localStorage.setItem(storageKey, JSON.stringify(history)); // Сохраняем в браузер
    
    input.value = ''; // Очищаем поле ввода
    renderChat();    // Обновляем окно чата
}

// Отрисовка сообщений на экране из LocalStorage
function renderChat() {
    const box = document.getElementById('chat-box');
    box.innerHTML = '';

    if (!activeChatUser) return;

    const storageKey = getChatStorageKey(currentUser, activeChatUser);
    const history = JSON.parse(localStorage.getItem(storageKey)) || [];

    box.innerHTML = history.map(m => {
        // Проверяем, кто отправитель, для выбора цвета облачка (msg-out или msg-in)
        const isMyMsg = m.sender.toLowerCase() === currentUser.toLowerCase();
        const cssClass = isMyMsg ? 'msg-out' : 'msg-in';
        
        return `
            <div class="message ${cssClass}">
                ${m.text}
                <span class="msg-time">${m.time || ''}</span>
            </div>
        `;
    }).join('');

    // Скроллим чат вниз
    box.scrollTop = box.scrollHeight;
}

// 6. ВЫХОД ИЗ ПРОФИЛЯ
function logout() {
    currentUser = null;
    activeChatUser = null;
    
    document.getElementById('chat-header').innerText = "Выберите, кому написать в списке слева...";
    document.getElementById('msg-text').disabled = true;
    document.getElementById('send-btn').disabled = true;
    document.getElementById('chat-box').innerHTML = '';
    
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('app-screen').style.display = 'none';
}

// Отправка сообщений по кнопке Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'msg-text') {
        sendMessage();
    }
});
// Проверяем, загружен ли Telegram WebApp API
let tg;

if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    console.log('Telegram WebApp API загружен');
} else {
    console.log('Telegram WebApp API не загружен, тестовый режим');
    // Создаем mock-объект для тестирования
    tg = {
        expand: () => {},
        initDataUnsafe: {
            user: {
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                photo_url: 'https://via.placeholder.com/150'
            }
        },
        HapticFeedback: {
            impactOccurred: () => {},
            notificationOccurred: () => {}
        },
        shareMessage: (text) => {
            alert('Шаринг (в тестовом режиме):\n' + text);
        }
    };
}

// Firebase конфигурация (ЗАМЕНИТЕ ЭТИ ДАННЫЕ НА ВАШИ!)
const firebaseConfig = {
  apiKey: "AIzaSyAUIq3K4mcjGOccQOghm1H-aLdMOYpOWMA",
  authDomain: "beer-cs2-counter.firebaseapp.com",
  projectId: "beer-cs2-counter",
  storageBucket: "beer-cs2-counter.firebasestorage.app",
  messagingSenderId: "229120924522",
  appId: "1:229120924522:web:d6723c4d64d848d77da313"
};

// Инициализация Firebase
let db;
try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyDEXAMPLEabc123def456ghi789jkl") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log('Firebase инициализирован');
    } else {
        console.log('Firebase не настроен, используем локальное хранение');
        db = null;
    }
} catch (error) {
    console.log('Firebase не доступен, работаем в локальном режиме:', error);
    db = null;
}

// Элементы DOM
const elements = {
    userName: document.getElementById('user-name'),
    userPhoto: document.getElementById('user-photo'),
    userStats: document.getElementById('user-stats'),
    
    beerCard: document.getElementById('beer-card'),
    beerStats: document.getElementById('beer-stats'),
    beerTotal: document.getElementById('beer-total'),
    beerBottles: document.getElementById('beer-bottles'),
    
    cs2Card: document.getElementById('cs2-card'),
    cs2Stats: document.getElementById('cs2-stats'),
    cs2Buttons: document.getElementById('cs2-buttons'),
    cs2Total: document.getElementById('cs2-total'),
    cs2Wins: document.getElementById('cs2-wins'),
    cs2Losses: document.getElementById('cs2-losses'),
    cs2Draws: document.getElementById('cs2-draws'),
    
    btnWin: document.getElementById('btn-win'),
    btnLose: document.getElementById('btn-lose'),
    btnDraw: document.getElementById('btn-draw'),
    btnCancel: document.getElementById('btn-cancel'),
    btnReset: document.getElementById('btn-reset'),
    btnShare: document.getElementById('btn-share')
};

// Данные пользователя
let userData = {
    beer: 0, // в литрах
    cs2: {
        wins: 0,
        losses: 0,
        draws: 0
    },
    userId: null,
    username: 'Гость'
};

// Инициализация
function init() {
    // Показываем информацию пользователя из Telegram
    const user = tg.initDataUnsafe?.user;
    
    if (user) {
        // Если есть данные пользователя
        const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                         user.username || 
                         'Пользователь';
        elements.userName.textContent = userName;
        
        if (user.photo_url) {
            elements.userPhoto.src = user.photo_url;
        } else {
            // Если нет фото, показываем заглушку с инициалами
            elements.userPhoto.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName) + '&background=667eea&color=fff';
        }
        
        // Сохраняем ID пользователя для статистики
        userData.userId = user.id;
        userData.username = user.username || `user_${user.id}`;
    } else {
        // Если нет данных пользователя (тестовый режим или запуск из браузера)
        elements.userName.textContent = 'Гость';
        elements.userPhoto.src = 'https://ui-avatars.com/api/?name=Guest&background=764ba2&color=fff';
        
        // Генерируем случайный ID для гостя
        userData.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
        userData.username = 'Гость';
    }
    
    // Загружаем сохраненные данные
    loadData();
    
    // Обновляем отображение
    updateDisplay();
    
    // Назначаем обработчики событий
    setupEventListeners();
    setupTabs();
    
    // Загружаем глобальную статистику
    loadGlobalStats();
}

// Загрузка данных из localStorage
function loadData() {
    const saved = localStorage.getItem('beer_cs2_stats');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            userData = {
                ...userData,
                beer: parsed.beer || 0,
                cs2: {
                    wins: parsed.cs2?.wins || 0,
                    losses: parsed.cs2?.losses || 0,
                    draws: parsed.cs2?.draws || 0
                }
            };
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
        }
    }
}

// Сохранение данных в localStorage
function saveData() {
    localStorage.setItem('beer_cs2_stats', JSON.stringify(userData));
    
    // Сохраняем в Firebase если доступен
    if (db && userData.userId) {
        saveToFirebase();
        loadGlobalStats(); // Обновляем статистику после сохранения
    }
}

// Сохранение данных в Firebase
async function saveToFirebase() {
    if (!db || !userData.userId) return;
    
    try {
        await db.collection('users').doc(userData.userId.toString()).set({
            username: userData.username,
            photo_url: tg.initDataUnsafe?.user?.photo_url || '',
            beer: userData.beer,
            cs2_wins: userData.cs2.wins,
            cs2_losses: userData.cs2.losses,
            cs2_draws: userData.cs2.draws,
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('Данные сохранены в Firebase');
    } catch (error) {
        console.error('Ошибка сохранения в Firebase:', error);
    }
}

// Загрузка глобальной статистики
async function loadGlobalStats() {
    if (!db) {
        console.log('Firebase не доступен, пропускаем загрузку глобальной статистики');
        return;
    }
    
    try {
        // Загрузка топа по пиву
        const beerSnapshot = await db.collection('users')
            .orderBy('beer', 'desc')
            .limit(20)
            .get();
        
        updateLeaderboard('beer', beerSnapshot);
        
        // Загрузка топа по CS2
        const cs2Snapshot = await db.collection('users').get();
        const cs2Data = processCs2Stats(cs2Snapshot);
        updateLeaderboard('cs2', cs2Data);
        
        // Общая статистика
        updateGlobalStats(beerSnapshot);
        
    } catch (error) {
        console.error('Ошибка загрузки глобальной статистики:', error);
    }
}

// Обработка статистики CS2
function processCs2Stats(snapshot) {
    const players = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const totalGames = (data.cs2_wins || 0) + (data.cs2_losses || 0) + (data.cs2_draws || 0);
        const winRate = totalGames > 0 ? ((data.cs2_wins || 0) / totalGames) * 100 : 0;
        
        players.push({
            id: doc.id,
            username: data.username || 'Неизвестный',
            photo_url: data.photo_url || '',
            wins: data.cs2_wins || 0,
            total: totalGames,
            winRate: winRate
        });
    });
    
    // Сортировка по победам
    return players.sort((a, b) => b.wins - a.wins).slice(0, 20);
}

// Обновление таблиц лидерборда
function updateLeaderboard(type, data) {
    const containerId = type === 'beer' ? 'beer-leaderboard' : 'cs2-leaderboard';
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (data.empty || data.length === 0) {
        container.innerHTML = '<div class="leaderboard-item">Нет данных</div>';
        return;
    }
    
    const isFirestore = data.forEach; // Проверяем тип данных
    
    if (isFirestore) {
        // Данные из Firestore
        let rank = 1;
        data.forEach((doc, index) => {
            const user = doc.data();
            const isCurrentUser = doc.id === userData.userId?.toString();
            
            const item = document.createElement('div');
            item.className = `leaderboard-item ${isCurrentUser ? 'you' : ''} rank-${rank}`;
            
            item.innerHTML = `
                <div class="player-info">
                    <span class="rank-badge">${rank}</span>
                    <img src="${user.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=667eea&color=fff'}" 
                         alt="${user.username}" class="player-avatar" 
                         onerror="this.src='https://ui-avatars.com/api/?name=User&background=764ba2&color=fff'">
                    <span class="player-name">${user.username || 'Без имени'}</span>
                </div>
                <span class="stat-value">${(user.beer || 0).toFixed(1)} л</span>
            `;
            
            container.appendChild(item);
            rank++;
        });
    } else {
        // Обработанные данные CS2
        data.forEach((user, index) => {
            const isCurrentUser = user.id === userData.userId?.toString();
            
            const item = document.createElement('div');
            item.className = `leaderboard-item ${isCurrentUser ? 'you' : ''} rank-${index + 1}`;
            
            item.innerHTML = `
                <div class="player-info">
                    <span class="rank-badge">${index + 1}</span>
                    <img src="${user.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=667eea&color=fff'}" 
                         alt="${user.username}" class="player-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=User&background=764ba2&color=fff'">
                    <span class="player-name">${user.username}</span>
                </div>
                <span class="stat-value">${user.wins}</span>
                <span class="stat-value">${user.total}</span>
                <span class="stat-value">${user.winRate.toFixed(1)}%</span>
            `;
            
            container.appendChild(item);
        });
    }
}

// Обновление общей статистики
function updateGlobalStats(snapshot) {
    if (!snapshot || snapshot.empty) {
        document.getElementById('total-players').textContent = '0';
        document.getElementById('total-beer').textContent = '0';
        return;
    }
    
    let totalPlayers = 0;
    let totalBeer = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        totalPlayers++;
        totalBeer += data.beer || 0;
    });
    
    document.getElementById('total-players').textContent = totalPlayers;
    document.getElementById('total-beer').textContent = totalBeer.toFixed(1);
}

// Обновление отображения
function updateDisplay() {
    // Пиво
    const beerLiters = userData.beer.toFixed(1);
    const beerBottles = Math.floor(userData.beer / 0.5);
    
    elements.beerStats.textContent = `${beerLiters} л`;
    elements.beerTotal.textContent = `${beerLiters} л`;
    elements.beerBottles.textContent = `(${beerBottles} бутылок)`;
    
    // CS2
    const totalGames = userData.cs2.wins + userData.cs2.losses + userData.cs2.draws;
    
    elements.cs2Stats.textContent = `${userData.cs2.wins}/${userData.cs2.losses}/${userData.cs2.draws}`;
    elements.cs2Total.textContent = totalGames;
    elements.cs2Wins.textContent = userData.cs2.wins;
    elements.cs2Losses.textContent = userData.cs2.losses;
    elements.cs2Draws.textContent = userData.cs2.draws;
    
    // Общая статистика в заголовке
    elements.userStats.textContent = `🍺 ${beerLiters}л | 🎮 ${totalGames} игр`;
}

// Настройка вкладок
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок и контента
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс нажатой кнопке
            btn.classList.add('active');
            
            // Показываем соответствующий контент
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Обработчики событий
function setupEventListeners() {
    // Добавление пива
    elements.beerCard.addEventListener('click', () => {
        userData.beer += 0.5;
        saveData();
        updateDisplay();
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
    
    // Нажатие на CS2
    elements.cs2Card.addEventListener('click', () => {
        elements.cs2Buttons.classList.remove('hidden');
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
    
    // Кнопки CS2
    elements.btnWin.addEventListener('click', () => {
        userData.cs2.wins++;
        saveData();
        updateDisplay();
        hideCs2Buttons();
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    });
    
    elements.btnLose.addEventListener('click', () => {
        userData.cs2.losses++;
        saveData();
        updateDisplay();
        hideCs2Buttons();
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
    
    elements.btnDraw.addEventListener('click', () => {
        userData.cs2.draws++;
        saveData();
        updateDisplay();
        hideCs2Buttons();
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('warning');
        }
    });
    
    elements.btnCancel.addEventListener('click', hideCs2Buttons);
    
    // Сброс статистики
    elements.btnReset.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить всю статистику?')) {
            userData = {
                beer: 0,
                cs2: { wins: 0, losses: 0, draws: 0 },
                userId: userData.userId,
                username: userData.username
            };
            saveData();
            updateDisplay();
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('heavy');
            }
        }
    });
    
    // Поделиться
    elements.btnShare.addEventListener('click', () => {
        const beerLiters = userData.beer.toFixed(1);
        const totalGames = userData.cs2.wins + userData.cs2.losses + userData.cs2.draws;
        const winRate = totalGames > 0 ? ((userData.cs2.wins / totalGames) * 100).toFixed(1) : 0;
        
        const message = `🍺 Моя статистика:
Пиво выпито: ${beerLiters}л
CS2 игр: ${totalGames}
Побед: ${userData.cs2.wins} (${winRate}%)
Поражений: ${userData.cs2.losses}
Ничьих: ${userData.cs2.draws}

Посчитано в @beer_cs2_counter_bot`;
        
        if (tg.shareMessage) {
            tg.shareMessage(message);
        } else {
            alert(message);
        }
    });
}

// Скрыть кнопки CS2
function hideCs2Buttons() {
    elements.cs2Buttons.classList.add('hidden');
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);


// Проверяем, загружен ли Telegram WebApp API
let tg;

if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    console.log('Telegram WebApp API загружен');
    
    // Устанавливаем тему Telegram
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
} else {
    console.log('Telegram WebApp API не загружен, тестовый режим');
    // Создаем mock-объект для тестирования
    tg = {
        expand: () => {},
        initDataUnsafe: {
            user: {
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                photo_url: 'https://ui-avatars.com/api/?name=Тест&background=667eea&color=fff'
            }
        },
        HapticFeedback: {
            impactOccurred: () => {},
            notificationOccurred: () => {}
        },
        shareMessage: (text) => {
            alert('Шаринг (в тестовом режиме):\n' + text);
        },
        colorScheme: 'light'
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
        console.log('✅ Firebase инициализирован');
    } else {
        console.log('ℹ️ Firebase не настроен, используем локальное хранение');
        db = null;
    }
} catch (error) {
    console.log('⚠️ Firebase не доступен, работаем в локальном режиме:', error);
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
    btnShare: document.getElementById('btn-share'),
    
    themeSwitch: document.getElementById('theme-switch')
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

// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem('app-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isTelegramDark = tg.colorScheme === 'dark';
    
    // Приоритет: сохраненная тема > Telegram тема > системная тема
    if (savedTheme === 'dark' || (!savedTheme && (isTelegramDark || prefersDark))) {
        document.body.classList.add('dark-theme');
        if (elements.themeSwitch) {
            elements.themeSwitch.textContent = '☀️';
        }
    }
}

// Переключение темы
function setupThemeToggle() {
    if (!elements.themeSwitch) return;
    
    elements.themeSwitch.addEventListener('click', () => {
        // Добавляем класс для плавного перехода
        document.body.classList.add('theme-transition');
        
        const isDark = document.body.classList.toggle('dark-theme');
        elements.themeSwitch.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('app-theme', isDark ? 'dark' : 'light');
        
        // Анимация переключения
        elements.themeSwitch.style.transform = 'rotate(180deg) scale(1.2)';
        setTimeout(() => {
            elements.themeSwitch.style.transform = 'rotate(0deg) scale(1)';
            // Убираем класс перехода через секунду
            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 500);
        }, 300);
        
        // Тактильная отдача
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
}

// Анимация добавления пива
function animateBeerAdd() {
    const beerCard = document.getElementById('beer-card');
    beerCard.classList.add('beer-added');
    setTimeout(() => {
        beerCard.classList.remove('beer-added');
    }, 500);
}

// Анимация добавления CS2
function animateCs2Add(type) {
    const cs2Card = document.getElementById('cs2-card');
    cs2Card.classList.add('cs2-added');
    
    // Цветная вспышка в зависимости от результата
    let glowColor;
    if (type === 'win') {
        glowColor = 'rgba(72, 187, 120, 0.5)';
    } else if (type === 'lose') {
        glowColor = 'rgba(245, 101, 101, 0.5)';
    } else {
        glowColor = 'rgba(160, 174, 192, 0.5)';
    }
    
    cs2Card.style.boxShadow = `0 0 20px ${glowColor}`;
    
    setTimeout(() => {
        cs2Card.classList.remove('cs2-added');
        cs2Card.style.boxShadow = '';
    }, 300);
}

// Анимация статистики
function animateStats() {
    const statsElements = document.querySelectorAll('.stat-item');
    statsElements.forEach((el, index) => {
        el.classList.remove('updated');
        void el.offsetWidth; // Trigger reflow
        setTimeout(() => {
            el.classList.add('updated');
        }, 50 * index);
        
        // Убираем класс через 500ms
        setTimeout(() => {
            el.classList.remove('updated');
        }, 500 + (50 * index));
    });
}

// Инициализация
function init() {
    // Инициализация темы
    initTheme();
    
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
            elements.userPhoto.onerror = () => {
                elements.userPhoto.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName) + '&background=667eea&color=fff';
            };
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
    setupThemeToggle();
    
    // Анимация при загрузке
    setTimeout(() => {
        document.querySelectorAll('.action-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.classList.add('slide-in');
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 * index);
        });
        
        // Загружаем глобальную статистику
        loadGlobalStats();
    }, 100);
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
        // Обновляем глобальную статистику после сохранения
        setTimeout(() => {
            loadGlobalStats();
        }, 1000); // Небольшая задержка для обновления данных в Firebase
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
        
        console.log('✅ Данные сохранены в Firebase');
    } catch (error) {
        console.error('❌ Ошибка сохранения в Firebase:', error);
        
        // Если ошибка разрешений, пробуем создать документ
        if (error.code === 'permission-denied') {
            console.log('⚠️ Проблема с разрешениями, проверьте правила Firebase');
        }
    }
}

// Загрузка глобальной статистики
async function loadGlobalStats() {
    if (!db) {
        console.log('Firebase не доступен, пропускаем загрузку глобальной статистики');
        return;
    }
    
    console.log('🔄 Начинаю загрузку глобальной статистики...');
    
    try {
        // 1. Загружаем ВСЕХ пользователей один раз
        const allUsersSnapshot = await db.collection('users').get();
        console.log('📥 Загружено пользователей из Firebase:', allUsersSnapshot.size);
        
        if (allUsersSnapshot.empty) {
            console.log('В базе пока нет данных пользователей');
            document.getElementById('beer-leaderboard').innerHTML = '<div class="leaderboard-item">Нет данных</div>';
            document.getElementById('cs2-leaderboard').innerHTML = '<div class="leaderboard-item">Нет данных</div>';
            updateGlobalStats(0, 0);
            return;
        }
        
        // 2. Обрабатываем данные для пива (сортировка по beer)
        const beerData = [];
        const cs2Data = [];
        let totalBeer = 0;
        
        allUsersSnapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            
            // Для пива
            beerData.push({
                id: userId,
                username: user.username || 'Неизвестный',
                photo_url: user.photo_url || '',
                beer: user.beer || 0
            });
            
            // Для CS2
            const wins = user.cs2_wins || 0;
            const losses = user.cs2_losses || 0;
            const draws = user.cs2_draws || 0;
            const totalGames = wins + losses + draws;
            const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
            
            cs2Data.push({
                id: userId,
                username: user.username || 'Неизвестный',
                photo_url: user.photo_url || '',
                wins: wins,
                total: totalGames,
                winRate: winRate
            });
            
            // Суммируем общее пиво
            totalBeer += user.beer || 0;
        });
        
        // 3. Сортируем
        beerData.sort((a, b) => b.beer - a.beer);
        cs2Data.sort((a, b) => b.wins - a.wins);
        
        // 4. Обновляем интерфейс
        updateLeaderboard('beer', beerData.slice(0, 20));
        updateLeaderboard('cs2', cs2Data.slice(0, 20));
        updateGlobalStats(allUsersSnapshot.size, totalBeer);
        
        console.log('✅ Глобальная статистика загружена');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки глобальной статистики:', error);
        // Показываем сообщение об ошибке пользователю
        document.getElementById('beer-leaderboard').innerHTML = 
            '<div class="leaderboard-item">Ошибка загрузки</div>';
        document.getElementById('cs2-leaderboard').innerHTML = 
            '<div class="leaderboard-item">Ошибка загрузки</div>';
    }
}

// Обновление таблиц лидерборда
function updateLeaderboard(type, data) {
    const containerId = type === 'beer' ? 'beer-leaderboard' : 'cs2-leaderboard';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('Не найден контейнер для лидерборда:', containerId);
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Проверяем, есть ли данные
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="leaderboard-item">Нет данных</div>';
        return;
    }
    
    console.log(`📊 Обновляю лидерборд ${type}, записей:`, data.length);
    
    // Для каждого игрока создаем элемент
    data.forEach((item, index) => {
        const rank = index + 1;
        const isCurrentUser = item.id === userData.userId?.toString();
        
        const itemElement = document.createElement('div');
        itemElement.className = `leaderboard-item ${isCurrentUser ? 'you' : ''} rank-${rank}`;
        
        if (type === 'beer') {
            // Разметка для таблицы пива
            itemElement.innerHTML = `
                <div class="player-info">
                    <span class="rank-badge">${rank}</span>
                    <img src="${item.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.username) + '&background=667eea&color=fff'}" 
                         alt="${item.username}" class="player-avatar" 
                         onerror="this.src='https://ui-avatars.com/api/?name=User&background=764ba2&color=fff'">
                    <span class="player-name">${item.username}</span>
                </div>
                <span class="stat-value">${(item.beer || 0).toFixed(1)} л</span>
            `;
        } else {
            // Разметка для таблицы CS2
            itemElement.innerHTML = `
                <div class="player-info">
                    <span class="rank-badge">${rank}</span>
                    <img src="${item.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.username) + '&background=667eea&color=fff'}" 
                         alt="${item.username}" class="player-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=User&background=764ba2&color=fff'">
                    <span class="player-name">${item.username}</span>
                </div>
                <span class="stat-value">${item.wins || 0}</span>
                <span class="stat-value">${item.total || 0}</span>
                <span class="stat-value">${(item.winRate || 0).toFixed(1)}%</span>
            `;
        }
        
        // Анимация появления
        itemElement.style.opacity = '0';
        itemElement.style.transform = 'translateY(10px)';
        container.appendChild(itemElement);
        
        setTimeout(() => {
            itemElement.classList.add('fade-in');
            itemElement.style.opacity = '1';
            itemElement.style.transform = 'translateY(0)';
        }, 50 * index);
    });
}

// Обновление общей статистики
function updateGlobalStats(totalPlayers, totalBeer) {
    const playersElement = document.getElementById('total-players');
    const beerElement = document.getElementById('total-beer');
    
    if (playersElement) {
        playersElement.textContent = totalPlayers || 0;
    }
    
    if (beerElement) {
        beerElement.textContent = (totalBeer || 0).toFixed(1);
    }
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
    
    // Анимация обновления статистики
    setTimeout(animateStats, 50);
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
            
            // Тактильная отдача
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
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
        animateBeerAdd();
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
        animateCs2Add('win');
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    });
    
    elements.btnLose.addEventListener('click', () => {
        userData.cs2.losses++;
        saveData();
        updateDisplay();
        hideCs2Buttons();
        animateCs2Add('lose');
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
    
    elements.btnDraw.addEventListener('click', () => {
        userData.cs2.draws++;
        saveData();
        updateDisplay();
        hideCs2Buttons();
        animateCs2Add('draw');
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('warning');
        }
    });
    
    elements.btnCancel.addEventListener('click', hideCs2Buttons);
    
    // Сброс статистики
    elements.btnReset.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить всю статистику?\nЭто действие нельзя отменить.')) {
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
            
            // Анимация сброса
            document.querySelectorAll('.stat-item').forEach(item => {
                item.classList.add('updated');
            });
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
            // Альтернативный способ поделиться
            if (navigator.share) {
                navigator.share({
                    title: 'Моя статистика пива и CS2',
                    text: message
                });
            } else {
                prompt('Скопируйте текст для отправки:', message);
            }
        }
    });
}

// Скрыть кнопки CS2
function hideCs2Buttons() {
    elements.cs2Buttons.classList.add('hidden');
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);

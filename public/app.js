/**
 * Клиентская логика для Telegram Mini App "Ставки от AI"
 * Обработка загрузки файлов, анимации и взаимодействие с API
 */
// Применяем тему Telegram
if (tg.themeParams) {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
}

// ==================== Telegram WebApp API ====================
let tg = window.Telegram?.WebApp || {
    expand: () => console.log('Mock expand'),
    ready: () => console.log('Mock ready'),
    themeParams: {},
    HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {}
    },
    MainButton: {
        show: () => {},
        hide: () => {},
        setText: () => {},
        enable: () => {},
        onClick: () => {}
    }
};

console.log('Telegram WebApp available:', !!window.Telegram?.WebApp);

if (window.Telegram?.WebApp) {
    tg.expand();
    tg.ready();
    console.log('✅ Telegram WebApp initialized');
} else {
    console.warn('⚠️ Telegram WebApp not available - using fallback');
}

// Применяем тему Telegram
if (tg.themeParams) {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
}

// ==================== DOM Elements ====================
const uploadArea = document.getElementById('uploadArea');
const uploadContent = document.getElementById('uploadContent');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileInput = document.getElementById('fileInput');
const removeImageBtn = document.getElementById('removeImage');

const analyzeBtn = document.getElementById('analyzeBtn');
const quickBtn = document.getElementById('quickBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

const resultCard = document.getElementById('resultCard');
const resultIcon = document.getElementById('resultIcon');
const betType = document.getElementById('betType');
const reasonText = document.getElementById('reasonText');
const probability = document.getElementById('probability');
const probabilityBar = document.getElementById('probabilityBar');
const confidence = document.getElementById('confidence');
const confidenceStars = document.getElementById('confidenceStars');
const analysisText = document.getElementById('analysisText');
const newPredictionBtn = document.getElementById('newPredictionBtn');

const toastContainer = document.getElementById('toastContainer');
const loadingOverlay = document.getElementById('loadingOverlay');

// ==================== State ====================
let selectedFile = null;
let isAnalyzing = false;

// ==================== Utility Functions ====================

/**
 * Форматирование размера файла
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Генерация звёзд для рейтинга
 */
function generateStars(count) {
    return '⭐'.repeat(Math.min(count, 10));
}

/**
 * Показать Toast уведомление
 */
function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Вибрация для Telegram
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type === 'error' ? 'error' : 'success');
    }
    
    // Автоудаление через 4 секунды
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Показать/скрыть overlay загрузки
 */
function toggleLoadingOverlay(show) {
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}

/**
 * Анимация печати текста
 */
function typeWriter(element, text, speed = 30) {
    element.textContent = '';
    let i = 0;
    
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                resolve();
            }
        }, speed);
    });
}

// ==================== File Handling ====================

/**
 * Обработка выбранного файла
 */
function handleFile(file) {
    if (!file) return;
    
    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Ошибка', 'Поддерживаются только изображения (JPEG, PNG, GIF, WebP)', 'error');
        return;
    }
    
    // Проверка размера (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('Ошибка', 'Файл слишком большой. Максимум 10 МБ', 'error');
        return;
    }
    
    selectedFile = file;
    
    // Предпросмотр изображения
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Переключение UI
        uploadContent.style.display = 'none';
        previewContainer.style.display = 'block';
        analyzeBtn.disabled = false;
        
        // Вибрация
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
        
        showToast('Успех', 'Изображение загружено', 'success');
    };
    
    reader.onerror = () => {
        showToast('Ошибка', 'Не удалось загрузить файл', 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Удаление загруженного файла
 */
function removeFile() {
    selectedFile = null;
    previewImage.src = '';
    fileInput.value = '';
    
    uploadContent.style.display = 'block';
    previewContainer.style.display = 'none';
    analyzeBtn.disabled = true;
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// ==================== API Functions ====================

/**
 * Анализ изображения
 */
async function analyzePrediction() {
    if (!selectedFile || isAnalyzing) return;
    
    isAnalyzing = true;
    analyzeBtn.classList.add('loading');
    analyzeBtn.disabled = true;
    toggleLoadingOverlay(true);
    
    // Вибрация старт
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
    }
    
    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }
        
        const result = await response.json();
        
        if (result.success) {
            await displayResult(result.data);
            showToast('Готово', 'Анализ завершён успешно', 'success');
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка анализа:', error);
        showToast('Ошибка', 'Не удалось проанализировать изображение', 'error');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    } finally {
        isAnalyzing = false;
        analyzeBtn.classList.remove('loading');
        analyzeBtn.disabled = false;
        toggleLoadingOverlay(false);
    }
}

/**
 * Быстрый прогноз без изображения
 */
async function quickPrediction() {
    if (isAnalyzing) return;
    
    isAnalyzing = true;
    quickBtn.disabled = true;
    toggleLoadingOverlay(true);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
    }
    
    try {
        const response = await fetch('/api/quick-predict');
        
        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }
        
        const result = await response.json();
        
        if (result.success) {
            await displayResult(result.data);
            showToast('Готово', 'Прогноз сгенерирован', 'success');
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка генерации:', error);
        showToast('Ошибка', 'Не удалось сгенерировать прогноз', 'error');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    } finally {
        isAnalyzing = false;
        quickBtn.disabled = false;
        toggleLoadingOverlay(false);
    }
}

/**
 * Отображение результата с анимациями
 */
async function displayResult(data) {
    // Скрываем если показан
    resultCard.classList.remove('show');
    
    // Небольшая задержка
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Заполняем данные
    resultIcon.textContent = data.emoji || '🎯';
    betType.textContent = data.betType;
    reasonText.textContent = data.reason;
    probability.textContent = `${data.probability}%`;
    confidence.textContent = `${data.confidence}/10`;
    confidenceStars.textContent = generateStars(data.confidence);
    analysisText.textContent = data.analysis;
    
    // Анимация progress bar
    probabilityBar.style.width = '0%';
    setTimeout(() => {
        probabilityBar.style.width = `${data.probability}%`;
    }, 100);
    
    // Показываем карточку
    resultCard.classList.add('show');
    
    // Плавная прокрутка к результату
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
    
    // Вибрация успеха
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    // Анимация печати для текста причины (опционально)
    // await typeWriter(reasonText, data.reason, 20);
}

/**
 * Сброс для нового прогноза
 */
function resetForNewPrediction() {
    resultCard.classList.remove('show');
    removeFile();
    
    // Плавная прокрутка наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// ==================== Event Listeners ====================

// Клик по области загрузки
uploadArea.addEventListener('click', (e) => {
    if (e.target === removeImageBtn || e.target.closest('.remove-image')) {
        return;
    }
    fileInput.click();
});

// Выбор файла через input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
});

// Удаление изображения
removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeFile();
});

// Drag & Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFile(file);
    }
});

// Paste из буфера обмена (Ctrl+V)
document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
                handleFile(file);
                showToast('Вставлено', 'Изображение из буфера обмена', 'info');
            }
            break;
        }
    }
});

// Кнопка анализа
analyzeBtn.addEventListener('click', analyzePrediction);

// Кнопка быстрого прогноза
quickBtn.addEventListener('click', quickPrediction);

// Кнопка нового прогноза
newPredictionBtn.addEventListener('click', resetForNewPrediction);

// ==================== Keyboard Shortcuts ====================
document.addEventListener('keydown', (e) => {
    // Enter - анализ (если файл загружен)
    if (e.key === 'Enter' && selectedFile && !analyzeBtn.disabled) {
        analyzePrediction();
    }
    
    // Escape - удалить файл или скрыть результат
    if (e.key === 'Escape') {
        if (resultCard.classList.contains('show')) {
            resultCard.classList.remove('show');
        } else if (selectedFile) {
            removeFile();
        }
    }
    
    // Space - быстрый прогноз
    if (e.key === ' ' && !selectedFile && e.target === document.body) {
        e.preventDefault();
        quickPrediction();
    }
});

// ==================== Telegram Main Button ====================
// Используем главную кнопку Telegram для анализа
function updateMainButton() {
    if (selectedFile && !isAnalyzing) {
        tg.MainButton.setText('🎯 Проанализировать');
        tg.MainButton.show();
        tg.MainButton.enable();
        tg.MainButton.onClick(analyzePrediction);
    } else {
        tg.MainButton.hide();
    }
}

// Обновляем кнопку при изменении состояния
const originalHandleFile = handleFile;
handleFile = function(...args) {
    originalHandleFile.apply(this, args);
    updateMainButton();
};

const originalRemoveFile = removeFile;
removeFile = function(...args) {
    originalRemoveFile.apply(this, args);
    updateMainButton();
};

// ==================== Background Particles Animation ====================
function createParticles() {
    const particles = document.getElementById('particles');
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 4 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `rgba(74, 222, 128, ${Math.random() * 0.3 + 0.1})`;
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${Math.random() * 10 + 10}s infinite ease-in-out`;
        particle.style.animationDelay = Math.random() * 5 + 's';
        
        particles.appendChild(particle);
    }
}

// ==================== Initialize ====================
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Betting AI App initialized');
    
    // Создаём частицы
    createParticles();
    
    // Инициализируем Main Button
    updateMainButton();
    
    // Приветственное сообщение
    setTimeout(() => {
        showToast(
            'Добро пожаловать! 👋',
            'Загрузите изображение или получите быстрый прогноз',
            'info'
        );
    }, 500);
    
    // Отправляем событие готовности в Telegram
    tg.ready();
    
    console.log('✅ App ready');
});

// ==================== Service Worker (опционально для PWA) ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Раскомментируй если добавишь service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('✅ Service Worker registered'))
        //     .catch(err => console.error('❌ Service Worker registration failed:', err));
    });
}

// ==================== Error Handling ====================
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
    showToast('Ошибка', 'Что-то пошло не так. Попробуйте обновить страницу', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled promise rejection:', e.reason);
    showToast('Ошибка', 'Ошибка при обработке запроса', 'error');
});

// ==================== Debug Info ====================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Development mode');
    console.log('📱 Telegram WebApp:', tg);
    console.log('🎨 Theme:', tg.themeParams);
    console.log('👤 User:', tg.initDataUnsafe?.user);
}

// ==================== Экспорт для отладки ====================
window.BettingApp = {
    analyzePrediction,
    quickPrediction,
    handleFile,
    removeFile,
    showToast,
    displayResult,
    resetForNewPrediction
};

console.log('🎮 BettingApp API available in window.BettingApp');

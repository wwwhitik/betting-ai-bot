/**
 * Express сервер для Telegram Mini App
 * Обрабатывает загрузку изображений и генерацию прогнозов
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const generator = require('./utils/generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Отключаем кеш для разработки
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Создаём папку uploads если её нет
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Поддерживаются только изображения (JPEG, PNG, GIF, WebP)'));
        }
    }
});

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==================== ROUTES ====================

/**
 * Главная страница - отдаёт Mini App
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * API: Анализ изображения и генерация прогноза
 * POST /api/analyze
 */
app.post('/api/analyze', upload.single('image'), async (req, res) => {
    try {
        // Имитация обработки изображения
        console.log('📸 Получено изображение:', req.file ? req.file.filename : 'Нет файла');

        // Искусственная задержка для эффекта "анализа"
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Генерируем случайный прогноз
        const prediction = generator.generate();

        // Добавляем информацию о файле если есть
        if (req.file) {
            prediction.imageInfo = {
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            };
        }

        console.log('✅ Прогноз сгенерирован:', prediction.betType);

        res.json({
            success: true,
            data: prediction
        });

        // Удаляем загруженный файл через 5 минут (экономим место)
        if (req.file) {
            setTimeout(() => {
                const filePath = path.join(uploadsDir, req.file.filename);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Ошибка удаления файла:', err);
                    else console.log('🗑️ Удалён файл:', req.file.filename);
                });
            }, 5 * 60 * 1000);
        }

    } catch (error) {
        console.error('❌ Ошибка при анализе:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обработке изображения',
            message: error.message
        });
    }
});

/**
 * API: Быстрый прогноз без изображения
 * GET /api/quick-predict
 */
app.get('/api/quick-predict', (req, res) => {
    try {
        const prediction = generator.generate();
        
        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('❌ Ошибка при генерации:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка генерации прогноза'
        });
    }
});

/**
 * API: Множественные прогнозы
 * GET /api/multiple-predictions?count=3
 */
app.get('/api/multiple-predictions', (req, res) => {
    try {
        const count = Math.min(parseInt(req.query.count) || 3, 10); // Максимум 10
        const predictions = generator.generateMultiple(count);
        
        res.json({
            success: true,
            count: predictions.length,
            data: predictions
        });
    } catch (error) {
        console.error('❌ Ошибка при генерации множественных прогнозов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка генерации прогнозов'
        });
    }
});

/**
 * API: Статистика сервера
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
    const uploadFiles = fs.readdirSync(uploadsDir);
    const totalSize = uploadFiles.reduce((acc, file) => {
        const stats = fs.statSync(path.join(uploadsDir, file));
        return acc + stats.size;
    }, 0);

    res.json({
        success: true,
        data: {
            uptime: process.uptime(),
            uploadsCount: uploadFiles.length,
            uploadsTotalSize: totalSize,
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        }
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint не найден'
    });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('💥 Глобальная ошибка:', err);
    
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: 'Ошибка загрузки файла',
            message: err.message
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`📱 URL: http://localhost:${PORT}`);
    console.log(`🌍 ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔥 Готов к приёму запросов!');
    console.log('================================');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM получен, завершаю работу...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('⚠️ SIGINT получен, завершаю работу...');
    process.exit(0);
});

module.exports = app;

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 

const authRoutes = require('./routes/authRoutes');
const articleRoutes = require('./routes/articleRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser()); 

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Підключено до MongoDB'))
    .catch(err => console.error('❌ Помилка підключення до БД:', err));

// API Маршрути
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на http://localhost:${PORT}`);
});
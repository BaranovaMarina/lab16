const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const User = require('../models/User');
const router = express.Router();

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({ 'string.min': "Мінімум 2 символи", 'any.required': "Ім'я обов'язкове" }),
    email: Joi.string().email().required().messages({ 'string.email': 'Некоректний email', 'any.required': "Email обов'язковий" }),
    password: Joi.string().min(6).required().messages({ 'string.min': 'Мінімум 6 символів', 'any.required': "Пароль обов'язковий" }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Паролі не збігаються', 'any.required': "Підтвердження обов'язкове" })
});

const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    
    // ДОДАНО: secure: true та sameSite: 'none' для роботи між доменами
    res.cookie('token', token, { 
        expires: new Date(Date.now() + 2 * 60 * 60 * 1000), 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none' 
    });
    
    res.status(statusCode).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
};

router.post('/register', async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body, { abortEarly: false });
        if (error) return res.status(400).json({ errors: error.details.map(d => d.message) });

        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ errors: ['Цей Email вже використовується'] });

        const user = new User({ name, email, password });
        await user.save();
        sendTokenResponse(user, 201, res);
    } catch (error) { res.status(500).json({ errors: ['Помилка сервера'] }); }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Користувача не знайдено' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Невірний пароль' });

        sendTokenResponse(user, 200, res);
    } catch (error) { res.status(500).json({ message: 'Помилка сервера' }); }
});

router.post('/logout', (req, res) => {
    res.cookie('token', 'none', { 
        expires: new Date(Date.now() + 10 * 1000), 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none' 
    });
    res.status(200).json({ success: true, message: 'Вийшли успішно' });
});

// НАЙГОЛОВНІШИЙ МАРШРУТ ДЛЯ КНОПОК ВИДАЛЕННЯ
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token || token === 'none') return res.status(401).json({ message: 'Не авторизовано' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });
        
        res.status(200).json({ data: user });
    } catch (error) { res.status(401).json({ message: 'Недійсний токен' }); }
});

module.exports = router;
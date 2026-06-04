const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const router = express.Router();

const protect = (req, res, next) => {
    let token = req.cookies.token;
    if (!token || token === 'none') return res.status(401).json({ message: 'Немає доступу. Авторизуйтесь.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) { return res.status(401).json({ message: 'Недійсний токен.' }); }
};

const commentSchema = Joi.object({
    text: Joi.string().min(2).max(500).required().messages({
        'string.min': 'Мінімум 2 символи', 'string.max': 'Максимум 500 символів', 'any.required': 'Текст обов\'язковий'
    })
});

router.get('/', async (req, res) => {
    try {
        const articles = await Article.find().sort({ publishedAt: -1 }).populate('author', 'name');
        res.json({ data: articles });
    } catch (error) { res.status(500).json({ message: 'Помилка завантаження' }); }
});

router.post('/', protect, async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        const newArticle = new Article({ title, content, tags, author: req.userId });
        await newArticle.save();
        res.status(201).json({ success: true, data: newArticle });
    } catch (error) { res.status(500).json({ message: 'Помилка створення' }); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Не знайдено' });
        if (article.author.toString() !== req.userId) return res.status(403).json({ message: 'Тільки власник може видаляти' });

        await article.deleteOne();
        res.status(200).json({ success: true, message: 'Видалено' });
    } catch (error) { res.status(500).json({ message: 'Помилка видалення' }); }
});

router.get('/:articleId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ article: req.params.articleId }).populate('user', 'name');
        res.json({ data: comments });
    } catch (error) { res.status(500).json({ message: 'Помилка завантаження' }); }
});

router.post('/:articleId/comments', protect, async (req, res) => {
    try {
        const { error } = commentSchema.validate(req.body, { abortEarly: false });
        if (error) return res.status(400).json({ errors: error.details.map(d => d.message) });

        const newComment = new Comment({ text: req.body.text, article: req.params.articleId, user: req.userId });
        await newComment.save();
        res.status(201).json({ success: true, data: newComment });
    } catch (error) { res.status(500).json({ message: 'Помилка збереження' }); }
});

router.delete('/:articleId/comments/:commentId', protect, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Не знайдено' });
        if (comment.user.toString() !== req.userId) return res.status(403).json({ message: 'Тільки власник може видаляти' });

        await comment.deleteOne();
        res.status(200).json({ success: true, message: 'Видалено' });
    } catch (error) { res.status(500).json({ message: 'Помилка видалення' }); }
});

module.exports = router;
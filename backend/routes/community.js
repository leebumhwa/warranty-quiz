const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/community/posts
router.get('/posts', authenticate, async (req, res) => {
  try {
    res.json({ posts: await db.getPosts() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts
router.post('/posts', authenticate, async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
  }
  try {
    const post = await db.createPost(req.user.id, title.trim(), content.trim());
    res.status(201).json({ post: { ...post, author_name: req.user.name, comment_count: 0, like_count: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/community/posts/:id
router.get('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await db.getPostById(req.params.id, req.user.id);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/community/posts/:id — owner only
router.put('/posts/:id', authenticate, async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
  }
  try {
    const post = await db.getPostRaw(req.params.id);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: '수정 권한이 없습니다.' });
    const updated = await db.updatePost(req.params.id, title.trim(), content.trim());
    res.json({ post: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/community/posts/:id — owner or admin
router.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await db.getPostRaw(req.params.id);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }
    await db.deletePost(req.params.id);
    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/:id/comments
router.post('/posts/:id/comments', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
  try {
    const post = await db.getPostRaw(req.params.id);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    const comment = await db.createComment(parseInt(req.params.id), req.user.id, content.trim());
    res.status(201).json({ comment: { ...comment, author_name: req.user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/community/comments/:id — owner or admin
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    const comment = await db.getCommentRaw(req.params.id);
    if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }
    await db.deleteComment(req.params.id);
    res.json({ message: '댓글이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/community/posts/:id/like — toggle (cannot like own post)
router.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const post = await db.getPostRaw(req.params.id);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    if (post.user_id === req.user.id) {
      return res.status(400).json({ error: '본인 게시글에는 좋아요를 누를 수 없습니다.' });
    }
    const result = await db.toggleLike(req.user.id, parseInt(req.params.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

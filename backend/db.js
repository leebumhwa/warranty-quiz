require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const QUIZ_ITEM = 'warranty-quiz-item';

const db = {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUserByEmail(email) {
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return data || null;
  },
  async getUserById(id) {
    const { data } = await supabase.from('users').select('*').eq('id', parseInt(id)).maybeSingle();
    return data || null;
  },
  async createUser(email, password, name, role = 'user', privacyAgreedAt = null) {
    const existing = await db.getUserByEmail(email);
    if (existing) return null;
    const { data } = await supabase
      .from('users')
      .insert({ email, password, name, role, privacy_agreed_at: privacyAgreedAt })
      .select().single();
    return data;
  },

  // ── Files (admin uploads) ─────────────────────────────────────────────────
  async getAllFiles() {
    const { data: files } = await supabase
      .from('files')
      .select('id, original_name, file_size, created_at, uploaded_by, correction_notes')
      .order('created_at', { ascending: false });
    if (!files || files.length === 0) return [];
    const userIds = [...new Set(files.map(f => f.uploaded_by).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    return files.map(f => ({
      id: f.id,
      original_name: f.original_name,
      file_size: f.file_size,
      created_at: f.created_at,
      correction_notes: f.correction_notes,
      uploader_name: userMap[f.uploaded_by] || '알 수 없음',
    }));
  },
  async getFileById(id) {
    const { data } = await supabase.from('files').select('*').eq('id', parseInt(id)).maybeSingle();
    return data || null;
  },
  async getFilesByIds(ids) {
    const { data } = await supabase.from('files').select('*').in('id', ids.map(Number));
    return data || [];
  },
  async createFile(originalName, content, fileSize, uploadedBy) {
    const { data } = await supabase
      .from('files')
      .insert({ original_name: originalName, content, file_size: fileSize, uploaded_by: uploadedBy })
      .select().single();
    return data;
  },
  async deleteFile(id) {
    const { error } = await supabase.from('files').delete().eq('id', parseInt(id));
    return !error;
  },
  async updateFileCorrectionNotes(fileId, notes) {
    const { data } = await supabase.from('files')
      .update({ correction_notes: notes }).eq('id', parseInt(fileId)).select().single();
    return data;
  },

  // ── Source files (admin-designated file for user quiz generation) ──────────
  async getSourceFiles() {
    const { data: files } = await supabase
      .from('source_files')
      .select('id, name, file_size, is_active, created_at, uploaded_by')
      .order('created_at', { ascending: false });
    if (!files || files.length === 0) return [];
    const userIds = [...new Set(files.map(f => f.uploaded_by).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    return files.map(f => ({ ...f, uploader_name: userMap[f.uploaded_by] || '알 수 없음' }));
  },
  async getActiveSourceFile() {
    const { data } = await supabase.from('source_files').select('*').eq('is_active', true).maybeSingle();
    return data || null;
  },
  async createSourceFile(name, content, fileSize, uploadedBy) {
    const { data } = await supabase
      .from('source_files')
      .insert({ name, content, file_size: fileSize, uploaded_by: uploadedBy })
      .select().single();
    return data;
  },
  async setActiveSourceFile(id) {
    await supabase.from('source_files').update({ is_active: false }).neq('id', 0);
    const { data } = await supabase.from('source_files')
      .update({ is_active: true }).eq('id', parseInt(id)).select().single();
    return data;
  },
  async deleteSourceFile(id) {
    await supabase.from('source_files').delete().eq('id', parseInt(id));
  },

  // ── Quizzes ───────────────────────────────────────────────────────────────
  async getAllQuizzes() {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, description, created_by, created_at, is_private')
      .order('created_at', { ascending: false });
    if (!quizzes || quizzes.length === 0) return [];
    const userIds = [...new Set(quizzes.map(q => q.created_by).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    const { data: items } = await supabase.from(QUIZ_ITEM).select('quiz_id');
    const countMap = {};
    (items || []).forEach(q => { countMap[q.quiz_id] = (countMap[q.quiz_id] || 0) + 1; });
    return quizzes.map(q => ({
      ...q,
      creator_name: userMap[q.created_by] || '알 수 없음',
      question_count: countMap[q.id] || 0,
    }));
  },
  async getPublicQuizzes() {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, description, created_by, created_at, is_private')
      .eq('is_private', false)
      .order('created_at', { ascending: false });
    if (!quizzes || quizzes.length === 0) return [];
    const userIds = [...new Set(quizzes.map(q => q.created_by).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    const { data: items } = await supabase.from(QUIZ_ITEM).select('quiz_id');
    const countMap = {};
    (items || []).forEach(q => { countMap[q.quiz_id] = (countMap[q.quiz_id] || 0) + 1; });
    return quizzes.map(q => ({
      ...q,
      creator_name: userMap[q.created_by] || '알 수 없음',
      question_count: countMap[q.id] || 0,
    }));
  },
  async getPrivateQuizzesByUser(userId) {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, description, created_by, created_at, is_private')
      .eq('is_private', true)
      .eq('created_by', parseInt(userId))
      .order('created_at', { ascending: false });
    if (!quizzes || quizzes.length === 0) return [];
    const { data: items } = await supabase.from(QUIZ_ITEM).select('quiz_id');
    const countMap = {};
    (items || []).forEach(q => { countMap[q.quiz_id] = (countMap[q.quiz_id] || 0) + 1; });
    return quizzes.map(q => ({
      ...q,
      creator_name: '나',
      question_count: countMap[q.id] || 0,
    }));
  },
  async getQuizById(id) {
    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', parseInt(id)).maybeSingle();
    if (!quiz) return null;
    const { data: creator } = await supabase.from('users').select('name').eq('id', quiz.created_by).maybeSingle();
    const { data: questions } = await supabase
      .from(QUIZ_ITEM).select('*').eq('quiz_id', parseInt(id)).order('order_num');
    return {
      quiz: { ...quiz, creator_name: creator?.name || '알 수 없음' },
      questions: (questions || []).map(q => ({ ...q, options: JSON.stringify(q.options) })),
    };
  },
  async createQuizWithQuestions(title, description, createdBy, questionList) {
    const { data: quiz } = await supabase
      .from('quizzes')
      .insert({ title, description, created_by: createdBy, is_private: false })
      .select().single();
    const items = questionList.map((q, idx) => ({
      quiz_id: quiz.id, question_text: q.question, options: q.options,
      correct_answer: q.correct_answer, explanation: q.explanation || '', order_num: idx,
    }));
    const { data: savedItems } = await supabase.from(QUIZ_ITEM).insert(items).select();
    return {
      quiz,
      questions: (savedItems || []).map(q => ({ ...q, options: JSON.stringify(q.options) })),
    };
  },
  async createPrivateQuizWithQuestions(title, description, createdBy, questionList) {
    const { data: quiz } = await supabase
      .from('quizzes')
      .insert({ title, description, created_by: createdBy, is_private: true })
      .select().single();
    const items = questionList.map((q, idx) => ({
      quiz_id: quiz.id, question_text: q.question, options: q.options,
      correct_answer: q.correct_answer, explanation: q.explanation || '', order_num: idx,
    }));
    const { data: savedItems } = await supabase.from(QUIZ_ITEM).insert(items).select();
    return {
      quiz,
      questions: (savedItems || []).map(q => ({ ...q, options: JSON.stringify(q.options) })),
    };
  },
  async deleteQuiz(id) {
    await supabase.from('results').delete().eq('quiz_id', parseInt(id));
    const { error } = await supabase.from('quizzes').delete().eq('id', parseInt(id));
    return !error;
  },
  async getQuestionById(id) {
    const { data } = await supabase.from(QUIZ_ITEM).select('*').eq('id', parseInt(id)).maybeSingle();
    return data || null;
  },
  async deleteQuestion(id) {
    const { error } = await supabase.from(QUIZ_ITEM).delete().eq('id', parseInt(id));
    return !error;
  },
  async updateQuestion(id, updates) {
    const { data } = await supabase.from(QUIZ_ITEM)
      .update(updates).eq('id', parseInt(id)).select().single();
    return data;
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  async createReport(questionId, quizId, userId, questionText, comment) {
    const { data } = await supabase.from('question_reports')
      .insert({ question_id: questionId, quiz_id: quizId, user_id: userId, question_text: questionText, user_comment: comment })
      .select().single();
    return data;
  },
  async getAllReports() {
    const { data: reports } = await supabase.from('question_reports')
      .select('*').order('created_at', { ascending: false });
    if (!reports || reports.length === 0) return [];
    const userIds = [...new Set(reports.map(r => r.user_id).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, name, email').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    return reports.map(r => ({
      ...r,
      user_name: userMap[r.user_id]?.name || '알 수 없음',
      user_email: userMap[r.user_id]?.email || '',
    }));
  },
  async resolveReport(reportId) {
    const { data } = await supabase.from('question_reports')
      .update({ resolved: true }).eq('id', parseInt(reportId)).select().single();
    return data;
  },
  async deleteReport(reportId) {
    await supabase.from('question_reports').delete().eq('id', parseInt(reportId));
  },

  // ── Notices ────────────────────────────────────────────────────────────────
  async getNotices() {
    const { data } = await supabase.from('notices')
      .select('id, content, created_at').eq('is_active', true)
      .order('created_at', { ascending: false });
    return data || [];
  },
  async getAllNotices() {
    const { data } = await supabase.from('notices')
      .select('id, content, is_active, created_at, created_by')
      .order('created_at', { ascending: false });
    return data || [];
  },
  async createNotice(content, createdBy) {
    const { data } = await supabase.from('notices')
      .insert({ content, created_by: createdBy }).select().single();
    return data;
  },
  async updateNotice(id, content) {
    const { data } = await supabase.from('notices')
      .update({ content }).eq('id', parseInt(id)).select().single();
    return data;
  },
  async deleteNotice(id) {
    await supabase.from('notices').delete().eq('id', parseInt(id));
  },

  // ── Schedules ──────────────────────────────────────────────────────────────
  async getSchedules() {
    const { data, error } = await supabase.from('admin_schedules')
      .select('*').order('date', { ascending: true });
    if (error) { console.error('getSchedules error:', error); throw error; }
    return data || [];
  },
  async createSchedule(date, title, note, createdBy) {
    const { data, error } = await supabase.from('admin_schedules')
      .insert({ date, title, note: note || null, created_by: createdBy }).select().single();
    if (error) { console.error('createSchedule error:', error); throw error; }
    return data;
  },
  async updateSchedule(id, date, title, note) {
    const { data, error } = await supabase.from('admin_schedules')
      .update({ date, title, note: note || null }).eq('id', parseInt(id)).select().single();
    if (error) { console.error('updateSchedule error:', error); throw error; }
    return data;
  },
  async deleteSchedule(id) {
    const { error } = await supabase.from('admin_schedules').delete().eq('id', parseInt(id));
    if (error) { console.error('deleteSchedule error:', error); throw error; }
  },

  // ── Results ────────────────────────────────────────────────────────────────
  async deleteResult(id) {
    const { error } = await supabase.from('results').delete().eq('id', parseInt(id));
    return !error;
  },
  async createResult(userId, quizId, score, total, answers) {
    const { data } = await supabase
      .from('results')
      .insert({ user_id: userId, quiz_id: quizId, score, total, answers })
      .select().single();
    return data;
  },
  async getResultsByUser(userId) {
    const { data: results } = await supabase
      .from('results')
      .select('id, quiz_id, score, total, completed_at')
      .eq('user_id', parseInt(userId))
      .order('completed_at', { ascending: false });
    if (!results || results.length === 0) return [];
    const quizIds = [...new Set(results.map(r => r.quiz_id).filter(Boolean))];
    const { data: quizzes } = await supabase.from('quizzes').select('id, title').in('id', quizIds);
    const quizMap = Object.fromEntries((quizzes || []).map(q => [q.id, q.title]));
    return results.map(r => ({ ...r, quiz_title: quizMap[r.quiz_id] || '삭제된 퀴즈' }));
  },
  async getLeaderboard() {
    const { data: results } = await supabase.from('results').select('user_id, score, total');
    if (!results || results.length === 0) return [];
    const userStats = {};
    for (const r of results) {
      if (!userStats[r.user_id]) userStats[r.user_id] = { total_score: 0, total_questions: 0, count: 0 };
      userStats[r.user_id].total_score += r.score;
      userStats[r.user_id].total_questions += r.total;
      userStats[r.user_id].count += 1;
    }
    const userIds = Object.keys(userStats).map(Number);
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    const rankings = userIds.map(id => ({
      user_id: id,
      user_name: userMap[id] || '알 수 없음',
      quiz_count: userStats[id].count,
      avg_accuracy: userStats[id].total_questions > 0
        ? Math.round((userStats[id].total_score / userStats[id].total_questions) * 100) : 0,
      total_score: userStats[id].total_score,
      total_questions: userStats[id].total_questions,
    }));
    rankings.sort((a, b) => b.avg_accuracy - a.avg_accuracy || b.quiz_count - a.quiz_count);
    return rankings.map((r, idx) => ({ ...r, rank: idx + 1 }));
  },
  async getAllResults() {
    const { data: results } = await supabase
      .from('results')
      .select('id, user_id, quiz_id, score, total, completed_at')
      .order('completed_at', { ascending: false });
    if (!results || results.length === 0) return [];
    const userIds = [...new Set(results.map(r => r.user_id).filter(Boolean))];
    const quizIds = [...new Set(results.map(r => r.quiz_id).filter(Boolean))];
    const [{ data: users }, { data: quizzes }] = await Promise.all([
      supabase.from('users').select('id, name, email').in('id', userIds),
      supabase.from('quizzes').select('id, title').in('id', quizIds),
    ]);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const quizMap = Object.fromEntries((quizzes || []).map(q => [q.id, q.title]));
    return results.map(r => ({
      ...r,
      user_name: userMap[r.user_id]?.name || '알 수 없음',
      user_email: userMap[r.user_id]?.email || '',
      quiz_title: quizMap[r.quiz_id] || '삭제된 퀴즈',
    }));
  },

  // ── Ranking (공식 퀴즈 결과만, 새 공식) ─────────────────────────────────────
  async getRanking() {
    const { data: publicQuizzes } = await supabase
      .from('quizzes').select('id').eq('is_private', false);
    const publicQuizIds = (publicQuizzes || []).map(q => q.id);
    if (publicQuizIds.length === 0) return [];

    const { data: results } = await supabase
      .from('results').select('user_id, score, total').in('quiz_id', publicQuizIds);
    if (!results || results.length === 0) return [];

    const userStats = {};
    for (const r of results) {
      if (!userStats[r.user_id]) userStats[r.user_id] = { total_score: 0, total_questions: 0, count: 0 };
      userStats[r.user_id].total_score += r.score;
      userStats[r.user_id].total_questions += r.total;
      userStats[r.user_id].count += 1;
    }
    const userIds = Object.keys(userStats).map(Number);
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));

    const rankings = userIds.map(id => {
      const stats = userStats[id];
      const avgAccuracy = stats.total_questions > 0
        ? Math.round((stats.total_score / stats.total_questions) * 100) : 0;
      const rankingScore = parseFloat((stats.total_questions * 0.6 + avgAccuracy * 0.4).toFixed(1));
      return {
        user_id: id,
        user_name: userMap[id] || '알 수 없음',
        quiz_count: stats.count,
        total_questions: stats.total_questions,
        avg_accuracy: avgAccuracy,
        ranking_score: rankingScore,
      };
    });
    rankings.sort((a, b) => b.ranking_score - a.ranking_score || b.total_questions - a.total_questions);
    return rankings.slice(0, 50).map((r, idx) => ({ ...r, rank: idx + 1 }));
  },

  // ── Community — Posts ──────────────────────────────────────────────────────
  async getPosts() {
    const { data: posts } = await supabase
      .from('posts').select('id, user_id, title, content, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (!posts || posts.length === 0) return [];
    const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    const postIds = posts.map(p => p.id);
    const [{ data: comments }, { data: likes }] = await Promise.all([
      supabase.from('comments').select('post_id').in('post_id', postIds),
      supabase.from('post_likes').select('post_id').in('post_id', postIds),
    ]);
    const commentCount = {};
    (comments || []).forEach(c => { commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1; });
    const likeCount = {};
    (likes || []).forEach(l => { likeCount[l.post_id] = (likeCount[l.post_id] || 0) + 1; });
    return posts.map(p => ({
      ...p,
      author_name: userMap[p.user_id] || '알 수 없음',
      comment_count: commentCount[p.id] || 0,
      like_count: likeCount[p.id] || 0,
    }));
  },
  async getPostById(id, currentUserId) {
    const { data: post } = await supabase.from('posts').select('*').eq('id', parseInt(id)).maybeSingle();
    if (!post) return null;
    const { data: author } = await supabase.from('users').select('name').eq('id', post.user_id).maybeSingle();
    const { data: rawComments } = await supabase
      .from('comments').select('id, user_id, content, created_at')
      .eq('post_id', parseInt(id)).order('created_at', { ascending: true });
    const commentUserIds = [...new Set((rawComments || []).map(c => c.user_id).filter(Boolean))];
    const { data: commentUsers } = commentUserIds.length > 0
      ? await supabase.from('users').select('id, name').in('id', commentUserIds)
      : { data: [] };
    const commentUserMap = Object.fromEntries((commentUsers || []).map(u => [u.id, u.name]));
    const { data: likes } = await supabase.from('post_likes').select('id, user_id').eq('post_id', parseInt(id));
    const likeCount = (likes || []).length;
    const userLiked = currentUserId ? (likes || []).some(l => l.user_id === currentUserId) : false;
    return {
      ...post,
      author_name: author?.name || '알 수 없음',
      comments: (rawComments || []).map(c => ({ ...c, author_name: commentUserMap[c.user_id] || '알 수 없음' })),
      like_count: likeCount,
      user_liked: userLiked,
    };
  },
  async getPostRaw(id) {
    const { data } = await supabase.from('posts').select('id, user_id, title').eq('id', parseInt(id)).maybeSingle();
    return data || null;
  },
  async createPost(userId, title, content) {
    const { data } = await supabase.from('posts')
      .insert({ user_id: userId, title, content }).select().single();
    return data;
  },
  async updatePost(id, title, content) {
    const { data } = await supabase.from('posts')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', parseInt(id)).select().single();
    return data;
  },
  async deletePost(id) {
    await supabase.from('posts').delete().eq('id', parseInt(id));
  },

  // ── Community — Comments ───────────────────────────────────────────────────
  async getCommentRaw(id) {
    const { data } = await supabase.from('comments').select('id, user_id, post_id').eq('id', parseInt(id)).maybeSingle();
    return data || null;
  },
  async createComment(postId, userId, content) {
    const { data } = await supabase.from('comments')
      .insert({ post_id: postId, user_id: userId, content }).select().single();
    return data;
  },
  async deleteComment(id) {
    await supabase.from('comments').delete().eq('id', parseInt(id));
  },

  // ── Community — Likes ──────────────────────────────────────────────────────
  async toggleLike(userId, postId) {
    const { data: existing } = await supabase.from('post_likes')
      .select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle();
    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_likes').insert({ user_id: userId, post_id: postId });
    }
    const { data: likes } = await supabase.from('post_likes').select('id').eq('post_id', postId);
    return { liked: !existing, likeCount: (likes || []).length };
  },
};

module.exports = db;

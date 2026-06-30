import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './mood.css';

Chart.register(...registerables);

/* ── Constants ── */
const MOODS = [
    { score: 5, label: 'Excellent', emoji: '😄', color: '#38a169', bg: '#c6f6d5' },
    { score: 4, label: 'Good', emoji: '🙂', color: '#68d391', bg: '#f0fff4' },
    { score: 3, label: 'Neutral', emoji: '😐', color: '#d69e2e', bg: '#fefcbf' },
    { score: 2, label: 'Low', emoji: '😔', color: '#ed8936', bg: '#feebc8' },
    { score: 1, label: 'Bad', emoji: '😢', color: '#e53e3e', bg: '#fed7d7' },
];

const EMOTIONS = [
    { id: 'happy', icon: '😊', label: 'Happy' },
    { id: 'calm', icon: '😌', label: 'Calm' },
    { id: 'energetic', icon: '⚡', label: 'Energetic' },
    { id: 'grateful', icon: '🙏', label: 'Grateful' },
    { id: 'focused', icon: '🎯', label: 'Focused' },
    { id: 'confident', icon: '💪', label: 'Confident' },
    { id: 'anxious', icon: '😰', label: 'Anxious' },
    { id: 'stressed', icon: '😤', label: 'Stressed' },
    { id: 'sad', icon: '😔', label: 'Sad' },
    { id: 'angry', icon: '😠', label: 'Angry' },
    { id: 'tired', icon: '😴', label: 'Tired' },
    { id: 'lonely', icon: '🥺', label: 'Lonely' },
    { id: 'motivated', icon: '🚀', label: 'Motivated' },
    { id: 'overwhelmed', icon: '🌊', label: 'Overwhelmed' },
    { id: 'hopeful', icon: '🌟', label: 'Hopeful' },
    { id: 'irritable', icon: '😒', label: 'Irritable' },
];

const POSITIVE_EMOTIONS = ['happy', 'calm', 'energetic', 'grateful', 'focused', 'confident', 'motivated', 'hopeful'];

const TRIGGERS = [
    { id: 'work', icon: '💼', label: 'Work / Study' },
    { id: 'family', icon: '👨‍👩‍👧', label: 'Family' },
    { id: 'social', icon: '👥', label: 'Social Life' },
    { id: 'health', icon: '🏥', label: 'Health' },
    { id: 'finance', icon: '💰', label: 'Finances' },
    { id: 'sleep', icon: '😴', label: 'Poor Sleep' },
    { id: 'exercise', icon: '🏃', label: 'Exercise' },
    { id: 'weather', icon: '🌤️', label: 'Weather' },
    { id: 'food', icon: '🍽️', label: 'Food / Diet' },
    { id: 'news', icon: '📰', label: 'News / Media' },
];

const ACTIVITIES = [
    { id: 'meditate', icon: '🧘', label: 'Meditation' },
    { id: 'journal', icon: '📓', label: 'Journaling' },
    { id: 'walk', icon: '🚶', label: 'Nature Walk' },
    { id: 'music', icon: '🎵', label: 'Listen to Music' },
    { id: 'talk', icon: '💬', label: 'Talk to Someone' },
    { id: 'breathe', icon: '🌬️', label: 'Deep Breathing' },
    { id: 'read', icon: '📚', label: 'Reading' },
    { id: 'creative', icon: '🎨', label: 'Creative Activity' },
];

const MOOD_FACTS = [
    { fact: '6×', desc: 'more productive when in a positive mood' },
    { fact: '90%', desc: 'of moods are influenced by sleep quality' },
    { fact: '30 min', desc: 'of exercise can lift mood for up to 12hrs' },
    { fact: '21 days', desc: 'to build a consistent gratitude habit' },
];

const TODAY = new Date().toISOString().split('T')[0];

/* ── Helpers ── */
function getMoodByScore(score) {
    return MOODS.find(m => m.score === score) || MOODS[2];
}
function avgMoodLabel(avg) {
    if (avg >= 4.5) return { label: 'Excellent', color: '#38a169' };
    if (avg >= 3.5) return { label: 'Good', color: '#68d391' };
    if (avg >= 2.5) return { label: 'Neutral', color: '#d69e2e' };
    if (avg >= 1.5) return { label: 'Low', color: '#ed8936' };
    return { label: 'Struggling', color: '#e53e3e' };
}

/* ──────────────────────────────────────────── */
export default function Mood() {

    /* ── Log state ── */
    const [moodLog, setMoodLog] = useState(
        () => JSON.parse(localStorage.getItem('moodLog')) || []
    );

    /* Log form */
    const [lDate, setLDate] = useState(TODAY);
    const [lTime, setLTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [lScore, setLScore] = useState(3);
    const [lEmotions, setLEmotions] = useState([]);
    const [lTriggers, setLTriggers] = useState([]);
    const [lActivities, setLActivities] = useState([]);
    const [lNote, setLNote] = useState('');
    const [lEnergy, setLEnergy] = useState(3);
    const [lStress, setLStress] = useState(3);

    /* ── Mood goal ── */
    const [moodGoal, setMoodGoal] = useState(
        () => localStorage.getItem('moodGoal') || 'balance'
    );

    /* ── AI ── */
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── Chart refs ── */
    const moodChartRef = useRef(null);
    const emotionChartRef = useRef(null);
    const moodInst = useRef(null);
    const emotionInst = useRef(null);

    /* ── Persist ── */
    useEffect(() => { localStorage.setItem('moodLog', JSON.stringify(moodLog)); }, [moodLog]);
    useEffect(() => { localStorage.setItem('moodGoal', moodGoal); }, [moodGoal]);

    /* ── Charts ── */
    useEffect(() => {
        const last14 = [...moodLog]
            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
            .slice(-14);

        /* Mood Trend Line */
        if (moodChartRef.current) {
            if (moodInst.current) moodInst.current.destroy();
            moodInst.current = new Chart(moodChartRef.current.getContext('2d'), {
                type: 'line',
                data: {
                    labels: last14.map(e => e.date.slice(5)),
                    datasets: [
                        {
                            label: 'Mood Score',
                            data: last14.map(e => e.score),
                            borderColor: '#805ad5',
                            backgroundColor: 'rgba(128,90,213,0.12)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointBackgroundColor: last14.map(e => getMoodByScore(e.score).color),
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                        },
                        {
                            label: 'Energy Level',
                            data: last14.map(e => e.energy),
                            borderColor: '#d69e2e',
                            borderDash: [5, 3],
                            borderWidth: 1.5,
                            tension: 0.4,
                            fill: false,
                            pointRadius: 3,
                        },
                        {
                            label: 'Stress Level',
                            data: last14.map(e => e.stress),
                            borderColor: '#e53e3e',
                            borderDash: [3, 3],
                            borderWidth: 1.5,
                            tension: 0.4,
                            fill: false,
                            pointRadius: 3,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: {
                            min: 1, max: 5, ticks: {
                                stepSize: 1,
                                callback: v => ['', 'Bad', 'Low', 'Neutral', 'Good', 'Excellent'][v] || v,
                            }, title: { display: true, text: 'Level (1–5)' }
                        },
                    },
                },
            });
        }

        /* Emotion Doughnut */
        if (emotionChartRef.current) {
            const counts = {};
            moodLog.forEach(e => (e.emotions || []).forEach(em => {
                counts[em] = (counts[em] || 0) + 1;
            }));
            const topEmotions = Object.entries(counts)
                .sort((a, b) => b[1] - a[1]).slice(0, 8);
            const COLORS = ['#805ad5', '#38a169', '#d69e2e', '#e53e3e', '#3182ce', '#ed8936', '#00b5d8', '#9b2c2c'];
            if (emotionInst.current) emotionInst.current.destroy();
            emotionInst.current = new Chart(emotionChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: topEmotions.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
                    datasets: [{
                        data: topEmotions.map(([, v]) => v),
                        backgroundColor: COLORS.slice(0, topEmotions.length),
                        borderWidth: 2,
                    }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
            });
        }

        return () => { moodInst.current?.destroy(); emotionInst.current?.destroy(); };
    }, [moodLog]);

    /* ── Handlers ── */
    function toggleEmotion(id) {
        setLEmotions(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
    }
    function toggleTrigger(id) {
        setLTriggers(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    }
    function toggleActivity(id) {
        setLActivities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    }

    function logMood() {
        const entry = {
            id: Date.now(),
            date: lDate || TODAY,
            time: lTime,
            score: lScore,
            emotions: lEmotions,
            triggers: lTriggers,
            activities: lActivities,
            note: lNote,
            energy: lEnergy,
            stress: lStress,
        };
        setMoodLog(prev => [...prev, entry]);
        setLEmotions([]); setLTriggers([]); setLActivities([]);
        setLNote(''); setLScore(3); setLEnergy(3); setLStress(3);
    }

    function removeEntry(id) {
        setMoodLog(prev => prev.filter(e => e.id !== id));
    }

    function clearLog() {
        if (window.confirm('Clear all mood logs? This cannot be undone.')) {
            setMoodLog([]);
            localStorage.removeItem('moodLog');
        }
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your mood data…');

        const totalEntries = moodLog.length;
        const avgScore = totalEntries
            ? (moodLog.reduce((s, e) => s + e.score, 0) / totalEntries).toFixed(1) : 0;
        const avgEnergy = totalEntries
            ? (moodLog.reduce((s, e) => s + e.energy, 0) / totalEntries).toFixed(1) : 0;
        const avgStress = totalEntries
            ? (moodLog.reduce((s, e) => s + e.stress, 0) / totalEntries).toFixed(1) : 0;

        const last7 = moodLog.filter(e => (Date.now() - new Date(e.date)) / 86400000 <= 7);
        const weekAvg = last7.length
            ? (last7.reduce((s, e) => s + e.score, 0) / last7.length).toFixed(1) : 0;

        const emotionCounts = {};
        moodLog.forEach(e => (e.emotions || []).forEach(em => {
            emotionCounts[em] = (emotionCounts[em] || 0) + 1;
        }));
        const topEmotions = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k).join(', ') || 'None logged';

        const triggerCounts = {};
        moodLog.forEach(e => (e.triggers || []).forEach(t => {
            triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        }));
        const topTriggers = Object.entries(triggerCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(', ') || 'None logged';

        const prompt = `You are a mental wellness coach AI. Here is my mood tracking data:
- Total mood entries: ${totalEntries}
- All-time average mood score: ${avgScore}/5
- This week's average mood: ${weekAvg}/5
- Average energy level: ${avgEnergy}/5
- Average stress level: ${avgStress}/5
- Most frequent emotions: ${topEmotions}
- Most common triggers: ${topTriggers}
- Wellness goal: ${moodGoal}

Give a concise, honest mental wellness report (under 180 words) that:
1. Evaluates overall mood pattern and emotional trends.
2. Gives 2-3 specific, actionable tips to improve mental wellbeing.
3. Addresses the most common triggers and how to manage them.
4. Ends with a short motivational note.
Use bullet points. Keep it warm, practical and encouraging.`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            const data = await response.json();
            setAiReport(data.error ? '❌ Error: ' + data.error.message : data.content[0].text);
        } catch (err) {
            setAiReport('❌ Connection error: ' + err.message);
        } finally {
            setAiLoading(false);
        }
    }

    /* ── Derived values ── */
    const totalEntries = moodLog.length;
    const avgScore = totalEntries
        ? parseFloat((moodLog.reduce((s, e) => s + e.score, 0) / totalEntries).toFixed(1)) : null;
    const avgEnergy = totalEntries
        ? parseFloat((moodLog.reduce((s, e) => s + e.energy, 0) / totalEntries).toFixed(1)) : null;
    const avgStress = totalEntries
        ? parseFloat((moodLog.reduce((s, e) => s + e.stress, 0) / totalEntries).toFixed(1)) : null;

    const last7 = moodLog.filter(e => (Date.now() - new Date(e.date)) / 86400000 <= 7);
    const weekAvg = last7.length
        ? parseFloat((last7.reduce((s, e) => s + e.score, 0) / last7.length).toFixed(1)) : null;

    const todayEntries = moodLog.filter(e => e.date === TODAY);
    const todayAvg = todayEntries.length
        ? parseFloat((todayEntries.reduce((s, e) => s + e.score, 0) / todayEntries.length).toFixed(1)) : null;

    /* streak */
    const loggedDates = new Set(moodLog.map(e => e.date));
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (loggedDates.has(d.toISOString().split('T')[0])) streak++;
        else break;
    }

    const avgLabel = avgScore !== null ? avgMoodLabel(avgScore) : null;
    const todayMood = todayAvg !== null ? getMoodByScore(Math.round(todayAvg)) : null;
    const recentLogs = [...moodLog].reverse().slice(0, 10);
    const currentMood = getMoodByScore(lScore);

    /* top emotions */
    const emotionCounts = {};
    moodLog.forEach(e => (e.emotions || []).forEach(em => {
        emotionCounts[em] = (emotionCounts[em] || 0) + 1;
    }));
    const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    /* positive ratio */
    const allEmotionIds = moodLog.flatMap(e => e.emotions || []);
    const positiveRatio = allEmotionIds.length
        ? Math.round((allEmotionIds.filter(e => POSITIVE_EMOTIONS.includes(e)).length / allEmotionIds.length) * 100)
        : null;

    /* ── Render ── */
    return (
        <div className="container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>🧠 Mood Dashboard</h1>
            </header>

            <main>

                {/* ── Mood Facts ── */}
                <div className="facts-row">
                    {MOOD_FACTS.map(f => (
                        <div key={f.fact} className="fact-box">
                            <div className="fact-val">{f.fact}</div>
                            <div className="fact-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── Goal Tabs ── */}
                <div className="card">
                    <h2>🎯 Wellness Goal</h2>
                    <div className="goal-tabs">
                        {[
                            { id: 'balance', label: '⚖️ Emotional Balance' },
                            { id: 'reduce', label: '😌 Reduce Stress' },
                            { id: 'positivity', label: '🌟 Build Positivity' },
                            { id: 'awareness', label: '🔍 Self Awareness' },
                        ].map(g => (
                            <div key={g.id}
                                className={`goal-tab${moodGoal === g.id ? ' active' : ''}`}
                                onClick={() => setMoodGoal(g.id)}>
                                {g.label}
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                        Your current focus: <strong style={{ color: '#805ad5' }}>
                            {moodGoal === 'balance' ? 'Maintaining emotional balance day to day' :
                                moodGoal === 'reduce' ? 'Managing and reducing stress levels' :
                                    moodGoal === 'positivity' ? 'Cultivating more positive emotions' :
                                        'Building deeper self-awareness through reflection'}
                        </strong>
                    </p>
                </div>

                {/* ── Today's Stats ── */}
                {totalEntries > 0 && (
                    <div className="card" id="stats-card">
                        <h2>📊 Mood Analytics</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <div className="val" style={{ color: avgLabel?.color }}>{avgScore ?? '—'}</div>
                                <div className="lbl">Avg Mood Score</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: avgLabel?.color }}>{avgLabel?.label ?? '—'}</div>
                                <div className="lbl">Overall Rating</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: weekAvg !== null ? avgMoodLabel(weekAvg).color : '#333' }}>
                                    {weekAvg ?? '—'}
                                </div>
                                <div className="lbl">This Week Avg</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: todayMood?.color || '#333' }}>
                                    {todayMood ? todayMood.emoji : '—'}
                                </div>
                                <div className="lbl">Today's Mood</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: positiveRatio >= 60 ? '#38a169' : '#e53e3e' }}>
                                    {positiveRatio !== null ? `${positiveRatio}%` : '—'}
                                </div>
                                <div className="lbl">Positive Emotions</div>
                            </div>
                            <div className="stat-box">
                                <div className="val">{streak}</div>
                                <div className="lbl">Log Streak 🔥</div>
                            </div>
                        </div>

                        {/* Energy / Stress summary */}
                        <div className="energy-stress-row">
                            <div className="es-box" style={{ borderColor: '#d69e2e55', background: '#fffff0' }}>
                                <span className="es-label">⚡ Avg Energy</span>
                                <div className="progress-bar-wrap" style={{ marginTop: '6px' }}>
                                    <div className="progress-bar-fill"
                                        style={{ width: `${(avgEnergy / 5) * 100}%`, background: '#d69e2e' }} />
                                </div>
                                <span className="es-val" style={{ color: '#d69e2e' }}>{avgEnergy}/5</span>
                            </div>
                            <div className="es-box" style={{ borderColor: '#e53e3e55', background: '#fff5f5' }}>
                                <span className="es-label">😤 Avg Stress</span>
                                <div className="progress-bar-wrap" style={{ marginTop: '6px' }}>
                                    <div className="progress-bar-fill"
                                        style={{ width: `${(avgStress / 5) * 100}%`, background: '#e53e3e' }} />
                                </div>
                                <span className="es-val" style={{ color: '#e53e3e' }}>{avgStress}/5</span>
                            </div>
                        </div>

                        {/* Top emotions */}
                        {topEmotions.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#555', marginBottom: '8px' }}>
                                    🔝 Your Most Frequent Emotions
                                </div>
                                <div className="top-emotions">
                                    {topEmotions.map(([id, count]) => {
                                        const em = EMOTIONS.find(e => e.id === id);
                                        return em ? (
                                            <div key={id} className="top-emotion-chip"
                                                style={{
                                                    background: POSITIVE_EMOTIONS.includes(id) ? '#c6f6d5' : '#fed7d7',
                                                    color: POSITIVE_EMOTIONS.includes(id) ? '#276749' : '#742a2a'
                                                }}>
                                                {em.icon} {em.label}
                                                <span className="emotion-count">{count}×</span>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Log Today's Mood ── */}
                <div className="card">
                    <h2>📝 Log Your Mood</h2>

                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="m-date">Date</label>
                            <input type="date" id="m-date" value={lDate} onChange={e => setLDate(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="m-time">Time</label>
                            <input type="time" id="m-time" value={lTime} onChange={e => setLTime(e.target.value)} />
                        </div>
                    </div>

                    {/* Mood Selector */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px' }}>How are you feeling?</label>
                        <div className="mood-selector">
                            {MOODS.map(m => (
                                <div key={m.score}
                                    className={`mood-option${lScore === m.score ? ' selected' : ''}`}
                                    style={lScore === m.score
                                        ? { background: m.bg, borderColor: m.color, transform: 'scale(1.1)' }
                                        : {}}
                                    onClick={() => setLScore(m.score)}>
                                    <span className="mood-emoji">{m.emoji}</span>
                                    <span className="mood-label" style={lScore === m.score ? { color: m.color } : {}}>
                                        {m.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mood-selected-banner"
                            style={{ background: currentMood.bg, color: currentMood.color }}>
                            {currentMood.emoji} You selected: <strong>{currentMood.label}</strong>
                        </div>
                    </div>

                    {/* Energy & Stress sliders */}
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="m-energy">⚡ Energy Level: <strong style={{ color: '#d69e2e' }}>{lEnergy}/5</strong></label>
                            <input type="range" id="m-energy" min="1" max="5" step="1"
                                value={lEnergy} onChange={e => setLEnergy(parseInt(e.target.value))}
                                className="mood-slider energy-slider" />
                            <div className="slider-labels">
                                <span>Drained</span><span>Energised</span>
                            </div>
                        </div>
                        <div className="input-box">
                            <label htmlFor="m-stress">😤 Stress Level: <strong style={{ color: '#e53e3e' }}>{lStress}/5</strong></label>
                            <input type="range" id="m-stress" min="1" max="5" step="1"
                                value={lStress} onChange={e => setLStress(parseInt(e.target.value))}
                                className="mood-slider stress-slider" />
                            <div className="slider-labels">
                                <span>Relaxed</span><span>Overwhelmed</span>
                            </div>
                        </div>
                    </div>

                    {/* Emotions */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                            🎭 What emotions are you feeling? <span style={{ color: '#888', fontWeight: 400 }}>(select all that apply)</span>
                        </label>
                        <div className="chip-grid">
                            {EMOTIONS.map(e => (
                                <div key={e.id}
                                    className={`chip${lEmotions.includes(e.id) ? ' chip-selected' : ''}`}
                                    style={lEmotions.includes(e.id)
                                        ? {
                                            background: POSITIVE_EMOTIONS.includes(e.id) ? '#c6f6d5' : '#fed7d7',
                                            borderColor: POSITIVE_EMOTIONS.includes(e.id) ? '#38a169' : '#e53e3e',
                                            color: POSITIVE_EMOTIONS.includes(e.id) ? '#276749' : '#742a2a'
                                        }
                                        : {}}
                                    onClick={() => toggleEmotion(e.id)}>
                                    {e.icon} {e.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Triggers */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                            ⚡ What's affecting your mood? <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
                        </label>
                        <div className="chip-grid">
                            {TRIGGERS.map(t => (
                                <div key={t.id}
                                    className={`chip${lTriggers.includes(t.id) ? ' chip-trigger' : ''}`}
                                    onClick={() => toggleTrigger(t.id)}>
                                    {t.icon} {t.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coping Activities */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                            🌿 Any self-care activities today? <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
                        </label>
                        <div className="chip-grid">
                            {ACTIVITIES.map(a => (
                                <div key={a.id}
                                    className={`chip${lActivities.includes(a.id) ? ' chip-activity' : ''}`}
                                    onClick={() => toggleActivity(a.id)}>
                                    {a.icon} {a.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <label htmlFor="m-note">📓 Journal Note <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
                            <textarea id="m-note" rows="3" placeholder="How are you feeling today? What's on your mind?"
                                value={lNote} onChange={e => setLNote(e.target.value)}
                                style={{
                                    width: '100%', padding: '11px', border: '1px solid #cbd5e0',
                                    borderRadius: '6px', fontSize: '15px', resize: 'vertical',
                                    fontFamily: 'inherit', lineHeight: 1.5,
                                }} />
                        </div>
                    </div>

                    <button onClick={logMood}>💾 Save Mood Entry</button>

                    {/* Recent Log */}
                    <div id="log-list">
                        {recentLogs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#888', padding: '12px' }}>No mood entries yet.</p>
                            : recentLogs.map(e => {
                                const mood = getMoodByScore(e.score);
                                return (
                                    <div key={e.id} className="log-item">
                                        <span style={{ color: '#555', fontSize: '0.78rem' }}>{e.date} {e.time}</span>
                                        <span style={{ fontSize: '1.2rem' }}>{mood.emoji}</span>
                                        <span className="log-tag" style={{ background: mood.bg, color: mood.color }}>
                                            {mood.label}
                                        </span>
                                        <span style={{ color: '#d69e2e', fontSize: '0.8rem' }}>⚡{e.energy}/5</span>
                                        <span style={{ color: '#e53e3e', fontSize: '0.8rem' }}>😤{e.stress}/5</span>
                                        {e.note && (
                                            <span style={{ color: '#718096', fontSize: '0.78rem', fontStyle: 'italic', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                "{e.note}"
                                            </span>
                                        )}
                                        <button className="remove-btn" onClick={() => removeEntry(e.id)}>✕</button>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* ── Charts Row ── */}
                <div className="charts-row" style={{ marginBottom: '25px' }}>
                    <div className="chart-card">
                        <h3>📈 Mood, Energy & Stress Trend</h3>
                        <div className="chart-mini"><canvas ref={moodChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>🎭 Top Emotions Distribution</h3>
                        <div className="chart-mini"><canvas ref={emotionChartRef} /></div>
                    </div>
                </div>

                {/* ── Coping Toolkit ── */}
                <div className="card">
                    <h2>🌿 Coping Toolkit</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '14px' }}>
                        Evidence-based activities to lift your mood and reduce stress.
                    </p>
                    <div className="toolkit-grid">
                        {ACTIVITIES.map(a => {
                            const usedCount = moodLog.filter(e => (e.activities || []).includes(a.id)).length;
                            return (
                                <div key={a.id} className="toolkit-item">
                                    <span className="toolkit-icon">{a.icon}</span>
                                    <div className="toolkit-info">
                                        <span className="toolkit-label">{a.label}</span>
                                        <span className="toolkit-count">{usedCount}× logged</span>
                                    </div>
                                    <div className="progress-bar-wrap" style={{ flex: 1, minWidth: '60px' }}>
                                        <div className="progress-bar-fill"
                                            style={{ width: `${Math.min((usedCount / Math.max(totalEntries, 1)) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Trigger Analysis ── */}
                <div className="card">
                    <h2>⚡ Trigger Analysis</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '14px' }}>
                        What's most frequently affecting your mood.
                    </p>
                    <div className="trigger-grid">
                        {TRIGGERS.map(t => {
                            const count = moodLog.filter(e => (e.triggers || []).includes(t.id)).length;
                            if (count === 0) return null;
                            const pct = Math.round((count / totalEntries) * 100);
                            return (
                                <div key={t.id} className="trigger-item">
                                    <span className="trigger-icon">{t.icon}</span>
                                    <span className="trigger-label">{t.label}</span>
                                    <span className="trigger-count">{count}× ({pct}%)</span>
                                    <div className="progress-bar-wrap" style={{ flex: 1, minWidth: '60px' }}>
                                        <div className="progress-bar-fill"
                                            style={{ width: `${pct}%`, background: '#ed8936' }} />
                                    </div>
                                </div>
                            );
                        }).filter(Boolean)}
                        {!moodLog.some(e => (e.triggers || []).length > 0) && (
                            <p style={{ color: '#888', fontSize: '0.88rem' }}>No triggers logged yet. Log mood entries with triggers to see analysis.</p>
                        )}
                    </div>
                </div>

                {/* ── Manage Data ── */}
                <div className="card">
                    <h2>📈 Manage Data</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '12px' }}>
                        You have <strong>{totalEntries}</strong> mood entries logged over <strong>{loggedDates.size}</strong> days.
                    </p>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Clear All Mood Data
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="card">
                    <h3>🤖 AI Wellness Report</h3>
                    <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '12px' }}>
                        Analyses your mood scores, emotional patterns, stress levels, and triggers to give personalised mental wellness advice.
                    </p>
                    <button className="btn-ai" onClick={generateAIReport} disabled={aiLoading}>
                        {aiLoading ? 'Generating…' : 'Generate AI Report'}
                    </button>
                    {aiReport && (
                        <div id="ai-report-box" style={{ marginTop: '16px', whiteSpace: 'pre-wrap' }}>
                            {aiReport}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}

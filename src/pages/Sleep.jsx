import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './sleep.css';

Chart.register(...registerables);

/* ── Constants ── */
const SLEEP_TIPS = [
    { id: 'dark', icon: '🌑', label: 'Keep room dark (blackout curtains)' },
    { id: 'cool', icon: '❄️', label: 'Keep room cool (16–19 °C / 61–66 °F)' },
    { id: 'noscreen', icon: '📵', label: 'No screens 60 min before bed' },
    { id: 'caffeine', icon: '☕', label: 'No caffeine after 2 PM' },
    { id: 'schedule', icon: '⏰', label: 'Same sleep & wake time every day' },
    { id: 'exercise', icon: '🏃', label: 'Exercise earlier in the day' },
    { id: 'wind', icon: '📖', label: 'Wind-down routine (reading, stretching)' },
    { id: 'alcohol', icon: '🍷', label: 'Avoid alcohol within 3 hrs of bedtime' },
];

const QUALITY_LABELS = { 1: 'Very Poor', 2: 'Poor', 3: 'Fair', 4: 'Good', 5: 'Excellent' };
const QUALITY_COLORS = { 1: '#e53e3e', 2: '#dd6b20', 3: '#d69e2e', 4: '#38a169', 5: '#2b6cb0' };

const SLEEP_STAGES = [
    { name: 'Light Sleep (N1–N2)', pct: '50–60%', desc: 'Transition & consolidation phase', color: '#bee3f8' },
    { name: 'Deep Sleep (N3)', pct: '15–20%', desc: 'Physical repair & immune support', color: '#c6f6d5' },
    { name: 'REM Sleep', pct: '20–25%', desc: 'Memory, emotion & creativity', color: '#fefcbf' },
    { name: 'Awake periods', pct: '5–10%', desc: 'Brief arousals — normal in adults', color: '#fed7d7' },
];

const AGE_RECOMMENDATIONS = [
    { range: '6–13 yrs', hrs: '9–11' },
    { range: '14–17 yrs', hrs: '8–10' },
    { range: '18–25 yrs', hrs: '7–9' },
    { range: '26–64 yrs', hrs: '7–9' },
    { range: '65+ yrs', hrs: '7–8' },
];

const TODAY = new Date().toISOString().split('T')[0];

/* ── Helpers ── */
function toMins(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function durationHrs(bedtime, wakeTime) {
    if (!bedtime || !wakeTime) return null;
    let bed = toMins(bedtime);
    let wake = toMins(wakeTime);
    if (wake <= bed) wake += 24 * 60;
    return parseFloat(((wake - bed) / 60).toFixed(2));
}

function sleepScore(duration, quality, consistency) {
    const durScore = Math.min(Math.max(((duration - 4) / (9 - 4)) * 40, 0), 40);
    const qualScore = (quality / 5) * 40;
    const consScore = Math.min(consistency * 4, 20);
    return Math.round(durScore + qualScore + consScore);
}

function scoreLabel(score) {
    if (score >= 85) return { label: 'Excellent', color: '#38a169' };
    if (score >= 70) return { label: 'Good', color: '#2b6cb0' };
    if (score >= 50) return { label: 'Fair', color: '#d69e2e' };
    return { label: 'Poor', color: '#e53e3e' };
}

function recommendedHrs(age) {
    if (age < 14) return [9, 11];
    if (age < 18) return [8, 10];
    if (age < 65) return [7, 9];
    return [7, 8];
}

/* ──────────────────────────────────────────── */
export default function Sleep() {
    /* ── Profile state ── */
    const [userProfile, setUserProfile] = useState(
        () => JSON.parse(localStorage.getItem('sleepProfile')) || null
    );
    const [pAge, setPAge] = useState(userProfile?.age || '');
    const [pGoal, setPGoal] = useState(userProfile?.goal || 'quality');

    /* ── Log state ── */
    const [sleepLog, setSleepLog] = useState(
        () => JSON.parse(localStorage.getItem('sleepLog')) || []
    );

    /* Log form */
    const [lDate, setLDate] = useState(TODAY);
    const [lBed, setLBed] = useState('22:30');
    const [lWake, setLWake] = useState('06:30');
    const [lQuality, setLQuality] = useState(3);
    const [lNotes, setLNotes] = useState('');

    /* ── Hygiene checklist ── */
    const [checklist, setChecklist] = useState(
        () => JSON.parse(localStorage.getItem('sleepChecklist')) || {}
    );

    /* ── AI Report ── */
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── Chart refs ── */
    const durationChartRef = useRef(null);
    const qualityChartRef = useRef(null);
    const durationInst = useRef(null);
    const qualityInst = useRef(null);

    /* ── Persist ── */
    useEffect(() => {
        localStorage.setItem('sleepLog', JSON.stringify(sleepLog));
    }, [sleepLog]);

    useEffect(() => {
        localStorage.setItem('sleepChecklist', JSON.stringify(checklist));
    }, [checklist]);

    useEffect(() => {
        if (userProfile)
            localStorage.setItem('sleepProfile', JSON.stringify(userProfile));
    }, [userProfile]);

    /* ── Charts ── */
    useEffect(() => {
        const last7 = [...sleepLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

        /* Duration Chart */
        if (durationChartRef.current) {
            const labels = last7.map(e => e.date.slice(5));
            const durations = last7.map(e => e.duration);
            const recLow = userProfile ? recommendedHrs(userProfile.age)[0] : 7;
            const recHigh = userProfile ? recommendedHrs(userProfile.age)[1] : 9;

            if (durationInst.current) durationInst.current.destroy();
            durationInst.current = new Chart(durationChartRef.current.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Hours Slept',
                            data: durations,
                            backgroundColor: durations.map(d =>
                                d >= recLow && d <= recHigh ? 'rgba(56,161,105,0.7)' : 'rgba(229,62,62,0.65)'
                            ),
                            borderRadius: 4,
                        },
                        {
                            label: `Recommended (${recLow}–${recHigh}h)`,
                            data: last7.map(() => recHigh),
                            type: 'line',
                            borderColor: '#3182ce',
                            borderDash: [6, 4],
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: false, min: 0, max: 12, title: { display: true, text: 'Hours' } } },
                },
            });
        }

        /* Quality Chart */
        if (qualityChartRef.current) {
            const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            sleepLog.forEach(e => { counts[e.quality] = (counts[e.quality] || 0) + 1; });
            const labels = Object.keys(counts).map(k => QUALITY_LABELS[k]);
            const data = Object.values(counts);
            const colors = Object.keys(counts).map(k => QUALITY_COLORS[k]);

            if (qualityInst.current) qualityInst.current.destroy();
            qualityInst.current = new Chart(qualityChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
            });
        }

        return () => {
            durationInst.current?.destroy();
            qualityInst.current?.destroy();
        };
    }, [sleepLog, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Handlers ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        setUserProfile({ age: parseInt(pAge), goal: pGoal });
    }

    function logSleep() {
        const dur = durationHrs(lBed, lWake);
        if (!dur || dur <= 0) { alert('Please enter valid bedtime and wake time.'); return; }
        const entry = {
            id: Date.now(),
            date: lDate || TODAY,
            bedtime: lBed,
            wakeTime: lWake,
            duration: dur,
            quality: parseInt(lQuality),
            notes: lNotes,
        };
        setSleepLog(prev => [...prev, entry]);
        setLNotes('');
    }

    function clearLog() {
        if (window.confirm('Clear all sleep logs? This cannot be undone.')) {
            setSleepLog([]);
            localStorage.removeItem('sleepLog');
        }
    }

    function toggleTip(id) {
        setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your sleep data…');

        const totalNights = sleepLog.length;
        const avgDur = totalNights
            ? (sleepLog.reduce((s, e) => s + e.duration, 0) / totalNights).toFixed(1)
            : 0;
        const avgQual = totalNights
            ? (sleepLog.reduce((s, e) => s + e.quality, 0) / totalNights).toFixed(1)
            : 0;
        const last7 = sleepLog.filter(e => (Date.now() - new Date(e.date)) / 86400000 <= 7);
        const weekAvgDur = last7.length
            ? (last7.reduce((s, e) => s + e.duration, 0) / last7.length).toFixed(1)
            : 0;

        const recRange = userProfile ? recommendedHrs(userProfile.age).join('–') : '7–9';
        const profileSummary = userProfile
            ? `Age ${userProfile.age}, goal: ${pGoal}, recommended sleep: ${recRange} hrs.`
            : 'Profile not filled in yet.';

        const checkedTips = SLEEP_TIPS.filter(t => checklist[t.id]).map(t => t.label).join(', ') || 'None checked';

        const prompt = `You are a sleep health coach AI. Here is my sleep data:
- Profile: ${profileSummary}
- Total nights logged: ${totalNights}
- All-time average sleep duration: ${avgDur} hrs
- All-time average sleep quality: ${avgQual}/5
- This week's average sleep duration: ${weekAvgDur} hrs
- Sleep hygiene habits currently practised: ${checkedTips}

Please give a concise, honest sleep report (under 180 words) that:
1. States whether I am sleep-deprived, oversleeping, or on track.
2. Gives 2-3 specific, actionable tips to improve sleep.
3. Ends with a short motivational note.
Use bullet points. Keep it practical and encouraging.`;

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
            if (data.error) {
                setAiReport('❌ Error: ' + data.error.message);
            } else {
                setAiReport(data.content[0].text);
            }
        } catch (err) {
            setAiReport('❌ Connection error: ' + err.message);
        } finally {
            setAiLoading(false);
        }
    }

    /* ── Derived ── */
    const totalNights = sleepLog.length;
    const avgDuration = totalNights
        ? parseFloat((sleepLog.reduce((s, e) => s + e.duration, 0) / totalNights).toFixed(1))
        : null;
    const avgQuality = totalNights
        ? parseFloat((sleepLog.reduce((s, e) => s + e.quality, 0) / totalNights).toFixed(1))
        : null;
    const last7 = sleepLog.filter(e => (Date.now() - new Date(e.date)) / 86400000 <= 7);
    const sleepDebt = userProfile && avgDuration != null
        ? Math.max(0, parseFloat((recommendedHrs(userProfile.age)[0] - avgDuration).toFixed(1)))
        : null;

    /* consistency: number of consecutive days in last 7 with a log */
    const loggedDates = new Set(sleepLog.map(e => e.date));
    let streak = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (loggedDates.has(d.toISOString().split('T')[0])) streak++;
        else break;
    }

    const score = avgDuration && avgQuality
        ? sleepScore(avgDuration, avgQuality, streak)
        : null;
    const scoreInfo = score !== null ? scoreLabel(score) : null;

    const recRange = userProfile ? recommendedHrs(userProfile.age) : [7, 9];
    const recentLogs = [...sleepLog].reverse().slice(0, 10);
    const checkedCount = SLEEP_TIPS.filter(t => checklist[t.id]).length;

    /* ── Render ── */
    return (
        <div className="sleep-container">
            <header className="sleep-header">
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>🌙 Sleep Dashboard</h1>
            </header>

            <main>
                {/* ── Profile Card ── */}
                <div className="sleep-card">
                    <h2>👤 Sleep Profile</h2>

                    <div className="goal-tabs">
                        {[
                            { id: 'quality', label: '✨ Improve Quality' },
                            { id: 'duration', label: '⏳ Increase Duration' },
                            { id: 'consistency', label: '📅 Build Consistency' },
                        ].map(g => (
                            <div
                                key={g.id}
                                className={`goal-tab${pGoal === g.id ? ' active' : ''}`}
                                onClick={() => setPGoal(g.id)}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="s-age">Age (yrs)</label>
                                <input type="number" id="s-age" min="6" max="100" placeholder="e.g., 28"
                                    value={pAge} onChange={e => setPAge(e.target.value)} required />
                            </div>
                            <div className="input-box" style={{ flex: '2 1 320px' }}>
                                <label>Recommended Sleep by Age</label>
                                <div className="age-table">
                                    {AGE_RECOMMENDATIONS.map(r => (
                                        <div key={r.range} className="age-row">
                                            <span className="age-range">{r.range}</span>
                                            <span className="age-hrs">{r.hrs} hrs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button type="submit">Save Profile</button>
                    </form>
                </div>

                {/* ── Sleep Analytics ── */}
                {userProfile && score !== null && (
                    <div className="sleep-card" id="stats-card">
                        <h2>📊 Sleep Analytics</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <div className="val" style={{ color: scoreInfo.color }}>{score}</div>
                                <div className="lbl">Sleep Score</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: scoreInfo.color }}>{scoreInfo.label}</div>
                                <div className="lbl">Score Rating</div>
                            </div>
                            <div className="stat-box">
                                <div className="val">{avgDuration}h</div>
                                <div className="lbl">Avg Duration</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: QUALITY_COLORS[Math.round(avgQuality)] }}>
                                    {avgQuality}/5
                                </div>
                                <div className="lbl">Avg Quality</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: sleepDebt > 0 ? '#e53e3e' : '#38a169' }}>
                                    {sleepDebt > 0 ? `-${sleepDebt}h` : '✓'}
                                </div>
                                <div className="lbl">Sleep Debt</div>
                            </div>
                            <div className="stat-box">
                                <div className="val">{streak}</div>
                                <div className="lbl">Day Streak 🔥</div>
                            </div>
                        </div>

                        {/* Score bar */}
                        <div style={{ marginTop: '6px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '6px' }}>
                                Sleep Score: <strong style={{ color: scoreInfo.color }}>{score}/100</strong>
                            </div>
                            <div className="progress-bar-wrap">
                                <div className="progress-bar-fill"
                                    style={{ width: `${score}%`, background: scoreInfo.color }} />
                            </div>
                        </div>

                        {/* Recommended range */}
                        <div className="rec-range-box">
                            <span>🎯 Recommended for age {userProfile.age}:</span>
                            <strong> {recRange[0]}–{recRange[1]} hours/night</strong>
                        </div>
                    </div>
                )}

                {/* ── Sleep Stages ── */}
                <div className="sleep-card">
                    <h2>🧠 Sleep Stages Explained</h2>
                    <div className="stages-grid">
                        {SLEEP_STAGES.map(s => (
                            <div key={s.name} className="stage-box" style={{ background: s.color }}>
                                <div className="stage-pct">{s.pct}</div>
                                <div className="stage-name">{s.name}</div>
                                <div className="stage-desc">{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Log a Night ── */}
                <div className="sleep-card">
                    <h2>📝 Log a Night's Sleep</h2>
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-date">Date (night of)</label>
                            <input type="date" id="l-date" value={lDate} onChange={e => setLDate(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-bed">Bedtime</label>
                            <input type="time" id="l-bed" value={lBed} onChange={e => setLBed(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-wake">Wake Time</label>
                            <input type="time" id="l-wake" value={lWake} onChange={e => setLWake(e.target.value)} />
                        </div>
                    </div>

                    {/* Duration preview */}
                    {lBed && lWake && (
                        <div className="duration-preview">
                            ⏱️ Duration: <strong>
                                {durationHrs(lBed, lWake)
                                    ? `${durationHrs(lBed, lWake)} hrs`
                                    : '—'}
                            </strong>
                        </div>
                    )}

                    <div className="form-group">
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <label>Sleep Quality</label>
                            <div className="quality-picker">
                                {[1, 2, 3, 4, 5].map(q => (
                                    <div
                                        key={q}
                                        className={`quality-star${lQuality >= q ? ' filled' : ''}`}
                                        style={lQuality >= q ? { background: QUALITY_COLORS[q], borderColor: QUALITY_COLORS[q] } : {}}
                                        onClick={() => setLQuality(q)}
                                    >
                                        {q}
                                    </div>
                                ))}
                                <span className="quality-label" style={{ color: QUALITY_COLORS[lQuality] }}>
                                    {QUALITY_LABELS[lQuality]}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <label htmlFor="l-notes">Notes (optional)</label>
                            <input type="text" id="l-notes" placeholder="e.g., woke up twice, had vivid dreams…"
                                value={lNotes} onChange={e => setLNotes(e.target.value)} />
                        </div>
                    </div>

                    <button onClick={logSleep}>Save Sleep Entry</button>

                    {/* Recent Logs */}
                    <div id="sleep-log-list">
                        {recentLogs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#888', padding: '12px' }}>No sleep entries yet.</p>
                            : recentLogs.map(e => (
                                <div key={e.id} className="log-item">
                                    <span style={{ color: '#555', fontSize: '0.8rem' }}>{e.date}</span>
                                    <span className="log-tag">{e.bedtime} → {e.wakeTime}</span>
                                    <span style={{ fontWeight: 600 }}>🌙 {e.duration}h</span>
                                    <span style={{ color: QUALITY_COLORS[e.quality], fontWeight: 600 }}>
                                        {'★'.repeat(e.quality)}{'☆'.repeat(5 - e.quality)}
                                    </span>
                                    {e.notes && <span style={{ color: '#718096', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                        "{e.notes}"
                                    </span>}
                                </div>
                            ))}
                    </div>
                </div>

                {/* ── Charts Row ── */}
                <div className="charts-row">
                    <div className="chart-card">
                        <h3>🌙 Sleep Duration (Last 7 Nights)</h3>
                        <div className="chart-mini"><canvas ref={durationChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>⭐ Quality Distribution</h3>
                        <div className="chart-mini"><canvas ref={qualityChartRef} /></div>
                    </div>
                </div>

                {/* ── Sleep Hygiene Checklist ── */}
                <div className="sleep-card">
                    <h2>✅ Sleep Hygiene Checklist</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '14px' }}>
                        Check the habits you practised today. Goal: build these consistently.
                    </p>

                    {/* Progress */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.88rem', color: '#555', marginBottom: '6px' }}>
                            <strong>{checkedCount}/{SLEEP_TIPS.length}</strong> habits today
                        </div>
                        <div className="progress-bar-wrap">
                            <div className="progress-bar-fill"
                                style={{ width: `${(checkedCount / SLEEP_TIPS.length) * 100}%` }} />
                        </div>
                    </div>

                    <div className="hygiene-grid">
                        {SLEEP_TIPS.map(t => (
                            <div
                                key={t.id}
                                className={`hygiene-item${checklist[t.id] ? ' checked' : ''}`}
                                onClick={() => toggleTip(t.id)}
                            >
                                <span className="hygiene-icon">{t.icon}</span>
                                <span className="hygiene-label">{t.label}</span>
                                <span className="hygiene-check">{checklist[t.id] ? '✓' : ''}</span>
                            </div>
                        ))}
                    </div>

                    <button onClick={() => setChecklist({})}
                        style={{ marginTop: '14px', background: '#bee3f8', color: '#1a365d' }}>
                        Reset Checklist
                    </button>
                </div>

                {/* ── Clear Data ── */}
                <div className="sleep-card">
                    <h2>🗑️ Manage Data</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '12px' }}>
                        You have <strong>{totalNights}</strong> nights logged. Use the button below to clear all data.
                    </p>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Clear All Sleep Data
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="sleep-card">
                    <h3>🤖 AI Sleep Report</h3>
                    <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '12px' }}>
                        Analyses your logged sleep data, quality scores, and hygiene habits to give personalised recommendations.
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

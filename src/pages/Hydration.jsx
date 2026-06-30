import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './hydration.css';

Chart.register(...registerables);

/* ── Constants ── */
const DRINK_TYPES = [
    { name: 'Water', icon: '💧', color: '#3182ce', factor: 1.00 },
    { name: 'Sparkling', icon: '🫧', color: '#00b5d8', factor: 1.00 },
    { name: 'Herbal Tea', icon: '🍵', color: '#38a169', factor: 0.95 },
    { name: 'Green Tea', icon: '🍃', color: '#276749', factor: 0.90 },
    { name: 'Coffee', icon: '☕', color: '#744210', factor: 0.70 },
    { name: 'Juice', icon: '🧃', color: '#d69e2e', factor: 0.80 },
    { name: 'Sports Drink', icon: '🥤', color: '#805ad5', factor: 0.90 },
    { name: 'Coconut Water', icon: '🥥', color: '#38a169', factor: 1.00 },
    { name: 'Milk', icon: '🥛', color: '#718096', factor: 0.90 },
    { name: 'Smoothie', icon: '🫐', color: '#e53e3e', factor: 0.85 },
];

const QUICK_AMOUNTS = [150, 250, 350, 500, 750];

const HYDRATION_TIPS = [
    { id: 'morning', icon: '🌅', label: 'Drink 1 glass of water right after waking up' },
    { id: 'meals', icon: '🍽️', label: 'Drink a glass of water before each meal' },
    { id: 'bottle', icon: '🧴', label: 'Carry a reusable water bottle everywhere' },
    { id: 'reminders', icon: '📱', label: 'Set hourly water reminders on your phone' },
    { id: 'fruits', icon: '🍉', label: 'Eat hydrating foods (cucumber, watermelon, oranges)' },
    { id: 'urine', icon: '💛', label: 'Check urine colour — aim for pale yellow' },
    { id: 'exercise', icon: '🏃', label: 'Drink 500 ml extra per 30 min of exercise' },
    { id: 'alcohol', icon: '🍷', label: 'Match each alcoholic drink with a glass of water' },
];

const URINE_COLORS = [
    { level: 1, label: 'Very Well Hydrated', color: '#fefcbf', text: '#744210', tip: 'Excellent! Keep it up.' },
    { level: 2, label: 'Well Hydrated', color: '#f6e05e', text: '#744210', tip: 'Great hydration level.' },
    { level: 3, label: 'Hydrated', color: '#ecc94b', text: '#744210', tip: 'Good — maintain intake.' },
    { level: 4, label: 'Mildly Dehydrated', color: '#d69e2e', text: '#fff', tip: 'Drink 1–2 more glasses.' },
    { level: 5, label: 'Dehydrated', color: '#c05621', text: '#fff', tip: 'Increase water intake now.' },
    { level: 6, label: 'Severely Dehydrated', color: '#7b341e', text: '#fff', tip: 'Drink water immediately!' },
];

const WATER_FACTS = [
    { fact: '75%', desc: 'of the human brain is water' },
    { fact: '8×', desc: 'times a day you lose water via breath' },
    { fact: '2.5 L', desc: 'average adult daily water output' },
    { fact: '~60%', desc: 'of adult body weight is water' },
];

const TODAY = new Date().toISOString().split('T')[0];

/* ── Helpers ── */
function calcDailyGoal({ weight, activity, climate }) {
    let base = weight * 35;
    if (activity === 'moderate') base += 400;
    if (activity === 'active') base += 700;
    if (activity === 'athlete') base += 1000;
    if (climate === 'hot') base += 500;
    if (climate === 'very_hot') base += 900;
    return Math.round(base / 50) * 50;
}

function getPctColor(pct) {
    if (pct >= 90) return '#38a169';
    if (pct >= 60) return '#d69e2e';
    return '#e53e3e';
}

/* ──────────────────────────────────────────── */
export default function Hydration() {

    /* ── Profile state ── */
    const [userProfile, setUserProfile] = useState(
        () => JSON.parse(localStorage.getItem('hydrationProfile')) || null
    );
    const [pWeight, setPWeight] = useState(userProfile?.weight || '');
    const [pActivity, setPActivity] = useState(userProfile?.activity || 'moderate');
    const [pClimate, setPClimate] = useState(userProfile?.climate || 'normal');

    /* ── Log state ── */
    const [intakeLog, setIntakeLog] = useState(
        () => JSON.parse(localStorage.getItem('hydrationLog')) || []
    );

    /* Log form */
    const [lDate, setLDate] = useState(TODAY);
    const [lTime, setLTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [lDrink, setLDrink] = useState('Water');
    const [lAmount, setLAmount] = useState(250);

    /* ── Urine tracker ── */
    const [urineLevel, setUrineLevel] = useState(
        () => parseInt(localStorage.getItem('hydrationUrineLevel')) || 2
    );

    /* ── Checklist ── */
    const [checklist, setChecklist] = useState(
        () => JSON.parse(localStorage.getItem('hydrationChecklist')) || {}
    );

    /* ── AI ── */
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── Chart refs ── */
    const intakeChartRef = useRef(null);
    const drinkChartRef = useRef(null);
    const intakeInst = useRef(null);
    const drinkInst = useRef(null);

    /* ── Persist ── */
    useEffect(() => { localStorage.setItem('hydrationLog', JSON.stringify(intakeLog)); }, [intakeLog]);
    useEffect(() => { localStorage.setItem('hydrationChecklist', JSON.stringify(checklist)); }, [checklist]);
    useEffect(() => { localStorage.setItem('hydrationUrineLevel', String(urineLevel)); }, [urineLevel]);
    useEffect(() => {
        if (userProfile) localStorage.setItem('hydrationProfile', JSON.stringify(userProfile));
    }, [userProfile]);

    /* ── Charts ── */
    useEffect(() => {
        const byDate = {};
        intakeLog.forEach(e => {
            const factor = DRINK_TYPES.find(d => d.name === e.drink)?.factor ?? 1;
            byDate[e.date] = (byDate[e.date] || 0) + Math.round(e.amount * factor);
        });
        const sortedDates = Object.keys(byDate).sort().slice(-7);
        const goal = userProfile ? calcDailyGoal(userProfile) : 2500;

        if (intakeChartRef.current) {
            if (intakeInst.current) intakeInst.current.destroy();
            intakeInst.current = new Chart(intakeChartRef.current.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedDates.map(d => d.slice(5)),
                    datasets: [
                        {
                            label: 'Net Intake (ml)',
                            data: sortedDates.map(d => byDate[d]),
                            backgroundColor: sortedDates.map(d =>
                                byDate[d] >= goal ? 'rgba(56,161,105,0.75)' : 'rgba(49,130,206,0.65)'
                            ),
                            borderColor: sortedDates.map(d =>
                                byDate[d] >= goal ? '#38a169' : '#3182ce'
                            ),
                            borderWidth: 1,
                        },
                        {
                            label: `Goal (${goal} ml)`,
                            data: sortedDates.map(() => goal),
                            type: 'line',
                            borderColor: '#e53e3e',
                            backgroundColor: 'rgba(229,62,62,0.1)',
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
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'ml' } } },
                },
            });
        }

        if (drinkChartRef.current) {
            const counts = {};
            intakeLog.forEach(e => { counts[e.drink] = (counts[e.drink] || 0) + e.amount; });
            const labels = Object.keys(counts);
            const data = Object.values(counts);
            const colors = labels.map(l => DRINK_TYPES.find(d => d.name === l)?.color || '#999');
            if (drinkInst.current) drinkInst.current.destroy();
            drinkInst.current = new Chart(drinkChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
            });
        }

        return () => { intakeInst.current?.destroy(); drinkInst.current?.destroy(); };
    }, [intakeLog, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Handlers ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        setUserProfile({ weight: parseFloat(pWeight), activity: pActivity, climate: pClimate });
    }

    function logIntake() {
        if (!lAmount || lAmount <= 0) { alert('Please enter a valid amount.'); return; }
        setIntakeLog(prev => [...prev, {
            id: Date.now(), date: lDate || TODAY, time: lTime,
            drink: lDrink, amount: parseInt(lAmount),
        }]);
    }

    function quickAdd(amt) {
        setIntakeLog(prev => [...prev, {
            id: Date.now(), date: TODAY,
            time: new Date().toTimeString().slice(0, 5),
            drink: lDrink, amount: amt,
        }]);
    }

    function removeEntry(id) {
        setIntakeLog(prev => prev.filter(e => e.id !== id));
    }

    function clearLog() {
        if (window.confirm('Clear all hydration logs? This cannot be undone.')) {
            setIntakeLog([]);
            localStorage.removeItem('hydrationLog');
        }
    }

    function toggleTip(id) {
        setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your hydration data…');

        const goal = userProfile ? calcDailyGoal(userProfile) : 2500;
        const byDate = {};
        intakeLog.forEach(e => {
            const factor = DRINK_TYPES.find(d => d.name === e.drink)?.factor ?? 1;
            byDate[e.date] = (byDate[e.date] || 0) + Math.round(e.amount * factor);
        });
        const dailyValues = Object.values(byDate);
        const avgDaily = dailyValues.length
            ? Math.round(dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length) : 0;
        const last7Dates = Object.keys(byDate).filter(d => (Date.now() - new Date(d)) / 86400000 <= 7);
        const daysMetGoal = last7Dates.filter(d => byDate[d] >= goal).length;
        const checkedTips = HYDRATION_TIPS.filter(t => checklist[t.id]).map(t => t.label).join(', ') || 'None';
        const urineInfo = URINE_COLORS.find(u => u.level === urineLevel);
        const profileSummary = userProfile
            ? `Weight ${userProfile.weight} kg, activity: ${userProfile.activity}, climate: ${userProfile.climate}, daily goal: ${goal} ml.`
            : 'Profile not set.';

        const prompt = `You are a hydration coach AI. Here is my data:
- Profile: ${profileSummary}
- Total drink entries logged: ${intakeLog.length}
- Average daily net intake: ${avgDaily} ml (goal: ${goal} ml)
- Days this week meeting goal: ${daysMetGoal}/7
- Current urine colour level: ${urineInfo?.label}
- Hydration habits practised: ${checkedTips}

Give a concise, honest hydration report (under 180 words) that:
1. States whether I am dehydrated, on track, or over-hydrated.
2. Gives 2-3 specific, actionable tips.
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
            setAiReport(data.error ? '❌ Error: ' + data.error.message : data.content[0].text);
        } catch (err) {
            setAiReport('❌ Connection error: ' + err.message);
        } finally {
            setAiLoading(false);
        }
    }

    /* ── Derived values ── */
    const goal = userProfile ? calcDailyGoal(userProfile) : 2500;
    const todayEntries = intakeLog.filter(e => e.date === TODAY);
    const todayNet = todayEntries.reduce((s, e) => {
        const factor = DRINK_TYPES.find(d => d.name === e.drink)?.factor ?? 1;
        return s + Math.round(e.amount * factor);
    }, 0);
    const pct = Math.min(Math.round((todayNet / goal) * 100), 100);
    const pctColor = getPctColor(pct);
    const glassesLeft = Math.max(0, Math.ceil((goal - todayNet) / 250));

    const byDateAll = {};
    intakeLog.forEach(e => {
        const factor = DRINK_TYPES.find(d => d.name === e.drink)?.factor ?? 1;
        byDateAll[e.date] = (byDateAll[e.date] || 0) + Math.round(e.amount * factor);
    });
    const dailyVals = Object.values(byDateAll);
    const avgDaily = dailyVals.length
        ? Math.round(dailyVals.reduce((s, v) => s + v, 0) / dailyVals.length) : 0;

    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if ((byDateAll[d.toISOString().split('T')[0]] || 0) >= goal) streak++;
        else break;
    }

    const recentLogs = [...intakeLog].reverse().slice(0, 12);
    const checkedCount = HYDRATION_TIPS.filter(t => checklist[t.id]).length;
    const urineInfo = URINE_COLORS.find(u => u.level === urineLevel);
    const drinkInfo = DRINK_TYPES.find(d => d.name === lDrink) || DRINK_TYPES[0];
    const totalBubbles = Math.min(Math.round(goal / 250), 12);
    const filledBubbles = Math.min(Math.round(todayNet / 250), totalBubbles);

    /* ── Render ── */
    return (
        <div className="hydration-container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>💧 Hydration Dashboard</h1>
            </header>

            <main>

                {/* ── Water Facts ── */}
                <div className="facts-row">
                    {WATER_FACTS.map(f => (
                        <div key={f.fact} className="fact-box">
                            <div className="fact-val">{f.fact}</div>
                            <div className="fact-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── Profile Card ── */}
                <div className="card">
                    <h2>👤 Your Hydration Profile</h2>
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="h-weight">Weight (kg)</label>
                                <input type="number" id="h-weight" min="20" max="300" step="0.1"
                                    placeholder="e.g., 70" value={pWeight}
                                    onChange={e => setPWeight(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="h-activity">Activity Level</label>
                                <select id="h-activity" value={pActivity} onChange={e => setPActivity(e.target.value)}>
                                    <option value="sedentary">Sedentary (desk job)</option>
                                    <option value="moderate">Moderately Active (3–5 days/wk)</option>
                                    <option value="active">Very Active (6–7 days/wk)</option>
                                    <option value="athlete">Athlete / Physical Job</option>
                                </select>
                            </div>
                            <div className="input-box">
                                <label htmlFor="h-climate">Climate</label>
                                <select id="h-climate" value={pClimate} onChange={e => setPClimate(e.target.value)}>
                                    <option value="cold">Cold</option>
                                    <option value="normal">Temperate</option>
                                    <option value="hot">Hot / Humid</option>
                                    <option value="very_hot">Very Hot (35 °C+)</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit">Calculate My Goal</button>
                    </form>
                </div>

                {/* ── Today's Stats ── */}
                <div className="card" id="stats-card">
                    <h2>📊 Today's Hydration Stats</h2>
                    <div className="stats-grid">
                        <div className="stat-box">
                            <div className="val" style={{ color: pctColor }}>{todayNet} ml</div>
                            <div className="lbl">Intake Today</div>
                        </div>
                        <div className="stat-box">
                            <div className="val">{goal} ml</div>
                            <div className="lbl">Daily Goal</div>
                        </div>
                        <div className="stat-box">
                            <div className="val" style={{ color: pctColor }}>{pct}%</div>
                            <div className="lbl">Goal Progress</div>
                        </div>
                        <div className="stat-box">
                            <div className="val" style={{ color: glassesLeft === 0 ? '#38a169' : '#e53e3e' }}>
                                {glassesLeft === 0 ? '✓' : glassesLeft}
                            </div>
                            <div className="lbl">Glasses Left</div>
                        </div>
                        <div className="stat-box">
                            <div className="val">{avgDaily} ml</div>
                            <div className="lbl">Daily Average</div>
                        </div>
                        <div className="stat-box">
                            <div className="val">{streak}</div>
                            <div className="lbl">Goal Streak 🔥</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '6px' }}>
                            Progress: <strong style={{ color: pctColor }}>{todayNet} / {goal} ml ({pct}%)</strong>
                        </div>
                        <div className="progress-bar-wrap">
                            <div className="progress-bar-fill"
                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, #3182ce, ${pctColor})` }} />
                        </div>
                    </div>

                    {/* Bubble Visualizer */}
                    <div style={{ marginTop: '18px' }}>
                        <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '10px' }}>
                            Each bubble = 250 ml. Tap to quickly add. Goal: {totalBubbles} glasses ({goal} ml).
                        </p>
                        <div className="water-bubbles" id="water-bubbles">
                            {Array.from({ length: totalBubbles }, (_, i) => (
                                <div key={i}
                                    className={`bubble${i < filledBubbles ? ' filled' : ''}`}
                                    onClick={() => quickAdd(250)}>
                                    💧
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                            <strong>{filledBubbles} / {totalBubbles} glasses today</strong>
                        </div>
                    </div>
                </div>

                {/* ── Log a Drink ── */}
                <div className="card">
                    <h2>📝 Log a Drink</h2>

                    {/* Quick-add row */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                            Quick Add — {drinkInfo.icon} {lDrink}
                        </label>
                        <div className="quick-btns">
                            {QUICK_AMOUNTS.map(amt => (
                                <button key={amt} className="quick-btn" onClick={() => quickAdd(amt)}>
                                    {amt} ml
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-date">Date</label>
                            <input type="date" id="l-date" value={lDate} onChange={e => setLDate(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-time">Time</label>
                            <input type="time" id="l-time" value={lTime} onChange={e => setLTime(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-amount">Amount (ml)</label>
                            <input type="number" id="l-amount" min="1" max="2000" step="25"
                                placeholder="e.g., 250" value={lAmount}
                                onChange={e => setLAmount(e.target.value)} />
                        </div>
                    </div>

                    {/* Drink type chips */}
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <label>Drink Type</label>
                            <div className="drink-picker">
                                {DRINK_TYPES.map(d => (
                                    <div key={d.name}
                                        className={`drink-chip${lDrink === d.name ? ' selected' : ''}`}
                                        style={lDrink === d.name
                                            ? { background: d.color, borderColor: d.color, color: '#fff' }
                                            : {}}
                                        onClick={() => setLDrink(d.name)}>
                                        {d.icon} {d.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Net preview */}
                    <div className="net-preview" style={{ marginBottom: '12px' }}>
                        💧 Net hydration: <strong style={{ color: drinkInfo.color }}>
                            {Math.round(lAmount * drinkInfo.factor)} ml
                        </strong>
                        <span className="factor-note">
                            ({lAmount} ml × {drinkInfo.factor} hydration factor)
                        </span>
                    </div>

                    <button onClick={logIntake}>+ Add Drink</button>

                    {/* Log list */}
                    <div id="log-list">
                        {recentLogs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#888', padding: '12px' }}>No drinks logged yet.</p>
                            : recentLogs.map(e => {
                                const d = DRINK_TYPES.find(x => x.name === e.drink) || DRINK_TYPES[0];
                                return (
                                    <div key={e.id} className="log-item">
                                        <span style={{ color: '#555', fontSize: '0.78rem' }}>{e.date} {e.time}</span>
                                        <span style={{ fontWeight: 600 }}>{d.icon} {e.drink}</span>
                                        <span className="log-tag">{e.amount} ml</span>
                                        <span style={{ color: d.color, fontWeight: 600 }}>
                                            💧 {Math.round(e.amount * d.factor)} ml net
                                        </span>
                                        <button className="remove-btn" onClick={() => removeEntry(e.id)}>✕</button>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* ── Charts Row ── */}
                <div className="charts-row" style={{ marginBottom: '25px' }}>
                    <div className="chart-card">
                        <h3>💧 Daily Intake vs Goal</h3>
                        <div className="chart-mini"><canvas ref={intakeChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>🥤 Drink Type Distribution</h3>
                        <div className="chart-mini"><canvas ref={drinkChartRef} /></div>
                    </div>
                </div>

                {/* ── Urine Colour Indicator ── */}
                <div className="card">
                    <h2>🔬 Urine Colour Indicator</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '14px' }}>
                        Select the colour that best matches yours today — a quick hydration check.
                    </p>
                    <div className="urine-grid">
                        {URINE_COLORS.map(u => (
                            <div key={u.level}
                                className={`urine-chip${urineLevel === u.level ? ' active' : ''}`}
                                style={{
                                    background: u.color, color: u.text,
                                    borderColor: urineLevel === u.level ? '#1a365d' : 'transparent'
                                }}
                                onClick={() => setUrineLevel(u.level)}>
                                {u.label}
                            </div>
                        ))}
                    </div>
                    {urineInfo && (
                        <div className="urine-result"
                            style={{ background: urineInfo.color, color: urineInfo.text }}>
                            <strong>Level {urineInfo.level} — {urineInfo.label}:</strong> {urineInfo.tip}
                        </div>
                    )}
                </div>

                {/* ── Hydration Habit Checklist ── */}
                <div className="card">
                    <h2>✅ Hydration Habit Checklist</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '10px' }}>
                        Check the habits you practised today. Goal: build these consistently.
                    </p>
                    <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.88rem', color: '#555', marginBottom: '6px' }}>
                            <strong>{checkedCount} / {HYDRATION_TIPS.length}</strong> habits today
                        </div>
                        <div className="progress-bar-wrap">
                            <div className="progress-bar-fill"
                                style={{ width: `${(checkedCount / HYDRATION_TIPS.length) * 100}%` }} />
                        </div>
                    </div>
                    <div className="checklist-grid">
                        {HYDRATION_TIPS.map(t => (
                            <div key={t.id}
                                className={`checklist-item${checklist[t.id] ? ' checked' : ''}`}
                                onClick={() => toggleTip(t.id)}>
                                <span className="checklist-icon">{t.icon}</span>
                                <span className="checklist-label">{t.label}</span>
                                <span className="checklist-check">{checklist[t.id] ? '✓' : ''}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setChecklist({})}
                        style={{ marginTop: '14px', background: '#bee3f8', color: '#1a365d' }}>
                        Reset Checklist
                    </button>
                </div>

                {/* ── Manage Data ── */}
                <div className="card">
                    <h2>📈 Manage Data</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '12px' }}>
                        You have <strong>{intakeLog.length}</strong> drink entries logged.
                    </p>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Clear All Hydration Data
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="card">
                    <h3>🤖 AI Hydration Report</h3>
                    <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '12px' }}>
                        Analyses your logged intake, goal attainment, urine colour, and habits to give personalised advice.
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
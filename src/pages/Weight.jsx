import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './weight.css';

Chart.register(...registerables);

/* ── Constants ── */
const BMI_CATEGORIES = [
    { label: 'Underweight', lo: 0, hi: 18.5, color: '#3182ce', bg: 'rgba(49,130,206,0.15)' },
    { label: 'Normal Weight', lo: 18.5, hi: 25, color: '#38a169', bg: 'rgba(56,161,105,0.15)' },
    { label: 'Overweight', lo: 25, hi: 30, color: '#d69e2e', bg: 'rgba(214,158,46,0.15)' },
    { label: 'Obese Class I', lo: 30, hi: 35, color: '#ed8936', bg: 'rgba(237,137,54,0.15)' },
    { label: 'Obese Class II', lo: 35, hi: 40, color: '#e53e3e', bg: 'rgba(229,62,62,0.15)' },
    { label: 'Obese Class III', lo: 40, hi: 999, color: '#9b2c2c', bg: 'rgba(155,44,44,0.15)' },
];

const BODY_FAT_CATEGORIES = {
    male: [
        { label: 'Essential Fat', lo: 0, hi: 6, color: '#3182ce' },
        { label: 'Athletic', lo: 6, hi: 14, color: '#38a169' },
        { label: 'Fitness', lo: 14, hi: 18, color: '#68d391' },
        { label: 'Average', lo: 18, hi: 25, color: '#d69e2e' },
        { label: 'Obese', lo: 25, hi: 100, color: '#e53e3e' },
    ],
    female: [
        { label: 'Essential Fat', lo: 0, hi: 14, color: '#3182ce' },
        { label: 'Athletic', lo: 14, hi: 21, color: '#38a169' },
        { label: 'Fitness', lo: 21, hi: 25, color: '#68d391' },
        { label: 'Average', lo: 25, hi: 32, color: '#d69e2e' },
        { label: 'Obese', lo: 32, hi: 100, color: '#e53e3e' },
    ],
};

const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', multiplier: 1.2 },
    { id: 'light', label: 'Lightly Active', desc: '1–3 days/week exercise', multiplier: 1.375 },
    { id: 'moderate', label: 'Moderately Active', desc: '3–5 days/week exercise', multiplier: 1.55 },
    { id: 'very', label: 'Very Active', desc: '6–7 days/week hard exercise', multiplier: 1.725 },
    { id: 'extra', label: 'Extra Active', desc: 'Physical job + hard training', multiplier: 1.9 },
];

const GOAL_TYPES = [
    { id: 'lose', label: '📉 Lose Weight', calorieAdj: -500 },
    { id: 'maintain', label: '⚖️ Maintain Weight', calorieAdj: 0 },
    { id: 'gain', label: '📈 Gain Muscle', calorieAdj: +300 },
];

const MEASUREMENTS = [
    { id: 'waist', label: 'Waist', icon: '📏', unit: 'cm' },
    { id: 'chest', label: 'Chest', icon: '📐', unit: 'cm' },
    { id: 'hips', label: 'Hips', icon: '📏', unit: 'cm' },
    { id: 'neck', label: 'Neck', icon: '📐', unit: 'cm' },
    { id: 'arm', label: 'Arm', icon: '💪', unit: 'cm' },
    { id: 'thigh', label: 'Thigh', icon: '📏', unit: 'cm' },
];

const WEIGHT_FACTS = [
    { fact: '3,500', desc: 'calories equal roughly 1 lb of body fat' },
    { fact: '0.5–1%', desc: 'of body weight: ideal weekly loss rate' },
    { fact: '60–70%', desc: 'of body weight is water on average' },
    { fact: '10%', desc: 'weight loss can improve key health markers' },
];

const TODAY = new Date().toISOString().split('T')[0];

/* ── Helpers ── */
function calcBMI(weightKg, heightCm) {
    const h = heightCm / 100;
    return parseFloat((weightKg / (h * h)).toFixed(1));
}

function getBMICategory(bmi) {
    return BMI_CATEGORIES.find(c => bmi >= c.lo && bmi < c.hi) || BMI_CATEGORIES[5];
}

function getBodyFatCategory(bf, gender) {
    const cats = BODY_FAT_CATEGORIES[gender] || BODY_FAT_CATEGORIES.male;
    return cats.find(c => bf >= c.lo && bf < c.hi) || cats[cats.length - 1];
}

function calcBMR(weightKg, heightCm, age, gender) {
    if (gender === 'female') {
        return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

function calcTDEE(bmr, activityId) {
    const level = ACTIVITY_LEVELS.find(a => a.id === activityId) || ACTIVITY_LEVELS[1];
    return Math.round(bmr * level.multiplier);
}

function lbsToKg(lbs) { return parseFloat((lbs * 0.453592).toFixed(2)); }
function kgToLbs(kg) { return parseFloat((kg / 0.453592).toFixed(2)); }

function feetInchesToCm(ft, inch) {
    return Math.round((parseInt(ft) * 30.48) + (parseInt(inch) * 2.54));
}

/* ─────────────────────────────────────────────── */
export default function Weight() {

    /* ── Unit preference ── */
    const [unit, setUnit] = useState(
        () => localStorage.getItem('weightUnit') || 'kg'
    );

    /* ── Profile ── */
    const [profile, setProfile] = useState(
        () => JSON.parse(localStorage.getItem('weightProfile')) || null
    );
    const [pHeight, setPHeight] = useState(profile?.heightCm || '');
    const [pAge, setPAge] = useState(profile?.age || '');
    const [pGender, setPGender] = useState(profile?.gender || 'male');
    const [pActivity, setPActivity] = useState(profile?.activity || 'moderate');
    const [pHeightFt, setPHeightFt] = useState('');
    const [pHeightIn, setPHeightIn] = useState('');

    /* ── Goal ── */
    const [goalType, setGoalType] = useState(() => localStorage.getItem('wGoalType') || 'lose');
    const [goalWeight, setGoalWeight] = useState(() => localStorage.getItem('wGoalWeight') || '');
    const [goalWeeklyChange, setGoalWeeklyChange] = useState(() => localStorage.getItem('wGoalWeekly') || '0.5');

    /* ── Weight Log ── */
    const [weightLog, setWeightLog] = useState(
        () => JSON.parse(localStorage.getItem('weightLog')) || []
    );

    /* Log form */
    const [lDate, setLDate] = useState(TODAY);
    const [lTime, setLTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [lWeight, setLWeight] = useState('');
    const [lBodyFat, setLBodyFat] = useState('');
    const [lMuscleMass, setLMuscleMass] = useState('');
    const [lNote, setLNote] = useState('');
    const [lMeasurements, setLMeasurements] = useState({});

    /* ── Chart refs ── */
    const weightChartRef = useRef(null);
    const compChartRef = useRef(null);
    const weightInst = useRef(null);
    const compInst = useRef(null);

    /* ── AI ── */
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── Active tab ── */
    const [activeTab, setActiveTab] = useState('log');

    /* ── Persist ── */
    useEffect(() => { localStorage.setItem('weightLog', JSON.stringify(weightLog)); }, [weightLog]);
    useEffect(() => { localStorage.setItem('weightUnit', unit); }, [unit]);
    useEffect(() => { localStorage.setItem('wGoalType', goalType); }, [goalType]);
    useEffect(() => { localStorage.setItem('wGoalWeight', goalWeight); }, [goalWeight]);
    useEffect(() => { localStorage.setItem('wGoalWeekly', goalWeeklyChange); }, [goalWeeklyChange]);
    useEffect(() => {
        if (profile) localStorage.setItem('weightProfile', JSON.stringify(profile));
    }, [profile]);

    /* ── Charts ── */
    useEffect(() => {
        const last30 = [...weightLog]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);

        /* Weight Trend */
        if (weightChartRef.current) {
            if (weightInst.current) weightInst.current.destroy();

            const displayWeights = last30.map(e =>
                unit === 'lbs' ? kgToLbs(e.weightKg) : e.weightKg
            );

            const goalLine = goalWeight
                ? last30.map(() => parseFloat(goalWeight))
                : null;

            const datasets = [
                {
                    label: `Weight (${unit})`,
                    data: displayWeights,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72,187,120,0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#48bb78',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                },
            ];

            if (goalLine) {
                datasets.push({
                    label: `Goal (${unit})`,
                    data: goalLine,
                    borderColor: '#805ad5',
                    borderDash: [6, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                });
            }

            weightInst.current = new Chart(weightChartRef.current.getContext('2d'), {
                type: 'line',
                data: {
                    labels: last30.map(e => e.date.slice(5)),
                    datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: {
                            title: { display: true, text: `Weight (${unit})` },
                            beginAtZero: false,
                        },
                    },
                },
            });
        }

        /* Body Composition Doughnut */
        if (compChartRef.current) {
            const latest = [...weightLog].sort((a, b) => b.id - a.id)[0];
            if (compInst.current) compInst.current.destroy();

            if (latest?.bodyFatPct) {
                const fatPct = latest.bodyFatPct;
                const musclePct = latest.muscleMassPct || Math.round((100 - fatPct) * 0.85);
                const otherPct = Math.max(0, 100 - fatPct - musclePct);

                compInst.current = new Chart(compChartRef.current.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Body Fat %', 'Muscle Mass %', 'Other (bone, water, etc.)'],
                        datasets: [{
                            data: [fatPct, musclePct, otherPct],
                            backgroundColor: ['#e53e3e', '#38a169', '#3182ce'],
                            borderWidth: 2,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                    },
                });
            } else {
                compInst.current = new Chart(compChartRef.current.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['No Body Fat Data'],
                        datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'], borderWidth: 0 }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: false },
                        },
                    },
                });
            }
        }

        return () => { weightInst.current?.destroy(); compInst.current?.destroy(); };
    }, [weightLog, unit, goalWeight]);

    /* ── Handlers ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        let heightCm = parseFloat(pHeight);
        if (unit === 'lbs' && pHeightFt) {
            heightCm = feetInchesToCm(pHeightFt || 0, pHeightIn || 0);
        }
        setProfile({
            heightCm,
            age: parseInt(pAge),
            gender: pGender,
            activity: pActivity,
        });
    }

    function logEntry() {
        let weightKg = parseFloat(lWeight);
        if (!weightKg || weightKg <= 0) { alert('Please enter a valid weight.'); return; }
        if (unit === 'lbs') weightKg = lbsToKg(weightKg);

        const entry = {
            id: Date.now(),
            date: lDate || TODAY,
            time: lTime,
            weightKg,
            bodyFatPct: lBodyFat ? parseFloat(lBodyFat) : null,
            muscleMassPct: lMuscleMass ? parseFloat(lMuscleMass) : null,
            measurements: { ...lMeasurements },
            note: lNote,
        };
        setWeightLog(prev => [...prev, entry]);
        setLWeight(''); setLBodyFat(''); setLMuscleMass('');
        setLNote(''); setLMeasurements({});
    }

    function removeEntry(id) {
        setWeightLog(prev => prev.filter(e => e.id !== id));
    }

    function clearLog() {
        if (window.confirm('Clear all weight logs? This cannot be undone.')) {
            setWeightLog([]);
            localStorage.removeItem('weightLog');
        }
    }

    function updateMeasurement(id, val) {
        setLMeasurements(prev => ({ ...prev, [id]: val }));
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your body composition data…');

        const totalEntries = weightLog.length;
        const latest = [...weightLog].sort((a, b) => b.id - a.id)[0];
        const oldest = [...weightLog].sort((a, b) => a.id - b.id)[0];

        const latestW = latest
            ? (unit === 'lbs' ? kgToLbs(latest.weightKg).toFixed(1) : latest.weightKg.toFixed(1))
            : 'N/A';
        const oldestW = oldest
            ? (unit === 'lbs' ? kgToLbs(oldest.weightKg).toFixed(1) : oldest.weightKg.toFixed(1))
            : 'N/A';
        const change = latest && oldest
            ? (unit === 'lbs'
                ? (kgToLbs(latest.weightKg) - kgToLbs(oldest.weightKg)).toFixed(1)
                : (latest.weightKg - oldest.weightKg).toFixed(1))
            : 0;

        const bmi = profile && latest
            ? calcBMI(latest.weightKg, profile.heightCm)
            : null;
        const bmr = profile && latest
            ? calcBMR(latest.weightKg, profile.heightCm, profile.age, profile.gender)
            : null;
        const tdee = bmr ? calcTDEE(bmr, profile.activity) : null;

        const prompt = `You are a certified nutrition and fitness coach AI. Here is my body composition data:
- Total entries logged: ${totalEntries}
- Starting weight: ${oldestW} ${unit}
- Current weight: ${latestW} ${unit}
- Total weight change: ${change > 0 ? '+' : ''}${change} ${unit}
- Current BMI: ${bmi ?? 'N/A'}
- Latest body fat %: ${latest?.bodyFatPct ?? 'Not logged'}%
- Latest muscle mass %: ${latest?.muscleMassPct ?? 'Not logged'}%
- Estimated TDEE: ${tdee ?? 'N/A'} calories/day
- Wellness goal: ${goalType}
- Target weight: ${goalWeight || 'Not set'} ${unit}
${profile ? `- Profile: Age ${profile.age}, ${profile.gender}, activity: ${profile.activity}` : ''}

Give a concise, honest body composition report (under 200 words) that:
1. Evaluates the current weight trend and body composition.
2. Gives 3 specific, actionable tips tailored to the goal (${goalType}).
3. Comments on the BMI and body fat if available.
4. Provides a calorie target recommendation based on TDEE.
5. Ends with a short motivational note.
Use bullet points. Keep it warm, practical and science-based.`;

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
    const sortedLog = [...weightLog].sort((a, b) => b.id - a.id);
    const latestEntry = sortedLog[0] || null;
    const oldestEntry = [...weightLog].sort((a, b) => a.id - b.id)[0] || null;
    const totalEntries = weightLog.length;

    const latestWeightDisplay = latestEntry
        ? (unit === 'lbs' ? kgToLbs(latestEntry.weightKg) : latestEntry.weightKg).toFixed(1)
        : null;

    const totalChange = latestEntry && oldestEntry
        ? parseFloat(
            unit === 'lbs'
                ? (kgToLbs(latestEntry.weightKg) - kgToLbs(oldestEntry.weightKg)).toFixed(1)
                : (latestEntry.weightKg - oldestEntry.weightKg).toFixed(1)
        )
        : null;

    const bmi = profile && latestEntry ? calcBMI(latestEntry.weightKg, profile.heightCm) : null;
    const bmiCat = bmi ? getBMICategory(bmi) : null;

    const bmr = profile && latestEntry
        ? calcBMR(latestEntry.weightKg, profile.heightCm, profile.age, profile.gender)
        : null;
    const tdee = bmr ? calcTDEE(bmr, profile.activity) : null;
    const goalAdj = GOAL_TYPES.find(g => g.id === goalType)?.calorieAdj || 0;
    const targetCalories = tdee ? tdee + goalAdj : null;

    const bfCat = latestEntry?.bodyFatPct && profile
        ? getBodyFatCategory(latestEntry.bodyFatPct, profile.gender)
        : null;

    /* Goal progress */
    const goalWeightKg = goalWeight
        ? (unit === 'lbs' ? lbsToKg(parseFloat(goalWeight)) : parseFloat(goalWeight))
        : null;
    const goalProgress = goalWeightKg && oldestEntry && latestEntry
        ? Math.min(
            100,
            Math.round(
                Math.abs((oldestEntry.weightKg - latestEntry.weightKg) /
                    Math.max(0.01, Math.abs(oldestEntry.weightKg - goalWeightKg))) * 100
            )
        )
        : 0;

    const last7 = weightLog.filter(e => (Date.now() - new Date(e.date)) / 86400000 <= 7);
    const weeklyChange = last7.length >= 2
        ? parseFloat(
            unit === 'lbs'
                ? (kgToLbs(last7[last7.length - 1].weightKg) - kgToLbs(last7[0].weightKg)).toFixed(1)
                : (last7[last7.length - 1].weightKg - last7[0].weightKg).toFixed(1)
        )
        : null;

    /* ── Render ── */
    return (
        <div className="wt-container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>⚖️ Weight & Body Composition</h1>
                <div className="unit-toggle">
                    <button
                        className={`unit-btn${unit === 'kg' ? ' active' : ''}`}
                        onClick={() => setUnit('kg')}>kg</button>
                    <button
                        className={`unit-btn${unit === 'lbs' ? ' active' : ''}`}
                        onClick={() => setUnit('lbs')}>lbs</button>
                </div>
            </header>

            <main>

                {/* ── Facts Row ── */}
                <div className="facts-row">
                    {WEIGHT_FACTS.map(f => (
                        <div key={f.fact} className="fact-box">
                            <div className="fact-val">{f.fact}</div>
                            <div className="fact-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── Profile Card ── */}
                <div className="card">
                    <h2>👤 Your Profile</h2>
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            {unit === 'kg' ? (
                                <div className="input-box">
                                    <label htmlFor="wt-height">Height (cm)</label>
                                    <input type="number" id="wt-height" min="100" max="250"
                                        placeholder="e.g., 175"
                                        value={pHeight} onChange={e => setPHeight(e.target.value)} required />
                                </div>
                            ) : (
                                <>
                                    <div className="input-box">
                                        <label htmlFor="wt-ft">Height (ft)</label>
                                        <input type="number" id="wt-ft" min="3" max="8"
                                            placeholder="5" value={pHeightFt}
                                            onChange={e => setPHeightFt(e.target.value)} />
                                    </div>
                                    <div className="input-box">
                                        <label htmlFor="wt-in">Height (in)</label>
                                        <input type="number" id="wt-in" min="0" max="11"
                                            placeholder="9" value={pHeightIn}
                                            onChange={e => setPHeightIn(e.target.value)} />
                                    </div>
                                </>
                            )}
                            <div className="input-box">
                                <label htmlFor="wt-age">Age</label>
                                <input type="number" id="wt-age" min="10" max="100"
                                    placeholder="e.g., 28"
                                    value={pAge} onChange={e => setPAge(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="wt-gender">Biological Sex</label>
                                <select id="wt-gender" value={pGender} onChange={e => setPGender(e.target.value)}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label className="section-label">Activity Level</label>
                            <div className="activity-grid">
                                {ACTIVITY_LEVELS.map(a => (
                                    <div key={a.id}
                                        className={`activity-card${pActivity === a.id ? ' active' : ''}`}
                                        onClick={() => setPActivity(a.id)}>
                                        <span className="activity-name">{a.label}</span>
                                        <span className="activity-desc">{a.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button type="submit">💾 Save Profile</button>
                    </form>
                </div>

                {/* ── Goal Card ── */}
                <div className="card">
                    <h2>🎯 Weight Goal</h2>
                    <div className="goal-type-row">
                        {GOAL_TYPES.map(g => (
                            <div key={g.id}
                                className={`goal-type-card${goalType === g.id ? ' active' : ''}`}
                                onClick={() => setGoalType(g.id)}>
                                {g.label}
                            </div>
                        ))}
                    </div>
                    <div className="form-group" style={{ marginTop: '12px' }}>
                        <div className="input-box">
                            <label>Target Weight ({unit})</label>
                            <input type="number" min="20" max="300" step="0.1"
                                placeholder={`e.g., ${unit === 'kg' ? '70' : '154'}`}
                                value={goalWeight}
                                onChange={e => setGoalWeight(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label>Weekly Change Rate ({unit}/week)</label>
                            <select value={goalWeeklyChange} onChange={e => setGoalWeeklyChange(e.target.value)}>
                                <option value="0.25">0.25 {unit}/week (gentle)</option>
                                <option value="0.5">0.5 {unit}/week (recommended)</option>
                                <option value="0.75">0.75 {unit}/week (moderate)</option>
                                <option value="1">1 {unit}/week (aggressive)</option>
                            </select>
                        </div>
                    </div>

                    {/* Goal Progress */}
                    {goalWeight && latestEntry && (
                        <div className="goal-progress-block">
                            <div className="goal-progress-header">
                                <span>Goal Progress</span>
                                <span className="goal-pct">{goalProgress}%</span>
                            </div>
                            <div className="progress-bar-wrap">
                                <div className="progress-bar-fill goal-fill"
                                    style={{ width: `${goalProgress}%` }} />
                            </div>
                            <div className="goal-meta">
                                <span>
                                    Current: <strong>{latestWeightDisplay} {unit}</strong>
                                </span>
                                <span>
                                    Target: <strong>{goalWeight} {unit}</strong>
                                </span>
                                <span>
                                    Remaining: <strong>
                                        {Math.abs(
                                            parseFloat(goalWeight) - parseFloat(latestWeightDisplay)
                                        ).toFixed(1)} {unit}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Analytics ── */}
                {totalEntries > 0 && (
                    <div className="card" id="wt-stats-card">
                        <h2>📊 Body Composition Analytics</h2>

                        <div className="stats-grid">
                            <div className="stat-box">
                                <div className="val" style={{ color: '#48bb78' }}>
                                    {latestWeightDisplay ?? '—'}
                                </div>
                                <div className="lbl">Current Weight ({unit})</div>
                            </div>
                            <div className="stat-box">
                                <div className="val"
                                    style={{
                                        color: totalChange === null ? '#718096'
                                            : totalChange < 0 ? '#48bb78'
                                                : totalChange > 0 ? '#e53e3e' : '#d69e2e'
                                    }}>
                                    {totalChange !== null
                                        ? `${totalChange > 0 ? '+' : ''}${totalChange}`
                                        : '—'}
                                </div>
                                <div className="lbl">Total Change ({unit})</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: bmiCat?.color || '#718096' }}>
                                    {bmi ?? '—'}
                                </div>
                                <div className="lbl">BMI</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: bmiCat?.color || '#718096' }}>
                                    {bmiCat?.label ?? '—'}
                                </div>
                                <div className="lbl">BMI Category</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#3182ce' }}>
                                    {latestEntry?.bodyFatPct != null ? `${latestEntry.bodyFatPct}%` : '—'}
                                </div>
                                <div className="lbl">Body Fat %</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#38a169' }}>
                                    {latestEntry?.muscleMassPct != null ? `${latestEntry.muscleMassPct}%` : '—'}
                                </div>
                                <div className="lbl">Muscle Mass %</div>
                            </div>
                        </div>

                        {/* TDEE Panel */}
                        {tdee && (
                            <div className="tdee-panel">
                                <div className="tdee-item">
                                    <span className="tdee-label">🔥 BMR (Base Metabolic Rate)</span>
                                    <span className="tdee-val">{bmr} kcal/day</span>
                                </div>
                                <div className="tdee-item">
                                    <span className="tdee-label">⚡ TDEE (Total Daily Energy)</span>
                                    <span className="tdee-val">{tdee} kcal/day</span>
                                </div>
                                <div className="tdee-item tdee-target">
                                    <span className="tdee-label">🎯 Target Calories ({goalType})</span>
                                    <span className="tdee-val" style={{ color: '#a78bfa' }}>
                                        {targetCalories} kcal/day
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Weekly change */}
                        {weeklyChange !== null && (
                            <div className="weekly-change-bar"
                                style={{
                                    background: weeklyChange < 0 ? 'rgba(72,187,120,0.1)' : 'rgba(229,62,62,0.1)',
                                    borderColor: weeklyChange < 0 ? 'rgba(72,187,120,0.3)' : 'rgba(229,62,62,0.3)',
                                }}>
                                <span>This week:</span>
                                <strong style={{ color: weeklyChange < 0 ? '#48bb78' : '#fc8181' }}>
                                    {weeklyChange > 0 ? '+' : ''}{weeklyChange} {unit}
                                </strong>
                                <span style={{ color: '#718096', fontSize: '0.78rem' }}>
                                    (Ideal: ±0.5 {unit}/week)
                                </span>
                            </div>
                        )}

                        {/* Body fat category */}
                        {bfCat && (
                            <div className="bf-category-badge" style={{
                                color: bfCat.color,
                                background: bfCat.color + '18', borderColor: bfCat.color + '44'
                            }}>
                                💪 Body Fat Category: <strong>{bfCat.label}</strong>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab Nav ── */}
                <div className="tab-nav">
                    {[
                        { id: 'log', label: '📝 Log Entry' },
                        { id: 'measurements', label: '📏 Measurements' },
                        { id: 'bmi', label: '🩺 BMI Guide' },
                    ].map(t => (
                        <button key={t.id}
                            className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Log Entry ── */}
                {activeTab === 'log' && (
                    <div className="card">
                        <h2>📝 Log Weight Entry</h2>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="l-date">Date</label>
                                <input type="date" id="l-date" value={lDate}
                                    onChange={e => setLDate(e.target.value)} />
                            </div>
                            <div className="input-box">
                                <label htmlFor="l-time">Time</label>
                                <input type="time" id="l-time" value={lTime}
                                    onChange={e => setLTime(e.target.value)} />
                            </div>
                            <div className="input-box">
                                <label htmlFor="l-weight">Weight ({unit}) *</label>
                                <input type="number" id="l-weight" min="20" max="500" step="0.1"
                                    placeholder={unit === 'kg' ? 'e.g., 75.2' : 'e.g., 165.8'}
                                    value={lWeight} onChange={e => setLWeight(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="l-bf">Body Fat % (optional)</label>
                                <input type="number" id="l-bf" min="3" max="60" step="0.1"
                                    placeholder="e.g., 18.5"
                                    value={lBodyFat} onChange={e => setLBodyFat(e.target.value)} />
                            </div>
                            <div className="input-box">
                                <label htmlFor="l-mm">Muscle Mass % (optional)</label>
                                <input type="number" id="l-mm" min="10" max="80" step="0.1"
                                    placeholder="e.g., 42.0"
                                    value={lMuscleMass} onChange={e => setLMuscleMass(e.target.value)} />
                            </div>
                            <div className="input-box">
                                <label htmlFor="l-note">Note (optional)</label>
                                <input type="text" id="l-note" placeholder="e.g., After morning fast"
                                    value={lNote} onChange={e => setLNote(e.target.value)} />
                            </div>
                        </div>

                        {/* BMI Preview */}
                        {lWeight && profile && (
                            () => {
                                const previewKg = unit === 'lbs' ? lbsToKg(parseFloat(lWeight)) : parseFloat(lWeight);
                                const previewBMI = calcBMI(previewKg, profile.heightCm);
                                const previewCat = getBMICategory(previewBMI);
                                return (
                                    <div className="bmi-preview"
                                        style={{ background: previewCat.bg, borderColor: previewCat.color + '55' }}>
                                        ⚖️ BMI Preview: <strong style={{ color: previewCat.color }}>
                                            {previewBMI}
                                        </strong> — {previewCat.label}
                                    </div>
                                );
                            }
                        )()}

                        <button onClick={logEntry}>💾 Save Entry</button>

                        {/* Log list */}
                        <div id="log-list">
                            {sortedLog.length === 0
                                ? <p className="empty-log">No entries yet. Log your first weight above.</p>
                                : sortedLog.slice(0, 12).map(e => {
                                    const displayW = unit === 'lbs'
                                        ? kgToLbs(e.weightKg).toFixed(1)
                                        : e.weightKg.toFixed(1);
                                    const entryBMI = profile
                                        ? calcBMI(e.weightKg, profile.heightCm)
                                        : null;
                                    const entryBMICat = entryBMI ? getBMICategory(entryBMI) : null;
                                    return (
                                        <div key={e.id} className="log-item">
                                            <span className="log-date">{e.date} {e.time}</span>
                                            <span className="log-weight">⚖️ {displayW} {unit}</span>
                                            {e.bodyFatPct && (
                                                <span className="log-tag bf-tag">🔴 {e.bodyFatPct}% fat</span>
                                            )}
                                            {e.muscleMassPct && (
                                                <span className="log-tag muscle-tag">💪 {e.muscleMassPct}% muscle</span>
                                            )}
                                            {entryBMICat && (
                                                <span className="log-tag"
                                                    style={{ background: entryBMICat.bg, color: entryBMICat.color }}>
                                                    BMI {entryBMI}
                                                </span>
                                            )}
                                            {e.note && (
                                                <span className="log-note">"{e.note}"</span>
                                            )}
                                            <button className="remove-btn" onClick={() => removeEntry(e.id)}>✕</button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* ── Measurements Tab ── */}
                {activeTab === 'measurements' && (
                    <div className="card">
                        <h2>📏 Body Measurements</h2>
                        <p style={{ fontSize: '0.88rem', color: 'var(--wt-text-secondary)', margin: '0 0 16px' }}>
                            Log your body measurements to track body composition changes beyond the scale.
                        </p>
                        <div className="measurements-grid">
                            {MEASUREMENTS.map(m => (
                                <div key={m.id} className="measurement-input-box">
                                    <label>{m.icon} {m.label} (cm)</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="300"
                                        step="0.1"
                                        placeholder={`e.g., ${m.id === 'waist' ? '80' : m.id === 'chest' ? '95' : '55'}`}
                                        value={lMeasurements[m.id] || ''}
                                        onChange={e => updateMeasurement(m.id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                        <button onClick={logEntry}>💾 Save with Current Weight</button>

                        {/* Latest measurements display */}
                        {sortedLog.some(e => Object.keys(e.measurements || {}).length > 0) && (
                            <div style={{ marginTop: '20px' }}>
                                <div className="section-label" style={{ marginBottom: '12px' }}>
                                    📐 Latest Measurements
                                </div>
                                <div className="measurements-display-grid">
                                    {MEASUREMENTS.map(m => {
                                        const latestVal = sortedLog.find(
                                            e => e.measurements?.[m.id]
                                        )?.measurements[m.id];
                                        return (
                                            <div key={m.id} className="measurement-display-box">
                                                <span className="m-icon">{m.icon}</span>
                                                <span className="m-label">{m.label}</span>
                                                <span className="m-val">
                                                    {latestVal ? `${latestVal} cm` : '—'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── BMI Guide ── */}
                {activeTab === 'bmi' && (
                    <div className="card">
                        <h2>🩺 BMI Reference Guide</h2>
                        <p style={{ fontSize: '0.88rem', color: 'var(--wt-text-secondary)', margin: '0 0 16px' }}>
                            BMI is a screening tool, not a diagnostic. Muscle mass, bone density, and distribution
                            are not captured by BMI alone.
                        </p>
                        <div className="bmi-guide-grid">
                            {BMI_CATEGORIES.map(c => (
                                <div key={c.label}
                                    className={`bmi-guide-chip${bmi && bmi >= c.lo && bmi < c.hi ? ' active' : ''}`}
                                    style={{ borderColor: c.color + '55', background: c.bg }}>
                                    <span className="bmi-range" style={{ color: c.color }}>
                                        {c.lo === 0 ? '< 18.5' : c.hi === 999 ? '≥ 40' : `${c.lo}–${c.hi}`}
                                    </span>
                                    <span className="bmi-cat-label" style={{ color: c.color }}>{c.label}</span>
                                    {bmi && bmi >= c.lo && bmi < c.hi && (
                                        <span className="bmi-you">← You ({bmi})</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <div className="section-label" style={{ marginBottom: '10px' }}>
                                💪 Body Fat % Reference ({profile?.gender || 'male'})
                            </div>
                            <div className="bf-guide-grid">
                                {(BODY_FAT_CATEGORIES[profile?.gender || 'male']).map(c => (
                                    <div key={c.label}
                                        className={`bmi-guide-chip${latestEntry?.bodyFatPct != null
                                            && latestEntry.bodyFatPct >= c.lo
                                            && latestEntry.bodyFatPct < c.hi ? ' active' : ''}`}
                                        style={{ borderColor: c.color + '55', background: c.color + '12' }}>
                                        <span className="bmi-range" style={{ color: c.color }}>
                                            {c.lo}–{c.hi === 100 ? '100+' : c.hi}%
                                        </span>
                                        <span className="bmi-cat-label" style={{ color: c.color }}>{c.label}</span>
                                        {latestEntry?.bodyFatPct != null
                                            && latestEntry.bodyFatPct >= c.lo
                                            && latestEntry.bodyFatPct < c.hi && (
                                                <span className="bmi-you">← You ({latestEntry.bodyFatPct}%)</span>
                                            )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Charts Row ── */}
                <div className="charts-row" style={{ marginBottom: '25px' }}>
                    <div className="chart-card">
                        <h3>📈 Weight Trend (Last 30 entries)</h3>
                        <div className="chart-mini"><canvas ref={weightChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>🔬 Body Composition Breakdown</h3>
                        <div className="chart-mini"><canvas ref={compChartRef} /></div>
                        {!latestEntry?.bodyFatPct && (
                            <p className="chart-empty-note">Log body fat % to see composition breakdown</p>
                        )}
                    </div>
                </div>

                {/* ── Manage Data ── */}
                <div className="card">
                    <h2>📈 Manage Data</h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--wt-text-secondary)', marginBottom: '12px' }}>
                        You have <strong>{totalEntries}</strong> weight entries logged.
                    </p>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Clear All Weight Data
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="card">
                    <h3>🤖 AI Body Composition Report</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--wt-text-secondary)', marginBottom: '12px' }}>
                        Analyses your weight trend, BMI, body fat, and goal to give personalised nutrition and
                        fitness advice including calorie targets.
                    </p>
                    <button className="btn-ai" onClick={generateAIReport} disabled={aiLoading}>
                        {aiLoading ? 'Generating…' : '✨ Generate AI Report'}
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
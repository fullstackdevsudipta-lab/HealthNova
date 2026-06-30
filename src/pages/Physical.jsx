import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './physical.css'

Chart.register(...registerables);

export default function Physical() {

    const EXERCISES = [
        { name: 'Running', group: 'Cardio', cpm: 10, diff: 'Hard', type: 'Cardio' },
        { name: 'Walking', group: 'Cardio', cpm: 4, diff: 'Easy', type: 'Cardio' },
        { name: 'Cycling', group: 'Cardio/Legs', cpm: 8, diff: 'Medium', type: 'Cardio' },
        { name: 'Swimming', group: 'Full Body', cpm: 7, diff: 'Medium', type: 'Cardio' },
        { name: 'Jump Rope', group: 'Cardio', cpm: 11, diff: 'Hard', type: 'Cardio' },
        { name: 'Pushups', group: 'Chest/Arms', cpm: 5, diff: 'Medium', type: 'Strength' },
        { name: 'Squats', group: 'Legs', cpm: 5, diff: 'Medium', type: 'Strength' },
        { name: 'Plank', group: 'Core', cpm: 3, diff: 'Medium', type: 'Strength' },
        { name: 'Dumbbell Rows', group: 'Back', cpm: 4, diff: 'Medium', type: 'Strength' },
        { name: 'Burpees', group: 'Full Body', cpm: 10, diff: 'Hard', type: 'HIIT' },
        { name: 'Yoga', group: 'Flexibility', cpm: 3, diff: 'Easy', type: 'Flexibility' },
        { name: 'HIIT', group: 'Full Body', cpm: 12, diff: 'Hard', type: 'HIIT' },
        { name: 'Deadlift', group: 'Back/Legs', cpm: 6, diff: 'Hard', type: 'Strength' },
        { name: 'Bench Press', group: 'Chest', cpm: 5, diff: 'Medium', type: 'Strength' },
        { name: 'Lunges', group: 'Legs', cpm: 5, diff: 'Easy', type: 'Strength' },
        { name: 'Pull-ups', group: 'Back/Arms', cpm: 6, diff: 'Hard', type: 'Strength' },
        { name: 'Shoulder Press', group: 'Shoulders', cpm: 5, diff: 'Medium', type: 'Strength' },
        { name: 'Pilates', group: 'Core', cpm: 4, diff: 'Easy', type: 'Flexibility' },
        { name: 'Boxing', group: 'Full Body', cpm: 9, diff: 'Hard', type: 'HIIT' },
        { name: 'Rowing Machine', group: 'Full Body', cpm: 9, diff: 'Medium', type: 'Cardio' },
    ];

    /* ── Health Calculations ── */
    function calcBMR({ weight, height, age, gender }) {
        const s = gender === 'male' ? 5 : -161;
        return Math.round(10 * weight + 6.25 * height - 5 * age + s);
    }
    function calcTDEE(p) {
        return Math.round(calcBMR(p) * p.activity);
    }
    function calcBMI({ weight, height }) {
        const hm = height / 100;
        return (weight / (hm * hm)).toFixed(1);
    }
    function bmiCategory(bmi) {
        if (bmi < 18.5) return { cat: 'Underweight', color: '#3182ce' };
        if (bmi < 25) return { cat: 'Normal', color: '#38a169' };
        if (bmi < 30) return { cat: 'Overweight', color: '#d69e2e' };
        return { cat: 'Obese', color: '#e53e3e' };
    }
    function getGoalCalories(tdee, goal) {
        if (goal === 'weight_loss') return Math.round(tdee * 0.8);
        if (goal === 'muscle_gain') return Math.round(tdee * 1.1);
        return tdee;
    }

    const HR_ZONES = [
        { name: 'Warm Up (50–60%)', pct: [0.50, 0.60], bg: '#bee3f8', text: '#1a365d' },
        { name: 'Fat Burn (60–70%)', pct: [0.60, 0.70], bg: '#c6f6d5', text: '#1a4731' },
        { name: 'Cardio (70–80%)', pct: [0.70, 0.80], bg: '#fefcbf', text: '#744210' },
        { name: 'Peak (80–90%)', pct: [0.80, 0.90], bg: '#fed7d7', text: '#742a2a' },
        { name: 'Max Effort (90–100%)', pct: [0.90, 1.00], bg: '#9b2c2c', text: '#fff' },
    ];

    const WEEKLY_PLANS = {
        easy: [
            { day: 'Monday', ex: '30 min Walking + Light Stretching', diff: 'Easy', badge: 'd-easy' },
            { day: 'Tuesday', ex: 'Rest / Gentle Yoga (20 min)', diff: 'Rest', badge: 'd-rest' },
            { day: 'Wednesday', ex: '20 min Walking + Bodyweight Squats ×2', diff: 'Easy', badge: 'd-easy' },
            { day: 'Thursday', ex: 'Rest', diff: 'Rest', badge: 'd-rest' },
            { day: 'Friday', ex: '30 min Walking + Light Core Work', diff: 'Easy', badge: 'd-easy' },
            { day: 'Saturday', ex: 'Swimming or Cycling 30 min', diff: 'Easy', badge: 'd-easy' },
            { day: 'Sunday', ex: 'Full Rest / Leisure Walk', diff: 'Rest', badge: 'd-rest' },
        ],
        'easy-medium': [
            { day: 'Monday', ex: '30 min Brisk Walk + Pushups 3×10', diff: 'Easy', badge: 'd-easy' },
            { day: 'Tuesday', ex: 'Yoga / Stretching 30 min', diff: 'Rest', badge: 'd-rest' },
            { day: 'Wednesday', ex: 'Cycling 35 min + Core Circuit', diff: 'Medium', badge: 'd-medium' },
            { day: 'Thursday', ex: 'Rest', diff: 'Rest', badge: 'd-rest' },
            { day: 'Friday', ex: 'Squats 3×15 + Rows 3×12 + Walk', diff: 'Medium', badge: 'd-medium' },
            { day: 'Saturday', ex: '30 min Light Jog or Swimming', diff: 'Easy', badge: 'd-easy' },
            { day: 'Sunday', ex: 'Full Rest', diff: 'Rest', badge: 'd-rest' },
        ],
        medium: [
            { day: 'Monday', ex: 'Running 30 min + Pushups 3×15', diff: 'Medium', badge: 'd-medium' },
            { day: 'Tuesday', ex: 'Strength: Squats, Rows, Shoulder Press (45 min)', diff: 'Medium', badge: 'd-medium' },
            { day: 'Wednesday', ex: 'Rest / Yoga', diff: 'Rest', badge: 'd-rest' },
            { day: 'Thursday', ex: 'Running 35 min + Core Circuit', diff: 'Medium', badge: 'd-medium' },
            { day: 'Friday', ex: 'Strength: Bench Press, Deadlift (45 min)', diff: 'Medium', badge: 'd-medium' },
            { day: 'Saturday', ex: 'Cycling or Swimming 40 min', diff: 'Easy', badge: 'd-easy' },
            { day: 'Sunday', ex: 'Full Rest', diff: 'Rest', badge: 'd-rest' },
        ],
        'medium-hard': [
            { day: 'Monday', ex: 'HIIT 30 min (Burpees, Jump Rope, Squats)', diff: 'Hard', badge: 'd-hard' },
            { day: 'Tuesday', ex: 'Strength: Full Body 50 min', diff: 'Medium', badge: 'd-medium' },
            { day: 'Wednesday', ex: 'Running 40 min', diff: 'Medium', badge: 'd-medium' },
            { day: 'Thursday', ex: 'HIIT 25 min + Core 15 min', diff: 'Hard', badge: 'd-hard' },
            { day: 'Friday', ex: 'Strength + Cardio Finisher 50 min', diff: 'Hard', badge: 'd-hard' },
            { day: 'Saturday', ex: 'Active Recovery: Walk/Yoga', diff: 'Easy', badge: 'd-easy' },
            { day: 'Sunday', ex: 'Full Rest', diff: 'Rest', badge: 'd-rest' },
        ],
        hard: [
            { day: 'Monday', ex: 'Heavy Compound Lift: Squat + Deadlift', diff: 'Hard', badge: 'd-hard' },
            { day: 'Tuesday', ex: 'Chest & Triceps: Bench, Dips, Flyes', diff: 'Hard', badge: 'd-hard' },
            { day: 'Wednesday', ex: 'Active Recovery: 25 min Jog + Stretch', diff: 'Easy', badge: 'd-easy' },
            { day: 'Thursday', ex: 'Back & Biceps: Pull-ups, Rows, Curls', diff: 'Hard', badge: 'd-hard' },
            { day: 'Friday', ex: 'Shoulders & Core: Press, Lateral Raises, Plank', diff: 'Hard', badge: 'd-hard' },
            { day: 'Saturday', ex: 'HIIT Conditioning 30 min', diff: 'Medium', badge: 'd-medium' },
            { day: 'Sunday', ex: 'Full Rest', diff: 'Rest', badge: 'd-rest' },
        ],
    };

    function getPlanIntensity(bmi, age, goal) {
        if (bmi > 35 || age > 65) return 'easy';
        if (bmi > 30 || age > 55) return 'easy-medium';
        if (bmi < 18.5 && goal !== 'muscle_gain') return 'easy';
        if (goal === 'muscle_gain') return 'hard';
        if (goal === 'weight_loss') return 'medium-hard';
        return 'medium';
    }

    const TODAY = new Date().toISOString().split('T')[0];

    /* ── State ── */
    const [currentGoal, setCurrentGoal] = useState('maintenance');
    const [userProfile, setUserProfile] = useState(() => JSON.parse(localStorage.getItem('fitnessProfile')) || null);
    const [workoutData, setWorkoutData] = useState(() => JSON.parse(localStorage.getItem('fitnessWorkouts')) || []);
    const [hydration, setHydration] = useState(() => parseInt(localStorage.getItem('fitnessHydration')) || 0);
    const [exSearch, setExSearch] = useState('');
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* Profile form */
    const [pAge, setPAge] = useState(userProfile?.age || '');
    const [pWeight, setPWeight] = useState(userProfile?.weight || '');
    const [pHeight, setPHeight] = useState(userProfile?.height || '');
    const [pGender, setPGender] = useState(userProfile?.gender || 'male');
    const [pActivity, setPActivity] = useState(userProfile?.activity || 1.55);

    /* Workout log form */
    const [wDate, setWDate] = useState(TODAY);
    const [wExercise, setWExercise] = useState('');
    const [wDuration, setWDuration] = useState('');
    const [wCalories, setWCalories] = useState('');
    const [wMuscle, setWMuscle] = useState('Cardio');
    const [wWeightLog, setWWeightLog] = useState('');
    const [wCalorieGoal, setWCalorieGoal] = useState('2000');

    /* Chart refs */
    const calChartRef = useRef(null);
    const muscleChartRef = useRef(null);
    const weightChartRef = useRef(null);
    const calChartInst = useRef(null);
    const muscleChartInst = useRef(null);
    const weightChartInst = useRef(null);

    /* ── Sync localStorage ── */
    useEffect(() => {
        localStorage.setItem('fitnessWorkouts', JSON.stringify(workoutData));
    }, [workoutData]);

    useEffect(() => {
        localStorage.setItem('fitnessHydration', hydration);
    }, [hydration]);

    useEffect(() => {
        if (userProfile) {
            localStorage.setItem('fitnessProfile', JSON.stringify(userProfile));
            const tdee = calcTDEE(userProfile);
            setWCalorieGoal(String(getGoalCalories(tdee, currentGoal)));
        }
    }, [userProfile, currentGoal]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Charts ── */
    useEffect(() => {
        if (calChartRef.current) {
            const last7 = workoutData.slice(-7);
            const labels = last7.map(w => w.date.slice(5));
            const burned = last7.map(w => w.cal);
            const goals = last7.map(w => w.goalCal);
            if (calChartInst.current) calChartInst.current.destroy();
            calChartInst.current = new Chart(calChartRef.current.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Burned', data: burned, backgroundColor: 'rgba(232,100,122,0.7)', borderColor: '#e8647a', borderWidth: 1 },
                        { label: 'Goal', data: goals, backgroundColor: 'rgba(79,163,232,0.15)', borderColor: '#4fa3e8', borderWidth: 2, type: 'line', tension: 0.3 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#8fb5ce', font: { family: 'DM Sans' } } } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#4a6b82' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                        x: { ticks: { color: '#4a6b82' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    },
                },
            });
        }

        if (muscleChartRef.current) {
            const counts = {};
            workoutData.forEach(w => { counts[w.muscle] = (counts[w.muscle] || 0) + 1; });
            const labels = Object.keys(counts);
            const data = Object.values(counts);
            const COLORS = ['#e8647a', '#4fa3e8', '#61b8a8', '#f4a261', '#c084fc', '#f6ad55', '#00b5d8'];
            if (muscleChartInst.current) muscleChartInst.current.destroy();
            muscleChartInst.current = new Chart(muscleChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: COLORS.slice(0, labels.length), borderWidth: 2, borderColor: '#0f1e2d' }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#8fb5ce', font: { family: 'DM Sans' } } } },
                },
            });
        }

        if (weightChartRef.current) {
            const withWeight = workoutData.filter(w => w.weight).sort((a, b) => a.date.localeCompare(b.date));
            const labels = withWeight.map(w => w.date.slice(5));
            const data = withWeight.map(w => w.weight);
            if (weightChartInst.current) weightChartInst.current.destroy();
            weightChartInst.current = new Chart(weightChartRef.current.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Weight (kg)', data,
                        borderColor: '#61b8a8', backgroundColor: 'rgba(97,184,168,0.12)',
                        borderWidth: 2, tension: 0.4, fill: true, pointRadius: 4,
                        pointBackgroundColor: '#61b8a8',
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: false, ticks: { color: '#4a6b82' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                        x: { ticks: { color: '#4a6b82' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    },
                    plugins: { legend: { position: 'bottom', labels: { color: '#8fb5ce', font: { family: 'DM Sans' } } } },
                },
            });
        }

        return () => {
            calChartInst.current?.destroy();
            muscleChartInst.current?.destroy();
            weightChartInst.current?.destroy();
        };
    }, [workoutData]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Profile submit ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        const profile = {
            age: parseInt(pAge),
            weight: parseFloat(pWeight),
            height: parseFloat(pHeight),
            gender: pGender,
            activity: parseFloat(pActivity),
        };
        setUserProfile(profile);
    }

    /* ── Workout log ── */
    function autofillCal(exercise, duration) {
        if (!exercise) return;
        const cpm = parseInt(exercise.split('|')[1]) || 5;
        const dur = parseInt(duration) || 30;
        setWCalories(String(Math.round(cpm * dur)));
    }

    function logWorkout() {
        const dur = parseInt(wDuration) || 0;
        const cal = parseInt(wCalories) || 0;
        if (!dur || !cal) { alert('Please enter duration and calories.'); return; }
        const exName = wExercise ? wExercise.split('|')[0] : 'Unknown';
        const entry = {
            id: Date.now(),
            date: wDate || TODAY,
            exName,
            dur,
            cal,
            muscle: wMuscle,
            weight: parseFloat(wWeightLog) || null,
            goalCal: parseInt(wCalorieGoal) || 2000,
        };
        setWorkoutData(prev => [...prev, entry]);
        setWDuration('');
        setWCalories('');
        setWWeightLog('');
    }

    function clearWorkoutData() {
        if (window.confirm('Clear all workout logs? This cannot be undone.')) {
            setWorkoutData([]);
            localStorage.removeItem('fitnessWorkouts');
        }
    }

    /* ── Hydration ── */
    function toggleBubble(i) {
        setHydration(prev => (i < prev ? i : i + 1));
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your data…');

        const totalSessions = workoutData.length;
        const totalCal = workoutData.reduce((s, w) => s + w.cal, 0);
        const avgCal = totalSessions ? Math.round(totalCal / totalSessions) : 0;
        const now = new Date();
        const last7Days = workoutData.filter(w => (now - new Date(w.date)) / 86400000 <= 7);
        const sessionsThisWeek = last7Days.length;
        const calThisWeek = last7Days.reduce((s, w) => s + w.cal, 0);

        const profileSummary = userProfile
            ? `BMI ${calcBMI(userProfile)} (${bmiCategory(parseFloat(calcBMI(userProfile))).cat}), BMR ${calcBMR(userProfile)} kcal, TDEE ${calcTDEE(userProfile)} kcal, goal: ${currentGoal.replace('_', ' ')}.`
            : 'Profile not filled in yet.';

        const prompt = `You are a fitness coach AI. Here is my data:
- Profile: ${profileSummary}
- Total logged workouts: ${totalSessions}
- Average calories burned per session: ${avgCal} kcal
- Workouts this week: ${sessionsThisWeek}
- Calories burned this week: ${calThisWeek} kcal
- Fitness goal: ${currentGoal.replace('_', ' ')}

Please give a concise, honest report (under 180 words) that:
1. States whether I am overtraining, undertraining, or on track.
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

    /* ── Derived values ── */
    const bmi = userProfile ? parseFloat(calcBMI(userProfile)) : null;
    const bmr = userProfile ? calcBMR(userProfile) : null;
    const tdee = userProfile ? calcTDEE(userProfile) : null;
    const goalCal = userProfile ? getGoalCalories(tdee, currentGoal) : null;
    const maxHR = userProfile ? 220 - userProfile.age : null;
    const bmiInfo = bmi !== null ? bmiCategory(bmi) : null;

    const intensity = userProfile ? getPlanIntensity(bmi, userProfile.age, currentGoal) : 'medium';
    const weeklyPlan = WEEKLY_PLANS[intensity] || WEEKLY_PLANS['medium'];

    const filteredExercises = EXERCISES.filter(e =>
        e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
        e.group.toLowerCase().includes(exSearch.toLowerCase()) ||
        e.type.toLowerCase().includes(exSearch.toLowerCase())
    );

    const recentLogs = [...workoutData].reverse().slice(0, 10);
    const DIFF_COLORS = { Easy: 'd-easy', Medium: 'd-medium', Hard: 'd-hard' };

    /* ── Render ── */
    return (
        // ↓ ONLY CHANGE from original: "container" → "fitness-page"
        <div className="fitness-page">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>🏋️ Fitness Dashboard</h1>
            </header>

            <main>
                {/* ── Profile Card ── */}
                <div className="card">
                    <h2>👤 Your Profile</h2>

                    <div className="goal-tabs">
                        {[
                            { id: 'maintenance', label: '⚖️ Maintenance' },
                            { id: 'weight_loss', label: '🔥 Weight Loss' },
                            { id: 'muscle_gain', label: '💪 Muscle Gain' },
                        ].map(g => (
                            <div
                                key={g.id}
                                className={`goal-tab${currentGoal === g.id ? ' active' : ''}`}
                                onClick={() => setCurrentGoal(g.id)}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="p-age">Age (yrs)</label>
                                <input type="number" id="p-age" min="10" max="100" placeholder="e.g., 30"
                                    value={pAge} onChange={e => setPAge(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="p-weight">Weight (kg)</label>
                                <input type="number" id="p-weight" min="20" max="300" step="0.1" placeholder="e.g., 70"
                                    value={pWeight} onChange={e => setPWeight(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="p-height">Height (cm)</label>
                                <input type="number" id="p-height" min="100" max="250" placeholder="e.g., 170"
                                    value={pHeight} onChange={e => setPHeight(e.target.value)} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="p-gender">Gender</label>
                                <select id="p-gender" value={pGender} onChange={e => setPGender(e.target.value)}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div className="input-box">
                                <label htmlFor="p-activity">Activity Level</label>
                                <select id="p-activity" value={pActivity} onChange={e => setPActivity(e.target.value)}>
                                    <option value="1.2">Sedentary (desk job, no exercise)</option>
                                    <option value="1.375">Lightly Active (1–3 days/week)</option>
                                    <option value="1.55">Moderately Active (3–5 days/week)</option>
                                    <option value="1.725">Very Active (6–7 days/week)</option>
                                    <option value="1.9">Extra Active (athlete / physical job)</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit">Calculate My Stats</button>
                    </form>
                </div>

                {/* ── Health Analytics ── */}
                {userProfile && (
                    <div className="card" id="stats-card">
                        <h2>📊 Health Analytics</h2>
                        <div className="stats-grid">
                            <div className="stat-box"><div className="val" style={{ color: bmiInfo.color }}>{bmi}</div><div className="lbl">BMI</div></div>
                            <div className="stat-box"><div className="val" style={{ color: bmiInfo.color }}>{bmiInfo.cat}</div><div className="lbl">BMI Category</div></div>
                            <div className="stat-box"><div className="val">{bmr?.toLocaleString()}</div><div className="lbl">BMR (kcal/day)</div></div>
                            <div className="stat-box"><div className="val">{tdee?.toLocaleString()}</div><div className="lbl">TDEE (kcal/day)</div></div>
                            <div className="stat-box"><div className="val">{goalCal?.toLocaleString()}</div><div className="lbl">Goal Calories</div></div>
                            <div className="stat-box"><div className="val">{maxHR}</div><div className="lbl">Max Heart Rate</div></div>
                        </div>

                        <h3 style={{ marginBottom: '8px' }}>❤️ Heart Rate Training Zones</h3>
                        <div className="hr-zones">
                            {HR_ZONES.map(z => {
                                const lo = Math.round(maxHR * z.pct[0]);
                                const hi = Math.round(maxHR * z.pct[1]);
                                return (
                                    <div key={z.name} className="hr-zone" style={{ background: z.bg }}>
                                        <div className="zone-dot" style={{ background: z.text === '#fff' ? '#9b2c2c' : z.text }} />
                                        <span className="zone-name" style={{ color: z.text }}>{z.name}</span>
                                        <span className="zone-range" style={{ color: z.text }}>{lo} – {hi} bpm</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Weekly Plan ── */}
                {userProfile && (
                    <div className="card" id="planner-card">
                        <h2>📅 Your Personalised Weekly Workout Plan</h2>
                        <p style={{ fontSize: '0.9rem', color: '#8fb5ce', marginBottom: '16px', lineHeight: 1.5 }}>
                            Based on your BMI of {bmi} ({bmiInfo.cat}), age {userProfile.age}, and{' '}
                            <strong style={{ color: '#e8edf2' }}>{currentGoal.replace('_', ' ')}</strong> goal — your plan is calibrated to{' '}
                            <strong style={{ color: '#61b8a8' }}>{intensity.replace('-', ' / ')}</strong> intensity.
                        </p>
                        <div id="weekly-plan">
                            {weeklyPlan.map(d => (
                                <div key={d.day} className="plan-day">
                                    <span className="plan-day-name">{d.day}</span>
                                    <span className="plan-day-detail">{d.ex}</span>
                                    <span className={`difficulty-badge ${d.badge}`}>{d.diff}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Log a Workout ── */}
                <div className="card">
                    <h2>📝 Log a Workout</h2>
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="w-date">Date</label>
                            <input type="date" id="w-date" value={wDate} onChange={e => setWDate(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="w-exercise">Exercise</label>
                            <select id="w-exercise" value={wExercise}
                                onChange={e => { setWExercise(e.target.value); autofillCal(e.target.value, wDuration); }}>
                                <option value="">— Select Exercise —</option>
                                {EXERCISES.map(ex => (
                                    <option key={ex.name} value={`${ex.name}|${ex.cpm}`}>{ex.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-box">
                            <label htmlFor="w-duration">Duration (min)</label>
                            <input type="number" id="w-duration" min="1" max="300" placeholder="e.g., 30"
                                value={wDuration}
                                onChange={e => { setWDuration(e.target.value); autofillCal(wExercise, e.target.value); }} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="w-calories">Calories Burned</label>
                            <input type="number" id="w-calories" min="1" placeholder="Auto or enter"
                                value={wCalories} onChange={e => setWCalories(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="w-muscle">Primary Muscle Group</label>
                            <select id="w-muscle" value={wMuscle} onChange={e => setWMuscle(e.target.value)}>
                                <option value="Cardio">Cardio / Full Body</option>
                                <option value="Chest">Chest</option>
                                <option value="Back">Back</option>
                                <option value="Legs">Legs</option>
                                <option value="Shoulders">Shoulders</option>
                                <option value="Arms">Arms</option>
                                <option value="Core">Core</option>
                            </select>
                        </div>
                        <div className="input-box">
                            <label htmlFor="w-weight-log">Body Weight Today (kg)</label>
                            <input type="number" id="w-weight-log" step="0.1" placeholder="Optional"
                                value={wWeightLog} onChange={e => setWWeightLog(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="w-calorie-goal">Daily Calorie Goal</label>
                            <input type="number" id="w-calorie-goal" placeholder="Auto from profile"
                                value={wCalorieGoal} onChange={e => setWCalorieGoal(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={logWorkout}>Save Workout</button>

                    <div id="log-list">
                        {recentLogs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#4a6b82', padding: '12px' }}>No workouts logged yet.</p>
                            : recentLogs.map((w) => (
                                <div key={w.id ?? w.date + w.exName} className="log-item">
                                    <span style={{ color: '#4a6b82', fontSize: '0.8rem' }}>{w.date}</span>
                                    <span style={{ fontWeight: 600, color: '#e8edf2' }}>{w.exName}</span>
                                    <span className="log-tag">{w.dur} min</span>
                                    <span style={{ color: '#e8647a', fontWeight: 600 }}>🔥 {w.cal} kcal</span>
                                    <span style={{ color: '#4a6b82', fontSize: '0.8rem' }}>{w.muscle}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* ── Charts Row ── */}
                <div className="charts-row" style={{ marginBottom: '0' }}>
                    <div className="chart-card">
                        <h3>🔥 Calories Burned vs Goal</h3>
                        <div className="chart-mini"><canvas ref={calChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>💪 Muscle Group Distribution</h3>
                        <div className="chart-mini"><canvas ref={muscleChartRef} /></div>
                    </div>
                </div>

                {/* ── Weight Trend ── */}
                <div className="card">
                    <h2>📈 Weight Trend</h2>
                    <div className="chart-container"><canvas ref={weightChartRef} /></div>
                    <button className="btn-danger" onClick={clearWorkoutData} style={{ marginTop: '20px' }}>
                        🗑️ Clear All Data
                    </button>
                </div>

                {/* ── Exercise Library ── */}
                <div className="card">
                    <h2>📚 Exercise Library</h2>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <input type="text" id="ex-search" placeholder="🔍 Search exercises…"
                                value={exSearch} onChange={e => setExSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="table-scroll">
                        <table id="exercise-table">
                            <thead>
                                <tr>
                                    <th>Exercise</th><th>Muscle Group</th><th>Cal/min</th><th>Difficulty</th><th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExercises.map(ex => (
                                    <tr key={ex.name}>
                                        <td><strong>{ex.name}</strong></td>
                                        <td>{ex.group}</td>
                                        <td>{ex.cpm}</td>
                                        <td><span className={`difficulty-badge ${DIFF_COLORS[ex.diff]}`}>{ex.diff}</span></td>
                                        <td>{ex.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Hydration Tracker ── */}
                <div className="card">
                    <h2>💧 Daily Hydration Tracker</h2>
                    <p style={{ fontSize: '0.88rem', color: '#4a6b82', marginBottom: '10px' }}>
                        Each bubble = 250 ml. Tap to fill. Goal: 8 glasses (2 L).
                    </p>
                    <div className="water-bubbles" id="water-bubbles">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div key={i} className={`bubble${i < hydration ? ' filled' : ''}`}
                                onClick={() => toggleBubble(i)}>
                                💧
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#e8edf2' }}>
                        <strong>{hydration} / 8 glasses today</strong>
                        <div className="progress-bar-wrap" style={{ marginTop: '8px' }}>
                            <div className="progress-bar-fill" style={{ width: `${(hydration / 8) * 100}%` }} />
                        </div>
                    </div>
                    <button onClick={() => setHydration(0)}
                        style={{
                            marginTop: '14px', background: 'rgba(79,163,232,0.12)', color: '#4fa3e8',
                            border: '1px solid rgba(79,163,232,0.25)', boxShadow: 'none'
                        }}>
                        Reset
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="card">
                    <h3>🤖 AI Performance Report</h3>
                    <p style={{ fontSize: '0.9rem', color: '#8fb5ce', marginBottom: '4px' }}>
                        Analyses your logged workouts, BMI, and calorie data to flag overtraining,
                        undertraining, and give personalised advice.
                    </p>
                    <button className="btn-ai" onClick={generateAIReport} disabled={aiLoading}>
                        {aiLoading ? '⏳ Generating…' : '✨ Generate AI Report'}
                    </button>
                    {aiReport && (
                        <div id="ai-report-box" style={{ whiteSpace: 'pre-wrap' }}>
                            {aiReport}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
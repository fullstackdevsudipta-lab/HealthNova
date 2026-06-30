import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './nutrition.css';

Chart.register(...registerables);

/* ── Food Database ── */
const FOOD_DB = [
    { name: 'Chicken Breast (100g)', cal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, category: 'Protein' },
    { name: 'Brown Rice (100g)', cal: 216, protein: 4.5, carbs: 45, fat: 1.8, fiber: 3.5, category: 'Carbs' },
    { name: 'Whole Egg (1 large)', cal: 72, protein: 6, carbs: 0.4, fat: 5, fiber: 0, category: 'Protein' },
    { name: 'Banana (1 medium)', cal: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, category: 'Fruit' },
    { name: 'Salmon (100g)', cal: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, category: 'Protein' },
    { name: 'Oats (100g dry)', cal: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, category: 'Carbs' },
    { name: 'Greek Yogurt (100g)', cal: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, category: 'Dairy' },
    { name: 'Almonds (30g)', cal: 174, protein: 6, carbs: 6, fat: 15, fiber: 3.5, category: 'Fats' },
    { name: 'Sweet Potato (100g)', cal: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, category: 'Carbs' },
    { name: 'Avocado (100g)', cal: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, category: 'Fats' },
    { name: 'Broccoli (100g)', cal: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, category: 'Veggies' },
    { name: 'White Rice (100g)', cal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, category: 'Carbs' },
    { name: 'Tuna (100g canned)', cal: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, category: 'Protein' },
    { name: 'Peanut Butter (2 tbsp)', cal: 188, protein: 8, carbs: 6, fat: 16, fiber: 2, category: 'Fats' },
    { name: 'Milk Whole (240ml)', cal: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, category: 'Dairy' },
    { name: 'Cottage Cheese (100g)', cal: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, category: 'Dairy' },
    { name: 'Spinach (100g)', cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, category: 'Veggies' },
    { name: 'Lentils (100g cooked)', cal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, category: 'Protein' },
    { name: 'Olive Oil (1 tbsp)', cal: 119, protein: 0, carbs: 0, fat: 14, fiber: 0, category: 'Fats' },
    { name: 'Apple (1 medium)', cal: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, category: 'Fruit' },
    { name: 'Whey Protein (1 scoop)', cal: 120, protein: 25, carbs: 3, fat: 1.5, fiber: 0, category: 'Protein' },
    { name: 'Bread Whole Wheat (1sl)', cal: 80, protein: 4, carbs: 15, fat: 1, fiber: 2, category: 'Carbs' },
    { name: 'Pasta (100g cooked)', cal: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, category: 'Carbs' },
    { name: 'Cheddar Cheese (30g)', cal: 120, protein: 7, carbs: 0.4, fat: 10, fiber: 0, category: 'Dairy' },
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

const MACRO_GOALS = {
    maintenance: { protein: 0.8, fat: 0.25, },
    weight_loss: { protein: 1.2, fat: 0.20, },
    muscle_gain: { protein: 1.6, fat: 0.25, },
};

/* ── Health Calculations (same as Physical) ── */
function calcBMR({ weight, height, age, gender }) {
    const s = gender === 'male' ? 5 : -161;
    return Math.round(10 * weight + 6.25 * height - 5 * age + s);
}
function calcTDEE(p) {
    return Math.round(calcBMR(p) * p.activity);
}
function getGoalCalories(tdee, goal) {
    if (goal === 'weight_loss') return Math.round(tdee * 0.8);
    if (goal === 'muscle_gain') return Math.round(tdee * 1.1);
    return tdee;
}

function getMacroTargets(goalCal, weight, goal) {
    const proteinPerKg = MACRO_GOALS[goal]?.protein || 0.8;
    const fatPct = MACRO_GOALS[goal]?.fat || 0.25;
    const protein = Math.round(proteinPerKg * weight);
    const fat = Math.round((goalCal * fatPct) / 9);
    const carbs = Math.round((goalCal - protein * 4 - fat * 9) / 4);
    return { protein, fat, carbs };
}

const CATEGORY_COLORS = {
    Protein: '#e53e3e', Carbs: '#d69e2e', Fats: '#805ad5',
    Dairy: '#3182ce', Fruit: '#38a169', Veggies: '#00b5d8',
};

const TODAY = new Date().toISOString().split('T')[0];

/* ──────────────────────────────────────────── */
export default function Nutrition() {

    /* ── Goal tab ── */
    const [currentGoal, setCurrentGoal] = useState('maintenance');

    /* ── Profile state ── */
    const [userProfile, setUserProfile] = useState(
        () => JSON.parse(localStorage.getItem('nutritionProfile')) || null
    );
    const [pAge, setPAge] = useState(userProfile?.age || '');
    const [pWeight, setPWeight] = useState(userProfile?.weight || '');
    const [pHeight, setPHeight] = useState(userProfile?.height || '');
    const [pGender, setPGender] = useState(userProfile?.gender || 'male');
    const [pActivity, setPActivity] = useState(userProfile?.activity || 1.55);

    /* ── Meal log state ── */
    const [mealLog, setMealLog] = useState(
        () => JSON.parse(localStorage.getItem('nutritionLog')) || []
    );

    /* Log form */
    const [lDate, setLDate] = useState(TODAY);
    const [lMeal, setLMeal] = useState('Breakfast');
    const [lFood, setLFood] = useState('');
    const [lQty, setLQty] = useState(1);
    const [lCustom, setLCustom] = useState(false);
    const [lCal, setLCal] = useState('');
    const [lProtein, setLProtein] = useState('');
    const [lCarbs, setLCarbs] = useState('');
    const [lFat, setLFat] = useState('');
    const [lFiber, setLFiber] = useState('');
    const [lName, setLName] = useState('');
    const [foodSearch, setFoodSearch] = useState('');

    /* ── AI ── */
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── Chart refs ── */
    const calChartRef = useRef(null);
    const macroChartRef = useRef(null);
    const mealChartRef = useRef(null);
    const calInst = useRef(null);
    const macroInst = useRef(null);
    const mealInst = useRef(null);

    /* ── Persist ── */
    useEffect(() => { localStorage.setItem('nutritionLog', JSON.stringify(mealLog)); }, [mealLog]);
    useEffect(() => {
        if (userProfile) localStorage.setItem('nutritionProfile', JSON.stringify(userProfile));
    }, [userProfile]);

    /* ── Charts ── */
    useEffect(() => {
        const byDate = {};
        mealLog.forEach(e => {
            if (!byDate[e.date]) byDate[e.date] = { cal: 0, protein: 0, carbs: 0, fat: 0 };
            byDate[e.date].cal += e.cal;
            byDate[e.date].protein += e.protein;
            byDate[e.date].carbs += e.carbs;
            byDate[e.date].fat += e.fat;
        });
        const last7 = Object.keys(byDate).sort().slice(-7);
        const goalCal = userProfile
            ? getGoalCalories(calcTDEE(userProfile), currentGoal)
            : 2000;

        /* Calories Bar Chart */
        if (calChartRef.current) {
            if (calInst.current) calInst.current.destroy();
            calInst.current = new Chart(calChartRef.current.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: last7.map(d => d.slice(5)),
                    datasets: [
                        {
                            label: 'Calories',
                            data: last7.map(d => Math.round(byDate[d].cal)),
                            backgroundColor: last7.map(d =>
                                byDate[d].cal <= goalCal * 1.05
                                    ? 'rgba(56,161,105,0.7)' : 'rgba(229,62,62,0.7)'
                            ),
                            borderColor: last7.map(d =>
                                byDate[d].cal <= goalCal * 1.05 ? '#38a169' : '#e53e3e'
                            ),
                            borderWidth: 1,
                        },
                        {
                            label: `Goal (${goalCal} kcal)`,
                            data: last7.map(() => goalCal),
                            type: 'line',
                            borderColor: '#3182ce',
                            backgroundColor: 'rgba(49,130,206,0.1)',
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
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'kcal' } } },
                },
            });
        }

        /* Today's Macro Doughnut */
        if (macroChartRef.current) {
            const todayData = byDate[TODAY] || { protein: 0, carbs: 0, fat: 0 };
            if (macroInst.current) macroInst.current.destroy();
            macroInst.current = new Chart(macroChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Protein', 'Carbs', 'Fat'],
                    datasets: [{
                        data: [
                            Math.round(todayData.protein),
                            Math.round(todayData.carbs),
                            Math.round(todayData.fat),
                        ],
                        backgroundColor: ['rgba(229,62,62,0.8)', 'rgba(214,158,46,0.8)', 'rgba(128,90,213,0.8)'],
                        borderWidth: 2,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                },
            });
        }

        /* Meal Type Bar Chart */
        if (mealChartRef.current) {
            const byMeal = {};
            mealLog.filter(e => e.date === TODAY).forEach(e => {
                byMeal[e.meal] = (byMeal[e.meal] || 0) + e.cal;
            });
            const labels = Object.keys(byMeal);
            const data = Object.values(byMeal).map(Math.round);
            const COLORS = ['rgba(229,62,62,0.7)', 'rgba(49,130,206,0.7)', 'rgba(56,161,105,0.7)',
                'rgba(214,158,46,0.7)', 'rgba(128,90,213,0.7)', 'rgba(0,181,216,0.7)'];
            if (mealInst.current) mealInst.current.destroy();
            mealInst.current = new Chart(mealChartRef.current.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Calories by Meal',
                        data,
                        backgroundColor: COLORS.slice(0, labels.length),
                        borderRadius: 4,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'kcal' } } },
                    indexAxis: 'y',
                },
            });
        }

        return () => {
            calInst.current?.destroy();
            macroInst.current?.destroy();
            mealInst.current?.destroy();
        };
    }, [mealLog, userProfile, currentGoal]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Autofill from food DB ── */
    function autofillFood(foodName) {
        setLFood(foodName);
        const item = FOOD_DB.find(f => f.name === foodName);
        if (item) {
            setLCal(String(item.cal));
            setLProtein(String(item.protein));
            setLCarbs(String(item.carbs));
            setLFat(String(item.fat));
            setLFiber(String(item.fiber));
            setLName(item.name);
        }
    }

    function applyQty(val) {
        setLQty(val);
        const item = FOOD_DB.find(f => f.name === lFood);
        if (item) {
            setLCal(String(Math.round(item.cal * val)));
            setLProtein(String(Math.round(item.protein * val * 10) / 10));
            setLCarbs(String(Math.round(item.carbs * val * 10) / 10));
            setLFat(String(Math.round(item.fat * val * 10) / 10));
            setLFiber(String(Math.round(item.fiber * val * 10) / 10));
        }
    }

    /* ── Handlers ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        setUserProfile({
            age: parseInt(pAge), weight: parseFloat(pWeight),
            height: parseFloat(pHeight), gender: pGender,
            activity: parseFloat(pActivity),
        });
    }

    function logMeal() {
        const cal = parseFloat(lCal);
        if (!cal || cal <= 0) { alert('Please select a food or enter calories.'); return; }
        setMealLog(prev => [...prev, {
            id: Date.now(),
            date: lDate || TODAY,
            meal: lMeal,
            name: lCustom ? (lName || 'Custom Food') : (lFood || 'Custom Food'),
            cal: parseFloat(lCal) || 0,
            protein: parseFloat(lProtein) || 0,
            carbs: parseFloat(lCarbs) || 0,
            fat: parseFloat(lFat) || 0,
            fiber: parseFloat(lFiber) || 0,
        }]);
        setLCal(''); setLProtein(''); setLCarbs('');
        setLFat(''); setLFiber(''); setLName('');
        setLFood(''); setLQty(1);
    }

    function removeEntry(id) {
        setMealLog(prev => prev.filter(e => e.id !== id));
    }

    function clearLog() {
        if (window.confirm('Clear all nutrition logs? This cannot be undone.')) {
            setMealLog([]);
            localStorage.removeItem('nutritionLog');
        }
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your nutrition data…');

        const goalCal = userProfile
            ? getGoalCalories(calcTDEE(userProfile), currentGoal)
            : 2000;
        const targets = userProfile
            ? getMacroTargets(goalCal, userProfile.weight, currentGoal)
            : { protein: 50, carbs: 250, fat: 65 };

        const todayItems = mealLog.filter(e => e.date === TODAY);
        const todayCal = Math.round(todayItems.reduce((s, e) => s + e.cal, 0));
        const todayProt = Math.round(todayItems.reduce((s, e) => s + e.protein, 0));
        const todayCarbs = Math.round(todayItems.reduce((s, e) => s + e.carbs, 0));
        const todayFat = Math.round(todayItems.reduce((s, e) => s + e.fat, 0));
        const todayFiber = Math.round(todayItems.reduce((s, e) => s + e.fiber, 0));

        const profileSummary = userProfile
            ? `BMR ${calcBMR(userProfile)} kcal, TDEE ${calcTDEE(userProfile)} kcal, goal: ${currentGoal.replace('_', ' ')}, calorie target: ${goalCal} kcal.`
            : 'Profile not set.';

        const prompt = `You are a nutrition coach AI. Here is my data:
- Profile: ${profileSummary}
- Calorie target: ${goalCal} kcal | Protein target: ${targets.protein}g | Carbs: ${targets.carbs}g | Fat: ${targets.fat}g
- Today's intake: ${todayCal} kcal | Protein: ${todayProt}g | Carbs: ${todayCarbs}g | Fat: ${todayFat}g | Fiber: ${todayFiber}g
- Goal: ${currentGoal.replace('_', ' ')}

Give a concise, honest nutrition report (under 180 words) that:
1. States whether I am over, under, or on track with calories and key macros.
2. Gives 2-3 specific, actionable dietary tips.
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
    const bmr = userProfile ? calcBMR(userProfile) : null;
    const tdee = userProfile ? calcTDEE(userProfile) : null;
    const goalCal = userProfile ? getGoalCalories(tdee, currentGoal) : 2000;
    const targets = userProfile
        ? getMacroTargets(goalCal, userProfile.weight, currentGoal)
        : { protein: 50, carbs: 250, fat: 65 };

    const todayItems = mealLog.filter(e => e.date === TODAY);
    const todayCal = Math.round(todayItems.reduce((s, e) => s + e.cal, 0));
    const todayProt = Math.round(todayItems.reduce((s, e) => s + e.protein, 0) * 10) / 10;
    const todayCarbs = Math.round(todayItems.reduce((s, e) => s + e.carbs, 0) * 10) / 10;
    const todayFat = Math.round(todayItems.reduce((s, e) => s + e.fat, 0) * 10) / 10;
    const todayFiber = Math.round(todayItems.reduce((s, e) => s + e.fiber, 0) * 10) / 10;
    const calRemain = Math.max(0, goalCal - todayCal);
    const calPct = Math.min(Math.round((todayCal / goalCal) * 100), 100);

    const filteredFoods = FOOD_DB.filter(f =>
        f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
        f.category.toLowerCase().includes(foodSearch.toLowerCase())
    );

    const recentLogs = [...mealLog].reverse().slice(0, 12);

    /* macro % bar helper */
    function macroPct(got, target) { return Math.min(Math.round((got / target) * 100), 100); }
    function macroColor(pct) {
        if (pct >= 90 && pct <= 110) return '#38a169';
        if (pct > 110) return '#e53e3e';
        return '#d69e2e';
    }

    /* ── Render ── */
    return (
        <div className="container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>🥗 Caloric & Macro Intake</h1>
            </header>

            <main>

                {/* ── Profile Card ── */}
                <div className="card">
                    <h2>👤 Your Nutrition Profile</h2>

                    <div className="goal-tabs">
                        {[
                            { id: 'maintenance', label: '⚖️ Maintenance' },
                            { id: 'weight_loss', label: '🔥 Weight Loss' },
                            { id: 'muscle_gain', label: '💪 Muscle Gain' },
                        ].map(g => (
                            <div key={g.id}
                                className={`goal-tab${currentGoal === g.id ? ' active' : ''}`}
                                onClick={() => setCurrentGoal(g.id)}>
                                {g.label}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="n-age">Age (yrs)</label>
                                <input type="number" id="n-age" min="10" max="100" placeholder="e.g., 30"
                                    value={pAge} onChange={e => setPAge(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="n-weight">Weight (kg)</label>
                                <input type="number" id="n-weight" min="20" max="300" step="0.1" placeholder="e.g., 70"
                                    value={pWeight} onChange={e => setPWeight(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="n-height">Height (cm)</label>
                                <input type="number" id="n-height" min="100" max="250" placeholder="e.g., 170"
                                    value={pHeight} onChange={e => setPHeight(e.target.value)} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="n-gender">Gender</label>
                                <select id="n-gender" value={pGender} onChange={e => setPGender(e.target.value)}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div className="input-box">
                                <label htmlFor="n-activity">Activity Level</label>
                                <select id="n-activity" value={pActivity} onChange={e => setPActivity(e.target.value)}>
                                    <option value="1.2">Sedentary</option>
                                    <option value="1.375">Lightly Active (1–3 days/wk)</option>
                                    <option value="1.55">Moderately Active (3–5 days/wk)</option>
                                    <option value="1.725">Very Active (6–7 days/wk)</option>
                                    <option value="1.9">Extra Active (athlete)</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit">Calculate My Targets</button>
                    </form>
                </div>

                {/* ── Health Stats ── */}
                {userProfile && (
                    <div className="card" id="stats-card">
                        <h2>📊 Nutrition Targets</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <div className="val">{bmr?.toLocaleString()}</div>
                                <div className="lbl">BMR (kcal)</div>
                            </div>
                            <div className="stat-box">
                                <div className="val">{tdee?.toLocaleString()}</div>
                                <div className="lbl">TDEE (kcal)</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#38a169' }}>{goalCal?.toLocaleString()}</div>
                                <div className="lbl">Goal Calories</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#e53e3e' }}>{targets.protein}g</div>
                                <div className="lbl">Protein Target</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#d69e2e' }}>{targets.carbs}g</div>
                                <div className="lbl">Carbs Target</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#805ad5' }}>{targets.fat}g</div>
                                <div className="lbl">Fat Target</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Today's Summary ── */}
                <div className="card">
                    <h2>🍽️ Today's Summary</h2>

                    {/* Calorie ring info */}
                    <div className="today-cal-row">
                        <div className="cal-ring-wrap">
                            <svg viewBox="0 0 120 120" className="cal-ring">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                <circle cx="60" cy="60" r="50" fill="none"
                                    stroke={calPct >= 100 ? '#e53e3e' : '#38a169'}
                                    strokeWidth="12"
                                    strokeDasharray={`${(calPct / 100) * 314} 314`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 60 60)" />
                                <text x="60" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill="#1a365d">{todayCal}</text>
                                <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#718096">kcal eaten</text>
                            </svg>
                        </div>
                        <div className="cal-breakdown">
                            <div className="cal-row-item">
                                <span className="cal-label">🎯 Goal</span>
                                <span className="cal-val">{goalCal} kcal</span>
                            </div>
                            <div className="cal-row-item">
                                <span className="cal-label">✅ Eaten</span>
                                <span className="cal-val" style={{ color: '#38a169' }}>{todayCal} kcal</span>
                            </div>
                            <div className="cal-row-item">
                                <span className="cal-label">🔥 Remaining</span>
                                <span className="cal-val" style={{ color: calRemain === 0 ? '#e53e3e' : '#3182ce' }}>
                                    {calRemain} kcal
                                </span>
                            </div>
                            <div className="cal-row-item">
                                <span className="cal-label">🍽️ Meals today</span>
                                <span className="cal-val">{todayItems.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Macro Progress Bars */}
                    <h3 style={{ marginTop: '20px', marginBottom: '12px' }}>💪 Macro Progress</h3>
                    {[
                        { label: 'Protein', got: todayProt, target: targets.protein, unit: 'g', color: '#e53e3e' },
                        { label: 'Carbs', got: todayCarbs, target: targets.carbs, unit: 'g', color: '#d69e2e' },
                        { label: 'Fat', got: todayFat, target: targets.fat, unit: 'g', color: '#805ad5' },
                        { label: 'Fiber', got: todayFiber, target: 25, unit: 'g', color: '#38a169' },
                    ].map(m => {
                        const pct = macroPct(m.got, m.target);
                        const color = macroColor(pct);
                        return (
                            <div key={m.label} className="macro-row">
                                <div className="macro-label-row">
                                    <span className="macro-name" style={{ color: m.color }}>{m.label}</span>
                                    <span className="macro-nums">
                                        <strong style={{ color }}>{m.got}{m.unit}</strong>
                                        <span style={{ color: '#888' }}> / {m.target}{m.unit}</span>
                                        <span className="macro-pct" style={{ color }}>{pct}%</span>
                                    </span>
                                </div>
                                <div className="progress-bar-wrap">
                                    <div className="progress-bar-fill"
                                        style={{ width: `${pct}%`, background: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Log a Meal ── */}
                <div className="card">
                    <h2>📝 Log a Meal</h2>

                    {/* Custom toggle */}
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <div className="toggle-row">
                                <span className={`toggle-opt${!lCustom ? ' active' : ''}`}
                                    onClick={() => setLCustom(false)}>📚 From Library</span>
                                <span className={`toggle-opt${lCustom ? ' active' : ''}`}
                                    onClick={() => setLCustom(true)}>✏️ Custom Entry</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-date">Date</label>
                            <input type="date" id="l-date" value={lDate} onChange={e => setLDate(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-meal">Meal Type</label>
                            <select id="l-meal" value={lMeal} onChange={e => setLMeal(e.target.value)}>
                                {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {!lCustom ? (
                        <>
                            <div className="form-group">
                                <div className="input-box" style={{ flex: '1 1 100%' }}>
                                    <label htmlFor="food-search">Search Food</label>
                                    <input type="text" id="food-search" placeholder="🔍 Search foods…"
                                        value={foodSearch} onChange={e => setFoodSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <div className="input-box" style={{ flex: '2 1 220px' }}>
                                    <label htmlFor="l-food">Select Food</label>
                                    <select id="l-food" value={lFood}
                                        onChange={e => autofillFood(e.target.value)}>
                                        <option value="">— Choose Food —</option>
                                        {filteredFoods.map(f => (
                                            <option key={f.name} value={f.name}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-box">
                                    <label htmlFor="l-qty">Servings</label>
                                    <input type="number" id="l-qty" min="0.25" max="20" step="0.25"
                                        value={lQty} onChange={e => applyQty(parseFloat(e.target.value) || 1)} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="form-group">
                            <div className="input-box" style={{ flex: '1 1 100%' }}>
                                <label htmlFor="l-name">Food Name</label>
                                <input type="text" id="l-name" placeholder="e.g., My homemade pasta"
                                    value={lName} onChange={e => setLName(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Macro inputs */}
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-cal">Calories (kcal) *</label>
                            <input type="number" id="l-cal" min="0" placeholder="e.g., 350"
                                value={lCal} onChange={e => setLCal(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-protein">Protein (g)</label>
                            <input type="number" id="l-protein" min="0" step="0.1" placeholder="e.g., 30"
                                value={lProtein} onChange={e => setLProtein(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-carbs">Carbs (g)</label>
                            <input type="number" id="l-carbs" min="0" step="0.1" placeholder="e.g., 40"
                                value={lCarbs} onChange={e => setLCarbs(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-fat">Fat (g)</label>
                            <input type="number" id="l-fat" min="0" step="0.1" placeholder="e.g., 10"
                                value={lFat} onChange={e => setLFat(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-fiber">Fiber (g)</label>
                            <input type="number" id="l-fiber" min="0" step="0.1" placeholder="e.g., 5"
                                value={lFiber} onChange={e => setLFiber(e.target.value)} />
                        </div>
                    </div>

                    <button onClick={logMeal}>+ Add to Log</button>

                    {/* Log List */}
                    <div id="log-list">
                        {recentLogs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#888', padding: '12px' }}>No meals logged yet.</p>
                            : recentLogs.map(e => (
                                <div key={e.id} className="log-item">
                                    <span style={{ color: '#555', fontSize: '0.78rem' }}>{e.date}</span>
                                    <span className="log-tag">{e.meal}</span>
                                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                                    <span style={{ color: '#e53e3e', fontWeight: 600 }}>🔥 {Math.round(e.cal)} kcal</span>
                                    <span style={{ color: '#718096', fontSize: '0.78rem' }}>
                                        P:{e.protein}g C:{e.carbs}g F:{e.fat}g
                                    </span>
                                    <button className="remove-btn" onClick={() => removeEntry(e.id)}>✕</button>
                                </div>
                            ))}
                    </div>
                </div>

                {/* ── Charts Row ── */}
                <div className="charts-row" style={{ marginBottom: '25px' }}>
                    <div className="chart-card">
                        <h3>🔥 Calories vs Goal (Last 7 Days)</h3>
                        <div className="chart-mini"><canvas ref={calChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>🥗 Today's Macro Split</h3>
                        <div className="chart-mini"><canvas ref={macroChartRef} /></div>
                    </div>
                </div>

                {/* ── Meals by Type Chart ── */}
                <div className="card">
                    <h2>🍽️ Today's Calories by Meal</h2>
                    <div className="chart-container"><canvas ref={mealChartRef} /></div>
                </div>

                {/* ── Food Library ── */}
                <div className="card">
                    <h2>📚 Food Library</h2>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <input type="text" placeholder="🔍 Search foods, categories…"
                                value={foodSearch} onChange={e => setFoodSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="table-scroll">
                        <table id="food-table">
                            <thead>
                                <tr>
                                    <th>Food</th><th>Category</th><th>Cal</th>
                                    <th>Protein</th><th>Carbs</th><th>Fat</th><th>Fiber</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFoods.map(f => (
                                    <tr key={f.name}>
                                        <td><strong>{f.name}</strong></td>
                                        <td>
                                            <span className="difficulty-badge"
                                                style={{
                                                    background: CATEGORY_COLORS[f.category] + '22',
                                                    color: CATEGORY_COLORS[f.category],
                                                    border: `1px solid ${CATEGORY_COLORS[f.category]}55`
                                                }}>
                                                {f.category}
                                            </span>
                                        </td>
                                        <td>{f.cal}</td>
                                        <td style={{ color: '#e53e3e' }}>{f.protein}g</td>
                                        <td style={{ color: '#d69e2e' }}>{f.carbs}g</td>
                                        <td style={{ color: '#805ad5' }}>{f.fat}g</td>
                                        <td style={{ color: '#38a169' }}>{f.fiber}g</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Manage Data ── */}
                <div className="card">
                    <h2>📈 Manage Data</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '12px' }}>
                        You have <strong>{mealLog.length}</strong> meal entries logged.
                    </p>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Clear All Nutrition Data
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="card">
                    <h3>🤖 AI Nutrition Report</h3>
                    <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '12px' }}>
                        Analyses your calorie intake, macro balance, and fitness goal to give personalised dietary advice.
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

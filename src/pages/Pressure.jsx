import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './pressure.css';

Chart.register(...registerables);

export default function Pressure() {

    // ─── State ────────────────────────────────────────────────────
    const [age, setAge] = useState('');
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [condition, setCondition] = useState('None');
    const [checkupDate, setCheckupDate] = useState('');
    const [result, setResult] = useState(null);       // { text, bgColor, textColor }
    const [nextCheckup, setNextCheckup] = useState('');
    const [dietResult, setDietResult] = useState('');
    const [dietLoading, setDietLoading] = useState(false);

    // ─── Refs ──────────────────────────────────────────────────────
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // ─── Mount: build chart ────────────────────────────────────────
    useEffect(() => {
        const bpData = JSON.parse(localStorage.getItem('bpData')) || [];

        if (chartRef.current) {
            chartInstance.current = new Chart(chartRef.current, {
                type: 'line',
                data: {
                    labels: bpData.map(e => e.date),
                    datasets: [
                        {
                            label: 'Systolic (Target < 120)',
                            data: bpData.map(e => e.sys),
                            borderColor: '#e8647a',
                            backgroundColor: 'rgba(232,100,122,0.15)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#e8647a',
                            pointRadius: 4,
                        },
                        {
                            label: 'Diastolic (Target < 80)',
                            data: bpData.map(e => e.dia),
                            borderColor: '#4fa3e8',
                            backgroundColor: 'rgba(79,163,232,0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#4fa3e8',
                            pointRadius: 4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#8fb5ce', font: { family: 'DM Sans', size: 12 } },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { color: '#4a6b82', font: { family: 'DM Sans' } },
                            grid: { color: 'rgba(255,255,255,0.04)' },
                        },
                        y: {
                            beginAtZero: false,
                            suggestedMin: 60,
                            suggestedMax: 180,
                            ticks: { color: '#4a6b82', font: { family: 'DM Sans' } },
                            grid: { color: 'rgba(255,255,255,0.04)' },
                        },
                    },
                },
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, []);

    // ─── Update chart ──────────────────────────────────────────────
    function updateChart(bpData) {
        if (!chartInstance.current) return;
        chartInstance.current.data.labels = bpData.map(e => e.date);
        chartInstance.current.data.datasets[0].data = bpData.map(e => e.sys);
        chartInstance.current.data.datasets[1].data = bpData.map(e => e.dia);
        chartInstance.current.update();
    }

    // ─── Diagnosis Logic ───────────────────────────────────────────
    function diagnoseBP(sys, dia, age, cond, baseDateStr) {
        let status = '';
        let bgColor = '';
        let textColor = '#fff';
        let daysToAdd = 180;

        // CRISES
        if (sys >= 200 || dia >= 130 || (cond === 'Pheochromocytoma' && sys >= 200)) {
            status = '🚨 CRITICAL EMERGENCY: Immediate care required! Go to the ER now.';
            bgColor = '#742a2a'; daysToAdd = 0;
        } else if (sys >= 180 || dia >= 110) {
            status = '⚠️ SEVERE (Hypertensive Crisis): Urgent same-day assessment required.';
            bgColor = '#9b2c2c'; daysToAdd = 0;
        }
        // HYPOTENSION
        else if (sys <= 100 && dia <= 60) {
            if (cond === 'FrailElderly') {
                status = '💜 Symptomatic Hypotension (Frail/Elderly): Recheck same day.';
            } else {
                status = '💜 Low Blood Pressure. Recheck today if dizzy, otherwise monitor.';
            }
            bgColor = '#553c9a'; daysToAdd = 0;
        }
        // PREGNANCY
        else if (cond === 'Pregnancy') {
            if (sys >= 170 || dia >= 110) { status = '🔴 Severe Pregnancy BP: Same-day obstetric assessment.'; bgColor = '#9b2c2c'; daysToAdd = 0; }
            else if (sys >= 150 || dia >= 95) { status = '🟠 Possible Preeclampsia Risk: Obstetric review within 24 hours.'; bgColor = '#c53030'; daysToAdd = 1; }
            else if (sys >= 130 || dia >= 85) { status = '🟡 Elevated Pregnancy BP: Recheck within 24–48 hours.'; bgColor = '#975a16'; daysToAdd = 2; textColor = '#fefcbf'; }
            else { status = '✅ Normal Pregnancy BP.'; bgColor = '#276749'; daysToAdd = 14; }
        }
        // HIGH RISK
        else if (['CKD', 'Diabetes', 'Renovascular', 'Aldosteronism', 'Cushing', 'Resistant'].includes(cond)) {
            if (sys >= 160 || dia >= 100) { status = '🔴 High Risk Stage 2: Urgent specialist review within 48 hours.'; bgColor = '#c53030'; daysToAdd = 2; }
            else if (sys >= 150 || dia >= 95) { status = '🔴 High Risk Stage 2: Recheck within 48–72 hours.'; bgColor = '#c53030'; daysToAdd = 3; }
            else if (sys >= 140 || dia >= 90) { status = '🟠 High Risk Stage 1: Recheck in 48–72 hours.'; bgColor = '#975a16'; daysToAdd = 7; textColor = '#fefcbf'; }
            else if (sys >= 135 || dia >= 85) { status = '🟡 Elevated for High-Risk: Recheck in 1 week.'; bgColor = '#744210'; daysToAdd = 7; textColor = '#fefcbf'; }
            else { status = '✅ Controlled for High-Risk profile.'; bgColor = '#276749'; daysToAdd = 90; }
        }
        // LIFESTYLE
        else if (['OSA', 'Obesity', 'Diet', 'Medications', 'Stress', 'Thyroid', 'Inflammatory'].includes(cond)) {
            if (sys >= 170 || dia >= 105) { status = '🔴 Stage 2: Expedite therapy/review within 48 hours.'; bgColor = '#c53030'; daysToAdd = 2; }
            else if (sys >= 150 || dia >= 95) { status = '🔴 Stage 2: Recheck in 48–72 hours.'; bgColor = '#c53030'; daysToAdd = 3; }
            else if (sys >= 140 || dia >= 88) { status = '🟠 Stage 1: Recheck in 1–2 weeks.'; bgColor = '#975a16'; daysToAdd = 7; textColor = '#fefcbf'; }
            else if (sys >= 135 || dia >= 85) { status = '🟡 Elevated: Recheck in 1–2 weeks with lifestyle plan.'; bgColor = '#744210'; daysToAdd = 14; textColor = '#fefcbf'; }
            else { status = '✅ Normal BP. Maintain healthy habits.'; bgColor = '#276749'; daysToAdd = 180; }
        }
        // AGE-BASED
        else {
            if (age <= 17) {
                if (sys >= 150 || dia >= 95) { status = '🔴 Urgent Pediatric Assessment: Recheck within 48 hours.'; bgColor = '#c53030'; daysToAdd = 2; }
                else if (sys >= 140 || dia >= 90) { status = '🟠 Stage 1 for Youth: Urgent pediatric review.'; bgColor = '#975a16'; daysToAdd = 3; textColor = '#fefcbf'; }
                else if (sys >= 120 || dia >= 80) { status = '🟡 Borderline/Elevated for Youth: Recheck in 1–2 weeks.'; bgColor = '#744210'; daysToAdd = 14; textColor = '#fefcbf'; }
                else { status = '✅ Normal BP for age. Recheck in 6–12 months.'; bgColor = '#276749'; daysToAdd = 180; }
            } else if (age < 65) {
                if (sys >= 160 || dia >= 100) { status = '🔴 Stage 2: Recheck in 48–72 hours.'; bgColor = '#c53030'; daysToAdd = 3; }
                else if (sys >= 140 || dia >= 90) { status = '🟠 Stage 1: Recheck in 1 week. Check risk factors.'; bgColor = '#975a16'; daysToAdd = 7; textColor = '#fefcbf'; }
                else if (sys >= 130 || dia >= 80) { status = '🟡 Elevated: Recheck in 1–2 weeks.'; bgColor = '#744210'; daysToAdd = 14; textColor = '#fefcbf'; }
                else { status = '✅ Normal / Optimal. Recheck in 6–12 months.'; bgColor = '#276749'; daysToAdd = 365; }
            } else {
                if (sys >= 160 || dia >= 95) { status = '🔴 Stage 2: Urgent geriatric review within 48 hours.'; bgColor = '#c53030'; daysToAdd = 2; }
                else if (sys >= 150 || dia >= 85) { status = '🔴 Stage 2: Recheck in 48–72 hours. Assess meds.'; bgColor = '#c53030'; daysToAdd = 3; }
                else if (sys >= 140 || dia >= 80) { status = '🟠 Stage 1: Recheck in 1–2 weeks. Monitor closely.'; bgColor = '#975a16'; daysToAdd = 14; textColor = '#fefcbf'; }
                else if (sys >= 130 || dia >= 70) { status = '✅ Stable elderly monitoring. Recheck in 6 months.'; bgColor = '#276749'; daysToAdd = 180; }
                else { status = '✅ Normal/Stable. Watch for hypotension symptoms.'; bgColor = '#276749'; daysToAdd = 180; }
            }
        }

        setResult({ text: status, bgColor, textColor });

        if (baseDateStr) {
            const [year, month, day] = baseDateStr.split('-');
            let calcDate = new Date(year, month - 1, day);
            calcDate.setDate(calcDate.getDate() + daysToAdd);
            const nextStr = daysToAdd === 0
                ? 'Today / Immediately'
                : calcDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
            setNextCheckup(nextStr);
        }
    }

    // ─── Form Submit ───────────────────────────────────────────────
    function handleSubmit(e) {
        e.preventDefault();
        const sys = parseInt(systolic);
        const dia = parseInt(diastolic);
        const ageVal = parseInt(age);

        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()} ${today.getHours()}:${today.getMinutes() < 10 ? '0' : ''}${today.getMinutes()}`;

        const bpData = JSON.parse(localStorage.getItem('bpData')) || [];
        bpData.push({ date: dateStr, age: ageVal, sys, dia });
        localStorage.setItem('bpData', JSON.stringify(bpData));

        updateChart(bpData);
        diagnoseBP(sys, dia, ageVal, condition, checkupDate);
    }

    // ─── Clear ─────────────────────────────────────────────────────
    function clearData() {
        if (window.confirm('Clear all BP tracking data? This cannot be undone.')) {
            localStorage.removeItem('bpData');
            updateChart([]);
            setResult(null);
            setNextCheckup('');
        }
    }

    // ─── AI Dietician (Claude API) ─────────────────────────────────
    async function handleGetDiet() {
        setDietLoading(true);
        setDietResult('⏳ Consulting AI dietician…');

        const sys = systolic || '120';
        const dia = diastolic || '80';
        const prompt = `You are a clinical dietician. Give a concise 1-day meal plan (breakfast, lunch, dinner, snack) for someone with condition: ${condition} and blood pressure ${sys}/${dia} mmHg. Focus on low-sodium, heart-healthy foods. Under 160 words, use bullet points per meal. No disclaimers.`;

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
                setDietResult('❌ Error: ' + data.error.message);
            } else {
                setDietResult(data.content[0].text);
            }
        } catch (err) {
            setDietResult('❌ Connection error: ' + err.message);
        } finally {
            setDietLoading(false);
        }
    }

    // ─── JSX ───────────────────────────────────────────────────────
    return (
        <div className="pressure-page">

            {/* Header */}
            <header className="bp-header">
                <Link to="/" className="bp-back-btn">← Back to Dashboard</Link>
                <h1>🩸 BP Tracker</h1>
                <div style={{ width: 120 }} /> {/* spacer so h1 stays centred */}
            </header>

            <main className="bp-main">

                {/* ── Section: Readings ── */}
                <div className="bp-section-label">Log Reading</div>

                {/* Log Reading Card */}
                <div className="bp-card bp-full">
                    <h2>📋 Log Your Reading</h2>

                    <form onSubmit={handleSubmit}>
                        <div className="bp-form-group">
                            <div className="bp-input-box">
                                <label htmlFor="bp-age">Age</label>
                                <input
                                    type="number" id="bp-age" required min="1" max="120"
                                    placeholder="e.g., 35"
                                    value={age}
                                    onChange={e => setAge(e.target.value)}
                                />
                            </div>
                            <div className="bp-input-box">
                                <label htmlFor="bp-systolic">Systolic (Top)</label>
                                <input
                                    type="number" id="bp-systolic" required min="50" max="300"
                                    placeholder="e.g., 120"
                                    value={systolic}
                                    onChange={e => setSystolic(e.target.value)}
                                />
                            </div>
                            <div className="bp-input-box">
                                <label htmlFor="bp-diastolic">Diastolic (Bottom)</label>
                                <input
                                    type="number" id="bp-diastolic" required min="30" max="200"
                                    placeholder="e.g., 80"
                                    value={diastolic}
                                    onChange={e => setDiastolic(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <button type="submit" className="bp-btn bp-btn-primary" style={{ width: '100%' }}>
                                Save Reading &amp; View Result
                            </button>
                        </div>
                    </form>

                    {result && (
                        <div
                            className="bp-result-banner"
                            style={{ backgroundColor: result.bgColor, color: result.textColor }}
                        >
                            {result.text}
                        </div>
                    )}
                </div>

                {/* ── Section: Trends ── */}
                <div className="bp-section-label">Progress</div>

                {/* Chart Card */}
                <div className="bp-card bp-full">
                    <h2>📈 Your Blood Pressure Over Time</h2>
                    <div className="bp-chart-wrap">
                        <canvas ref={chartRef} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <button className="bp-btn bp-btn-danger" onClick={clearData}>
                            🗑️ Clear All Data
                        </button>
                    </div>
                </div>

                {/* ── Section: Planning ── */}
                <div className="bp-section-label">Schedule &amp; Conditions</div>

                {/* Checkup + Conditions Card */}
                <div className="bp-card">
                    <h2>📅 Schedule Checkup</h2>
                    <div className="bp-form-group">
                        <div className="bp-input-box full">
                            <label htmlFor="bp-checkup-date">Your Checkup Date</label>
                            <input
                                type="date"
                                id="bp-checkup-date"
                                value={checkupDate}
                                onChange={e => setCheckupDate(e.target.value)}
                            />
                        </div>
                        <div className="bp-input-box full">
                            <label htmlFor="bp-condition">Special Conditions / Risk Factors</label>
                            <select
                                id="bp-condition"
                                value={condition}
                                onChange={e => setCondition(e.target.value)}
                            >
                                <option value="None">None (General Guidelines)</option>
                                <option value="CKD">Chronic kidney disease</option>
                                <option value="Renovascular">Renovascular disease (renal artery stenosis)</option>
                                <option value="Aldosteronism">Primary aldosteronism</option>
                                <option value="Pheochromocytoma">Pheochromocytoma</option>
                                <option value="Thyroid">Thyroid disease (hyper/hypo)</option>
                                <option value="Cushing">Cushing syndrome</option>
                                <option value="OSA">Obstructive sleep apnea</option>
                                <option value="Obesity">Obesity with sedentary lifestyle</option>
                                <option value="Diet">High dietary salt intake / Excess alcohol</option>
                                <option value="Medications">Meds (NSAIDs, contraceptives, steroids, stimulants)</option>
                                <option value="Stress">Chronic stress / Poor sleep</option>
                                <option value="Pregnancy">Pregnancy-related (preeclampsia risk)</option>
                                <option value="Inflammatory">Chronic inflammatory disease</option>
                                <option value="Diabetes">Diabetes mellitus</option>
                                <option value="Resistant">Resistant hypertension on three drugs</option>
                                <option value="FrailElderly">Frail elderly (multiple meds / dizziness)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Next Checkup Result */}
                {nextCheckup && (
                    <div className="bp-card bp-checkup-result">
                        <h2>📅 Your Next Recommended Checkup</h2>
                        <p className="bp-reading-detail">
                            Based on your reading <strong>{systolic}/{diastolic} mmHg</strong> with condition{' '}
                            <strong>{condition}</strong>:
                        </p>
                        <div className="bp-checkup-date-pill">{nextCheckup}</div>
                        <p className="bp-checkup-meta">
                            ⚠️ Recommendation only. Always consult your doctor.
                        </p>
                    </div>
                )}

                {/* ── Section: AI ── */}
                <div className="bp-section-label">AI Tools</div>

                {/* AI Dietician Card */}
                <div className="bp-card bp-full">
                    <h3>🍽️ AI Dietician</h3>
                    <p>
                        Get a personalised 1-day low-sodium meal plan tailored to your latest BP reading
                        and selected health condition.
                    </p>
                    <button
                        className="bp-btn bp-btn-ai"
                        onClick={handleGetDiet}
                        disabled={dietLoading}
                        style={{ marginTop: 4 }}
                    >
                        {dietLoading ? '⏳ Generating…' : '✨ Generate Meal Plan'}
                    </button>

                    {dietResult && (
                        <div className="bp-ai-box">{dietResult}</div>
                    )}
                </div>

            </main>
        </div>
    );
}
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './bloodglucose.css';

Chart.register(...registerables);

/* ── Constants ── */
const GLUCOSE_ZONES = [
    { name: 'Low (Hypoglycemia)', range: [0, 69], bg: '#fed7d7', text: '#742a2a', badge: 'bg-low', desc: 'Requires immediate fast-acting carbs' },
    { name: 'Normal (Optimal)', range: [70, 140], bg: '#c6f6d5', text: '#1a4731', badge: 'bg-norm', desc: 'Excellent target range' },
    { name: 'Elevated (Pre-Meal)', range: [141, 180], bg: '#fefcbf', text: '#744210', badge: 'bg-elev', desc: 'Slightly high if fasting' },
    { name: 'High (Hyperglycemia)', range: [181, 250], bg: '#feebc8', text: '#c05621', badge: 'bg-high', desc: 'Monitor closely, stay hydrated' },
    { name: 'Dangerously High', range: [251, 999], bg: '#9b2c2c', text: '#fff', badge: 'bg-crit', desc: 'Consult healthcare team if sustained' },
];

const MEAL_CONTEXTS = [
    { name: 'Fasting', icon: '🌅', typical: [70, 95] },
    { name: 'Before Breakfast', icon: '🍳', typical: [70, 110] },
    { name: 'After Breakfast', icon: '🥞', typical: [110, 160] },
    { name: 'Before Lunch', icon: '🥗', typical: [75, 115] },
    { name: 'After Lunch', icon: '🥪', typical: [110, 150] },
    { name: 'Before Dinner', icon: '🍲', typical: [75, 115] },
    { name: 'After Dinner', icon: '🍕', typical: [120, 170] },
    { name: 'Bedtime', icon: '🛌', typical: [100, 140] },
    { name: 'Overnight', icon: '😴', typical: [70, 120] },
    { name: 'Random', icon: '🩸', typical: [80, 140] },
];

const GLUCOSE_FACTS = [
    { fact: '70–99', desc: 'mg/dL typical normal fasting range' },
    { fact: '< 140', desc: 'mg/dL standard target 2 hours after meals' },
    { fact: 'Rule of 15', desc: 'Eat 15g carbs, wait 15 mins if sugar is low' },
    { fact: 'A1C Link', desc: 'Daily tracks directly predict your 3-month average' },
];

const GLUCOSE_SYMPTOMS = [
    { id: 'shakiness', icon: '🫨', label: 'Shakiness / Trembling' },
    { id: 'sweating', icon: '😓', label: 'Excessive Sweating' },
    { id: 'dizziness', icon: '💫', label: 'Dizziness or Lightheadedness' },
    { id: 'thirst', icon: '🥛', label: 'Extreme Thirst (Polydipsia)' },
    { id: 'urination', icon: '🚽', label: 'Frequent Urination' },
    { id: 'blurry', icon: '👓', label: 'Blurred Vision' },
    { id: 'headache', icon: '🤕', label: 'Headache' },
    { id: 'confusion', icon: '🧠', label: 'Confusion / Brain Fog' },
];

const TODAY = new Date().toISOString().split('T')[0];

/* ── Pure Helper Functions ── */
function getGlucoseZone(value) {
    const num = parseInt(value) || 0;
    return GLUCOSE_ZONES.find(z => num >= z.range[0] && num <= z.range[1]) || GLUCOSE_ZONES[1];
}

export default function BloodGlucose() {
    /* ── State Initialization ── */
    const [userProfile, setUserProfile] = useState(() => JSON.parse(localStorage.getItem('bgProfile')) || null);
    const [pAge, setPAge] = useState(userProfile?.age || '');
    const [pType, setPType] = useState(userProfile?.diabetesType || 'none');

    const [bgLog, setBgLog] = useState(() => JSON.parse(localStorage.getItem('bgLog')) || []);

    const [lDate, setLDate] = useState(TODAY);
    const [lTime, setLTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [lValue, setLValue] = useState('');
    const [lContext, setLContext] = useState('Fasting');
    const [lNotes, setLNotes] = useState('');

    const [liveGlucose, setLiveGlucose] = useState(100);
    const [simRunning, setSimRunning] = useState(false);
    const simRef = useRef(null);

    const [symptoms, setSymptoms] = useState(() => JSON.parse(localStorage.getItem('bgSymptoms')) || {});
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const chartTrendRef = useRef(null);
    const chartPieRef = useRef(null);
    const instTrend = useRef(null);
    const instPie = useRef(null);

    /* ── Side Effects & Data Syncing ── */
    useEffect(() => { localStorage.setItem('bgLog', JSON.stringify(bgLog)); }, [bgLog]);
    useEffect(() => { localStorage.setItem('bgSymptoms', JSON.stringify(symptoms)); }, [symptoms]);
    useEffect(() => {
        if (userProfile) localStorage.setItem('bgProfile', JSON.stringify(userProfile));
    }, [userProfile]);

    /* Live Value Simulator Engine */
    useEffect(() => {
        if (simRunning) {
            simRef.current = setInterval(() => {
                const ctxInfo = MEAL_CONTEXTS.find(c => c.name === lContext) || MEAL_CONTEXTS[0];
                const [lo, hi] = ctxInfo.typical;
                const drift = Math.round(lo + Math.random() * (hi - lo) + (Math.random() - 0.5) * 8);
                setLiveGlucose(Math.max(40, drift));
            }, 1000);
        } else {
            clearInterval(simRef.current);
        }
        return () => clearInterval(simRef.current);
    }, [simRunning, lContext]);

    /* ── High-Performance Memoized Analytics Calculations ── */
    const analytics = useMemo(() => {
        const total = bgLog.length;
        if (total === 0) return { total: 0, avg: null, min: null, max: null, fastingAvg: null, recent: [] };

        const sortedLogs = [...bgLog].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        const sum = bgLog.reduce((acc, curr) => acc + curr.value, 0);
        const values = bgLog.map(e => e.value);

        const fastingItems = bgLog.filter(e => e.context === 'Fasting');
        const fastingAvg = fastingItems.length
            ? Math.round(fastingItems.reduce((acc, c) => acc + c.value, 0) / fastingItems.length)
            : null;

        return {
            total,
            avg: Math.round(sum / total),
            min: Math.min(...values),
            max: Math.max(...values),
            fastingAvg,
            recent: [...bgLog].reverse().slice(0, 10),
            timeline: sortedLogs.slice(-14)
        };
    }, [bgLog]);

    const activeSymptomCount = useMemo(() => {
        return GLUCOSE_SYMPTOMS.filter(s => symptoms[s.id]).length;
    }, [symptoms]);

    /* ── Charts Logic Lifecycle ── */
    useEffect(() => {
        if (!analytics.timeline || analytics.timeline.length === 0) return;

        if (chartTrendRef.current) {
            if (instTrend.current) instTrend.current.destroy();
            instTrend.current = new Chart(chartTrendRef.current.getContext('2d'), {
                type: 'line',
                data: {
                    labels: analytics.timeline.map(e => `${e.date.slice(5)} ${e.time}`),
                    datasets: [
                        {
                            label: 'Blood Glucose (mg/dL)',
                            data: analytics.timeline.map(e => e.value),
                            borderColor: '#3182ce',
                            backgroundColor: 'rgba(49, 130, 206, 0.08)',
                            borderWidth: 2.5,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 5,
                            pointBackgroundColor: analytics.timeline.map(e => getGlucoseZone(e.value).text === '#fff' ? '#9b2c2c' : getGlucoseZone(e.value).text),
                        },
                        {
                            label: 'Upper Limit (Normal Post-Meal)',
                            data: analytics.timeline.map(() => 140),
                            borderColor: 'rgba(214, 158, 46, 0.4)',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                        },
                        {
                            label: 'Lower Limit (Hypo Bound)',
                            data: analytics.timeline.map(() => 70),
                            borderColor: 'rgba(229, 62, 62, 0.4)',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#8b9cb8' } } },
                    scales: {
                        y: { min: 40, max: 320, title: { display: true, text: 'mg/dL', color: '#8b9cb8' }, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8b9cb8' } },
                        x: { grid: { display: false }, ticks: { color: '#8b9cb8' } }
                    }
                }
            });
        }

        if (chartPieRef.current) {
            const distributions = GLUCOSE_ZONES.map(z => ({
                name: z.name.split(' ')[0],
                count: bgLog.filter(e => e.value >= z.range[0] && e.value <= z.range[1]).length
            }));

            if (instPie.current) instPie.current.destroy();
            instPie.current = new Chart(chartPieRef.current.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: distributions.map(d => d.name),
                    datasets: [{
                        data: distributions.map(d => d.count),
                        backgroundColor: ['#fc8181', '#68d391', '#f6e05e', '#f6ad55', '#e53e3e'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#8b9cb8' } } }
                }
            });
        }

        return () => {
            instTrend.current?.destroy();
            instPie.current?.destroy();
        };
    }, [analytics.timeline, bgLog]);

    /* ── Interaction Handlers ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        setUserProfile({ age: parseInt(pAge), diabetesType: pType });
    }

    function logReading() {
        const val = parseInt(lValue);
        if (!val || val < 20 || val > 600) {
            alert('Please input a realistic blood glucose range value (20–600 mg/dL).');
            return;
        }
        setBgLog(prev => [...prev, {
            id: Date.now(),
            date: lDate || TODAY,
            time: lTime,
            value: val,
            context: lContext,
            notes: lNotes
        }]);
        setLValue('');
        setLNotes('');
    }

    function logLiveReading() {
        setBgLog(prev => [...prev, {
            id: Date.now(),
            date: TODAY,
            time: new Date().toTimeString().slice(0, 5),
            value: liveGlucose,
            context: lContext,
            notes: 'Logged instantly from live tracker simulation'
        }]);
    }

    function removeEntry(id) {
        setBgLog(prev => prev.filter(e => e.id !== id));
    }

    function clearLog() {
        if (window.confirm('Are you absolutely certain you want to wipe all blood glucose logging tracks?')) {
            setBgLog([]);
            localStorage.removeItem('bgLog');
        }
    }

    function toggleSymptom(id) {
        setSymptoms(prev => ({ ...prev, [id]: !prev[id] }));
    }

    /* ── Client Side Smart Logic Builder Optimization ── */
    function generateSystemReport() {
        setAiLoading(true);
        setAiReport('⚡ Analyzing multi-variant data sets...');

        setTimeout(() => {
            if (analytics.total === 0) {
                setAiReport('❌ Insufficient tracking logs. Please enter blood glucose values to build your data trends matrix.');
                setAiLoading(false);
                return;
            }

            const activeList = GLUCOSE_SYMPTOMS.filter(s => symptoms[s.id]).map(s => s.label).join(', ') || 'None';
            let analyticalSummary = `### Continuous Data Evaluation:\n`;
            analyticalSummary += `* Overall mean glucose sits at **${analytics.avg} mg/dL** over ${analytics.total} logged data points.\n`;

            if (analytics.fastingAvg) {
                analyticalSummary += `* Your mean fasting level maps at **${analytics.fastingAvg} mg/dL**. `;
                analyticalSummary += analytics.fastingAvg > 100 ? 'This leans elevated. Baseline fasting parameters target < 100 mg/dL.\n' : 'This fits clean baseline target spaces.\n';
            }

            analyticalSummary += `\n### Tactical Self-Management Adjustments:\n`;
            if (analytics.max > 180) {
                analyticalSummary += `* **Hydration Balance:** Spikes upward of ${analytics.max} mg/dL increase metabolic fluid loss. Boost mineralized hydration.\n`;
                analyticalSummary += `* **Macro Pacing:** Prioritize complex low-glycemic fiber matrices over refined, fast-acting carbohydrates.\n`;
            } else {
                analyticalSummary += `* **Activity Sequencing:** Maintain your steady kinetic outputs. A brisk 15-minute walk post meals stabilizes insulin sensitivity curves beautifully.\n`;
            }

            if (activeSymptomCount > 0) {
                analyticalSummary += `\n### Clinical Symptom Matrix Alert:\n`;
                analyticalSummary += `* Cross-referencing noted physical cues: *${activeList}*. Ensure these matches align with structural glucose logs. Secure direct confirmation from your doctor or endo specialist if values sit outside standard safety brackets.\n`;
            }

            analyticalSummary += `\n**Disclaimer:** System telemetry data is instructional and does not equal diagnostic advice. Adjust insulin parameters only via specialized healthcare guidance.`;

            setAiReport(analyticalSummary);
            setAiLoading(false);
        }, 850);
    }

    const liveZone = getGlucoseZone(liveGlucose);

    return (
        <div className="container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>🩸 Blood Glucose Telemetry</h1>
            </header>

            <main>
                {/* ── Facts Row ── */}
                <div className="facts-row">
                    {GLUCOSE_FACTS.map(f => (
                        <div key={f.fact} className="fact-box">
                            <div className="fact-val">{f.fact}</div>
                            <div className="fact-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── Profile Configuration Card ── */}
                <div className="card">
                    <h2>👤 User Clinical Context</h2>
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="bg-age">Age (yrs)</label>
                                <input type="number" id="bg-age" min="1" max="115" value={pAge} onChange={e => setPAge(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="bg-type">Classification Matrix</label>
                                <select id="bg-type" value={pType} onChange={e => setPType(e.target.value)}>
                                    <option value="none">Non-Diabetic Baseline</option>
                                    <option value="type1">Type 1 Diabetes</option>
                                    <option value="type2">Type 2 Diabetes</option>
                                    <option value="prediabetes">Pre-diabetic Track</option>
                                    <option value="gestational">Gestational Track</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit">Calibrate Assessment Targets</button>
                    </form>
                </div>

                {/* ── Live Simulation Interface ── */}
                <div className="card">
                    <h2>📡 Real-time Intermittent Simulator</h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--bg-text-secondary)', marginBottom: '16px' }}>
                        Select metabolic time context parameters to initiate real-time continuous sensor readings.
                    </p>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <label>Current Log Context Allocation</label>
                            <div className="activity-picker">
                                {MEAL_CONTEXTS.map(c => (
                                    <div key={c.name}
                                        className={`activity-chip${lContext === c.name ? ' selected' : ''}`}
                                        onClick={() => setLContext(c.name)}>
                                        {c.icon} {c.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bpm-display-wrap">
                        <div className="bpm-ring" style={{ '--zone-color': liveZone.text === '#fff' ? 'var(--bg-accent-red)' : liveZone.text }}>
                            <div className="bpm-inner" style={{ background: liveZone.bg }}>
                                <div className="bpm-number" style={{ color: liveZone.text === '#fff' ? 'var(--bg-accent-crimson)' : liveZone.text }}>
                                    {liveGlucose}
                                </div>
                                <div className="bpm-unit">mg/dL</div>
                                <div className={`bpm-pulse${simRunning ? ' beating' : ''}`} style={{ color: 'var(--bg-accent-blue)' }}>💧</div>
                            </div>
                        </div>
                        <div className="bpm-info">
                            <div className="bpm-zone-label" style={{ background: liveZone.bg, color: liveZone.text === '#fff' ? 'var(--bg-accent-crimson)' : liveZone.text }}>
                                {liveZone.name}
                            </div>
                            <div className="bpm-benefit">{liveZone.desc}</div>

                            <div className="bpm-ctrl-btns">
                                <button className={simRunning ? 'btn-stop' : 'btn-start'} onClick={() => setSimRunning(p => !p)}>
                                    {simRunning ? '⏹ Stop Stream' : '▶ Start Stream'}
                                </button>
                                <button className="btn-log-bpm" onClick={logLiveReading}>
                                    💾 Commit {liveGlucose} mg/dL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Analytics Presentation Layer ── */}
                {analytics.total > 0 && (
                    <div className="card">
                        <h2>📊 Consolidated Glucose System Analytics</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <div className="val" style={{ color: 'var(--bg-accent-blue)' }}>{analytics.avg}</div>
                                <div className="lbl">Mean Balance (mg/dL)</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: 'var(--bg-accent-green-light)' }}>{analytics.fastingAvg ?? '—'}</div>
                                <div className="lbl">Mean Fasting Track</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: 'var(--bg-accent-red-light)' }}>{analytics.min}</div>
                                <div className="lbl">Floor Capture</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: 'var(--bg-accent-orange)' }}>{analytics.max}</div>
                                <div className="lbl">Peak Surge</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Manual Entry Portal ── */}
                <div className="card">
                    <h2>📝 Manual Data Entry Interface</h2>
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-val">Glucose Matrix Value (mg/dL)</label>
                            <input type="number" id="l-val" min="20" max="600" placeholder="e.g., 105" value={lValue} onChange={e => setLValue(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-date">Date Format</label>
                            <input type="date" id="l-date" value={lDate} onChange={e => setLDate(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-time">Time stamp</label>
                            <input type="time" id="l-time" value={lTime} onChange={e => setLTime(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-notes">Contextual Modifiers / Notes</label>
                            <input type="text" id="l-notes" placeholder="Pre-exercise, stress factors, high carb breakfast..." value={lNotes} onChange={e => setLNotes(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={logReading} style={{ marginTop: '8px' }}>+ Append Log Node</button>

                    {/* Historical Listing Sub-Module */}
                    <div id="log-list" style={{ marginTop: '20px' }}>
                        {analytics.recent.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--bg-text-muted)', padding: '12px' }}>No captured entry sequences recorded.</p>
                        ) : (
                            analytics.recent.map(e => {
                                const zone = getGlucoseZone(e.value);
                                return (
                                    <div key={e.id} className="log-item">
                                        <span style={{ color: 'var(--bg-text-secondary)', fontSize: '0.78rem' }}>{e.date} {e.time}</span>
                                        <span className="log-tag">{e.context}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--bg-accent-blue)' }}>{e.value} mg/dL</span>
                                        <span className={`difficulty-badge ${zone.badge}`} style={{ background: zone.bg, color: zone.text === '#fff' ? '#9b2c2c' : zone.text, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                            {zone.name.split(' ')[0]}
                                        </span>
                                        <button className="remove-btn" onClick={() => removeEntry(e.id)}>✕</button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Charts Presentation Module ── */}
                {analytics.total > 0 && (
                    <div className="charts-row">
                        <div className="chart-card">
                            <h3>📈 Structural Trends Matrix (14 Nodes)</h3>
                            <div className="chart-mini"><canvas ref={chartTrendRef} /></div>
                        </div>
                        <div className="chart-card">
                            <h3>🎯 Zone Volatility Scatter</h3>
                            <div className="chart-mini"><canvas ref={chartPieRef} /></div>
                        </div>
                    </div>
                )}

                {/* ── Physical Symptom Matrix ── */}
                <div className="card">
                    <h2>🩺 Somatosensory Checklist</h2>
                    {activeSymptomCount > 0 && (
                        <div className="symptom-warning" style={{ background: 'rgba(229,62,62,0.15)', color: 'var(--bg-accent-red-light)', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(229,62,62,0.2)' }}>
                            ⚠️ System registers <strong>{activeSymptomCount}</strong> un-stabilized peripheral symptomatic readings.
                        </div>
                    )}
                    <div className="checklist-grid">
                        {GLUCOSE_SYMPTOMS.map(s => (
                            <div key={s.id} className={`checklist-item${symptoms[s.id] ? ' checked-red' : ''}`} onClick={() => toggleSymptom(s.id)}>
                                <span className="checklist-icon">{s.icon}</span>
                                <span className="checklist-label">{s.label}</span>
                                <span className={`checklist-check${symptoms[s.id] ? ' red' : ''}`}>{symptoms[s.id] ? '✓' : ''}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setSymptoms({})} style={{ marginTop: '14px', background: 'var(--bg-border-hover)', color: 'var(--bg-text-primary)' }}>
                        Reset Symptom Matrix
                    </button>
                </div>

                {/* ── Diagnostic Report Generator ── */}
                <div className="card">
                    <h3>🤖 Automated Data Evaluation Engine</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--bg-text-secondary)', marginBottom: '12px' }}>
                        Compiles current clinical variables and trends parameters to create actionable insights.
                    </p>
                    <button className="btn-ai" style={{ background: 'var(--bg-accent-blue)' }} onClick={generateSystemReport} disabled={aiLoading}>
                        {aiLoading ? 'Defragmenting Variables...' : 'Initialize Analysis Matrix'}
                    </button>
                    {aiReport && (
                        <div id="ai-report-box" style={{ marginTop: '16px', whiteSpace: 'pre-wrap', background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--bg-border)', color: 'var(--bg-text-primary)', lineHeight: '1.5' }}>
                            {aiReport}
                        </div>
                    )}
                </div>

                {/* ── Storage Configuration ── */}
                <div className="card">
                    <h2>📈 Database Administration</h2>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Purge System Logs
                    </button>
                </div>
            </main>
        </div>
    );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './heartrate.css';

Chart.register(...registerables);


export default function HeartRate() {
    /* ── Constants ── */
    const HR_ZONES = [
        { name: 'Zone 1 — Warm Up', pct: [0.50, 0.60], bg: '#bee3f8', text: '#1a365d', benefit: 'Recovery & light activity', badge: 'z-1' },
        { name: 'Zone 2 — Fat Burn', pct: [0.60, 0.70], bg: '#c6f6d5', text: '#1a4731', benefit: 'Fat metabolism & aerobic base', badge: 'z-2' },
        { name: 'Zone 3 — Cardio', pct: [0.70, 0.80], bg: '#fefcbf', text: '#744210', benefit: 'Aerobic fitness & endurance', badge: 'z-3' },
        { name: 'Zone 4 — Peak', pct: [0.80, 0.90], bg: '#fed7d7', text: '#742a2a', benefit: 'High-intensity performance gains', badge: 'z-4' },
        { name: 'Zone 5 — Max Effort', pct: [0.90, 1.00], bg: '#9b2c2c', text: '#fff', benefit: 'Speed & anaerobic capacity', badge: 'z-5' },
    ];

    const ACTIVITY_TYPES = [
        { name: 'Resting', icon: '🛋️', typical: [55, 75] },
        { name: 'Walking', icon: '🚶', typical: [60, 80] },
        { name: 'Running', icon: '🏃', typical: [120, 165] },
        { name: 'Cycling', icon: '🚴', typical: [110, 155] },
        { name: 'Swimming', icon: '🏊', typical: [110, 150] },
        { name: 'HIIT', icon: '⚡', typical: [150, 185] },
        { name: 'Yoga', icon: '🧘', typical: [55, 90] },
        { name: 'Weightlifting', icon: '🏋️', typical: [90, 140] },
        { name: 'Sleeping', icon: '😴', typical: [40, 60] },
        { name: 'Other', icon: '❤️', typical: [60, 100] },
    ];

    const RESTING_HR_CATEGORIES = [
        { label: 'Athlete', lo: 0, hi: 49, color: '#2b6cb0' },
        { label: 'Excellent', lo: 50, hi: 59, color: '#38a169' },
        { label: 'Good', lo: 60, hi: 69, color: '#68d391' },
        { label: 'Above Average', lo: 70, hi: 79, color: '#d69e2e' },
        { label: 'Average', lo: 80, hi: 89, color: '#ed8936' },
        { label: 'Below Average', lo: 90, hi: 99, color: '#e53e3e' },
        { label: 'Poor', lo: 100, hi: 999, color: '#742a2a' },
    ];

    const HR_FACTS = [
        { fact: '~100k', desc: 'heartbeats per day on average' },
        { fact: '2.5B+', desc: 'beats in an average lifetime' },
        { fact: '60–100', desc: 'normal adult resting BPM range' },
        { fact: '40–60', desc: 'BPM typical for elite athletes' },
    ];

    const SYMPTOMS = [
        { id: 'palpitations', icon: '💓', label: 'Palpitations / fluttering' },
        { id: 'dizziness', icon: '💫', label: 'Dizziness or lightheadedness' },
        { id: 'shortness', icon: '😮‍💨', label: 'Shortness of breath' },
        { id: 'chest', icon: '🫀', label: 'Chest tightness or discomfort' },
        { id: 'fatigue', icon: '😴', label: 'Unusual fatigue' },
        { id: 'irregular', icon: '📉', label: 'Irregular or skipped beats' },
    ];

    const TODAY = new Date().toISOString().split('T')[0];

    /* ── Helpers ── */
    function getMaxHR(age) { return 220 - age; }
    function getZone(hr, maxHR) {
        const pct = hr / maxHR;
        return HR_ZONES.find(z => pct >= z.pct[0] && pct < z.pct[1]) || HR_ZONES[4];
    }
    function getRestingCategory(bpm) {
        return RESTING_HR_CATEGORIES.find(c => bpm >= c.lo && bpm <= c.hi)
            || RESTING_HR_CATEGORIES[6];
    }
    function hrPctOfMax(hr, maxHR) {
        return Math.min(Math.round((hr / maxHR) * 100), 100);
    }

    /* ──────────────────────────────────────────── */


    /* ── Profile ── */
    const [userProfile, setUserProfile] = useState(
        () => JSON.parse(localStorage.getItem('hrProfile')) || null
    );
    const [pAge, setPAge] = useState(userProfile?.age || '');
    const [pGender, setPGender] = useState(userProfile?.gender || 'male');

    /* ── Log state ── */
    const [hrLog, setHrLog] = useState(
        () => JSON.parse(localStorage.getItem('hrLog')) || []
    );

    /* Log form */
    const [lDate, setLDate] = useState(TODAY);
    const [lTime, setLTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [lHR, setLHR] = useState('');
    const [lActivity, setLActivity] = useState('Resting');
    const [lNotes, setLNotes] = useState('');
    const [lDuration, setLDuration] = useState('');

    /* ── Live BPM simulator ── */
    const [liveBPM, setLiveBPM] = useState(72);
    const [simRunning, setSimRunning] = useState(false);
    const simRef = useRef(null);

    /* ── Symptom tracker ── */
    const [symptoms, setSymptoms] = useState(
        () => JSON.parse(localStorage.getItem('hrSymptoms')) || {}
    );

    /* ── AI ── */
    const [aiReport, setAiReport] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── Chart refs ── */
    const hrChartRef = useRef(null);
    const zoneChartRef = useRef(null);
    const hrInst = useRef(null);
    const zoneInst = useRef(null);

    /* ── Persist ── */
    useEffect(() => { localStorage.setItem('hrLog', JSON.stringify(hrLog)); }, [hrLog]);
    useEffect(() => { localStorage.setItem('hrSymptoms', JSON.stringify(symptoms)); }, [symptoms]);
    useEffect(() => {
        if (userProfile) localStorage.setItem('hrProfile', JSON.stringify(userProfile));
    }, [userProfile]);

    /* ── Live BPM simulator ── */
    useEffect(() => {
        if (simRunning) {
            simRef.current = setInterval(() => {
                const actInfo = ACTIVITY_TYPES.find(a => a.name === lActivity) || ACTIVITY_TYPES[0];
                const [lo, hi] = actInfo.typical;
                const newBPM = Math.round(lo + Math.random() * (hi - lo) + (Math.random() - 0.5) * 6);
                setLiveBPM(newBPM);
            }, 900);
        } else {
            clearInterval(simRef.current);
        }
        return () => clearInterval(simRef.current);
    }, [simRunning, lActivity]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Charts ── */
    useEffect(() => {
        const maxHR = userProfile ? getMaxHR(userProfile.age) : 190;
        const last14 = [...hrLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

        /* HR Trend Line Chart */
        if (hrChartRef.current) {
            if (hrInst.current) hrInst.current.destroy();
            hrInst.current = new Chart(hrChartRef.current.getContext('2d'), {
                type: 'line',
                data: {
                    labels: last14.map(e => `${e.date.slice(5)} ${e.time}`),
                    datasets: [
                        {
                            label: 'Heart Rate (BPM)',
                            data: last14.map(e => e.hr),
                            borderColor: '#e53e3e',
                            backgroundColor: 'rgba(229,62,62,0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointBackgroundColor: last14.map(e => {
                                const z = getZone(e.hr, maxHR);
                                return z.text === '#fff' ? '#9b2c2c' : z.text;
                            }),
                        },
                        {
                            label: 'Max HR',
                            data: last14.map(() => maxHR),
                            borderColor: '#718096',
                            borderDash: [6, 4],
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: { beginAtZero: false, min: 30, title: { display: true, text: 'BPM' } },
                    },
                },
            });
        }

        /* Zone Distribution Doughnut */
        if (zoneChartRef.current) {
            const zoneCounts = HR_ZONES.map(z => ({
                name: z.name.split('—')[1]?.trim() || z.name,
                count: hrLog.filter(e => {
                    const pct = e.hr / maxHR;
                    return pct >= z.pct[0] && pct < z.pct[1];
                }).length,
            }));
            if (zoneInst.current) zoneInst.current.destroy();
            zoneInst.current = new Chart(zoneChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: zoneCounts.map(z => z.name),
                    datasets: [{
                        data: zoneCounts.map(z => z.count),
                        backgroundColor: ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#9b2c2c'],
                        borderWidth: 2,
                    }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
            });
        }

        return () => { hrInst.current?.destroy(); zoneInst.current?.destroy(); };
    }, [hrLog, userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Handlers ── */
    function handleProfileSubmit(e) {
        e.preventDefault();
        setUserProfile({ age: parseInt(pAge), gender: pGender });
    }

    function logReading() {
        const hr = parseInt(lHR);
        if (!hr || hr < 20 || hr > 300) { alert('Please enter a valid heart rate (20–300 BPM).'); return; }
        setHrLog(prev => [...prev, {
            id: Date.now(),
            date: lDate || TODAY,
            time: lTime,
            hr,
            activity: lActivity,
            duration: parseInt(lDuration) || null,
            notes: lNotes,
        }]);
        setLHR(''); setLNotes(''); setLDuration('');
    }

    function logLiveBPM() {
        setHrLog(prev => [...prev, {
            id: Date.now(),
            date: TODAY,
            time: new Date().toTimeString().slice(0, 5),
            hr: liveBPM,
            activity: lActivity,
            duration: null,
            notes: 'Logged from live monitor',
        }]);
    }

    function removeEntry(id) {
        setHrLog(prev => prev.filter(e => e.id !== id));
    }

    function clearLog() {
        if (window.confirm('Clear all heart rate logs? This cannot be undone.')) {
            setHrLog([]);
            localStorage.removeItem('hrLog');
        }
    }

    function toggleSymptom(id) {
        setSymptoms(prev => ({ ...prev, [id]: !prev[id] }));
    }

    /* ── AI Report ── */
    async function generateAIReport() {
        setAiLoading(true);
        setAiReport('⏳ Analysing your heart rate data…');

        const maxHR = userProfile ? getMaxHR(userProfile.age) : 190;
        const totalReadings = hrLog.length;
        const avgHR = totalReadings
            ? Math.round(hrLog.reduce((s, e) => s + e.hr, 0) / totalReadings) : 0;
        const minHR = totalReadings ? Math.min(...hrLog.map(e => e.hr)) : 0;
        const maxLogged = totalReadings ? Math.max(...hrLog.map(e => e.hr)) : 0;

        const restingEntries = hrLog.filter(e => e.activity === 'Resting');
        const avgResting = restingEntries.length
            ? Math.round(restingEntries.reduce((s, e) => s + e.hr, 0) / restingEntries.length) : null;

        const activeSymptoms = SYMPTOMS.filter(s => symptoms[s.id]).map(s => s.label).join(', ') || 'None';
        const profileSummary = userProfile
            ? `Age ${userProfile.age}, gender: ${userProfile.gender}, estimated max HR: ${maxHR} BPM.`
            : 'Profile not set.';

        const prompt = `You are a heart health coach AI. Here is my data:
- Profile: ${profileSummary}
- Total readings logged: ${totalReadings}
- Average heart rate: ${avgHR} BPM
- Minimum logged HR: ${minHR} BPM
- Maximum logged HR: ${maxLogged} BPM
- Average resting HR: ${avgResting !== null ? avgResting + ' BPM' : 'Not enough resting data'}
- Reported symptoms: ${activeSymptoms}

Give a concise, honest heart rate health report (under 180 words) that:
1. Evaluates the resting HR and overall pattern.
2. Gives 2-3 specific, actionable tips to improve cardiovascular health.
3. Notes any concerning signs from the symptoms reported.
4. Ends with a short motivational note.
Use bullet points. Keep it practical and encouraging. Add a disclaimer to consult a doctor for medical concerns.`;

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
    const maxHR = userProfile ? getMaxHR(userProfile.age) : null;
    const totalReadings = hrLog.length;
    const avgHR = totalReadings
        ? Math.round(hrLog.reduce((s, e) => s + e.hr, 0) / totalReadings) : null;
    const restingEntries = hrLog.filter(e => e.activity === 'Resting');
    const avgResting = restingEntries.length
        ? Math.round(restingEntries.reduce((s, e) => s + e.hr, 0) / restingEntries.length) : null;
    const latestEntry = hrLog.length ? [...hrLog].sort((a, b) => b.id - a.id)[0] : null;
    const latestZone = latestEntry && maxHR ? getZone(latestEntry.hr, maxHR) : null;
    const restingCat = avgResting ? getRestingCategory(avgResting) : null;
    const liveZone = maxHR ? getZone(liveBPM, maxHR) : HR_ZONES[0];
    const livePct = maxHR ? hrPctOfMax(liveBPM, maxHR) : 0;
    const symptomCount = SYMPTOMS.filter(s => symptoms[s.id]).length;
    const recentLogs = [...hrLog].reverse().slice(0, 10);

    /* ── Render ── */
    return (
        <div className="container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>❤️ Heart Rate Dashboard</h1>
            </header>

            <main>

                {/* ── Heart Facts ── */}
                <div className="facts-row">
                    {HR_FACTS.map(f => (
                        <div key={f.fact} className="fact-box">
                            <div className="fact-val">{f.fact}</div>
                            <div className="fact-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── Profile Card ── */}
                <div className="card">
                    <h2>👤 Your Heart Rate Profile</h2>
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <div className="input-box">
                                <label htmlFor="hr-age">Age (yrs)</label>
                                <input type="number" id="hr-age" min="10" max="100" placeholder="e.g., 30"
                                    value={pAge} onChange={e => setPAge(e.target.value)} required />
                            </div>
                            <div className="input-box">
                                <label htmlFor="hr-gender">Gender</label>
                                <select id="hr-gender" value={pGender} onChange={e => setPGender(e.target.value)}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            {userProfile && (
                                <div className="input-box" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <div className="max-hr-display">
                                        <span className="max-hr-label">Estimated Max HR</span>
                                        <span className="max-hr-val">❤️ {maxHR} BPM</span>
                                        <span className="max-hr-formula">Formula: 220 − {userProfile.age}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button type="submit">Calculate Max Heart Rate</button>
                    </form>
                </div>

                {/* ── Live BPM Monitor ── */}
                <div className="card">
                    <h2>📡 Live BPM Monitor</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '16px' }}>
                        Select your activity and press Start to simulate a live heart rate reading. Press Log to save it.
                    </p>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <div className="input-box" style={{ flex: '1 1 100%' }}>
                            <label>Current Activity</label>
                            <div className="activity-picker">
                                {ACTIVITY_TYPES.map(a => (
                                    <div key={a.name}
                                        className={`activity-chip${lActivity === a.name ? ' selected' : ''}`}
                                        onClick={() => setLActivity(a.name)}>
                                        {a.icon} {a.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* BPM Display */}
                    <div className="bpm-display-wrap">
                        <div className="bpm-ring" style={{ '--zone-color': liveZone.text === '#fff' ? '#9b2c2c' : liveZone.text }}>
                            <div className="bpm-inner" style={{ background: liveZone.bg }}>
                                <div className="bpm-number" style={{ color: liveZone.text === '#fff' ? '#9b2c2c' : liveZone.text }}>
                                    {liveBPM}
                                </div>
                                <div className="bpm-unit">BPM</div>
                                <div className={`bpm-pulse${simRunning ? ' beating' : ''}`}>♥</div>
                            </div>
                        </div>
                        <div className="bpm-info">
                            <div className="bpm-zone-label"
                                style={{ background: liveZone.bg, color: liveZone.text === '#fff' ? '#9b2c2c' : liveZone.text }}>
                                {liveZone.name}
                            </div>
                            <div className="bpm-benefit">{liveZone.benefit}</div>
                            {maxHR && (
                                <div className="bpm-pct-row">
                                    <span style={{ fontSize: '0.85rem', color: '#555' }}>
                                        {livePct}% of Max HR ({maxHR} BPM)
                                    </span>
                                    <div className="progress-bar-wrap" style={{ marginTop: '6px' }}>
                                        <div className="progress-bar-fill"
                                            style={{
                                                width: `${livePct}%`,
                                                background: liveZone.text === '#fff' ? '#9b2c2c' : liveZone.text,
                                            }} />
                                    </div>
                                </div>
                            )}
                            <div className="bpm-ctrl-btns">
                                <button className={simRunning ? 'btn-stop' : 'btn-start'}
                                    onClick={() => setSimRunning(p => !p)}
                                    style={{ width: 'auto', padding: '8px 20px', minHeight: '36px' }}>
                                    {simRunning ? '⏹ Stop' : '▶ Start'}
                                </button>
                                <button className="btn-log-bpm"
                                    onClick={logLiveBPM}
                                    style={{ width: 'auto', padding: '8px 20px', minHeight: '36px' }}>
                                    💾 Log {liveBPM} BPM
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Analytics ── */}
                {totalReadings > 0 && (
                    <div className="card" id="stats-card">
                        <h2>📊 Heart Rate Analytics</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <div className="val" style={{ color: '#e53e3e' }}>{avgHR}</div>
                                <div className="lbl">Avg HR (BPM)</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: avgResting && avgResting < 60 ? '#38a169' : avgResting > 90 ? '#e53e3e' : '#d69e2e' }}>
                                    {avgResting ?? '—'}
                                </div>
                                <div className="lbl">Avg Resting HR</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#3182ce' }}>
                                    {hrLog.length ? Math.min(...hrLog.map(e => e.hr)) : '—'}
                                </div>
                                <div className="lbl">Lowest Logged</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: '#9b2c2c' }}>
                                    {hrLog.length ? Math.max(...hrLog.map(e => e.hr)) : '—'}
                                </div>
                                <div className="lbl">Highest Logged</div>
                            </div>
                            <div className="stat-box">
                                <div className="val">{totalReadings}</div>
                                <div className="lbl">Total Readings</div>
                            </div>
                            <div className="stat-box">
                                <div className="val" style={{ color: restingCat?.color || '#333' }}>
                                    {restingCat?.label ?? '—'}
                                </div>
                                <div className="lbl">Resting Category</div>
                            </div>
                        </div>

                        {/* Latest reading zone */}
                        {latestEntry && latestZone && (
                            <div className="latest-reading"
                                style={{ background: latestZone.bg, color: latestZone.text === '#fff' ? '#9b2c2c' : latestZone.text }}>
                                <span>🕐 Latest reading: <strong>{latestEntry.hr} BPM</strong> ({latestEntry.activity})</span>
                                <span className={`difficulty-badge ${latestZone.badge}`}>{latestZone.name.split('—')[1]?.trim()}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── HR Zones Reference ── */}
                {userProfile && (
                    <div className="card" id="zones-card">
                        <h2>❤️ Heart Rate Training Zones</h2>
                        <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '14px' }}>
                            Based on your max HR of <strong>{maxHR} BPM</strong> (age {userProfile.age}).
                        </p>
                        <div className="hr-zones">
                            {HR_ZONES.map(z => {
                                const lo = Math.round(maxHR * z.pct[0]);
                                const hi = Math.round(maxHR * z.pct[1]);
                                return (
                                    <div key={z.name} className="hr-zone" style={{ background: z.bg }}>
                                        <div className="zone-dot"
                                            style={{ background: z.text === '#fff' ? '#9b2c2c' : z.text }} />
                                        <span className="zone-name" style={{ color: z.text === '#fff' ? '#9b2c2c' : z.text }}>
                                            {z.name}
                                        </span>
                                        <span className="zone-range" style={{ color: z.text === '#fff' ? '#9b2c2c' : z.text }}>
                                            {lo} – {hi} BPM
                                        </span>
                                        <span className="zone-benefit" style={{ color: '#718096' }}>{z.benefit}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Resting HR Reference ── */}
                <div className="card">
                    <h2>🩺 Resting Heart Rate Guide</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '14px' }}>
                        Measure in the morning before getting out of bed for most accurate results.
                    </p>
                    <div className="resting-grid">
                        {RESTING_HR_CATEGORIES.map(c => (
                            <div key={c.label}
                                className={`resting-chip${avgResting && avgResting >= c.lo && avgResting <= c.hi ? ' active' : ''}`}
                                style={{ borderColor: c.color + '55', background: c.color + '15' }}>
                                <span className="resting-range" style={{ color: c.color }}>{c.lo === 0 ? '< 50' : `${c.lo}–${c.hi === 999 ? '100+' : c.hi}`} BPM</span>
                                <span className="resting-label" style={{ color: c.color }}>{c.label}</span>
                                {avgResting && avgResting >= c.lo && avgResting <= c.hi && (
                                    <span className="resting-you">← You</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Log a Reading ── */}
                <div className="card">
                    <h2>📝 Log a Reading</h2>
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
                            <label htmlFor="l-hr">Heart Rate (BPM) *</label>
                            <input type="number" id="l-hr" min="20" max="300" placeholder="e.g., 72"
                                value={lHR} onChange={e => setLHR(e.target.value)} />
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-duration">Duration (min)</label>
                            <input type="number" id="l-duration" min="1" max="300" placeholder="Optional"
                                value={lDuration} onChange={e => setLDuration(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="input-box">
                            <label htmlFor="l-activity">Activity</label>
                            <select id="l-activity" value={lActivity} onChange={e => setLActivity(e.target.value)}>
                                {ACTIVITY_TYPES.map(a => (
                                    <option key={a.name} value={a.name}>{a.icon} {a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-box">
                            <label htmlFor="l-notes">Notes</label>
                            <input type="text" id="l-notes" placeholder="Optional notes…"
                                value={lNotes} onChange={e => setLNotes(e.target.value)} />
                        </div>
                    </div>

                    {/* Zone preview */}
                    {lHR && maxHR && parseInt(lHR) > 0 && (
                        <div className="zone-preview"
                            style={{
                                background: getZone(parseInt(lHR), maxHR).bg,
                                color: getZone(parseInt(lHR), maxHR).text === '#fff'
                                    ? '#9b2c2c' : getZone(parseInt(lHR), maxHR).text
                            }}>
                            ❤️ {lHR} BPM → <strong>{getZone(parseInt(lHR), maxHR).name}</strong>
                            &nbsp;({hrPctOfMax(parseInt(lHR), maxHR)}% of max)
                        </div>
                    )}

                    <button onClick={logReading} style={{ marginTop: '12px' }}>+ Save Reading</button>

                    {/* Log list */}
                    <div id="log-list">
                        {recentLogs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#888', padding: '12px' }}>No readings logged yet.</p>
                            : recentLogs.map(e => {
                                const zone = maxHR ? getZone(e.hr, maxHR) : HR_ZONES[0];
                                return (
                                    <div key={e.id} className="log-item">
                                        <span style={{ color: '#555', fontSize: '0.78rem' }}>{e.date} {e.time}</span>
                                        <span className="log-tag">{e.activity}</span>
                                        <span style={{ fontWeight: 700, color: '#e53e3e' }}>❤️ {e.hr} BPM</span>
                                        <span className={`difficulty-badge ${zone.badge}`}>
                                            {zone.name.split('—')[1]?.trim() || zone.name}
                                        </span>
                                        {e.duration && (
                                            <span style={{ color: '#718096', fontSize: '0.78rem' }}>{e.duration} min</span>
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
                        <h3>❤️ HR Trend (Last 14 Readings)</h3>
                        <div className="chart-mini"><canvas ref={hrChartRef} /></div>
                    </div>
                    <div className="chart-card">
                        <h3>🎯 Zone Distribution</h3>
                        <div className="chart-mini"><canvas ref={zoneChartRef} /></div>
                    </div>
                </div>

                {/* ── Symptom Tracker ── */}
                <div className="card">
                    <h2>🩺 Symptom Tracker</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '10px' }}>
                        Check any symptoms you are currently experiencing. Share with your doctor if persistent.
                    </p>
                    {symptomCount > 0 && (
                        <div className="symptom-warning">
                            ⚠️ You have <strong>{symptomCount}</strong> active symptom{symptomCount > 1 ? 's' : ''} logged.
                            Please consult a healthcare professional if these persist.
                        </div>
                    )}
                    <div className="checklist-grid">
                        {SYMPTOMS.map(s => (
                            <div key={s.id}
                                className={`checklist-item${symptoms[s.id] ? ' checked-red' : ''}`}
                                onClick={() => toggleSymptom(s.id)}>
                                <span className="checklist-icon">{s.icon}</span>
                                <span className="checklist-label">{s.label}</span>
                                <span className={`checklist-check${symptoms[s.id] ? ' red' : ''}`}>
                                    {symptoms[s.id] ? '✓' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setSymptoms({})}
                        style={{ marginTop: '14px', background: '#fed7d7', color: '#742a2a' }}>
                        Clear Symptoms
                    </button>
                </div>

                {/* ── Manage Data ── */}
                <div className="card">
                    <h2>📈 Manage Data</h2>
                    <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '12px' }}>
                        You have <strong>{hrLog.length}</strong> heart rate readings logged.
                    </p>
                    <button className="btn-danger" onClick={clearLog}>
                        🗑️ Clear All Heart Rate Data
                    </button>
                </div>

                {/* ── AI Report ── */}
                <div className="card">
                    <h3>🤖 AI Heart Health Report</h3>
                    <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '12px' }}>
                        Analyses your HR readings, resting heart rate, zone distribution, and any symptoms to give personalised advice.
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

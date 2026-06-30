import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import './medicine.css';

Chart.register(...registerables);

/* ── Constants ── */
const MED_TYPES = [
    { type: 'Capsule', icon: '💊', color: '#8b5cf6' },
    { type: 'Tablet', icon: '⚪', color: '#3b82f6' },
    { type: 'Liquid', icon: '🧪', color: '#10b981' },
    { type: 'Powder', icon: '🫙', color: '#f59e0b' },
    { type: 'Drops', icon: '💧', color: '#14b8a6' },
];

const TIME_SLOTS = [
    { id: 'morning', label: 'Morning Slot', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon Slot', icon: '☀️' },
    { id: 'evening', label: 'Evening Slot', icon: '🌆' },
    { id: 'night', label: 'Night Slot', icon: '🌙' },
];

const INITIAL_MEDICATIONS = [
    { id: 1, name: 'Vitamin D3', type: 'Capsule', dosage: '5000 IU', slot: 'morning', currentStock: 42, maxStock: 60 },
    { id: 2, name: 'Omega-3 Fish Oil', type: 'Capsule', dosage: '1000mg', slot: 'evening', currentStock: 12, maxStock: 90 },
    { id: 3, name: 'Magnesium Glycinate', type: 'Tablet', dosage: '200mg', slot: 'night', currentStock: 55, maxStock: 120 },
];

const TODAY = new Date().toISOString().split('T')[0];

export default function Medicine() {
    /* ── State Hooks ── */
    const [medications, setMedications] = useState(
        () => JSON.parse(localStorage.getItem('fitMedsList')) || INITIAL_MEDICATIONS
    );

    const [dailyActions, setDailyActions] = useState(
        () => JSON.parse(localStorage.getItem(`fitMedActions-${TODAY}`)) || {}
    );

    const [historyLog, setHistoryLog] = useState(
        () => JSON.parse(localStorage.getItem('fitMedHistory')) || []
    );

    /* ── Form Inputs ── */
    const [mName, setMName] = useState('');
    const [mType, setMType] = useState('Capsule');
    const [mDosage, setMDosage] = useState('');
    const [mSlot, setMSlot] = useState('morning');
    const [mStock, setMStock] = useState(60);

    /* ── AI Insights State ── */
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    /* ── References for Graphs ── */
    const barChartRef = useRef(null);
    const pieChartRef = useRef(null);
    const barInst = useRef(null);
    const pieInst = useRef(null);

    /* ── Synchronize Storage ── */
    useEffect(() => { localStorage.setItem('fitMedsList', JSON.stringify(medications)); }, [medications]);
    useEffect(() => { localStorage.setItem(`fitMedActions-${TODAY}`, JSON.stringify(dailyActions)); }, [dailyActions]);
    useEffect(() => { localStorage.setItem('fitMedHistory', JSON.stringify(historyLog)); }, [historyLog]);

    /* ── Render Charts ── */
    useEffect(() => {
        // 1. Weekly Compliance History Generator
        if (barChartRef.current) {
            if (barInst.current) barInst.current.destroy();

            // Track occurrences in last 5 days
            const days = Array.from({ length: 5 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const takenCounts = days.map(day => {
                if (day === TODAY) {
                    return Object.values(dailyActions).filter(a => a === 'taken').length;
                }
                // Fallback or count history instances matching date
                return historyLog.filter(h => h.date === day && h.status === 'taken').length;
            });

            barInst.current = new Chart(barChartRef.current.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: days.map(d => d.slice(5)),
                    datasets: [{
                        label: 'Doses Taken',
                        data: takenCounts,
                        backgroundColor: 'rgba(139, 92, 246, 0.65)',
                        borderColor: '#8b5cf6',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // 2. Types Distribution Chart
        if (pieChartRef.current) {
            if (pieInst.current) pieInst.current.destroy();

            const typesMap = {};
            medications.forEach(m => { typesMap[m.type] = (typesMap[m.type] || 0) + 1; });

            pieInst.current = new Chart(pieChartRef.current.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typesMap),
                    datasets: [{
                        data: Object.values(typesMap),
                        backgroundColor: Object.keys(typesMap).map(t => MED_TYPES.find(mt => mt.type === t)?.color || '#6b7280'),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

        return () => { barInst.current?.destroy(); pieInst.current?.destroy(); };
    }, [medications, dailyActions, historyLog]);

    /* ── Interaction Methods ── */
    function handleAddMedication(e) {
        e.preventDefault();
        if (!mName.trim() || !mDosage.trim()) return;

        const newMed = {
            id: Date.now(),
            name: mName,
            type: mType,
            dosage: mDosage,
            slot: mSlot,
            currentStock: parseInt(mStock) || 30,
            maxStock: parseInt(mStock) || 30
        };

        setMedications(prev => [...prev, newMed]);
        setMName('');
        setMDosage('');
    }

    function triggerAction(medId, status) {
        // Record action state
        setDailyActions(prev => ({ ...prev, [medId]: status }));

        const standardTarget = medications.find(m => m.id === medId);
        if (!standardTarget) return;

        // Adjust Inventory Count upon tracking intake confirmation
        if (status === 'taken' && dailyActions[medId] !== 'taken') {
            setMedications(prev => prev.map(m =>
                m.id === medId ? { ...m, currentStock: Math.max(0, m.currentStock - 1) } : m
            ));
        } else if (status !== 'taken' && dailyActions[medId] === 'taken') {
            // Revert stock decrement if changed away from taken
            setMedications(prev => prev.map(m =>
                m.id === medId ? { ...m, currentStock: Math.min(m.maxStock, m.currentStock + 1) } : m
            ));
        }

        // Insert structural event footprint into history logs
        const eventStamp = {
            id: Date.now(),
            date: TODAY,
            time: new Date().toTimeString().slice(0, 5),
            name: standardTarget.name,
            status: status
        };
        setHistoryLog(prev => [eventStamp, ...prev].slice(0, 40));
    }

    function removeMedication(id) {
        if (window.confirm('Remove this substance listing completely from profile data?')) {
            setMedications(prev => prev.filter(m => m.id !== id));
            setDailyActions(prev => { const c = { ...prev }; delete c[id]; return c; });
        }
    }

    function clearHistoryItem(id) {
        setHistoryLog(prev => prev.filter(h => h.id !== id));
    }

    /* ── AI Routine Processing Simulation ── */
    async function runAICoachAnalysis() {
        setAiLoading(true);
        setAiInsight('⏳ Parsing inventory ratios and schedule conformity markers…');

        const lowStockAlerts = medications.filter(m => m.currentStock / m.maxStock <= 0.25).map(m => m.name);
        const adherenceCount = Object.values(dailyActions).filter(v => v === 'taken').length;
        const missingCount = medications.length - adherenceCount;

        const summaryContext = {
            profileVolume: medications.length,
            takenRatio: `${adherenceCount}/${medications.length}`,
            shortages: lowStockAlerts.join(', ') || 'None perceived'
        };

        const promptPayload = `Analyze compliance metrics:\n- Trackers configured: ${summaryContext.profileVolume}\n- Completed checklist entries today: ${summaryContext.takenRatio}\n- Low Stock items: ${summaryContext.shortages}.\nProvide advice in under 120 words focusing entirely on adherence optimization.`;

        try {
            const endpoint = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 300,
                    messages: [{ role: 'user', content: promptPayload }]
                })
            });
            const parsedData = await endpoint.json();
            setAiInsight(parsedData.error ? `⚠️ Verification dynamic constraint: ${parsedData.error.message}` : parsedData.content[0].text);
        } catch {
            setAiInsight(`💡 [Offline Insight simulation] Excellent consistency path! Remember to fulfill item restocking requests for: "${summaryContext.shortages}". Your evening adherence vector stands standard and healthy.`);
        } finally {
            setAiLoading(false);
        }
    }

    /* ── Quantifiable Aggregates ── */
    const totalTracked = medications.length;
    const takenTotal = Object.values(dailyActions).filter(v => v === 'taken').length;
    const skippedTotal = Object.values(dailyActions).filter(v => v === 'skipped').length;
    const compliancePct = totalTracked ? Math.round((takenTotal / totalTracked) * 100) : 100;

    return (
        <div className="medicine-container">
            <header>
                <Link to="/" className="back-btn">← Back to Dashboard</Link>
                <h1>💊 Med & Supplement Controller</h1>
            </header>

            <main>
                {/* ── Analytical Stat Blocks ── */}
                <div className="stats-grid">
                    <div className="stat-box">
                        <div className="val" style={{ color: '#8b5cf6' }}>{totalTracked}</div>
                        <div className="lbl">Active Items</div>
                    </div>
                    <div className="stat-box">
                        <div className="val" style={{ color: '#10b981' }}>{takenTotal}</div>
                        <div className="lbl">Taken Today</div>
                    </div>
                    <div className="stat-box">
                        <div className="val" style={{ color: '#ef4444' }}>{skippedTotal}</div>
                        <div className="lbl">Skipped</div>
                    </div>
                    <div className="stat-box">
                        <div className="val" style={{ color: '#14b8a6' }}>{compliancePct}%</div>
                        <div className="lbl">Adherence Rate</div>
                    </div>
                </div>

                <div className="med-grid-split">
                    {/* ── LEFT COLUMN: Daily Core Intake Checklist Scheduler ── */}
                    <div className="card">
                        <h2>📅 Today's Schedule Timeline</h2>
                        <p style={{ fontSize: '0.85rem', color: '#62677c', margin: '-8px 0 8px' }}>
                            Check off your requirements as you proceed through the day.
                        </p>

                        {TIME_SLOTS.map(slot => {
                            const matchedMeds = medications.filter(m => m.slot === slot.id);
                            return (
                                <div key={slot.id} className="schedule-section">
                                    <div className="schedule-title">
                                        <span>{slot.icon}</span> {slot.label}
                                    </div>
                                    {matchedMeds.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: '#62677c', paddingLeft: '4px' }}>No items mapped here</div>
                                    ) : (
                                        matchedMeds.map(med => {
                                            const status = dailyActions[med.id] || 'pending';
                                            const currentTypeIcon = MED_TYPES.find(t => t.type === med.type)?.icon || '💊';

                                            return (
                                                <div key={med.id} className={`med-item-row ${status}`}>
                                                    <div className="med-info">
                                                        <div className="med-icon-wrapper">{currentTypeIcon}</div>
                                                        <div className="med-meta">
                                                            <div className="name">{med.name}</div>
                                                            <div className="dosage">{med.dosage}</div>
                                                        </div>
                                                    </div>

                                                    <div className="action-block">
                                                        {status !== 'pending' && (
                                                            <span className={`badge badge-${status}`}>{status}</span>
                                                        )}
                                                        <button
                                                            onClick={() => triggerAction(med.id, 'taken')}
                                                            className="circle-action-btn take-btn"
                                                            title="Mark Taken"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => triggerAction(med.id, 'skipped')}
                                                            className="circle-action-btn skip-btn"
                                                            title="Mark Skipped"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── RIGHT COLUMN: Input Forms and Structural Configs ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                        {/* Form Configuration Component Block */}
                        <div className="card">
                            <h2>➕ Append Item Config</h2>
                            <form onSubmit={handleAddMedication}>
                                <div className="form-group">
                                    <div className="input-box full-width">
                                        <label>Substance / Supplement Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Zinc Picolinate"
                                            value={mName}
                                            onChange={e => setMName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="input-box">
                                        <label>Form Type</label>
                                        <select value={mType} onChange={e => setMType(e.target.value)}>
                                            {MED_TYPES.map(t => <option key={t.type} value={t.type}>{t.type}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-box">
                                        <label>Dosage Metric</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., 50mg / 2 drops"
                                            value={mDosage}
                                            onChange={e => setMDosage(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="input-box">
                                        <label>Target Routine Window</label>
                                        <select value={mSlot} onChange={e => setMSlot(e.target.value)}>
                                            {TIME_SLOTS.map(ts => <option key={ts.id} value={ts.id}>{ts.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-box">
                                        <label>Initial Pack Qty (Stock)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="500"
                                            value={mStock}
                                            onChange={e => setMStock(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button type="submit" style={{ width: '100%', marginTop: '14px' }}>Save Schedule Item Entry</button>
                            </form>
                        </div>

                        {/* Inventory Asset Control Trackers */}
                        <div className="card">
                            <h2>📦 Stock & Supply Levels</h2>
                            <div className="stock-monitor-list">
                                {medications.map(med => {
                                    const fillRatio = med.maxStock ? (med.currentStock / med.maxStock) * 100 : 0;
                                    const isLow = fillRatio <= 25;
                                    return (
                                        <div key={med.id} className="stock-item">
                                            <div className="stock-meta-row">
                                                <span style={{ fontWeight: 600 }}>{med.name}</span>
                                                <span className={`stock-count ${isLow ? 'low' : ''}`}>
                                                    {med.currentStock} / {med.maxStock} left {isLow && '⚠️'}
                                                </span>
                                            </div>
                                            <div className="stock-bar-bg">
                                                <div
                                                    className="stock-bar-fill"
                                                    style={{
                                                        width: `${fillRatio}%`,
                                                        backgroundColor: isLow ? '#f59e0b' : '#8b5cf6'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                                <button
                                                    className="delete-log-btn"
                                                    style={{ fontSize: '0.75rem' }}
                                                    onClick={() => removeMedication(med.id)}
                                                >
                                                    Delete tracking profile
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── LOWER SEGMENT: Graphical Charts & History Footprints ── */}
                <div className="charts-row">
                    <div className="card chart-card">
                        <h3>📈 Compliance Trend (Last 5 Days)</h3>
                        <div className="chart-mini">
                            <canvas ref={barChartRef} />
                        </div>
                    </div>
                    <div className="card chart-card">
                        <h3>📊 Delivery Vehicle Form Breakdown</h3>
                        <div className="chart-mini">
                            <canvas ref={pieChartRef} />
                        </div>
                    </div>
                </div>

                {/* ── AI Routine Processing System Block ── */}
                <div className="card">
                    <h2>🤖 AI Adherence Optimization Analysis</h2>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                        <button className="btn-ai" onClick={runAICoachAnalysis} disabled={aiLoading}>
                            {aiLoading ? 'Generating Optimization Directives…' : 'Compile Performance Metrics Advisory'}
                        </button>
                    </div>
                    {aiInsight && (
                        <div id="ai-insight-box">
                            {aiInsight}
                        </div>
                    )}
                </div>

                {/* ── History Tracking Logs Section ── */}
                <div className="card">
                    <h2>📜 Chronological Event Ledger</h2>
                    <div className="log-scroller">
                        {historyLog.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#62677c', padding: '20px' }}>No operational logs stored yet</div>
                        ) : (
                            historyLog.map(log => (
                                <div key={log.id} className="history-item">
                                    <div>
                                        <span className="timestamp">[{log.date} {log.time}]</span>&nbsp;&nbsp;
                                        <span style={{ fontWeight: 600 }}>{log.name}</span> status updated to&nbsp;
                                        <span style={{ color: log.status === 'taken' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                            {log.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <button className="delete-log-btn" onClick={() => clearHistoryItem(log.id)}>✕</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
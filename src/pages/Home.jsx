import React from 'react'
import { Link } from 'react-router-dom'
import './home.css'

export default function Home() {
    return (
        <>
            <div>
                <header>
                    <h1>Health Dashboard</h1>
                </header>
                <main className="dashboard-container">
                    <div className="tracker-box-name">Select Tracker</div>


                    <Link to="/pressure" className="tracker-box">
                        <h2>🩸 Blood Pressure Tracker</h2>
                        <p>Log systolic, diastolic, and pulse readings.</p>
                    </Link>

                    <Link to="/Physical" className="tracker-box">
                        <h2>🏃 Physical Activity & Steps</h2>
                        <p>Track daily step counts, active minutes, and total distance.</p>
                    </Link>

                    <Link to="/Sleep" className="tracker-box">
                        <h2>💤 Sleep Quality & Duration</h2>
                        <p>Monitor total hours, sleep stages, and consistency over time.</p>
                    </Link>

                    <Link to="/Hydration" className="tracker-box">
                        <h2>💧 Hydration</h2>
                        <p>Log your daily water intake in liters or ounces.</p>
                    </Link>

                    <Link to="/Nutrition" className="tracker-box">
                        <h2>🍽️ Caloric & Macro Intake</h2>
                        <p>Record total calories, protein, carbs, and fats daily.</p>
                    </Link>

                    <Link to="/Heartrate" className="tracker-box">
                        <h2>❤️ Heart Rate & HRV</h2>
                        <p>Measure resting heart rate and heart rate variability.</p>
                    </Link>

                    <Link to="/Mood" className="tracker-box">
                        <h2>🧠 Mood & Mental Well-being</h2>
                        <p>Log daily mood ratings and track stress levels.</p>
                    </Link>

                    <Link to="/Weight" className="tracker-box">
                        <h2>⚖️ Weight & Body Composition</h2>
                        <p>Track your body weight, BMI, and body fat percentage.</p>
                    </Link>

                    <Link to="/Glucose" className="tracker-box">
                        <h2>🩸 Blood Glucose Levels</h2>
                        <p>Record fasting and post-meal glucose readings.</p>
                    </Link>

                    <Link to="/Medicine" className="tracker-box">
                        <h2>💊 Medication & Supplements</h2>
                        <p>Set dosage reminders and monitor adherence tracking.</p>
                    </Link>
                </main>
            </div>
        </>
    )
}
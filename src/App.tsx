import './App.css';
import Home from './pages/Home.jsx';
import Pressure from './pages/Pressure.jsx';
import Physical from './pages/Physical.jsx';
import Sleep from './pages/Sleep.jsx';
import Hydration from './pages/Hydration.jsx';
import Nutrition from './pages/Nutrition.jsx';
import Heartrate from './pages/Heartrate.jsx';
import Mood from './pages/Mood.jsx';
import Weight from './pages/Weight.jsx'
import BloodGlucose from './pages/BloodGlucose.jsx';
import Medicine from './pages/Medicine.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Pressure" element={<Pressure />} />
        <Route path="/Physical" element={<Physical />} />
        <Route path="/Sleep" element={<Sleep />} />
        <Route path='/Hydration' element={<Hydration />} />
        <Route path='/Nutrition' element={<Nutrition />} />
        <Route path='/Heartrate' element={<Heartrate />} />
        <Route path='/Mood' element={<Mood />} />
        <Route path='/Weight' element={<Weight />} />
        <Route path='/Glucose' element={<BloodGlucose />} />
        <Route path='/Medicine' element={<Medicine />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
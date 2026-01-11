import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import FindTutors from './pages/FindTutors';
import HowItWorks from './pages/HowItWorks';
import About from './pages/About';
import FAQs from './pages/FAQs';
import Login from './pages/Login';
import Register from './pages/Register';
import TutorDashboard from './pages/TutorDashboard';
import TutorProfile from './pages/TutorProfile';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/find-tutors" element={<FindTutors />} />
              <Route path="/tutors/:id" element={<TutorProfile />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
          </main>
          <Footer />
        </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import Checkout from './pages/Checkout';
import EmailCleanup from './pages/EmailCleanup';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CleanInbox from './pages/CleanInbox';
import { AuthProvider } from './context/AuthContext';
// Scroll to top component
function ScrollToTop() {
  const {
    pathname
  } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
// Main app with AuthProvider
function AppWithAuth() {
  return <div className="flex flex-col min-h-screen bg-slate-50 text-base">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/email-cleanup" element={<EmailCleanup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/clean-inbox" element={<CleanInbox />} />
        </Routes>
      </main>
      <Footer />
    </div>;
}
export function App() {
  return <Router>
      <ScrollToTop />
      <AuthProvider>
        <AppWithAuth />
      </AuthProvider>
    </Router>;
}
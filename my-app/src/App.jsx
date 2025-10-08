import React from 'react';
import './App.css';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './Home.jsx';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login.jsx';
import Signup from './Signup.jsx';
import Report from './Report.jsx';
import Browse from './Browse.jsx';
import { useAuth } from './auth.js';

function App() {
  const { isAuthenticated } = useAuth?.() || { isAuthenticated: false };
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/report" element={isAuthenticated ? <Report /> : <Navigate to="/login" replace />} />
        <Route path="/browse" element={isAuthenticated ? <Browse /> : <Navigate to="/login" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;

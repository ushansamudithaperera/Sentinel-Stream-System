import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Forensics from './pages/Forensics';
import AlertDetail from './pages/AlertDetail';
import Navbar from './components/Navbar';

function Layout({ children }) {
  const location = useLocation();
  const hideNav = location.pathname === '/login' || location.pathname === '/';
  return (
    <>
      {!hideNav && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forensics" element={<Forensics />} />
          <Route path="/alert/:id" element={<AlertDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

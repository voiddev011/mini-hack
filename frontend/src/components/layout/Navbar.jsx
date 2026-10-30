import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NAV_SECTIONS = [
  { label: 'Overview', href: '/' },
  { label: 'Global', href: '/explore/global' },
  { label: 'India', href: '/explore/india' },
  { label: 'Industries', href: '/explore/industries' },
  { label: 'Sources', href: '/data/sources' },
];

export default function Navbar({ isLoggedIn, isAdmin, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();

  const handleToggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleLogoutClick = async (e) => {
    e.preventDefault();
    setLogoutError('');
    try {
      await onLogout();
      closeMenu();
      navigate('/');
    } catch (error) {
      setLogoutError(error.message || 'Unable to log out. Please try again.');
    }
  };

  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        <Link to="/" className="brand" aria-label="TrustCarbon home" onClick={closeMenu}>
          <img className="brand-mark" src="/assets/trustcarbon-fingerprint.png" alt="TrustCarbon logo" />
          <div className="brand-text">
            <span className="brand-name">TrustCarbon</span>
            <span className="brand-tagline">Measure. Reduce. Sustain.</span>
          </div>
        </Link>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Primary">
          {NAV_SECTIONS.map(s => (
            <Link
              key={s.href}
              to={s.href}
              onClick={closeMenu}
            >
              {s.label}
            </Link>
          ))}

          {/* Mobile-only auth */}
        </nav>

        <div className="nav-actions">
          {logoutError && <span role="alert">{logoutError}</span>}
          {isLoggedIn ? (
            <>
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="top-cta" onClick={closeMenu}>
                {isAdmin ? 'Admin / DBA' : 'Personal Dashboard'}
              </Link>
              <button
                className="profile-btn"
                onClick={handleLogoutClick}
                title="Log Out"
                aria-label="Account Log Out"
              >
                ●
              </button>
            </>
          ) : (
            <Link to="/login" className="top-cta" onClick={closeMenu}>Login</Link>
          )}

          <button
            className={`menu-btn ${menuOpen ? 'open' : ''}`}
            onClick={handleToggleMenu}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

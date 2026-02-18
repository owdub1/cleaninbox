import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MenuIcon, XIcon, MailIcon, UserIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const {
    user,
    isAuthenticated,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Handle Clean My Inbox button click
  const handleCleanInboxClick = () => {
    navigate('/email-cleanup');
  };
  return <nav className="bg-white dark:bg-gray-900 py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo centered at the top */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center">
            <MailIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-gray-100">
              CleanInbox
            </span>
          </Link>
        </div>
        {/* Desktop navigation - tabs lowered and independent */}
        <div className="hidden md:flex justify-center space-x-2">
          <Link to="/how-it-works" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            How It Works
          </Link>
          <Link to="/email-cleanup" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Email Cleanup
          </Link>
          <Link to="/pricing" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Pricing
          </Link>
          <Link to="/contact" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Contact
          </Link>
        </div>
        {/* User menu or login icon - positioned at the top right, more subtle */}
        <div className="absolute top-4 right-4 md:right-8 hidden md:flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Toggle dark mode">
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          {isAuthenticated ? <div className="relative">
              <button onClick={handleUserMenuToggle} className="flex items-center text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              </button>
              {isUserMenuOpen && <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setIsUserMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={() => {
              logout();
              setIsUserMenuOpen(false);
            }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex items-center">
                      <LogOutIcon className="h-4 w-4 mr-2" />
                      Sign out
                    </div>
                  </button>
                </div>}
            </div> : <Link to="/login" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Sign in">
              <UserIcon className="h-5 w-5" />
            </Link>}
        </div>
        {/* Mobile menu button - positioned at the top right for mobile */}
        <div className="absolute top-4 right-4 md:hidden flex items-center">
          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1" title="Toggle dark mode">
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          {isAuthenticated && <div className="relative mr-2">
              <button onClick={handleUserMenuToggle} className="flex items-center text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              </button>
              {isUserMenuOpen && <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setIsUserMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={() => {
              logout();
              setIsUserMenuOpen(false);
            }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex items-center">
                      <LogOutIcon className="h-4 w-4 mr-2" />
                      Sign out
                    </div>
                  </button>
                </div>}
            </div>}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none">
            {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {isMenuOpen && <div className="md:hidden mt-16">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-900 flex flex-col items-center">
            <Link to="/how-it-works" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium" onClick={() => setIsMenuOpen(false)}>
              How It Works
            </Link>
            <Link to="/email-cleanup" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium" onClick={() => setIsMenuOpen(false)}>
              Email Cleanup
            </Link>
            <Link to="/pricing" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium" onClick={() => setIsMenuOpen(false)}>
              Pricing
            </Link>
            <Link to="/contact" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium" onClick={() => setIsMenuOpen(false)}>
              Contact
            </Link>
            {!isAuthenticated && <>
                <Link to="/login" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium" onClick={() => setIsMenuOpen(false)}>
                  Sign in
                </Link>
                <button
                  onClick={() => {
                    handleCleanInboxClick();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-center bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors mt-4"
                >
                  Clean My Inbox Now
                </button>
              </>}
          </div>
        </div>}
      {/* Floating CTA button for desktop - hidden on cleanup/dashboard pages */}
      {!location.pathname.startsWith('/cleanup') && !location.pathname.startsWith('/dashboard') && (
        <div className="hidden md:block fixed bottom-8 right-8 z-10">
          <button
            onClick={handleCleanInboxClick}
            className="bg-indigo-600 dark:bg-indigo-500 text-white px-5 py-3 rounded-full font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-lg flex items-center"
          >
            Clean My Inbox Now
          </button>
        </div>
      )}
    </nav>;
};
export default Navbar;
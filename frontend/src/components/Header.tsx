import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Compass } from 'lucide-react';
import { toast } from 'react-toastify';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('cc_token');

  const handleLogout = () => {
    localStorage.removeItem('cc_token');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Compass className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Career Compass</h1>
          </div>
          
          {token && (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
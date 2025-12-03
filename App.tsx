import React, { useState } from 'react';
import { ViewState } from './types';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatInterface onBack={() => setCurrentView('landing')} />;
      case 'admin':
        return <AdminDashboard onBack={() => setCurrentView('landing')} />;
      case 'landing':
      default:
        return <LandingPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-ocean-100 selection:text-ocean-900">
      {renderView()}
    </div>
  );
};

export default App;
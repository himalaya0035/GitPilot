import React, { useState } from 'react';
import './App.css';
import WorkflowEditor from './components/WorkflowEditor';
import WorkflowRunner from './components/WorkflowRunner';
import WorkflowManager from './components/WorkflowManager';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  const [currentView, setCurrentView] = useState('editor'); // 'editor' or 'runner'
  const [workflow, setWorkflow] = useState(null);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);

  const handleWorkflowCreated = (workflowData) => {
    setWorkflow(workflowData);
    setCurrentView('runner');
  };

  const handleBackToEditor = () => {
    setCurrentView('editor');
  };

  const handleWorkflowRunnerClick = () => {
    if (!workflow) {
      setShowWorkflowSelector(true);
    } else {
      setCurrentView('runner');
    }
  };

  const handleWorkflowSelected = (selectedWorkflow) => {
    setWorkflow(selectedWorkflow);
    setCurrentView('runner');
    setShowWorkflowSelector(false);
  };

  return (
    <NotificationProvider>
      <div className="App">
        <header className="App-header">
          <div className="header-brand">
            <div className="header-logo">G</div>
            <h1>GitPilot</h1>
          </div>
          <nav className="header-nav">
            <button 
              className={`nav-tab ${currentView === 'editor' ? 'active' : ''}`}
              onClick={() => setCurrentView('editor')}
            >
              <span className="nav-tab-icon">✏️</span>
              Workflow Editor
            </button>
            <button 
              className={`nav-tab ${currentView === 'runner' ? 'active' : ''}`}
              onClick={handleWorkflowRunnerClick}
            >
              <span className="nav-tab-icon">🚀</span>
              Workflow Runner
              {!workflow && <span className="nav-tab-badge">!</span>}
            </button>
          </nav>
        </header>
        
        <main>
          {currentView === 'editor' ? (
            <WorkflowEditor onWorkflowCreated={handleWorkflowCreated} />
          ) : (
            <WorkflowRunner 
              workflow={workflow} 
              onBackToEditor={handleBackToEditor}
            />
          )}
        </main>

        {showWorkflowSelector && (
          <div className="modal-overlay">
            <div className="workflow-selector-modal">
              <div className="modal-header">
                <h2>Select Workflow to Run</h2>
                <button 
                  className="close-button"
                  onClick={() => setShowWorkflowSelector(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-content">
                <WorkflowManager 
                  onLoadWorkflow={handleWorkflowSelected}
                  onClose={() => setShowWorkflowSelector(false)}
                  showOnlyLoad={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </NotificationProvider>
  );
}

export default App;
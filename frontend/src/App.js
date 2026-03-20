import React, { useState, useEffect } from 'react';
import './App.css';
import WorkflowEditor from './components/WorkflowEditor';
import WorkflowRunner from './components/WorkflowRunner';
import WorkflowManager from './components/WorkflowManager';
import { NotificationProvider } from './contexts/NotificationContext';
import { isPlayground } from './services';
import { Edit3, Play, GitMerge, FlaskConical } from 'lucide-react';

// Playground-only imports
const PlaygroundBanner = isPlayground ? require('./components/PlaygroundBanner').default : null;
const PlaygroundHelper = isPlayground ? require('./components/PlaygroundHelper').default : null;
const seedSampleWorkflows = isPlayground ? require('./data/sampleWorkflows').seedSampleWorkflows : null;

function App() {
  const [currentView, setCurrentView] = useState('editor'); // 'editor' or 'runner'
  const [workflow, setWorkflow] = useState(null);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);

  // Seed sample workflows on first playground visit
  useEffect(() => {
    if (isPlayground && seedSampleWorkflows) {
      seedSampleWorkflows();
    }
  }, []);

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
        {isPlayground && PlaygroundBanner && <PlaygroundBanner />}
        <header className="App-header">
          <div className="header-brand">
            <div className="header-logo">
              <GitMerge size={24} />
            </div>
            <h1>GitPilot</h1>
            {isPlayground && (
              <span className="playground-badge">
                <FlaskConical size={13} />
                Playground
              </span>
            )}
          </div>
          <nav className="header-nav">
            <button
              className={`nav-tab ${currentView === 'editor' ? 'active' : ''}`}
              onClick={() => setCurrentView('editor')}
            >
              <span className="nav-tab-icon">
                <Edit3 size={18} />
              </span>
              Workflow Editor
            </button>
            <button
              className={`nav-tab ${currentView === 'runner' ? 'active' : ''}`}
              onClick={handleWorkflowRunnerClick}
            >
              <span className="nav-tab-icon">
                <Play size={18} />
              </span>
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
              onWorkflowChange={handleWorkflowSelected}
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

        {isPlayground && PlaygroundHelper && <PlaygroundHelper />}
      </div>
    </NotificationProvider>
  );
}

export default App;

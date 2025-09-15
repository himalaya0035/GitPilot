import React, { useState } from 'react';
import './App.css';
import WorkflowEditor from './components/WorkflowEditor';
import WorkflowRunner from './components/WorkflowRunner';

function App() {
  const [currentView, setCurrentView] = useState('editor'); // 'editor' or 'runner'
  const [workflow, setWorkflow] = useState(null);

  const handleWorkflowCreated = (workflowData) => {
    setWorkflow(workflowData);
    setCurrentView('runner');
  };

  const handleBackToEditor = () => {
    setCurrentView('editor');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Git Workflow Visualizer</h1>
        <nav>
          <button 
            className={currentView === 'editor' ? 'active' : ''}
            onClick={() => setCurrentView('editor')}
          >
            Workflow Editor
          </button>
          <button 
            className={currentView === 'runner' ? 'active' : ''}
            onClick={() => setCurrentView('runner')}
            disabled={!workflow}
          >
            Workflow Runner
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
    </div>
  );
}

export default App;
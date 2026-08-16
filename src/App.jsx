import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [authStep, setAuthStep] = useState('setup');
  const [scriptUrl, setScriptUrl] = useState('');
  const [entrants, setEntrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('appsScriptUrl');
    if (saved) {
      setScriptUrl(saved);
      setAuthStep('dashboard');
      loadEntrants(saved);
    }
  }, []);

  const jsonpRequest = (url, params) => {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Date.now();
      const script = document.createElement('script');
      
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      const queryParams = new URLSearchParams({ ...params, callback: callbackName });
      script.src = `${url}?${queryParams.toString()}`;
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('JSONP request failed'));
      };
      
      document.body.appendChild(script);
    });
  };

  const loadEntrants = async (url) => {
    setLoading(true);
    try {
      const data = await jsonpRequest(url, { action: 'getEntrants' });
      
      if (data.success) {
        setEntrants(data.data || []);
        setError('');
      } else {
        setError(data.message || 'Failed to load entrants.');
      }
    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load entrants. Check script URL.');
    }
    setLoading(false);
  };

  const togglePaid = async (rowNum, currentPaid) => {
    const newStatus = !currentPaid ? 'PAID' : '';
    
    try {
      const data = await jsonpRequest(scriptUrl, {
        action: 'togglePaid',
        row: rowNum,
        status: newStatus
      });
      
      if (data.success) {
        setEntrants(entrants.map(e => 
          e.rowNum === rowNum ? { ...e, paid: newStatus === 'PAID' } : e
        ));
        setError('');
      } else {
        setError(data.message || 'Failed to update.');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update.');
    }
  };

  const addEntrant = async () => {
    if (!newName.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      const data = await jsonpRequest(scriptUrl, {
        action: 'addEntrant',
        name: newName.trim(),
        amount: newAmount.trim() || ''
      });
      
      if (data.success) {
        setNewName('');
        setNewAmount('');
        setError('');
        loadEntrants(scriptUrl);
      } else {
        setError(data.message || 'Failed to add entrant.');
      }
    } catch (err) {
      console.error('Add error:', err);
      setError('Failed to add entrant.');
    }
  };

  const handleConnect = () => {
    if (!scriptUrl.trim()) {
      setError('Enter your Google Apps Script URL.');
      return;
    }
    
    localStorage.setItem('appsScriptUrl', scriptUrl);
    setAuthStep('dashboard');
    loadEntrants(scriptUrl);
  };

  const signOut = () => {
    localStorage.removeItem('appsScriptUrl');
    setAuthStep('setup');
    setEntrants([]);
    setError('');
    setScriptUrl('');
  };

  const filteredEntrants = entrants.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'paid' && e.paid) ||
      (filterStatus === 'unpaid' && !e.paid);
    return matchesSearch && matchesStatus;
  });

  if (authStep === 'setup') {
    return (
      <div className="container setup-container">
        <div className="setup-card">
          <h2>Connect your script</h2>
          <p className="setup-text">
            Paste your Google Apps Script URL below.
          </p>

          <div className="form-group">
            <label>Google Apps Script URL</label>
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="Paste your Apps Script URL"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn-primary" onClick={handleConnect}>
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Entrants</h1>
        <button className="btn-small" onClick={signOut}>Sign out</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name"
          className="search-input"
        />
      </div>

      <div className="filter-buttons">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filterStatus === 'paid' ? 'active' : ''}`}
          onClick={() => setFilterStatus('paid')}
        >
          Paid
        </button>
        <button
          className={`filter-btn ${filterStatus === 'unpaid' ? 'active' : ''}`}
          onClick={() => setFilterStatus('unpaid')}
        >
          Unpaid
        </button>
      </div>

      <div className="add-form">
        <h3>Add new entrant</h3>
        <div className="form-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
          />
          <input
            type="text"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Amount"
          />
        </div>
        <button className="btn-primary" onClick={addEntrant} disabled={loading}>
          Add entrant
        </button>
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && entrants.length === 0 && (
        <div className="empty">No entrants yet.</div>
      )}

      {!loading && entrants.length > 0 && filteredEntrants.length === 0 && (
        <div className="empty">No results found.</div>
      )}

      {!loading && filteredEntrants.length > 0 && (
        <div className="list">
          {filteredEntrants.map((entrant) => (
            <div
              key={entrant.rowNum}
              className={`entrant-row ${entrant.paid ? 'paid' : ''}`}
              onClick={() => togglePaid(entrant.rowNum, entrant.paid)}
            >
              <div className="checkbox">
                {entrant.paid && <span>✓</span>}
              </div>
              <div className="entrant-info">
                <div className="entrant-name">{entrant.name}</div>
              </div>
              {entrant.amount && (
                <div className="entrant-amount">{entrant.amount}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import './App.css';

const SHEET_ID = '1tebbUu6cziXr4OYM1kpFtl2N60JHSNe3Pvt_2JaPay4';
const SHEET_NAME = 'Sheet1';

export default function App() {
  const [authStep, setAuthStep] = useState('setup');
  const [clientId, setClientId] = useState('');
  const [entrants, setEntrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('googleAccessToken');
    if (saved) {
      setAuthStep('dashboard');
      loadEntrants(saved);
    }
  }, []);

  const initializeGoogleAuth = (clientId) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        ux_mode: 'popup',
        callback: handleAuthCode,
        access_type: 'offline',
        prompt: 'consent'
      });
      setTokenClient(client);
      setTimeout(() => {
        client.requestCode();
      }, 100);
    };
    document.body.appendChild(script);
  };

  const handleAuthCode = (response) => {
    if (response.code) {
      exchangeCodeForToken(response.code);
    }
  };

  const exchangeCodeForToken = async (code) => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: window.location.origin,
        })
      });
      
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('googleAccessToken', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('googleRefreshToken', data.refresh_token);
        }
        setAuthStep('dashboard');
        loadEntrants(data.access_token);
      } else {
        setError('Failed to get access token. Make sure your Client ID is correct.');
      }
    } catch (err) {
      setError('Failed to authenticate. Check browser console for details.');
    }
  };

  const loadEntrants = async (accessToken) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Load Error:', response.status, errorData);
        setError('Failed to load sheet.');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.values) {
        const rows = data.values.slice(1);
        const formatted = rows.map((row, idx) => ({
          rowNum: idx + 2,
          name: row[0] || '',
          paid: row[1] === 'PAID',
          amount: row[2] || ''
        }));
        setEntrants(formatted);
      }
    } catch (err) {
      setError('Failed to load sheet.');
    }
    setLoading(false);
  };

  const togglePaid = async (rowNum, currentPaid) => {
    const accessToken = localStorage.getItem('googleAccessToken');
    const newValue = !currentPaid;
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!B${rowNum}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            values: [[newValue ? 'PAID' : '']]
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        setError('Failed to update.');
        return;
      }
      
      setEntrants(entrants.map(e => 
        e.rowNum === rowNum ? { ...e, paid: newValue } : e
      ));
    } catch (err) {
      setError('Failed to update.');
    }
  };

  const addEntrant = async () => {
    if (!newName.trim()) {
      setError('Name is required.');
      return;
    }

    const accessToken = localStorage.getItem('googleAccessToken');
    const nextRow = entrants.length + 2;

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A${nextRow}:C${nextRow}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            values: [[newName.trim(), '', newAmount.trim() || '']]
          })
        }
      );

      if (!response.ok) {
        setError('Failed to add entrant.');
        return;
      }

      setEntrants([...entrants, {
        rowNum: nextRow,
        name: newName.trim(),
        paid: false,
        amount: newAmount.trim() || ''
      }]);

      setNewName('');
      setNewAmount('');
      setError('');
    } catch (err) {
      setError('Failed to add entrant.');
    }
  };

  const handleAuth = () => {
    if (!clientId.trim()) {
      setError('Enter your Client ID.');
      return;
    }
    
    initializeGoogleAuth(clientId);
  };

  const signOut = () => {
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('googleRefreshToken');
    setAuthStep('setup');
    setEntrants([]);
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
          <h2>Set up your dashboard</h2>
          <p className="setup-text">
            You need a Google Client ID to connect. Follow these steps:
          </p>
          <ol className="setup-steps">
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
            <li>Create a new project (or use existing)</li>
            <li>Enable Google Sheets API</li>
            <li>Create OAuth 2.0 credentials (Web application)</li>
            <li>Add authorized redirect URIs:
              <ul>
                <li>http://localhost:3000</li>
                <li>Your Netlify URL (after deploying)</li>
              </ul>
            </li>
            <li>Copy your Client ID</li>
          </ol>

          <div className="form-group">
            <label>Paste your Client ID here</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your Google Client ID"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn-primary" onClick={handleAuth}>
            Connect with Google
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

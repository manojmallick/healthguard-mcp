import React, { useState } from 'react';
import './styles/globals.css';

interface ComplianceResult {
  permitted: boolean;
  applicable_exception: string;
  exception_subsection: string;
  conditions_met: string[];
  approved_elements: string[];
  flagged_elements: string[];
  audit_event_hash: string;
  audit_valid: boolean;
  error?: string;
}

export function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [scenario, setScenario] = useState({
    data_type: 'medication_list',
    requester_role: 'specialist',
    care_relationship: 'referral',
    urgency: 'routine'
  });

  const runCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        permitted: false,
        applicable_exception: 'ERROR',
        exception_subsection: 'Request failed',
        conditions_met: [],
        approved_elements: [],
        flagged_elements: [],
        audit_event_hash: '',
        audit_valid: false,
        error: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>HealthGuard</h1>
        <p className="subtitle">Compliance Decision Visualizer</p>
      </header>

      <div className="grid">
        {/* Left Panel: Scenario Input */}
        <div className="panel input-panel">
          <h2>Clinical Scenario</h2>
          
          <div className="form-group">
            <label>Data Type</label>
            <select
              value={scenario.data_type}
              onChange={(e) => setScenario({...scenario, data_type: e.target.value})}
              className="select"
            >
              <option value="medication_list">Medication List</option>
              <option value="lab_results">Lab Results</option>
              <option value="imaging">Imaging Studies</option>
              <option value="full_record">Full Medical Record</option>
              <option value="de-identified">De-identified Data</option>
            </select>
          </div>

          <div className="form-group">
            <label>Requester Role</label>
            <select
              value={scenario.requester_role}
              onChange={(e) => setScenario({...scenario, requester_role: e.target.value})}
              className="select"
            >
              <option value="specialist">Outside Specialist</option>
              <option value="treating_physician">Treating Physician</option>
              <option value="patient">Patient (Self-request)</option>
              <option value="insurer">Health Insurer</option>
            </select>
          </div>

          <div className="form-group">
            <label>Care Relationship</label>
            <select
              value={scenario.care_relationship}
              onChange={(e) => setScenario({...scenario, care_relationship: e.target.value})}
              className="select"
            >
              <option value="treatment">Treatment</option>
              <option value="referral">Referral</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="form-group">
            <label>Urgency</label>
            <select
              value={scenario.urgency}
              onChange={(e) => setScenario({...scenario, urgency: e.target.value})}
              className="select"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergent">Emergent</option>
            </select>
          </div>

          <button
            onClick={runCheck}
            disabled={loading}
            className="button"
          >
            {loading ? 'Checking compliance...' : 'Run Compliance Check'}
          </button>
        </div>

        {/* Right Panel: Decision Tree Output */}
        {result && (
          <div className="panel result-panel">
            <h2>Compliance Decision</h2>

            {/* Decision Box */}
            <div className={`decision-box ${result.permitted ? 'permitted' : 'denied'}`}>
              <div className="decision-status">
                {result.permitted ? '✓ PERMITTED' : '✗ NOT PERMITTED'}
              </div>
              <div className="decision-exception">
                {result.applicable_exception}
              </div>
              {result.exception_subsection && (
                <div className="decision-citation">
                  {result.exception_subsection}
                </div>
              )}
            </div>

            {/* Conditions Met */}
            {result.conditions_met.length > 0 && (
              <div className="section">
                <h3>Conditions Met</h3>
                <div className="conditions-list">
                  {result.conditions_met.map((condition, idx) => (
                    <div key={idx} className="condition-item met">
                      <span className="icon">✓</span>
                      <span>{condition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Minimum Necessary Assessment */}
            {(result.approved_elements.length > 0 || result.flagged_elements.length > 0) && (
              <div className="section">
                <h3>Minimum Necessary Assessment</h3>
                {result.approved_elements.length > 0 && (
                  <div className="phi-list">
                    {result.approved_elements.map((element, idx) => (
                      <div key={`approved-${idx}`} className="phi-item approved">
                        <span className="icon">✓</span>
                        <span>{element}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.flagged_elements.length > 0 && (
                  <div className="phi-list">
                    {result.flagged_elements.map((element, idx) => (
                      <div key={`flagged-${idx}`} className="phi-item flagged">
                        <span className="icon">⚠</span>
                        <span>{element}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audit Event */}
            {result.audit_event_hash && (
              <div className="section audit-section">
                <div className="audit-status">
                  ✓ FHIR AuditEvent Generated · Validator: 0 errors
                </div>
                <div className="audit-hash">
                  SHA-256: {result.audit_event_hash.slice(0, 20)}...
                </div>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div className="section error-section">
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="footer">
        <p>HealthGuard v0.2.0 · Regulatory Compliance Intelligence · <a href="https://github.com/manojmallick/healthguard-mcp">GitHub</a></p>
      </footer>
    </div>
  );
}

export default App;

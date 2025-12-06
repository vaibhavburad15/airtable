
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const FormBuilder = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('My Form');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); 
  const [loadingBases, setLoadingBases] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const fetchBases = async () => {
      try {
        setLoadingBases(true);
        const res = await fetch(
          `${API_BASE}/api/forms/bases?userId=${userId}`
        );
        const data = await res.json();
        setBases(data.bases || data);
      } catch (err) {
        console.error(err);
        setMessage('Failed to load bases');
        setMessageType('error');
      } finally {
        setLoadingBases(false);
      }
    };
    fetchBases();
  }, [userId]);
  useEffect(() => {
    if (!formId || !userId) return;
    const fetchForm = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/forms/${formId}?userId=${userId}`);
        if (res.ok) {
          const form = await res.json();
          setTitle(form.name);
          setSelectedBase(form.airtableBaseId);
          setSelectedTable(form.airtableTableId);
          setQuestions(form.questions.map(q => ({ ...q, include: true })));
          setEditing(true);
        }
      } catch (err) {
        console.error('Error loading form:', err);
        setMessage('Failed to load form data');
        setMessageType('error');
      }
    };
    fetchForm();
  }, [formId, userId]);
  const handleBaseChange = async (e) => {
    const baseId = e.target.value;
    setSelectedBase(baseId);
    setSelectedTable('');
    setTables([]);
    setFields([]);
    setQuestions([]);
    setMessage('');
    if (!baseId) return;
    try {
      setLoadingTables(true);
      const res = await fetch(
        `${API_BASE}/api/forms/bases/${baseId}/tables?userId=${userId}`
      );
      const data = await res.json();
      setTables(data.tables || data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load tables');
      setMessageType('error');
    } finally {
      setLoadingTables(false);
    }
  };
  const handleTableChange = async (e) => {
    const tableId = e.target.value;
    setSelectedTable(tableId);
    setFields([]);
    setQuestions([]);
    setMessage('');
    if (!tableId) return;
    try {
      setLoadingFields(true);
      const res = await fetch(
        `${API_BASE}/api/forms/bases/${selectedBase}/tables/${tableId}/fields?userId=${userId}`
      );
      const data = await res.json();
      const fetchedFields = data.fields || data;
      setFields(fetchedFields);
      setQuestions(
        fetchedFields.map((f) => ({
          airtableFieldId: f.id,
          questionKey: f.name.replace(/\s+/g, '_').toLowerCase(),
          label: f.name,
          type: f.type,
          required: false,
          include: false,
          conditionalRules: null,
          options: f.options || [],
        }))
      );
    } catch (err) {
      console.error(err);
      setMessage('Failed to load fields');
      setMessageType('error');
    } finally {
      setLoadingFields(false);
    }
  };
  const toggleInclude = (idx) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, include: !q.include } : q))
    );
  };
  const toggleRequired = (idx) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, required: !q.required } : q))
    );
  };
  const changeLabel = (idx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, label: value } : q))
    );
  };
  const handleSaveForm = async () => {
    setMessage('');
    setMessageType('info');
    if (!userId) {
      setMessage('Missing userId. Go back to Dashboard and log in again.');
      setMessageType('error');
      return;
    }
    if (!selectedBase || !selectedTable) {
      setMessage('Please select both a base and a table.');
      setMessageType('error');
      return;
    }
    const selectedQuestions = questions
      .filter((q) => q.include)
      .map((q) => ({
        questionKey: q.questionKey,
        airtableFieldId: q.airtableFieldId,
        label: q.label,
        type: q.type,
        required: q.required,
        conditionalRules: q.conditionalRules,
        options: q.options,
      }));
    if (selectedQuestions.length === 0) {
      setMessage('Select at least one field to include in the form.');
      setMessageType('error');
      return;
    }
    setSaving(true);
    try {
      const url = editing && formId ? `${API_BASE}/api/forms/${formId}?userId=${userId}` : `${API_BASE}/api/forms?userId=${userId}`;
      const method = editing && formId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title || 'Untitled Form',
          baseId: selectedBase,
          tableId: selectedTable,
          questions: selectedQuestions,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save form');
      }
      const data = await res.json();
      setMessage(`Form saved successfully (id: ${data._id || data.id}).`);
      setMessageType('success');
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Error saving form');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };
  if (!userId) {
    return (
      <div className="page">
        <div className="card">
          <h1 className="page-title">Form Builder</h1>
          <p>No <code>userId</code> found. Please log in again.</p>
        </div>
      </div>
    );
  }
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };
  return (
    <motion.div
      className="page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="card"
        variants={itemVariants}
        whileHover={{ y: -5, boxShadow: '0 25px 50px rgba(0,0,0,0.1)' }}
        transition={{ duration: 0.3 }}
      >
        <motion.div className="card-header" variants={itemVariants}>
          <div>
            <motion.h1
              className="page-title"
              variants={itemVariants}
              style={{ fontSize: '2.2rem', fontWeight: 'bold' }}
            >
              Form Builder
            </motion.h1>
            <motion.p className="muted" variants={itemVariants}>
              Create a custom form based on your Airtable base and table.
            </motion.p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <motion.div
              className="pill"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              Airtable user&nbsp;
              <code>{userId.slice(0, 6)}…{userId.slice(-4)}</code>
            </motion.div>
            <motion.button
              onClick={() => {
                localStorage.removeItem('userId');
                navigate('/login');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              Logout
            </motion.button>
          </div>
        </motion.div>
        {message && (
          <div className={`alert alert-${messageType}`}>
            {message}
          </div>
        )}
        {}
        <motion.div
          className="section"
          variants={itemVariants}
          style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '12px',
            border: '1px solid #dee2e6'
          }}
        >
          <motion.h2
            className="section-title"
            variants={itemVariants}
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '50%',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              minWidth: '1.5rem',
              textAlign: 'center'
            }}>1</span>
            Form Configuration
          </motion.h2>
          <div className="grid-3">
            <div className="field">
              <label style={{ fontWeight: '600', color: '#495057' }}>Form Title</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your form title"
                style={{ fontSize: '1rem' }}
              />
            </div>
            <div className="field">
              <label style={{ fontWeight: '600', color: '#495057' }}>Airtable Base</label>
              <select
                className="input"
                value={selectedBase}
                onChange={handleBaseChange}
                disabled={loadingBases}
                style={{ fontSize: '1rem' }}
              >
                <option value="">
                  {loadingBases ? '🔄 Loading bases…' : '📁 Select a base'}
                </option>
                {Array.isArray(bases) && bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    📁 {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label style={{ fontWeight: '600', color: '#495057' }}>Airtable Table</label>
              <select
                className="input"
                value={selectedTable}
                onChange={handleTableChange}
                disabled={loadingTables || !selectedBase}
                style={{ fontSize: '1rem' }}
              >
                <option value="">
                  {loadingTables ? '🔄 Loading tables…' : selectedBase ? '📋 Select a table' : 'Select a base first'}
                </option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    📋 {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
        {}
        <motion.div
          className="section"
          variants={itemVariants}
          style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '12px',
            border: '1px solid #dee2e6'
          }}
        >
          <motion.h2
            className="section-title"
            variants={itemVariants}
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '50%',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              minWidth: '1.5rem',
              textAlign: 'center'
            }}>2</span>
            Field Selection
          </motion.h2>
          <motion.p
            className="muted"
            variants={itemVariants}
            style={{
              marginBottom: '1.5rem',
              fontSize: '1rem',
              color: '#6c757d'
            }}
          >
            Choose which Airtable fields to include in your form and customize their labels.
          </motion.p>
          {loadingFields && (
            <motion.div
              variants={itemVariants}
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6c757d'
              }}
            >
              🔄 Loading fields from your Airtable table…
            </motion.div>
          )}
          {!loadingFields && fields.length === 0 && selectedTable && (
            <motion.div
              variants={itemVariants}
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6c757d',
                background: 'white',
                borderRadius: '8px',
                border: '2px dashed #dee2e6'
              }}
            >
              📋 No fields found in this table. Try selecting a different table.
            </motion.div>
          )}
          {!loadingFields && !selectedTable && (
            <motion.div
              variants={itemVariants}
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6c757d',
                background: 'white',
                borderRadius: '8px',
                border: '2px dashed #dee2e6'
              }}
            >
              📋 Select a base and table above to see available fields.
            </motion.div>
          )}
          {fields.length > 0 && (
            <motion.div
              className="table-wrapper"
              variants={itemVariants}
              style={{
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <table className="table" style={{ margin: 0 }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Include</th>
                    <th>Field Label</th>
                    <th style={{ width: '120px' }}>Type</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Required</th>
                    <th style={{ width: '150px' }}>Conditional Logic</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, idx) => (
                    <motion.tr
                      key={q.airtableFieldId}
                      variants={itemVariants}
                      whileHover={{ backgroundColor: '#f8f9fa' }}
                      style={{ transition: 'background-color 0.2s ease' }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={q.include}
                          onChange={() => toggleInclude(idx)}
                          style={{ transform: 'scale(1.2)' }}
                        />
                      </td>
                      <td>
                        <input
                          className="input input-sm"
                          value={q.label}
                          onChange={(e) => changeLabel(idx, e.target.value)}
                          placeholder="Field label"
                          style={{ width: '100%', minWidth: '200px' }}
                        />
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: q.type === 'singleLineText' ? '#28a745' :
                                     q.type === 'email' ? '#007bff' :
                                     q.type === 'phoneNumber' ? '#17a2b8' :
                                     q.type === 'number' ? '#ffc107' :
                                     q.type === 'date' ? '#fd7e14' : '#6c757d',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {q.type === 'singleLineText' ? 'Text' :
                           q.type === 'email' ? 'Email' :
                           q.type === 'phoneNumber' ? 'Phone' :
                           q.type === 'number' ? 'Number' :
                           q.type === 'date' ? 'Date' :
                           q.type === 'multipleSelects' ? 'Multi-select' :
                           q.type === 'singleSelect' ? 'Select' : q.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={() => toggleRequired(idx)}
                          disabled={!q.include}
                          style={{ transform: 'scale(1.2)' }}
                        />
                      </td>
                      <td>
                        <input
                          className="input input-sm"
                          value={q.conditionalRules || ''}
                          onChange={(e) => setQuestions((prev) =>
                            prev.map((q2, i) => (i === idx ? { ...q2, conditionalRules: e.target.value } : q2))
                          )}
                          placeholder="Conditional rules"
                          disabled={!q.include}
                          style={{ width: '100%', minWidth: '120px' }}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
        {}
        <motion.div
          className="section"
          variants={itemVariants}
          style={{
            textAlign: 'center',
            padding: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: 'white'
          }}
        >
          <motion.h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}
            variants={itemVariants}
          >
            Ready to Create Your Form?
          </motion.h2>
          <motion.button
            className="btn"
            onClick={handleSaveForm}
            disabled={saving || !selectedBase || !selectedTable || questions.filter(q => q.include).length === 0}
            variants={itemVariants}
            whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '25px',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
              opacity: saving || !selectedBase || !selectedTable || questions.filter(q => q.include).length === 0 ? 0.6 : 1
            }}
          >
            {saving ? '🚀 Creating Form…' : '✨ Create Form'}
          </motion.button>
          {(!selectedBase || !selectedTable) && (
            <motion.p
              variants={itemVariants}
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                opacity: 0.9
              }}
            >
              💡 Select a base and table, then choose at least one field to enable form creation.
            </motion.p>
          )}
          {selectedBase && selectedTable && questions.filter(q => q.include).length === 0 && (
            <motion.p
              variants={itemVariants}
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                opacity: 0.9
              }}
            >
              💡 Check at least one field above to include it in your form.
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
export default FormBuilder;

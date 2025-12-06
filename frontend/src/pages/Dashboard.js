
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('userId');
}
const Dashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(() => {
    return getUserIdFromUrl() || localStorage.getItem('userId') || '';
  });
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const idFromUrl = getUserIdFromUrl();
    if (idFromUrl && idFromUrl !== userId) {
      setUserId(idFromUrl);
    }
  }, [userId]);
  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
      fetchForms();
    }
  }, [userId]);
  const fetchForms = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/forms?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setForms(data);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/forms/${formId}?userId=${userId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setForms(forms.filter(form => form._id !== formId));
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };
  const handleShareForm = (formId) => {
    const shareUrl = `${window.location.origin}/public/form/${formId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Form link copied to clipboard!');
  };
  if (!userId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Airtable Form Builder</h1>
        <p>No <code>userId</code> found in URL. Log in again.</p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 24px',
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            marginTop: '1rem'
          }}
        >
          Login with Airtable
        </button>
      </div>
    );
  }
  const handleCreateForm = () => {
    navigate('/form-builder');
  };
  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/login');
  };
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
      style={{ padding: '2rem' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}
      >
        <motion.h1
          style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}
        >
          Airtable Form Builder
        </motion.h1>
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          Logout
        </motion.button>
      </motion.div>
      <motion.p variants={itemVariants}>
        Logged in as Airtable user (internal id):{' '}
        <code>{userId}</code>
      </motion.p>
      <motion.hr
        variants={itemVariants}
        style={{ margin: '1.5rem 0', border: 'none', height: '1px', background: 'linear-gradient(90deg, #667eea, #764ba2)' }}
      />
      <motion.button
        variants={itemVariants}
        onClick={handleCreateForm}
        whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
        whileTap={{ scale: 0.95 }}
        style={{
          padding: '12px 24px',
          fontSize: '1.1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease'
        }}
      >
        Create New Form
      </motion.button>
      <motion.h2
        variants={itemVariants}
        style={{ marginTop: '2rem', fontSize: '1.8rem', color: '#333' }}
      >
        Your Forms
      </motion.h2>
      {loading ? (
        <motion.p variants={itemVariants}>Loading forms...</motion.p>
      ) : forms.length === 0 ? (
        <motion.p variants={itemVariants}>No forms created yet. Create your first form!</motion.p>
      ) : (
        <motion.div variants={itemVariants} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {forms.map(form => (
            <motion.div
              key={form._id}
              variants={itemVariants}
              style={{
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '10px',
                borderLeft: '4px solid #667eea',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{form.name}</h3>
                <p style={{ margin: '0.5rem 0', color: '#666' }}>
                  Created: {new Date(form.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate(`/form-builder/${form._id}`)}
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/forms/${form._id}/responses`)}
                  style={{
                    padding: '8px 16px',
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Responses
                </button>
                <button
                  onClick={() => handleShareForm(form._id)}
                  style={{
                    padding: '8px 16px',
                    background: '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Share
                </button>
                <button
                  onClick={() => handleDeleteForm(form._id)}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
export default Dashboard;

import React from 'react';
const Login = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/login';
  };
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Airtable Form Builder</h1>
      <p>Connect your Airtable account to start building dynamic forms.</p>
      <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Login with Airtable
      </button>
    </div>
  );
};
export default Login;

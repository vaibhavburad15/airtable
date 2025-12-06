import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
const Responses = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  useEffect(() => {
    fetchResponses();
    fetchAnalytics();
  }, [formId]);
  const fetchResponses = async () => {
    try {
      const response = await axios.get(`/api/forms/${formId}/responses?userId=${localStorage.getItem('userId')}`);
      setResponses(response.data);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`/api/forms/${formId}/analytics?userId=${localStorage.getItem('userId')}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };
  return (
    <div>
      <h2>Form Responses</h2>
      {analytics && (
        <div>
          <h3>Analytics</h3>
          <p>Total Responses: {analytics.totalResponses}</p>
          <p>Recent Responses (last 7 days): {analytics.recentResponses}</p>
          <h4>Field Statistics</h4>
          <ul>
            {Object.entries(analytics.fieldStats).map(([key, stat]) => (
              <li key={key}>
                {stat.label} ({stat.type}): {stat.responses} responses, {stat.uniqueValues} unique values
              </li>
            ))}
          </ul>
        </div>
      )}
      {responses.length === 0 ? (
        <p>No responses yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Submitted</th>
              <th>Status</th>
              <th>Answers</th>
            </tr>
          </thead>
          <tbody>
            {responses.map(response => (
              <tr key={response._id}>
                <td>{new Date(response.createdAt).toLocaleString()}</td>
                <td>{response.deletedInAirtable ? 'Deleted in Airtable' : 'Active'}</td>
                <td>
                  <pre>{JSON.stringify(response.answers, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
export default Responses;
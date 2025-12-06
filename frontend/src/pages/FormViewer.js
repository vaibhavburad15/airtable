import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const FormViewer = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitMessageType, setSubmitMessageType] = useState('info'); 
  useEffect(() => {
    fetchForm();
  }, [formId, fetchForm]);
  useEffect(() => {
    if (form) {
      updateVisibleQuestions();
    }
  }, [answers, form, updateVisibleQuestions]);
  const fetchForm = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/forms/public/${formId}`);
      setForm(response.data);
    } catch (error) {
      console.error('Error fetching form:', error);
      setSubmitMessage('Failed to load form. Please check the link and try again.');
      setSubmitMessageType('error');
    }
  }, [formId]);
  const shouldShowQuestion = (rules, answersSoFar) => {
    if (!rules) return true;
    const { logic, conditions } = rules;
    const results = conditions.map(condition => {
      const answer = answersSoFar[condition.questionKey];
      if (answer === undefined || answer === null) return false;
      switch (condition.operator) {
        case 'equals':
          return answer === condition.value;
        case 'notEquals':
          return answer !== condition.value;
        case 'contains':
          return String(answer).includes(condition.value);
        default:
          return false;
      }
    });
    return logic === 'AND' ? results.every(r => r) : results.some(r => r);
  };
  const updateVisibleQuestions = () => {
    const visible = form.questions.filter(question =>
      shouldShowQuestion(question.conditionalRules, answers)
    );
    setVisibleQuestions(visible);
  };
  const handleAnswerChange = (questionKey, value) => {
    setAnswers(prev => ({ ...prev, [questionKey]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');
    setSubmitMessageType('info');
    const requiredQuestions = visibleQuestions.filter(q => q.required);
    const missingRequired = requiredQuestions.filter(q => !answers[q.questionKey]);
    if (missingRequired.length > 0) {
      setSubmitMessage('Please fill in all required fields');
      setSubmitMessageType('error');
      setSubmitting(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answers));
      Object.keys(answers).forEach(key => {
        if (answers[key] instanceof File) {
          formData.append('files', answers[key]);
        }
      });
      await axios.post(`${API_BASE}/api/forms/${formId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSubmitMessage('Form submitted successfully!');
      setSubmitMessageType('success');
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitMessage(error.response?.data?.error || 'Error submitting form. Please try again.');
      setSubmitMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };
  const renderQuestion = (question) => {
    const value = answers[question.questionKey] || '';
    switch (question.type) {
      case 'singleLineText':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
          />
        );
      case 'longText':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
            rows={4}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
          />
        );
      case 'phoneNumber':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
          />
        );
      case 'singleSelect':
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
          >
            <option value="">Select...</option>
            {question.options && question.options.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'multipleSelects':
        return (
          <div>
            <select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                handleAnswerChange(question.questionKey, selectedOptions);
              }}
              required={question.required}
              style={{ minHeight: '100px' }}
            >
              {question.options && question.options.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      case 'attachment':
        return (
          <input
            type="file"
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.files[0])}
            required={question.required}
          />
        );
      default:
        return <input type="text" />;
    }
  };
  if (!form) return <div>Loading...</div>;
  return (
    <div>
      <h2>{form.name}</h2>
      <form onSubmit={handleSubmit}>
        {visibleQuestions.map(question => (
          <div key={question.questionKey}>
            <label>{question.label}{question.required && '*'}</label>
            {renderQuestion(question)}
          </div>
        ))}
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};
export default FormViewer;

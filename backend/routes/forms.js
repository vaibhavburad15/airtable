const express = require('express');
const axios = require('axios');
const Form = require('../models/Form');
const Response = require('../models/Response');
const User = require('../models/User');
const { shouldShowQuestion } = require('../utils/conditionalLogic');
const router = express.Router();
const getUser = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(401).json({ error: 'User ID required' });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Auth error' });
  }
};
router.get('/bases', getUser, async (req, res) => {
  try {
    const response = await axios.get('https://login.airtable.com/api/meta/bases', {
      headers: { Authorization: `Bearer ${req.user.accessToken}` }
    });
    res.json(response.data.bases);
  } catch (error) {
    console.error('Error fetching bases:', error);
    res.status(500).json({ error: 'Failed to fetch bases' });
  }
});
router.get('/bases/:baseId/tables', getUser, async (req, res) => {
  try {
    const { baseId } = req.params;
    const response = await axios.get(`https:login.airtable.com/api/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${req.user.accessToken}` }
    });
    res.json(response.data.tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});
router.get('/bases/:baseId/tables/:tableId/fields', getUser, async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    const response = await axios.get(`https://login.airtable.com/api/meta/bases/${baseId}/tables/${tableId}/fields`, {
      headers: { Authorization: `Bearer ${req.user.accessToken}` }
    });
    const supportedTypes = ['singleLineText', 'multilineText', 'email', 'phoneNumber', 'number', 'date', 'singleSelect', 'multipleSelects', 'attachment'];
    const fields = response.data.fields.filter(field => supportedTypes.includes(field.type));
    res.json(fields.map(field => ({
      id: field.id,
      name: field.name,
      type: field.type,
      options: field.options?.choices?.map(choice => choice.name) || []
    })));
  } catch (error) {
    console.error('Error fetching fields:', error);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});
router.post('/', getUser, async (req, res) => {
  try {
    const { name, baseId, tableId, questions } = req.body;
    const form = new Form({
      owner: req.user._id,
      airtableBaseId: baseId,
      airtableTableId: tableId,
      name,
      questions
    });
    await form.save();
    res.status(201).json(form);
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});
router.get('/', getUser, async (req, res) => {
  try {
    const forms = await Form.find({ owner: req.user._id });
    res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});
router.get('/:formId', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});
router.get('/public/:formId', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (error) {
    console.error('Error fetching public form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});
router.put('/:formId', getUser, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form || form.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, questions } = req.body;
    if (name) form.name = name;
    if (questions) form.questions = questions;
    await form.save();
    res.json(form);
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
});
router.delete('/:formId', getUser, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form || form.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await Form.findByIdAndDelete(req.params.formId);
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});
router.post('/:formId/submit', getUser, async (req, res) => {
  try {
    let answers = req.body.answers;
    let files = req.files || [];
    if (typeof answers === 'string') {
      answers = JSON.parse(answers);
    }
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    const visibleQuestions = form.questions.filter(q => shouldShowQuestion(q.conditionalRules, answers));
    const requiredQuestions = visibleQuestions.filter(q => q.required);
    const missingRequired = requiredQuestions.filter(q => !answers[q.questionKey]);
    if (missingRequired.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', fields: missingRequired.map(q => q.questionKey) });
    }
    const airtableData = {};
    const attachmentPromises = [];
    form.questions.forEach(q => {
      if (answers[q.questionKey] !== undefined) {
        if (q.type === 'attachment') {
          const file = files.find(f => f.fieldname === q.questionKey);
          if (file) {
            attachmentPromises.push(
              axios.post(
                'https://api.airtable.com/v0/' + form.airtableBaseId + '/' + form.airtableTableId,
                {
                  fields: {
                    [q.airtableFieldId]: [
                      {
                        url: file.location || `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                        filename: file.originalname
                      }
                    ]
                  }
                },
                { headers: { Authorization: `Bearer ${req.user.accessToken}` } }
              )
            );
          }
        } else {
          airtableData[q.airtableFieldId] = answers[q.questionKey];
        }
      }
    });
    let airtableResponse;
    if (Object.keys(airtableData).length > 0) {
      airtableResponse = await axios.post(
        `https://api.airtable.com/v0/${form.airtableBaseId}/${form.airtableTableId}`,
        { fields: airtableData },
        { headers: { Authorization: `Bearer ${req.user.accessToken}` } }
      );
    }
    if (attachmentPromises.length > 0) {
      await Promise.all(attachmentPromises);
    }
    const response = new Response({
      formId: form._id,
      airtableRecordId: airtableResponse?.data?.id || 'file-upload-only',
      answers
    });
    await response.save();
    res.status(201).json({ message: 'Response submitted successfully', responseId: response._id });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});
router.get('/:formId/responses', getUser, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form || form.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const responses = await Response.find({ formId: req.params.formId, deletedInAirtable: { $ne: true } });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});
router.get('/:formId/analytics', getUser, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form || form.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const responses = await Response.find({ formId: req.params.formId, deletedInAirtable: { $ne: true } });
    const totalResponses = responses.length;
    const recentResponses = responses.filter(r => {
      const responseDate = new Date(r.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return responseDate > weekAgo;
    }).length;
    const fieldStats = {};
    form.questions.forEach(q => {
      fieldStats[q.questionKey] = {
        label: q.label,
        type: q.type,
        responses: responses.filter(r => r.answers[q.questionKey] !== undefined).length,
        uniqueValues: [...new Set(responses.map(r => r.answers[q.questionKey]).filter(v => v !== undefined))].length
      };
    });
    res.json({
      totalResponses,
      recentResponses,
      fieldStats,
      formName: form.name,
      createdAt: form.createdAt
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
module.exports = router;

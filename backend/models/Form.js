const mongoose = require('mongoose');
const conditionSchema = new mongoose.Schema({
  questionKey: {
    type: String,
    required: true
  },
  operator: {
    type: String,
    enum: ['equals', 'notEquals', 'contains'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});
const conditionalRulesSchema = new mongoose.Schema({
  logic: {
    type: String,
    enum: ['AND', 'OR'],
    required: true
  },
  conditions: [conditionSchema]
});
const questionSchema = new mongoose.Schema({
  questionKey: {
    type: String,
    required: true
  },
  airtableFieldId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['singleLineText', 'longText', 'email', 'phoneNumber', 'number', 'date', 'singleSelect', 'multipleSelects', 'attachment'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  conditionalRules: conditionalRulesSchema,
  options: [String]
});
const formSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  airtableBaseId: {
    type: String,
    required: true
  },
  airtableTableId: {
    type: String,
    required: true
  },
  questions: [questionSchema]
}, {
  timestamps: true
});
module.exports = mongoose.model('Form', formSchema);
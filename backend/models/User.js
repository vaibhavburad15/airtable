const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  airtableUserId: {
    type: String,
    required: true,
    unique: true
  },
  profile: {
    type: Object,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  loginTimestamp: {
    type: Date,
    default: Date.now
  }
});
module.exports = mongoose.model('User', userSchema);
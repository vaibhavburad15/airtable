const express = require('express');
const Response = require('../models/Response');
const router = express.Router();
router.post('/', async (req, res) => {
  try {
    const { action, recordId, baseId, tableId } = req.body;
    if (action === 'recordUpdated') {
      const response = await Response.findOne({ airtableRecordId: recordId });
      if (response) {
        response.updatedAt = new Date();
        await response.save();
      }
    } else if (action === 'recordDeleted') {
      await Response.findOneAndUpdate(
        { airtableRecordId: recordId },
        { deletedInAirtable: true }
      );
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});
module.exports = router;
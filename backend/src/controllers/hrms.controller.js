const hrmsService = require('../services/hrms.service');

exports.getEmployees = async (req, res) => {
  try {
    const data = await hrmsService.fetchDynamicHRMSEmployees(req.query);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.fetchDynamicUser = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Identifier required' });
    }
    const user = await hrmsService.getOrRegisterHRMSUser(identifier);
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

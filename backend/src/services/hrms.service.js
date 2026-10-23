const env = require('../config/env');
const User = require('../models/User');
const Student = require('../models/Student');

class HRMSService {
  /**
   * Dynamically fetch employee / student records from HRMS API or database on demand.
   */
  async fetchDynamicHRMSEmployees(query = {}) {
    try {
      // If external HRMS API URL is configured in env, query live API
      if (process.env.HRMS_API_URL) {
        const axios = require('axios');
        const response = await axios.get(`${process.env.HRMS_API_URL}/employees`, {
          params: query,
          headers: { 'Authorization': `Bearer ${process.env.HRMS_API_KEY}` }
        });
        return response.data;
      }

      // If MySQL RDS environment parameters exist, perform live dynamic query
      if (process.env.DB_HOST && process.env.DB_USER) {
        try {
          const mysql = require('mysql2/promise');
          const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'student_database',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
          });

          const [rows] = await connection.query('SELECT * FROM students LIMIT 100');
          await connection.end();

          return {
            success: true,
            source: 'hrms_rds',
            data: rows
          };
        } catch (mysqlErr) {
          console.warn('HRMS RDS MySQL live fetch fallback:', mysqlErr.message);
        }
      }

      // Return empty list if no external HRMS sources are configured
      return {
        success: true,
        source: 'hrms_service',
        data: []
      };
    } catch (error) {
      console.error('HRMS Dynamic Fetch Error:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Dynamically lookup and register an HRMS user on demand when they log in or request access.
   */
  async getOrRegisterHRMSUser(employeeIdOrRollNumber) {
    try {
      let user = await User.findOne({ 
        $or: [{ username: employeeIdOrRollNumber }, { email: employeeIdOrRollNumber }] 
      });

      if (user) return user;

      // Dynamically fetch profile from HRMS
      const hrmsData = await this.fetchDynamicHRMSEmployees({ query: employeeIdOrRollNumber });
      const record = (hrmsData.data || []).find(e => e.employee_id === employeeIdOrRollNumber || e.roll_number === employeeIdOrRollNumber);

      if (record) {
        const crypto = require('crypto');
        user = new User({
          username: record.employee_id || record.roll_number,
          password: crypto.randomBytes(16).toString('hex'),
          email: record.email || `${record.employee_id}@pydah.edu.in`,
          name: record.name,
          role: record.role || 'student',
          status: 'active'
        });
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('getOrRegisterHRMSUser Error:', error);
      return null;
    }
  }
}

module.exports = new HRMSService();

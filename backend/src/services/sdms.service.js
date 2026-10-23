const mysql = require('mysql2/promise');
const env = require('../config/env');

class SDMSService {
  constructor() {
    this.pool = null;
  }

  getPool() {
    if (!this.pool) {
      if (!env.DB_HOST || !env.DB_USER) {
        throw new Error('SDMS MySQL database configuration is missing');
      }

      this.pool = mysql.createPool({
        host: env.DB_HOST,
        port: env.DB_PORT || 3306,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME || 'student_database',
        ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      });

      console.log('✅ SDMS MySQL connection pool initialized');
    }
    return this.pool;
  }

  /**
   * Fetch all active colleges
   */
  async getColleges() {
    const pool = this.getPool();
    const [rows] = await pool.query(
      'SELECT id, name, code FROM colleges WHERE is_active = 1 ORDER BY name ASC'
    );
    return rows;
  }

  /**
   * Fetch courses for a specific college (or all active)
   */
  async getCourses(collegeId) {
    const pool = this.getPool();
    let query = 'SELECT id, college_id, name, code, total_years, semesters_per_year FROM courses WHERE is_active = 1';
    const params = [];

    if (collegeId) {
      query += ' AND college_id = ?';
      params.push(Number(collegeId));
    }
    query += ' ORDER BY name ASC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Fetch branches for a specific course and college
   */
  async getBranches(collegeId, courseId) {
    const pool = this.getPool();
    let query = `
      SELECT cb.id, cb.course_id, cb.name, cb.code 
      FROM course_branches cb 
      JOIN courses c ON cb.course_id = c.id 
      WHERE cb.is_active = 1
    `;
    const params = [];

    if (courseId) {
      query += ' AND cb.course_id = ?';
      params.push(Number(courseId));
    }
    if (collegeId) {
      query += ' AND c.college_id = ?';
      params.push(Number(collegeId));
    }
    query += ' ORDER BY cb.name ASC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Fetch available academic years (1, 2, 3, 4, etc.)
   */
  async getYears(collegeId, courseId, branchId) {
    const pool = this.getPool();
    
    // Check if course has total_years defined
    let defaultYears = [];
    if (courseId) {
      const [courses] = await pool.query('SELECT total_years FROM courses WHERE id = ?', [Number(courseId)]);
      if (courses.length > 0 && courses[0].total_years) {
        const total = Number(courses[0].total_years);
        defaultYears = Array.from({ length: total }, (_, i) => i + 1);
      }
    }

    // Also get distinct current_year from students (Regular students only)
    let query = "SELECT DISTINCT current_year as year FROM students WHERE current_year IS NOT NULL AND current_year > 0 AND student_status = 'Regular'";
    const params = [];

    if (collegeId) {
      query += ' AND college_id = ?';
      params.push(Number(collegeId));
    }
    if (courseId) {
      query += ' AND course_id = ?';
      params.push(Number(courseId));
    }
    if (branchId) {
      query += ' AND branch_id = ?';
      params.push(Number(branchId));
    }
    query += ' ORDER BY year ASC';

    const [rows] = await pool.query(query, params);
    const dbYears = rows.map(r => Number(r.year)).filter(Boolean);

    // Merge and deduplicate
    const combined = Array.from(new Set([...defaultYears, ...dbYears])).sort((a, b) => a - b);
    return combined.length > 0 ? combined : [1, 2, 3, 4];
  }

  /**
   * Fetch available semesters (1, 2 or 1 through 8)
   */
  async getSemesters(collegeId, courseId, branchId, year) {
    const pool = this.getPool();
    let query = "SELECT DISTINCT current_semester as semester FROM students WHERE current_semester IS NOT NULL AND current_semester > 0 AND student_status = 'Regular'";
    const params = [];

    if (collegeId) {
      query += ' AND college_id = ?';
      params.push(Number(collegeId));
    }
    if (courseId) {
      query += ' AND course_id = ?';
      params.push(Number(courseId));
    }
    if (branchId) {
      query += ' AND branch_id = ?';
      params.push(Number(branchId));
    }
    if (year) {
      query += ' AND current_year = ?';
      params.push(Number(year));
    }
    query += ' ORDER BY semester ASC';

    const [rows] = await pool.query(query, params);
    const dbSems = rows.map(r => Number(r.semester)).filter(Boolean);

    if (year) {
      const y = Number(year);
      // Both numbering schemes: relative (1, 2) or cumulative (e.g. year 2 -> 3, 4)
      const expected = [1, 2, (y * 2) - 1, y * 2];
      const merged = Array.from(new Set([...dbSems, ...expected])).sort((a, b) => a - b);
      return merged;
    }

    return dbSems.length > 0 ? dbSems : [1, 2, 3, 4, 5, 6, 7, 8];
  }

  /**
   * Fetch sections (A, B, C, D, etc.)
   */
  async getSections(collegeId, courseId, branchId, year, semester) {
    const pool = this.getPool();
    let query = `
      SELECT DISTINCT s.section
      FROM students s
      WHERE s.section IS NOT NULL AND CHAR_LENGTH(s.section) > 0 AND s.student_status = 'Regular'
    `;
    const params = [];

    if (collegeId) {
      query += ' AND s.college_id = ?';
      params.push(Number(collegeId));
    }
    if (courseId) {
      query += ' AND s.course_id = ?';
      params.push(Number(courseId));
    }
    if (branchId) {
      query += ' AND s.branch_id = ?';
      params.push(Number(branchId));
    }
    if (year) {
      query += ' AND s.current_year = ?';
      params.push(Number(year));
    }
    if (semester) {
      query += ' AND s.current_semester = ?';
      params.push(Number(semester));
    }

    query += ' ORDER BY s.section ASC';

    const [rows] = await pool.query(query, params);
    const sections = rows.map(r => r.section).filter(Boolean);

    // Provide standard sections if none in database for the given combo
    if (sections.length === 0) {
      return ['A', 'B', 'C', 'D'];
    }
    return sections;
  }

  /**
   * Fetch students with College, Course, Branch, Year, Sem, Section, Search and Pagination
   */
  async getFilteredStudents({
    collegeId,
    courseId,
    branchId,
    year,
    semester,
    section,
    search,
    page = 1,
    limit = 20
  }) {
    const pool = this.getPool();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Filter ONLY Regular students
    let whereClause = "WHERE (s.student_status = 'Regular' OR LOWER(s.student_status) = 'regular')";
    const params = [];

    if (collegeId) {
      whereClause += ' AND s.college_id = ?';
      params.push(Number(collegeId));
    }
    if (courseId) {
      whereClause += ' AND s.course_id = ?';
      params.push(Number(courseId));
    }
    if (branchId) {
      whereClause += ' AND s.branch_id = ?';
      params.push(Number(branchId));
    }
    if (year) {
      whereClause += ' AND s.current_year = ?';
      params.push(Number(year));
    }
    if (semester) {
      whereClause += ' AND s.current_semester = ?';
      params.push(Number(semester));
    }
    if (section) {
      whereClause += ' AND s.section = ?';
      params.push(section);
    }
    if (search && search.trim()) {
      const sTerm = `%${search.trim()}%`;
      whereClause += ' AND (s.student_name LIKE ? OR s.admission_number LIKE ? OR s.pin_no LIKE ? OR s.email LIKE ? OR s.student_mobile LIKE ?)';
      params.push(sTerm, sTerm, sTerm, sTerm, sTerm);
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM students s
      ${whereClause}
    `;

    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0]?.total || 0;

    // Data query
    const dataQuery = `
      SELECT 
        s.id,
        s.admission_number,
        s.pin_no,
        TRIM(s.student_name) as student_name,
        s.email,
        s.student_mobile,
        s.father_name,
        s.gender,
        s.batch,
        s.current_year,
        s.current_semester,
        s.section,
        s.student_status,
        s.college_id,
        s.course_id,
        s.branch_id,
        COALESCE(s.college, col.name) as college_name,
        COALESCE(s.course, c.name) as course_name,
        COALESCE(s.branch, cb.name) as branch_name
      FROM students s
      LEFT JOIN colleges col ON s.college_id = col.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN course_branches cb ON s.branch_id = cb.id
      ${whereClause}
      ORDER BY s.current_year ASC, s.current_semester ASC, s.pin_no ASC, s.student_name ASC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limitNum, offset];
    const [rows] = await pool.query(dataQuery, dataParams);

    // Format for frontend consumption
    const formattedStudents = rows.map(s => {
      const identifier = s.pin_no || s.admission_number || `STD${s.id}`;
      return {
        _id: s.id.toString(),
        id: s.id,
        name: s.student_name || 'N/A',
        student_name: s.student_name || 'N/A',
        roll_number: identifier,
        username: identifier,
        email: s.email || `${identifier}@pydah.edu.in`,
        mobile_number: s.student_mobile || '',
        campus_name: s.college_name || 'Main Campus',
        college_name: s.college_name || '',
        course_name: s.course_name || 'General',
        branch_name: s.branch_name || '',
        batch_name: s.batch || '',
        year: s.current_year,
        semester: s.current_semester,
        section: s.section || '',
        gender: s.gender || '',
        status: s.student_status || 'active',
        source: 'sdms'
      };
    });

    return {
      students: formattedStudents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        has_more: offset + rows.length < total
      }
    };
  }
}

module.exports = new SDMSService();

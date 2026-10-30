const CrtModule = require('../models/CrtModule');
const Question = require('../models/Question');
const questionBankService = require('../services/questionBank.service');

// Helper to slugify a string
const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Seed default dynamic CRT modules, topics and levels if database collection is empty
const seedDefaultCrtStructure = async () => {
  const count = await CrtModule.countDocuments();
  if (count > 0) return;

  const standardLevels = [
    { level: 1, name: 'Level 1 (Beginner)', description: 'Fundamental concepts, basic formulas, and direct problems' },
    { level: 2, name: 'Level 2 (Intermediate)', description: 'Standard exam problems and moderate multi-step questions' },
    { level: 3, name: 'Level 3 (Advanced)', description: 'Complex scenarios, high-difficulty, and speed shortcuts' }
  ];

  const defaultModules = [
    {
      name: 'Quantitative Aptitude',
      code: 'aptitude',
      description: 'Arithmetic, percentages, profit-loss, time & work, permutations, and probability.',
      icon: 'Calculator',
      color: 'indigo',
      order: 1,
      topics: [
        {
          name: 'Time & Work',
          code: 'time-work',
          description: 'Problems on pipes, cisterns, efficiency, and man-days.',
          levels: standardLevels,
          order: 1
        },
        {
          name: 'Percentages, Profit & Loss',
          code: 'profit-loss',
          description: 'Cost price, selling price, discounts, margins and percentages.',
          levels: standardLevels,
          order: 2
        },
        {
          name: 'Time, Speed & Distance',
          code: 'speed-distance',
          description: 'Trains, boats, streams, relative velocity and averages.',
          levels: standardLevels,
          order: 3
        },
        {
          name: 'Permutations & Combinations',
          code: 'permutations',
          description: 'Arrangements, selections, probability basics and logic.',
          levels: standardLevels,
          order: 4
        },
        {
          name: 'Number Systems & Simplification',
          code: 'number-systems',
          description: 'HCF, LCM, divisibility rules, fractions and surds.',
          levels: standardLevels,
          order: 5
        }
      ]
    },
    {
      name: 'Logical Reasoning',
      code: 'reasoning',
      description: 'Syllogisms, blood relations, series completion, coding-decoding, and direction sense.',
      icon: 'Brain',
      color: 'emerald',
      order: 2,
      topics: [
        {
          name: 'Syllogisms & Deductive Logic',
          code: 'syllogisms',
          description: 'Venn diagrams, statements, deductions and conclusions.',
          levels: standardLevels,
          order: 1
        },
        {
          name: 'Blood Relations',
          code: 'blood-relations',
          description: 'Family tree, coded relations and kinship queries.',
          levels: standardLevels,
          order: 2
        },
        {
          name: 'Direction Sense Test',
          code: 'direction-sense',
          description: 'Cardinal directions, shadows, turns and displacement.',
          levels: standardLevels,
          order: 3
        },
        {
          name: 'Coding & Decoding',
          code: 'coding-decoding',
          description: 'Letter shifts, matrix coding, and symbolic substitution.',
          levels: standardLevels,
          order: 4
        },
        {
          name: 'Series & Pattern Completion',
          code: 'series-patterns',
          description: 'Number sequences, alphabet patterns and missing terms.',
          levels: standardLevels,
          order: 5
        }
      ]
    },
    {
      name: 'Technical & CS',
      code: 'technical',
      description: 'Data structures, algorithms, DBMS/SQL, operating systems, networking, and OOP.',
      icon: 'Code',
      color: 'purple',
      order: 3,
      topics: [
        {
          name: 'Data Structures & Algorithms',
          code: 'dsa',
          description: 'Arrays, linked lists, trees, graphs, sorting, and complexity.',
          levels: standardLevels,
          order: 1
        },
        {
          name: 'DBMS & SQL Queries',
          code: 'dbms-sql',
          description: 'Relational algebra, normalization, joins, indexing and transactions.',
          levels: standardLevels,
          order: 2
        },
        {
          name: 'Operating Systems',
          code: 'operating-systems',
          description: 'Processes, threads, CPU scheduling, deadlocks and memory management.',
          levels: standardLevels,
          order: 3
        },
        {
          name: 'Object-Oriented Programming (OOP)',
          code: 'oops',
          description: 'Classes, polymorphism, inheritance, encapsulation and design patterns.',
          levels: standardLevels,
          order: 4
        },
        {
          name: 'Computer Networks',
          code: 'computer-networks',
          description: 'OSI model, TCP/IP, IP addressing, HTTP, DNS and protocols.',
          levels: standardLevels,
          order: 5
        }
      ]
    },
    {
      name: 'Verbal Ability & English',
      code: 'verbal',
      description: 'Reading comprehension, sentence correction, vocabulary, idioms, and grammar.',
      icon: 'BookOpen',
      color: 'amber',
      order: 4,
      topics: [
        {
          name: 'Sentence Correction & Spotting Errors',
          code: 'grammar',
          description: 'Tenses, subject-verb agreement, modifiers and prepositions.',
          levels: standardLevels,
          order: 1
        },
        {
          name: 'Vocabulary, Synonyms & Antonyms',
          code: 'vocabulary',
          description: 'Word meanings, context clues, analogies and idiomatic usage.',
          levels: standardLevels,
          order: 2
        },
        {
          name: 'Reading Comprehension',
          code: 'reading',
          description: 'Passage comprehension, author tone, central idea and inferences.',
          levels: standardLevels,
          order: 3
        },
        {
          name: 'Para Jumbles & Fill in the Blanks',
          code: 'para-jumbles',
          description: 'Paragraph sequence reorganization and cloze tests.',
          levels: standardLevels,
          order: 4
        }
      ]
    }
  ];

  await CrtModule.insertMany(defaultModules);

  // Also seed initial questions into Question collection if empty
  const qCount = await Question.countDocuments();
  if (qCount === 0) {
    try {
      const createdModules = await CrtModule.find();
      const aptitudeMod = createdModules.find(m => m.code === 'aptitude');
      const reasoningMod = createdModules.find(m => m.code === 'reasoning');
      const technicalMod = createdModules.find(m => m.code === 'technical');

      const seedQuestions = [];

      // Seed from DEFAULT_QUESTION_BANK
      const defaultBank = questionBankService.DEFAULT_QUESTION_BANK || {};
      const crtBank = defaultBank.crt || {};

      if (aptitudeMod && crtBank.aptitude && Array.isArray(crtBank.aptitude)) {
        const topic = aptitudeMod.topics[0];
        crtBank.aptitude.forEach((q, idx) => {
          const lvl = (idx % 3) + 1;
          seedQuestions.push({
            text: q.text,
            module_id: aptitudeMod.code,
            main_module_id: aptitudeMod._id,
            topic_id: topic ? topic._id.toString() : '',
            subcategory: topic ? topic.code : 'aptitude',
            level_id: lvl,
            level_name: `Level ${lvl}`,
            question_type: q.question_type || 'mcq',
            options: q.options || [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || ''
          });
        });
      }

      if (reasoningMod && crtBank.reasoning && Array.isArray(crtBank.reasoning)) {
        const topic = reasoningMod.topics[0];
        crtBank.reasoning.forEach((q, idx) => {
          const lvl = (idx % 3) + 1;
          seedQuestions.push({
            text: q.text,
            module_id: reasoningMod.code,
            main_module_id: reasoningMod._id,
            topic_id: topic ? topic._id.toString() : '',
            subcategory: topic ? topic.code : 'reasoning',
            level_id: lvl,
            level_name: `Level ${lvl}`,
            question_type: q.question_type || 'mcq',
            options: q.options || [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || ''
          });
        });
      }

      if (technicalMod && crtBank.technical && Array.isArray(crtBank.technical)) {
        const topic = technicalMod.topics[0];
        crtBank.technical.forEach((q, idx) => {
          const lvl = (idx % 3) + 1;
          seedQuestions.push({
            text: q.text,
            module_id: technicalMod.code,
            main_module_id: technicalMod._id,
            topic_id: topic ? topic._id.toString() : '',
            subcategory: topic ? topic.code : 'technical',
            level_id: lvl,
            level_name: `Level ${lvl}`,
            question_type: q.question_type || 'mcq',
            options: q.options || [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || ''
          });
        });
      }

      if (seedQuestions.length > 0) {
        await Question.insertMany(seedQuestions);
      }
    } catch (seedErr) {
      console.warn('Initial CRT question seeding notice:', seedErr.message);
    }
  }
};

/**
 * GET /crt/modules
 * Returns all dynamic modules with topics, levels, and question counts
 */
exports.getModules = async (req, res) => {
  try {
    await seedDefaultCrtStructure();

    const modules = await CrtModule.find({ is_active: { $ne: false } })
      .sort({ order: 1, created_at: 1 })
      .lean();

    // Attach question counts per module and topic
    const counts = await Question.aggregate([
      {
        $group: {
          _id: {
            module_id: '$module_id',
            main_module_id: '$main_module_id',
            topic_id: '$topic_id',
            subcategory: '$subcategory',
            level_id: '$level_id'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const enrichedModules = modules.map(mod => {
      let moduleTotalQuestions = 0;

      const topics = (mod.topics || []).filter(t => t.is_active !== false).map(topic => {
        let topicTotalQuestions = 0;
        const topicIdStr = String(topic._id);
        const topicCodeStr = topic.code;

        const levelCounts = {};
        (topic.levels || []).forEach(lvl => {
          levelCounts[lvl.level] = 0;
        });

        counts.forEach(c => {
          const matchModule =
            String(c._id.main_module_id) === String(mod._id) ||
            c._id.module_id === mod.code ||
            c._id.module_id === String(mod._id);

          const matchTopic =
            c._id.topic_id === topicIdStr ||
            c._id.subcategory === topicCodeStr ||
            c._id.subcategory === topic.name;

          if (matchModule && matchTopic) {
            topicTotalQuestions += c.count;
            if (c._id.level_id !== undefined && levelCounts[c._id.level_id] !== undefined) {
              levelCounts[c._id.level_id] += c.count;
            }
          }
        });

        moduleTotalQuestions += topicTotalQuestions;

        const enrichedLevels = (topic.levels || []).map(lvl => ({
          ...lvl,
          question_count: levelCounts[lvl.level] || 0
        }));

        return {
          ...topic,
          levels: enrichedLevels,
          question_count: topicTotalQuestions
        };
      });

      return {
        ...mod,
        topics,
        question_count: moduleTotalQuestions
      };
    });

    return res.json({
      success: true,
      data: enrichedModules
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /crt/modules
 * Create a new Main Module
 */
exports.createModule = async (req, res) => {
  try {
    const { name, code, description, icon, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Module name is required' });
    }

    const generatedCode = (code && code.trim()) ? slugify(code) : slugify(name);

    // Check if code already exists
    const existing = await CrtModule.findOne({ code: generatedCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A module with code '${generatedCode}' already exists. Please choose a different name or code.`
      });
    }

    const maxOrder = await CrtModule.find().sort({ order: -1 }).limit(1);
    const nextOrder = (maxOrder.length && maxOrder[0].order) ? maxOrder[0].order + 1 : 1;

    const newModule = new CrtModule({
      name: name.trim(),
      code: generatedCode,
      description: description ? description.trim() : '',
      icon: icon || 'BookOpen',
      color: color || 'indigo',
      topics: [],
      order: nextOrder,
      is_active: true
    });

    await newModule.save();

    return res.status(201).json({
      success: true,
      message: 'Main module created successfully',
      data: newModule
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /crt/modules/:id
 * Edit an existing Main Module
 */
exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, is_active } = req.body;

    const mod = await CrtModule.findById(id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    if (name && name.trim()) mod.name = name.trim();
    if (description !== undefined) mod.description = description.trim();
    if (icon) mod.icon = icon;
    if (color) mod.color = color;
    if (is_active !== undefined) mod.is_active = Boolean(is_active);
    mod.updated_at = new Date();

    await mod.save();

    return res.json({
      success: true,
      message: 'Module updated successfully',
      data: mod
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /crt/modules/:id
 * Delete a Main Module
 */
exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const mod = await CrtModule.findById(id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Delete module
    await CrtModule.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Module '${mod.name}' deleted successfully`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /crt/modules/:moduleId/topics
 * Create a new Topic inside a Main Module with required Level selections
 */
exports.createTopic = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { name, code, description, levels } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Topic name is required' });
    }

    // Prompt & requirement: User MUST configure / select levels
    if (!levels || !Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Level selection is required! Please select at least one level for this topic.'
      });
    }

    const mod = await CrtModule.findById(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Main module not found' });
    }

    const generatedCode = (code && code.trim()) ? slugify(code) : slugify(name);

    // Format & validate levels
    const formattedLevels = levels.map((lvl, idx) => {
      if (typeof lvl === 'number') {
        return {
          level: lvl,
          name: `Level ${lvl}`,
          description: `Difficulty level ${lvl}`
        };
      }
      return {
        level: parseInt(lvl.level || idx + 1, 10),
        name: (lvl.name && lvl.name.trim()) ? lvl.name.trim() : `Level ${lvl.level || idx + 1}`,
        description: (lvl.description || '').trim()
      };
    });

    const newTopic = {
      name: name.trim(),
      code: generatedCode,
      description: (description || '').trim(),
      levels: formattedLevels,
      is_active: true,
      order: (mod.topics ? mod.topics.length : 0) + 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    mod.topics.push(newTopic);
    await mod.save();

    const createdTopic = mod.topics[mod.topics.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Topic created successfully with selected levels',
      data: createdTopic
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /crt/modules/:moduleId/topics/:topicId
 * Edit an existing Topic, including dynamic level modifications
 */
exports.updateTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;
    const { name, description, levels, is_active } = req.body;

    const mod = await CrtModule.findById(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Main module not found' });
    }

    const topic = mod.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    if (name && name.trim()) topic.name = name.trim();
    if (description !== undefined) topic.description = description.trim();
    if (is_active !== undefined) topic.is_active = Boolean(is_active);

    if (levels !== undefined) {
      if (!Array.isArray(levels) || levels.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one level must be selected for the topic'
        });
      }

      topic.levels = levels.map((lvl, idx) => {
        if (typeof lvl === 'number') {
          return {
            level: lvl,
            name: `Level ${lvl}`,
            description: `Difficulty level ${lvl}`
          };
        }
        return {
          level: parseInt(lvl.level || idx + 1, 10),
          name: (lvl.name && lvl.name.trim()) ? lvl.name.trim() : `Level ${lvl.level || idx + 1}`,
          description: (lvl.description || '').trim()
        };
      });
    }

    topic.updated_at = new Date();
    await mod.save();

    return res.json({
      success: true,
      message: 'Topic and level configuration updated successfully',
      data: topic
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /crt/modules/:moduleId/topics/:topicId
 * Delete a Topic from a Main Module
 */
exports.deleteTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;

    const mod = await CrtModule.findById(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Main module not found' });
    }

    const topic = mod.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    const topicName = topic.name;
    mod.topics.pull(topicId);
    await mod.save();

    return res.json({
      success: true,
      message: `Topic '${topicName}' removed successfully`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /crt/questions
 * Filter questions by module, topic, and level
 */
exports.getQuestions = async (req, res) => {
  try {
    const {
      module_id,
      topic_id,
      level_id,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    if (module_id && module_id !== 'all') {
      filter.$or = [
        { module_id: module_id },
        { subcategory: module_id }
      ];
      // If it looks like a valid Mongo ObjectId, also query main_module_id
      if (/^[0-9a-fA-F]{24}$/.test(module_id)) {
        filter.$or.push({ main_module_id: module_id });
      }
    }

    if (topic_id && topic_id !== 'all') {
      const topicFilter = [
        { topic_id: topic_id },
        { subcategory: topic_id }
      ];
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: topicFilter }
        ];
        delete filter.$or;
      } else {
        filter.$or = topicFilter;
      }
    }

    if (level_id && level_id !== 'all') {
      filter.level_id = parseInt(level_id, 10);
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const searchCondition = {
        $or: [
          { text: searchRegex },
          { options: searchRegex },
          { explanation: searchRegex }
        ]
      };
      if (filter.$and) {
        filter.$and.push(searchCondition);
      } else if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          searchCondition
        ];
        delete filter.$or;
      } else {
        Object.assign(filter, searchCondition);
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Question.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: {
        questions,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /crt/questions
 * Create a single question
 */
exports.createQuestion = async (req, res) => {
  try {
    const {
      text,
      module_id,
      main_module_id,
      topic_id,
      subcategory,
      level_id,
      level_name,
      question_type,
      options,
      correct_answer,
      explanation
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required' });
    }

    const cleanOptions = Array.isArray(options)
      ? options.map(o => String(o).trim()).filter(Boolean)
      : [];

    if (cleanOptions.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 options are required' });
    }

    const answer = correct_answer !== undefined ? String(correct_answer).trim() : cleanOptions[0];

    const question = new Question({
      text: text.trim(),
      module_id: module_id || 'crt',
      main_module_id: main_module_id || null,
      topic_id: topic_id || '',
      subcategory: subcategory || topic_id || 'general',
      level_id: level_id ? parseInt(level_id, 10) : 1,
      level_name: level_name || `Level ${level_id || 1}`,
      question_type: question_type || 'mcq',
      options: cleanOptions,
      correct_answer: answer,
      explanation: explanation ? explanation.trim() : ''
    });

    await question.save();

    return res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: question
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /crt/questions/bulk
 * Bulk upload questions parsed from CSV / Excel
 */
exports.bulkUploadQuestions = async (req, res) => {
  try {
    const {
      module_id,
      main_module_id,
      topic_id,
      subcategory,
      level_id,
      level_name,
      questions
    } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Questions array is required' });
    }

    const docsToInsert = [];

    questions.forEach((q, idx) => {
      const qText = q.text || q.question;
      if (!qText || !String(qText).trim()) return;

      const opts = Array.isArray(q.options)
        ? q.options.map(o => String(o).trim()).filter(Boolean)
        : [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);

      const finalOpts = opts.length >= 2 ? opts : ['Option A', 'Option B', 'Option C', 'Option D'];
      const ans = q.correct_answer || q.answer || finalOpts[0];

      docsToInsert.push({
        text: String(qText).trim(),
        module_id: module_id || q.module_id || 'crt',
        main_module_id: main_module_id || q.main_module_id || null,
        topic_id: topic_id || q.topic_id || '',
        subcategory: subcategory || q.subcategory || topic_id || 'general',
        level_id: q.level_id ? parseInt(q.level_id, 10) : (level_id ? parseInt(level_id, 10) : 1),
        level_name: q.level_name || level_name || `Level ${level_id || 1}`,
        question_type: q.question_type || 'mcq',
        options: finalOpts,
        correct_answer: String(ans).trim(),
        explanation: q.explanation ? String(q.explanation).trim() : ''
      });
    });

    if (docsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found in payload'
      });
    }

    const inserted = await Question.insertMany(docsToInsert);

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${inserted.length} questions into the CRT question bank!`,
      count: inserted.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /crt/questions/:id
 * Edit an existing question
 */
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      text,
      options,
      correct_answer,
      explanation,
      level_id,
      level_name,
      question_type,
      topic_id,
      subcategory
    } = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (text && text.trim()) question.text = text.trim();
    if (Array.isArray(options) && options.length >= 2) {
      question.options = options.map(o => String(o).trim()).filter(Boolean);
    }
    if (correct_answer !== undefined) question.correct_answer = String(correct_answer).trim();
    if (explanation !== undefined) question.explanation = String(explanation).trim();
    if (level_id !== undefined) question.level_id = parseInt(level_id, 10);
    if (level_name) question.level_name = level_name;
    if (question_type) question.question_type = question_type;
    if (topic_id) question.topic_id = topic_id;
    if (subcategory) question.subcategory = subcategory;
    question.updated_at = new Date();

    await question.save();

    return res.json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /crt/questions/:id
 * Delete a question
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    return res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /crt/stats
 * Overview counts for CRT portal
 */
exports.getStats = async (req, res) => {
  try {
    const [modulesCount, questionsCount] = await Promise.all([
      CrtModule.countDocuments({ is_active: { $ne: false } }),
      Question.countDocuments()
    ]);

    const modules = await CrtModule.find({ is_active: { $ne: false } }).select('topics');
    let totalTopics = 0;
    modules.forEach(m => {
      totalTopics += (m.topics || []).filter(t => t.is_active !== false).length;
    });

    return res.json({
      success: true,
      data: {
        totalModules: modulesCount,
        totalTopics: totalTopics,
        totalQuestions: questionsCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const { v4: uuidv4 } = require("uuid");
const os = require("os");
const { log } = require("console");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");



const port = 5000;

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: '65.60.61.250',
  user: 'tempor47_mood783',
  password: '!@0S7p41Pe',
  database: 'tempor47_quiz_print',
  //database: 'tempor47_mood783',

  
})
// const pool = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "clientmoodle",
// });

function printSomething() {
  console.log("Server is running.");
}

// function getLocalIpAddress() {
//   const interfaces = os.networkInterfaces();
//   let ipAddress;

//   for (const networkInterface in interfaces) {
//     const addresses = interfaces[networkInterface];
//     for (const address of addresses) {
//       if (address.family === "IPv4" && !address.internal) {
//         ipAddress = address.address;
//         break;
//       }
//     }
//     if (ipAddress) break;
//   }

//   return ipAddress || "127.0.0.1"; // Default to localhost if no IP address is found
// }

// const localIpAddress = getLocalIpAddress();
// console.log(`Local IP address: ${localIpAddress}`);

const checkDatabaseConnection = () => {
  pool.getConnection((err) => {
    if (err) {
      console.error("Database connection error:", err);
    } else {
      console.log("Database connection successful!");
    }
  });
};



const secretKey =
  "SnapzElectricalInstructorPro-Nextupgradwebsolutions-version1";

const authenticationMiddleware = (req, res, next) => {
  var token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Auth Failed" });
  } else {
    var token = req.header("Authorization").split(" ")[1];

    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Auth Failed" });
      }

      req.user = user;
      next();
    });
  }
};

const corsOptions = {
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

app.use(
  cors(corsOptions)
);

app.use(bodyParser.json());

app.post("/api/login", async (req, res) => {
  const requestBodyData = req.body;
  // Now you can access the data sent from the client in requestBodyData
  console.log("req Body", requestBodyData);
  const Email = requestBodyData.Email;
  const Pass = requestBodyData.Pass;

  if (Email && Pass) {
    const user = { username: Email };
    jwt.sign(user, secretKey, { expiresIn: "3h" }, (err, token) => {
      if (err) {
        return res.status(500).json({ error: "Failed to generate token." });
      }

      res.json({
        success: "success",
        token: token,
        username: Email,
      });
    });
    console.log("token sent");
  } else {
    res.json({ success: "false" });
  }
});



// app.post("/api/login", (req, res) => {
//   const requestBodyData = req.body;
//   // Now you can access the data sent from the client in requestBodyData
//   const Email = requestBodyData.Email;
//   const Pass = requestBodyData.Pass;
//   // Your code to handle the login logic
//   try {
//     if (Email == "piyush" && Pass == "dev10") {
//       const user = { id: "1", username: "Piyush" };

//       jwt.sign(user, secretKey, { expiresIn: "3h" }, (err, token) => {
//         if (err) {
//           return res.status(500).json({ error: "Failed to generate token." });
//         }

//         res.json({ success: "success", token: token, username: user.username });
//       });
//     } else {
//       res.json({ success: "false" });
//     }
//   } catch (error) {
//     res.json({ success: "Error" });
//     console.log(error);
//   }
// });

app.get("/getPublicIpAddress", (req, res) => {
  checkDatabaseConnection();
  const publicIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  res.send(`Public IP Address: ${publicIp}`);
});

app.use(express.json());

app.get("/", authenticationMiddleware, (req, resp) => {
  resp.send("server up and running");
});

//APi to save the current Category in database
app.post("/api/saveCategory", authenticationMiddleware , (req, res) => {
  const { username, category } = req.body;

  const query =
    "INSERT INTO `savedcategory` (`username`, `category`) VALUES (?, ?) " +
    "ON DUPLICATE KEY UPDATE `category` = ?";

  pool.query(
    query,
    [username, category, category],
    (error, results, fields) => {
      if (error) {
        console.error("Error executing the SQL query:", error);
        res.status(500).json({ message: "Error saving/updating category" });
      } else {
        console.log("Category saved/updated successfully");
        res
          .status(200)
          .json({ message: "Category saved/updated successfully" });
      }
    }
  );
});

//API TO GET THE CATEGORY FROM DATABASE
app.get("/api/getCategoryByUsername", authenticationMiddleware , (req, res) => {
  const username = req.query.user; // Get the username from the query parameters
  console.log("Category user=",username)
  // SQL query to retrieve data based on the username
  const query = "SELECT * FROM savedcategory WHERE username = ?";

  // Execute the SQL query with the provided username
  pool.query(query, [username], (error, results, fields) => {
    if (error) {
      console.error("Error executing the SQL query:", error);
      res.status(500).json({ message: "Error retrieving data" });
    } else {
      // Return the results, which will be an array of matching records
      res.status(200).json(results);
    }
  });
});

// API TO LOAD A QUIZ
app.get("/questions", authenticationMiddleware, (req, res) => {
  const questionIds = req.query.ids;
  if (!questionIds) {
    res.status(400).json({ error: "Missing ids parameter" });
    return;
  }
  const idsArray = questionIds.split(",");
  console.log("IDs Array:", idsArray);

  const query = `
  SELECT q.id AS question_id, q.questiontext, q.qtype AS question_type,
    a.id AS answer_id, a.answer, a.fraction
  FROM mdl8m_question q
  JOIN mdl8m_question_answers a ON q.id = a.question
  WHERE q.id IN (?)
  ORDER BY a.fraction DESC
  `;
  pool.query(query, [idsArray], (err, result) => {
    if (err) {
      console.error("Error retrieving questions:", err);
      res.status(500).json({ error: "Failed to retrieve questions" });
      return;
    }

    console.log("Query Result:", result);

    const uniqueQuestionIds = new Set();
    const questionList = [];

    result.forEach((row) => {
      const {
        question_id,
        questiontext,
        question_type,
        answer_id,
        answer,
        fraction,
      } = row;

      if (!uniqueQuestionIds.has(question_id)) {
        uniqueQuestionIds.add(question_id);

        const question = {
          question_id,
          question_text: questiontext,
          question_type,
          answers: [],
          correct_answer: null,
        };

        question.correct_answer = answer_id;

        questionList.push(question);
      }

      const question = questionList.find((q) => q.question_id === question_id);

      if (question) {
        question.answers.push({
          answer_id,
          answer,
        });
      }
    });

    res.json(questionList.reverse());
  });
});

// API TO DELETE A QUIZ
app.get("/api/deleteSavedDraft/:id", authenticationMiddleware, (req, res) => {
  const quizId = req.params.id;
  const username = req.query.user;
  console.log("username", username);

  console.log("QUIZ Id", quizId);
  // Ensure the quizId parameter is provided
  if (!quizId) {
    res.status(400).json({ error: "Missing quizId parameter" });
    return;
  }

  const query = "DELETE FROM savedquiz WHERE id = ? AND username = ?";
  pool.query(query, [quizId, username], (err, result) => {
    if (err) {
      console.error("Error deleting the quiz:", err);
      res.status(500).json({ error: "Failed to delete the quiz" });
      return;
    }

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      console.error("quiz not found");
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    console.error("success");
    res.status(200).json({ message: "DelSuccess" });
  });
});

// API TO SAVE QUIZ
app.post("/api/saveQuiz", authenticationMiddleware, (req, res) => {
  console.log("Save API Hit");
  const { quizName, questionIds, number_ques, title, username, Date } =
    req.body;
  const quizLowerCaseName = quizName.toLowerCase();
  const timestamp = Date;
  const questionIdsString = JSON.stringify(questionIds);
  const num = number_ques;

  const name = username;

  const quizData = [
    [quizLowerCaseName, questionIdsString, timestamp, name, num, title],
  ];

  const query =
    "INSERT INTO savedquiz (quiz_name, question_ids, timestamp,username,number,title) VALUES ?";

  console.log(quizData);
  pool.query(query, [quizData], (err, result) => {
    if (err) {
      console.log("Error saving the quiz:", err);
      res.status(500).json({ error: "Failed to save the quiz" });
      return;
    }
    res.status(200).json({ message: "Quiz saved successfully" });
  });
});

// API FOR GETTING ALL THE SAVED QUIZ DRAFTS FROM DATABASE
app.get("/getAllQuizzes", authenticationMiddleware, (req, res) => {
  const username = req.query.name;

  const query = "SELECT * FROM savedquiz WHERE username = ?";
  pool.query(query, [username], (err, result) => {
    if (err) {
      console.error("Error retrieving quizzes:", err);
      res.status(500).json({ error: "Failed to retrieve quizzes" });
      return;
    }
    res.status(200).json(result);
  });
});

// API FOR GETTING QUIZ INSIDE COURSE
app.get("/quiz/:courseId", authenticationMiddleware, (req, res) => {
  const courseId = req.params.courseId;

  const sqlQuery = `
    SELECT qz.id, qz.name
    FROM mdl8m_quiz AS qz
    JOIN mdl8m_course AS c ON c.id = qz.course
    WHERE c.id = ?
  `;

  pool.query(sqlQuery, [courseId], (error, results) => {
    if (error) {
      console.error("Error executing the query:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.json(results);
  });
});

// API TO GET ALL COURSES
app.get("/api/courses", authenticationMiddleware, (req, res) => {
  const query = `
  SELECT id AS course_id, fullname AS course_name, summary AS course_description FROM mdl8m_course;
  `;

  pool.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const courses = results.map((row) => ({
        course_id: row.course_id,
        course_name: row.course_name,
        course_description: row.course_description,
      }));

      res.json(courses);
    }
  });
});

app.get("/api/categories", authenticationMiddleware, (req, res) => {
  const query = `
    SELECT id, name
    FROM mdl8m_course_categories
  `;

  pool.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const categories = results.map((row) => ({
        category_id: row.id,
        category_name: row.name,
      }));
      console.log(categories);
      res.json(categories);
    }
  });
});

// API TO GET ALL THE QUESTIONS FROM QUESTION BANK
app.get("/api/questions", authenticationMiddleware, (req, res) => {
  const query = `
    SELECT q.id AS question_id, q.questiontext, q.qtype AS question_type,
    a.id AS answer_id, a.answer, a.fraction
    FROM mdl8m_question q
    JOIN mdl8m_question_answers a ON q.id = a.question
    WHERE a.fraction >= 0
  `;

  pool.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const questions = {};

      results.forEach((row) => {
        const {
          question_id,
          questiontext,
          question_type,
          answer_id,
          answer,
          fraction,
        } = row;

        if (!questions[question_id]) {
          questions[question_id] = {
            question_id,
            question_text: questiontext,
            question_type,
            answers: [],
            correct_answer: null,
          };
        }

        questions[question_id].answers.push({
          answer_id,
          answer,
        });

        if (fraction === 1) {
          questions[question_id].correct_answer = answer_id;
        }
      });

      const questionList = Object.values(questions);

      res.json(questionList);
    }
  });
});

// API FOR GETTING QUESTIONS INSIDE QUIZ

app.get("/quiz/questions/:id", authenticationMiddleware, (req, res) => {
  const quizId = req.params.id;

  const query = `
  
  SELECT q.id AS questionid, q.questiontext, q.name AS questionname, q.qtype AS questiontype, qa.answer AS correctanswer, GROUP_CONCAT(qas.answer) AS options FROM mdl8m_quiz_slots slot LEFT JOIN mdl8m_question_bank_entries qbe ON qbe.id = slot.id LEFT JOIN mdl8m_question_versions qv ON qv.questionbankentryid = qbe.id LEFT JOIN mdl8m_question q ON q.id = qv.questionid LEFT JOIN mdl8m_question_answers qa ON qa.question = q.id AND qa.fraction > 0 LEFT JOIN mdl8m_question_answers qas ON qas.question = q.id WHERE slot.quizid = ? GROUP BY q.id;




  `;

  pool.query(query, [quizId], (error, results) => {
    if (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.json(results);
    }
  });
});

// FETCH COURSE AND QUIZ FOR FILTER
app.get("/snapz/filter", authenticationMiddleware, (req, res) => {
  const sqlQuery = `SELECT c.id AS course_id, c.fullname AS course_name, qz.id AS quiz_id, qz.name AS quiz_name, q.id AS question_id, q.questiontext AS question_text FROM mdl8m_course AS c LEFT JOIN mdl8m_quiz AS qz ON qz.course = c.id LEFT JOIN mdl8m_question_attempts AS qa ON qa.questionusageid = qz.id LEFT JOIN mdl8m_question AS q ON q.id = qa.questionid;`;

  pool.query(sqlQuery, (error, results) => {
    if (error) {
      console.error("Error executing the query:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.json(results);
  });
});

// FETCH COURSE AND QUIZ FOR FILTER VERSION 2
app.get("/snapz/filter/2", authenticationMiddleware, (req, res) => {
  const sqlQuery = `WITH RECURSIVE category_hierarchy AS (
    SELECT c1.id, c1.parent, c1.name AS category_name, 1 AS level FROM mdl8m_question_categories c1 WHERE c1.parent = 0
    UNION ALL
    SELECT c2.id, c2.parent, c2.name, h.level + 1 FROM mdl8m_question_categories c2 INNER JOIN category_hierarchy h ON c2.parent = h.id
  )
  SELECT course.name AS course_name, course.id AS course_id, chapter.name AS chapter_name, chapter.id AS chapter_id, category_hierarchy.category_name AS article_name, category_hierarchy.id AS article_id FROM category_hierarchy
  LEFT JOIN mdl8m_question_categories AS chapter ON chapter.id = category_hierarchy.parent
  LEFT JOIN mdl8m_question_categories AS course ON course.id = chapter.parent
  WHERE category_hierarchy.level = 4
  ORDER BY course_name, chapter_name, article_name;`;

  pool.query(sqlQuery, (error, results) => {
    if (error) {
      console.error("Error executing the query:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const courses = [];

    results.forEach((result) => {
      const {
        course_name,
        course_id,
        chapter_name,
        chapter_id,
        article_name,
        article_id,
      } = result;

      let course = courses.find((c) => c.course_name === course_name);

      if (!course) {
        course = {
          course_name,
          course_id,
          chapters: [],
        };
        courses.push(course);
      }

      let chapter = course.chapters.find(
        (ch) => ch.chapter_name === chapter_name
      );

      if (!chapter) {
        chapter = {
          chapter_name,
          chapter_id,
          articles: [],
        };
        course.chapters.push(chapter);
      }

      chapter.articles.push({
        article_name,
        article_id,
      });
    });

    res.json(courses);
  });
});

// API FOR GETTING QUESTIONS INSIDE ARTICLES ONLY
app.get(
  "/api/article/category/:categoryId",
  authenticationMiddleware,
  (req, res) => {
    const categoryId = req.params.categoryId;

    const query = `
    SELECT q.id AS question_id, q.questiontext AS question_text, q.qtype AS question_type,
    a.id AS answer_id, a.answer, a.fraction, ti.tagid 
    FROM mdl8m_question_bank_entries AS mqbe
    INNER JOIN mdl8m_question_versions AS mqv ON mqbe.id = mqv.questionbankentryid
    INNER JOIN mdl8m_question AS q ON q.id = mqv.questionid
    INNER JOIN mdl8m_question_categories AS mqc ON mqc.id = mqbe.questioncategoryid
    LEFT JOIN mdl8m_question_answers AS a ON a.question = q.id
    JOIN mdl8m_tag_instance ti ON ti.itemid=q.id 
    WHERE mqc.id = ?
    ORDER BY questioncategoryid ASC
  `;

    pool.query(query, [categoryId], (error, results) => {
      if (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ error: "Internal server error" });
      } else {
        const questions = {};

        results.forEach((row) => {
          const {
            question_id,
            question_text,
            question_type,
            answer_id,
            answer,
            fraction,
            tagid,
          } = row;

          if (!questions[question_id]) {
            questions[question_id] = {
              question_id,
              question_text,
              question_type,
              answers: [],
              correct_answer: null,
              tagid:null,
            };
          }

          if (answer_id && answer) {
            questions[question_id].answers.push({
              answer_id,
              answer,
            });
          }

          if (fraction === 1) {
            questions[question_id].tagid = tagid;
            questions[question_id].correct_answer = answer_id;
          }
        });

        const questionList = Object.values(questions);

        res.json(questionList);
      }
    });
  }
);

// API TO FETCH RANDOM 100 QUESTIONS

app.get("/api/questions/random", authenticationMiddleware, (req, res) => {
  const query = `
    SELECT q.id AS question_id, q.questiontext, q.qtype AS question_type,
    a.id AS answer_id, ti.tagid, a.answer, a.fraction
    FROM mdl8m_question q
    JOIN mdl8m_question_answers a ON q.id = a.question
    JOIN mdl8m_tag_instance ti ON ti.itemid = q.id 
    WHERE a.fraction >= 0
  `;

  pool.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const questions = {};

      results.forEach((row) => {
        const {
          question_id,
          questiontext,
          question_type,
          answer_id,
          answer,
          fraction,
          tagid,
        } = row;

        if (!questions[question_id]) {
          questions[question_id] = {
            question_id,
            question_text: questiontext,
            question_type,
            answers: [],
            correct_answer: null,
            tagid:null,
          };
        }

        questions[question_id].answers.push({
          answer_id,
          answer,
        });

        if (fraction === 1) {
          questions[question_id].tagid = tagid;
          questions[question_id].correct_answer = answer_id;
        }
      });

      const questionList = Object.values(questions);

      // Randomly select 100 questions
      const randomQuestions = questionList
        .sort(() => Math.random() - 0.5)
        .slice(0, 100);

      // Create an array of question IDs
      const questionIDs = randomQuestions.map(
        (question) => question.question_id
      );

      res.json({ randomQuestions, questionIDs });
    }
  });
});

// API TO FETCH RANDOM QUESTIONS BY USER INPUT

app.get(
  "/api/questions/:numQuestions",
  authenticationMiddleware,
  (req, res) => {
    const numQuestions = parseInt(req.params.numQuestions);

    if (numQuestions <= 100) {
      const query = `
      SELECT q.id AS question_id, q.questiontext, q.qtype AS question_type,
      a.id AS answer_id, a.answer, a.fraction
      FROM mdl8m_question q
      JOIN mdl8m_question_answers a ON q.id = a.question
      WHERE a.fraction >= 0
    `;

      pool.query(query, (error, results) => {
        if (error) {
          console.error("Error fetching questions:", error);
          res.status(500).json({ error: "Internal server error" });
        } else {
          const questions = {};

          results.forEach((row) => {
            const {
              question_id,
              questiontext,
              question_type,
              answer_id,
              answer,
              fraction,
            } = row;

            if (!questions[question_id]) {
              questions[question_id] = {
                question_id,
                question_text: questiontext,
                question_type,
                answers: [],
                correct_answer: null,
              };
            }

            questions[question_id].answers.push({
              answer_id,
              answer,
            });

            if (fraction === 1) {
              questions[question_id].correct_answer = answer_id;
            }
          });

          const questionList = Object.values(questions);
          const randomQuestions = questionList
            .sort(() => Math.random() - 0.5)
            .slice(0, numQuestions);

          res.json(randomQuestions);
        }
      });
    } else {
      res.status(400).json({
        error: "Number of questions must be less than or equal to 100",
      });
    }
  }
);

// 100 QUESTION PAGINATION

app.get("/api/questions/100", authenticationMiddleware, (req, res) => {
  const { page } = req.query;
  const limit = 150;
  const offset = (page - 1) * limit;

  const query = `
    SELECT q.id AS question_id, q.questiontext, q.qtype AS question_type,
    a.id AS answer_id, a.answer, a.fraction
    FROM mdl8m_question q
    JOIN mdl8m_question_answers a ON q.id = a.question
    WHERE a.fraction >= 0
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  pool.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const questions = {};

      results.forEach((row) => {
        const {
          question_id,
          questiontext,
          question_type,
          answer_id,
          answer,
          fraction,
        } = row;

        if (!questions[question_id]) {
          questions[question_id] = {
            question_id,
            question_text: questiontext,
            question_type,
            answers: [],
            correct_answer: null,
          };
        }

        questions[question_id].answers.push({
          answer_id,
          answer,
        });

        if (fraction === 1) {
          questions[question_id].correct_answer = answer_id;
        }
      });

      const questionList = Object.values(questions);

      res.json(questionList);
    }
  });
});

// FILTER API VERSION 3
app.get("/categories/filter3", authenticationMiddleware, (req, res) => {
  
  const query = `
    SELECT id, name, parent
    FROM mdl8m_question_categories
    ORDER BY parent`;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      res.status(500).json({ error: "Error executing MySQL query: ", err });
      return;
    }

    // Map categories by their parent ID
    const categoryMap = {};
    results.forEach((category) => {
      const parentId = category.parent;
      if (!categoryMap[parentId]) {
        categoryMap[parentId] = [];
      }
      categoryMap[parentId].push(category);
    });

    // Build the category hierarchy
    const buildHierarchy = (categories, parentId) => {
      // Sort categories by name
      categories.sort((a, b) => a.name.localeCompare(b.name));

      categories.forEach((category) => {
        const children = categoryMap[category.id];
        if (children) {
          category.children = children;
          buildHierarchy(children, category.id);
        }
      });
    };

    const rootCategories = categoryMap[0] || [];
    buildHierarchy(rootCategories, 0);

    res.json(rootCategories);
    console.log(rootCategories);
  });
});

// API TO GET THE QUESTIONS INSIDE BOOK CHAPTER AND ARTICLE VERSION 2
app.get(
  "/api/article/category/:categoryId/:name",
  authenticationMiddleware,
  (req, res) => {
    const categoryId = req.params.categoryId;
    const name = req.params.name;

    let query;
    if (!name.startsWith("article")) {
      query = `
      WITH RECURSIVE category_hierarchy AS (
          SELECT id FROM mdl8m_question_categories WHERE id = ?
          UNION ALL
          SELECT c.id FROM mdl8m_question_categories c
          JOIN category_hierarchy h ON c.parent = h.id
      )
      SELECT q.id AS question_id, q.name AS questionName, q.questiontext AS question_text, q.qtype AS question_type,
      a.id AS answer_id, a.answer, a.fraction
      FROM mdl8m_question_bank_entries mqbe
      INNER JOIN mdl8m_question_versions mqv ON mqbe.id = mqv.questionbankentryid
      INNER JOIN mdl8m_question q ON q.id = mqv.questionid
      INNER JOIN mdl8m_question_categories mqc ON mqc.id = mqbe.questioncategoryid
      LEFT JOIN mdl8m_question_answers a ON a.question = q.id
      WHERE mqc.id IN (SELECT id FROM category_hierarchy) AND q.qtype = 'multichoice'`;
    } else if (name.startsWith("article")) {
      query = `
      SELECT q.id AS question_id,q.name AS questionName , q.questiontext AS question_text, q.qtype AS question_type,
      a.id AS answer_id, a.answer, a.fraction
      FROM mdl8m_question_bank_entries AS mqbe
      INNER JOIN mdl8m_question_versions AS mqv ON mqbe.id = mqv.questionbankentryid
      INNER JOIN mdl8m_question AS q ON q.id = mqv.questionid
      INNER JOIN mdl8m_question_categories AS mqc ON mqc.id = mqbe.questioncategoryid
      LEFT JOIN mdl8m_question_answers AS a ON a.question = q.id 
      WHERE mqc.id = ? AND q.qtype = 'multichoice'
      ORDER BY questioncategoryid ASC
    `;
    }
    console.error("query:", query, categoryId, name);
    pool.query(query, [categoryId], (error, results) => {
      if (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ error: "Internal server error"+ query });
      } else {
        const questions = {};

        results.forEach((row) => {
          const {
            question_id,
            questionName,
            question_text,
            question_type,
            answer_id,
            answer,
            fraction,
            
          } = row;

          if (!questions[question_id]) {
            questions[question_id] = {
              question_id,
              questionName,
              question_text,
              question_type,
              answers: [],
              correct_answer: null,
            
            };
          }

          if (answer_id && answer) {
            questions[question_id].answers.push({
              answer_id,
              answer,
            });
          }

          if (fraction === 1) {
            questions[question_id].correct_answer = answer_id;
           // questions[question_id].tagid = tagid;
          }
        });

        const questionList = Object.values(questions);

        res.json(questionList);
      }
    });
  }
);

//API TO GET THE SOLUTION SET OF THE SELECTED QUESTIONS
app.get("/api/generalfeedback", authenticationMiddleware, (req, res) => {
  console.log("request", req);

  const questionIdsString = req.query.ids;

  if (!questionIdsString) {
    return res.status(400).json({ error: "Missing question IDs" });
  }

  const questionIds = questionIdsString
    .split(",")
    .map((id) => parseInt(id, 10));
  console.log("Question Id-", questionIds);

  const responses = {}; // Use an object to store responses with their question IDs

  questionIds.forEach((id) => {
    const query = `
      SELECT questiontext, generalfeedback
      FROM mdl8m_question
      WHERE id = ?
    `;

    pool.query(query, [id], (error, results) => {
      if (error) {
        console.error(`Error fetching data for question ID ${id}:`, error);
        responses[id] = {
          question_text: null,
          general_feedback: null,
        };
      } else {
        if (results.length > 0) {
          const { questiontext, generalfeedback } = results[0];
          responses[id] = {
            question_text: questiontext,
            general_feedback: generalfeedback,
          };
        } else {
          responses[id] = {
            question_text: null,
            general_feedback: null,
          };
        }
      }

      // Check if all queries have been executed
      if (Object.keys(responses).length === questionIds.length) {
        // Convert responses object to an ordered array
        const orderedResponses = questionIds.map((id) => responses[id]);
        res.json(orderedResponses);
      }
    });
  });
});

//API TO FETCH THE QUESTIONS ACCORDING TO EASY MEDIUM HARD TAGS
app.get("/api/tags", (req, res) => {
  // Fixed tag ID
  const tagname = req.query.tag;
  console.log(tagname);
  if (tagname == "easy") {
    var tagId = 10;
    console.log("tagid", tagId);
  } else if (tagname == "medium") {
    var tagId = 14;
    console.log("tagid", tagId);
  } else if (tagname == "hard") {
    var tagId = 17;
    console.log("tagid", tagId);
  } else {
    console.log("tag id cannot be set as tagname is not available");
  }

  // Construct the SQL query
  const query = `
    SELECT q.id AS question_id, q.questiontext AS question_text
    FROM mdl8m_question q
    JOIN mdl8m_tag_instance ti ON ti.itemid = q.id 
    WHERE ti.tagid = ?;
  `;
console.log('tag query', query);
  // Execute the SQL query with the fixed tag ID
  pool.query(query, [tagId], (error, results) => {
    console.log('tag query 1', query);
    if (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(results);
    }
  });
});

//API TO CHECK IF ANY SAVED QUIZ EXISTS OR NOT
app.get("/api/checksavedquiz", authenticationMiddleware, (req, res) => {
  const username = req.query.name;

  const query = "SELECT * FROM savedquiz WHERE username = ?";
  pool.query(query, [username], (err, result) => {
    if (err) {
      console.error("Error retrieving quizzes:", err);
      res.status(500).json({ error: "Failed to retrieve quizzes" });
      return;
    }
    res.status(200).json({ result: result.length, success: true });
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

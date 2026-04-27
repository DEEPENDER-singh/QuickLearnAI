const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Step 1: Initialize Express server and basic setup

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

const courses = [
  "Java",
  "Python",
  "C",
  "C++",
  "JavaScript",
  "SQL",
  "Data Structures & Algorithms"
];

const topicQuestions = [
  {
    topic: "syntax",
    question: "Which option is most important for writing correct code syntax?",
    options: ["Correct keywords and symbols", "Random spacing only", "Long file names", "Internet speed"],
    correctAnswer: "Correct keywords and symbols"
  },
  {
    topic: "loops",
    question: "What is the main use of a loop?",
    options: ["Repeat code", "Delete code", "Change laptop speed", "Create a password"],
    correctAnswer: "Repeat code"
  },
  {
    topic: "functions",
    question: "Why do programmers use functions?",
    options: ["To reuse code", "To hide the screen", "To remove variables", "To stop typing forever"],
    correctAnswer: "To reuse code"
  },
  {
    topic: "arrays",
    question: "What does an array usually store?",
    options: ["Multiple values", "Only one password", "Only images", "Only database tables"],
    correctAnswer: "Multiple values"
  },
  {
    topic: "OOP concepts",
    question: "In OOP, what is an object?",
    options: ["An instance of a class", "A loop type", "A database command", "A keyboard shortcut"],
    correctAnswer: "An instance of a class"
  },
  {
    topic: "syntax",
    question: "What should you check first when code gives a syntax error?",
    options: ["Spelling, brackets, and punctuation", "Monitor brightness", "Wi-Fi password", "Folder color"],
    correctAnswer: "Spelling, brackets, and punctuation"
  },
  {
    topic: "loops",
    question: "Which loop idea means the code runs while a condition is true?",
    options: ["while loop", "print loop", "database loop", "style loop"],
    correctAnswer: "while loop"
  },
  {
    topic: "functions",
    question: "What is a parameter?",
    options: ["Input passed to a function", "A type of laptop", "A video link", "A certificate"],
    correctAnswer: "Input passed to a function"
  },
  {
    topic: "arrays",
    question: "Most programming arrays start indexing from which number?",
    options: ["0", "1", "10", "-10"],
    correctAnswer: "0"
  },
  {
    topic: "database concepts",
    question: "Which concept is used to store organized records?",
    options: ["Database", "Button", "Navbar", "Timer"],
    correctAnswer: "Database"
  }
];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

ensureDataFile();

app.get("/api/health", (req, res) => {
  res.json({
    message: "QuickLearn AI API is running",
    storage: "Local JSON file"
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, collegeName, semester } = req.body;

    if (!name || !email || !password || !collegeName || !semester) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const db = readDb();
    const existingStudent = db.students.find((student) => student.email === email);

    if (existingStudent) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const now = new Date().toISOString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = {
      _id: createId(),
      name,
      email,
      password: hashedPassword,
      collegeName,
      semester,
      selectedCourse: "",
      testScore: 0,
      totalQuestions: 10,
      weakPoints: [],
      progress: 0,
      completedLessons: 0,
      pendingLessons: 8,
      certificate: false,
      lastLogin: now,
      createdAt: now
    };

    db.students.push(student);
    writeDb(db);

    res.status(201).json({
      message: "Registration successful",
      student: publicStudent(student)
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDb();
    const student = db.students.find((item) => item.email === email);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    student.lastLogin = new Date().toISOString();
    writeDb(db);

    res.json({ message: "Login successful", student: publicStudent(student) });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.get("/api/courses", (req, res) => {
  res.json(courses);
});

app.post("/api/students/:id/course", (req, res) => {
  try {
    const { course } = req.body;

    if (!courses.includes(course)) {
      return res.status(400).json({ message: "Invalid course selected" });
    }

    const db = readDb();
    const student = findStudent(db, req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.selectedCourse = course;
    writeDb(db);

    res.json({ message: "Course selected", student: publicStudent(student) });
  } catch (error) {
    res.status(500).json({ message: "Could not select course", error: error.message });
  }
});

app.get("/api/questions/:course", (req, res) => {
  const questions = getQuestions(req.params.course).map((question) => ({
    _id: question._id,
    course: question.course,
    question: question.question,
    options: question.options,
    topic: question.topic
  }));

  res.json(questions);
});

app.post("/api/submit-test", (req, res) => {
  try {
    const { studentId, course, answers } = req.body;
    const questions = getQuestions(course);

    let score = 0;
    const weakTopics = [];

    questions.forEach((question) => {
      const selectedAnswer = answers[question._id];

      if (selectedAnswer === question.correctAnswer) {
        score += 1;
      } else if (!weakTopics.includes(question.topic)) {
        weakTopics.push(question.topic);
      }
    });

    const db = readDb();
    const student = findStudent(db, studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const progress = Math.round((score / questions.length) * 100);
    student.selectedCourse = course;
    student.testScore = score;
    student.totalQuestions = questions.length;
    student.weakPoints = weakTopics;
    student.progress = progress;
    student.completedLessons = score >= 7 ? 6 : 2;
    student.pendingLessons = score >= 7 ? 2 : 6;
    student.certificate = progress === 100;

    writeDb(db);

    res.json({
      score,
      totalQuestions: questions.length,
      weakPoints: weakTopics,
      level: score >= 7 ? "GOOD" : "LOW",
      student: publicStudent(student)
    });
  } catch (error) {
    res.status(500).json({ message: "Test submit failed", error: error.message });
  }
});

app.get("/api/learning-path/:studentId", (req, res) => {
  try {
    const db = readDb();
    const student = findStudent(db, req.params.studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const isGoodScore = student.testScore >= 7;
    const mode = isGoodScore ? "fast-track" : "beginner";

    res.json({
      level: isGoodScore ? "GOOD" : "LOW",
      title: isGoodScore ? "Fast-track Learning Mode" : "Beginner Learning Roadmap",
      material: getMaterial(student.selectedCourse, mode),
      weakPoints: student.weakPoints,
      feedback: buildFeedback(student.weakPoints)
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load learning path", error: error.message });
  }
});

app.get("/api/students/:id", (req, res) => {
  try {
    const db = readDb();
    const student = findStudent(db, req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(publicStudent(student));
  } catch (error) {
    res.status(500).json({ message: "Could not load student", error: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

startServer(Number(PORT));

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`QuickLearn AI is running on http://localhost:${port}`);
    console.log("Storage: backend/data/db.json");
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < Number(PORT) + 10) {
      console.log(`Port ${port} is busy. Trying port ${port + 1}...`);
      startServer(port + 1);
      return;
    }

    throw error;
  });
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    writeDb({ students: [] });
  }
}

function readDb() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDb(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function createId() {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

function findStudent(db, studentId) {
  return db.students.find((student) => student._id === studentId);
}

function publicStudent(student) {
  return {
    _id: student._id,
    name: student.name,
    email: student.email,
    collegeName: student.collegeName,
    semester: student.semester,
    selectedCourse: student.selectedCourse,
    testScore: student.testScore,
    totalQuestions: student.totalQuestions,
    weakPoints: student.weakPoints,
    progress: student.progress,
    completedLessons: student.completedLessons,
    pendingLessons: student.pendingLessons,
    certificate: student.certificate,
    lastLogin: student.lastLogin,
    createdAt: student.createdAt
  };
}

function getQuestions(course) {
  return topicQuestions.map((question, index) => ({
    ...question,
    _id: `${course}-${index + 1}`,
    course,
    question: `${course}: ${question.question}`
  }));
}

function getMaterial(course, mode) {
  const isFastTrack = mode === "fast-track";

  return {
    course,
    mode,
    videoTitle: isFastTrack
      ? `${course} Quick Revision Lecture`
      : `${course} Complete Beginner Lecture`,
    videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
    studyMaterial: isFastTrack
      ? "Quick notes: revise syntax, solve 5 practice problems, review common mistakes, and build one mini example."
      : "Beginner roadmap: learn basics, practice syntax, understand loops, functions, arrays, and revise weak topics daily."
  };
}

function buildFeedback(weakPoints) {
  if (!weakPoints || weakPoints.length === 0) {
    return "Great work! Keep practicing with quizzes and small projects.";
  }

  return `You need more practice in ${weakPoints.join(" and ")}.`;
}

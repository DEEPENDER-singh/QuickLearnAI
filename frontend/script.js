console.log("QuickLearn AI loaded");
const api = "";

const appState = {
  student: JSON.parse(localStorage.getItem("quicklearnStudent")) || null,
  courses: [],
  selectedCourse: "",
  questions: [],
  currentQuestion: 0,
  answers: {},
  timerSeconds: 15 * 60,
  timerId: null
};

const pages = document.querySelectorAll(".page");
const navMenu = document.getElementById("navMenu");
const loader = document.getElementById("loader");
const toast = document.getElementById("toast");

document.addEventListener("DOMContentLoaded", async () => {
  attachEvents();
  await loadCourses();
  showPage("home");
});

function attachEvents() {
  console.log("Attaching frontend events");
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.getElementById("menuToggle").addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });

  document.getElementById("registerForm").addEventListener("submit", registerStudent);
  document.getElementById("loginForm").addEventListener("submit", loginStudent);
  document.getElementById("nextQuestionBtn").addEventListener("click", nextQuestion);
  document.getElementById("submitTestBtn").addEventListener("click", submitTest);
}

async function loadCourses() {
  const courses = await request("/api/courses");
  appState.courses = courses;
  renderCourses();
}

function showPage(pageId) {
  console.log("Switching to page:", pageId);
  pages.forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  navMenu.classList.remove("open");

  if (pageId === "dashboard") loadDashboard();
}

function renderCourses() {
  console.log("Rendering courses");
  const courseGrid = document.getElementById("courseGrid");
  courseGrid.innerHTML = "";

  appState.courses.forEach((course) => {
    const card = document.createElement("button");
    card.className = "course-card";
    card.innerHTML = `<strong>${course}</strong><span>Start assessment and get a custom path.</span>`;
    card.addEventListener("click", () => selectCourse(course));
    courseGrid.appendChild(card);
  });
}

async function registerStudent(event) {
  event.preventDefault();

  const body = {
    name: document.getElementById("regName").value,
    email: document.getElementById("regEmail").value,
    password: document.getElementById("regPassword").value,
    collegeName: document.getElementById("regCollege").value,
    semester: document.getElementById("regSemester").value
  };

  const data = await request("/api/register", "POST", body);
  saveStudent(data.student);
  showToast("Registration successful. Select your course.");
  showPage("courses");
}

async function loginStudent(event) {
  console.log("Student login started");
  event.preventDefault();

  const body = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };

  const data = await request("/api/login", "POST", body);
  saveStudent(data.student);
  showToast("Login successful.");
  showPage(data.student.selectedCourse ? "dashboard" : "courses");
}

async function selectCourse(course) {
  if (!appState.student) {
    showToast("Please register or login first.");
    showPage("register");
    return;
  }

  appState.selectedCourse = course;
  const data = await request(`/api/students/${appState.student._id}/course`, "POST", {
    course
  });

  saveStudent(data.student);
  await startTest(course);
}

async function startTest(course) {
  appState.questions = await request(`/api/questions/${encodeURIComponent(course)}`);
  appState.currentQuestion = 0;
  appState.answers = {};
  appState.timerSeconds = 15 * 60;

  document.getElementById("testCourseTitle").textContent = `${course} Test`;
  showPage("test");
  renderQuestion();
  startTimer();
}

function renderQuestion() {
  const question = appState.questions[appState.currentQuestion];
  const questionNumber = appState.currentQuestion + 1;
  const progress = (questionNumber / appState.questions.length) * 100;

  document.getElementById("questionCounter").textContent = `Question ${questionNumber} of ${appState.questions.length}`;
  document.getElementById("questionText").textContent = question.question;
  document.getElementById("testProgress").style.width = `${progress}%`;

  const optionsBox = document.getElementById("optionsBox");
  optionsBox.innerHTML = "";

  question.options.forEach((option) => {
    const optionButton = document.createElement("button");
    optionButton.className = "option-btn";
    optionButton.textContent = option;

    if (appState.answers[question._id] === option) {
      optionButton.classList.add("selected");
    }

    optionButton.addEventListener("click", () => {
      appState.answers[question._id] = option;
      renderQuestion();
    });

    optionsBox.appendChild(optionButton);
  });

  document.getElementById("nextQuestionBtn").style.display =
    questionNumber === appState.questions.length ? "none" : "inline-block";
}

function nextQuestion() {
  if (appState.currentQuestion < appState.questions.length - 1) {
    appState.currentQuestion += 1;
    renderQuestion();
  }
}

function startTimer() {
  clearInterval(appState.timerId);
  updateTimerText();

  appState.timerId = setInterval(() => {
    appState.timerSeconds -= 1;
    updateTimerText();

    if (appState.timerSeconds <= 0) {
      clearInterval(appState.timerId);
      submitTest();
    }
  }, 1000);
}

function updateTimerText() {
  const minutes = Math.floor(appState.timerSeconds / 60);
  const seconds = appState.timerSeconds % 60;
  document.getElementById("timer").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function submitTest() {
  clearInterval(appState.timerId);

  const data = await request("/api/submit-test", "POST", {
    studentId: appState.student._id,
    course: appState.selectedCourse || appState.student.selectedCourse,
    answers: appState.answers
  });

  saveStudent(data.student);
  showToast(`Test submitted. Score: ${data.score}/${data.totalQuestions}`);
  await loadLearningPath();
}

async function loadLearningPath() {
  const pathData = await request(`/api/learning-path/${appState.student._id}`);
  const material = pathData.material || {};
  const details =
    pathData.level === "GOOD"
      ? ["Short video lecture", "Quick notes", "Practice quiz", "Fast-track mode"]
      : ["Full lecture video", "Complete study material", "Beginner roadmap", "Weak topic analysis"];

  document.getElementById("learningTitle").textContent = pathData.title;
  document.getElementById("learningVideo").src = material.videoUrl || "";
  document.getElementById("materialTitle").textContent = material.videoTitle || "Learning Material";
  document.getElementById("materialText").textContent = material.studyMaterial || "";
  document.getElementById("feedbackBox").textContent = pathData.feedback;

  const detailsBox = document.getElementById("learningDetails");
  detailsBox.innerHTML = "";
  details.forEach((item) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item;
    detailsBox.appendChild(tag);
  });

  showPage("learning");
}

async function loadDashboard() {
  const dashboard = document.getElementById("dashboardContent");

  if (!appState.student) {
    dashboard.innerHTML = `<div class="dashboard-card full"><strong>Please login or register first.</strong></div>`;
    return;
  }

  const student = await request(`/api/students/${appState.student._id}`);
  saveStudent(student);

  const weakPoints =
    student.weakPoints && student.weakPoints.length
      ? student.weakPoints.join(", ")
      : "No major weak points detected";

  dashboard.innerHTML = `
    <div class="dashboard-card"><span>Name</span><strong>${student.name}</strong></div>
    <div class="dashboard-card"><span>Selected Course</span><strong>${student.selectedCourse || "Not selected"}</strong></div>
    <div class="dashboard-card"><span>Test Score</span><strong>${student.testScore}/${student.totalQuestions}</strong></div>
    <div class="dashboard-card"><span>Completed Lessons</span><strong>${student.completedLessons}</strong></div>
    <div class="dashboard-card"><span>Pending Lessons</span><strong>${student.pendingLessons}</strong></div>
    <div class="dashboard-card"><span>Last Login</span><strong>${formatDate(student.lastLogin)}</strong></div>
    <div class="dashboard-card full">
      <div class="progress-label"><span>Progress</span><strong>${student.progress}%</strong></div>
      <div class="progress-track"><div class="progress-fill" style="width:${student.progress}%"></div></div>
    </div>
    <div class="dashboard-card full"><span>Weak Points</span><strong>${weakPoints}</strong></div>
    <div class="dashboard-card full"><span>Certificate</span><strong>${student.certificate ? "Certificate unlocked" : "Complete the course to unlock certificate"}</strong></div>
  `;
}

async function request(url, method = "GET", body = null) {
  try {
    showLoader(true);
    const options = {
      method,
      headers: { "Content-Type": "application/json" }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(api + url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  } catch (error) {
    showToast(error.message);
    throw error;
  } finally {
    showLoader(false);
  }
}

function saveStudent(student) {
  appState.student = student;
  localStorage.setItem("quicklearnStudent", JSON.stringify(student));
}

function showLoader(isVisible) {
  loader.classList.toggle("hidden", !isVisible);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleString();
}

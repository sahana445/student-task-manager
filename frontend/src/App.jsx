import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [showRegister, setShowRegister] = useState(false);

  const [auth, setAuth] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [task, setTask] = useState({
    title: "",
    subject: "",
    deadline: "",
    priority: "Medium",
  });

  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [sortOrder, setSortOrder] = useState("none");

  const token = localStorage.getItem("token");

  // =========================
  // AUTHENTICATION
  // =========================

  const handleAuthChange = (e) => {
    setAuth({
      ...auth,
      [e.target.name]: e.target.value,
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    setAuthError("");
    setAuthMessage("");

    try {
      const url = showRegister
        ? `${API}/api/auth/register`
        : `${API}/api/auth/login`;

      const body = showRegister
        ? auth
        : {
            email: auth.email,
            password: auth.password,
          };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Server returned an invalid response."
        );
      }

      if (!response.ok) {
        setAuthError(data.message || "Something went wrong");
        return;
      }

      if (showRegister) {
        setAuthMessage(
          "Registration successful! Please login."
        );

        setShowRegister(false);

        setAuth({
          name: "",
          email: auth.email,
          password: "",
        });
      } else {
        localStorage.setItem("token", data.token);

        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("AUTH ERROR:", error);
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsLoggedIn(false);
    setTasks([]);
  };

  // =========================
  // FETCH TASKS
  // =========================

  const fetchTasks = async () => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) return;

    try {
      const response = await fetch(`${API}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        handleLogout();
        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchTasks();
    }
  }, [isLoggedIn]);

  // =========================
  // TASK FORM
  // =========================

  const handleChange = (e) => {
    setTask({
      ...task,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingId
        ? `${API}/api/tasks/${editingId}`
        : `${API}/api/tasks`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(task),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      alert(error.message);
    }
  };

  const resetForm = () => {
    setTask({
      title: "",
      subject: "",
      deadline: "",
      priority: "Medium",
    });

    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
  setTask({
    title: item.title || "",
    subject: item.subject || "",
    deadline: item.deadline || "",
    priority: item.priority || "Medium",
  });

  setEditingId(item._id);
  setShowForm(true);
};

  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `${API}/api/tasks/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleComplete = async (item) => {
    try {
      const response = await fetch(
        `${API}/api/tasks/${item._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: item.title,
            subject: item.subject,
            deadline: item.deadline,
            priority: item.priority,
            status: "Completed",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      fetchTasks();
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  // =========================
  // DEADLINE STATUS
  // =========================

  const getDeadlineStatus = (item) => {
    if (item.status === "Completed") {
      return "Completed";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const deadline = new Date(item.deadline);

    deadline.setHours(0, 0, 0, 0);

    const difference =
      (deadline - today) /
      (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return "Overdue";
    }

    if (difference <= 2) {
      return "Due Soon";
    }

    return "Upcoming";
  };

  // =========================
  // FILTERS
  // =========================

  const subjects = [
    ...new Set(
      tasks
        .map((item) => item.subject)
        .filter(Boolean)
    ),
  ];

  let filteredTasks = tasks.filter((item) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      item.title.toLowerCase().includes(search) ||
      item.subject.toLowerCase().includes(search);

    const matchesPriority =
      priorityFilter === "All" ||
      item.priority === priorityFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Pending"
        ? item.status !== "Completed"
        : item.status === "Completed");

    const matchesSubject =
      subjectFilter === "All" ||
      item.subject === subjectFilter;

    return (
      matchesSearch &&
      matchesPriority &&
      matchesStatus &&
      matchesSubject
    );
  });

  if (sortOrder === "ascending") {
    filteredTasks = [...filteredTasks].sort(
      (a, b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    );
  }

  if (sortOrder === "descending") {
    filteredTasks = [...filteredTasks].sort(
      (a, b) =>
        new Date(b.deadline) -
        new Date(a.deadline)
    );
  }

  // =========================
  // ANALYTICS
  // =========================

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (item) => item.status === "Completed"
  ).length;

  const pendingTasks =
    totalTasks - completedTasks;

  const overdueTasks = tasks.filter(
    (item) =>
      getDeadlineStatus(item) === "Overdue"
  ).length;

  const completionPercentage =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  const upcomingTasks = tasks
    .filter(
      (item) =>
        item.status !== "Completed" &&
        getDeadlineStatus(item) === "Upcoming"
    )
    .sort(
      (a, b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    )
    .slice(0, 5);

  const dueSoonTasks = tasks
    .filter(
      (item) =>
        item.status !== "Completed" &&
        getDeadlineStatus(item) === "Due Soon"
    )
    .sort(
      (a, b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    );

  const overdueTasksList = tasks
    .filter(
      (item) =>
        item.status !== "Completed" &&
        getDeadlineStatus(item) === "Overdue"
    )
    .sort(
      (a, b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    );

  // =========================
  // LOGIN / REGISTER PAGE
  // =========================

  if (!isLoggedIn) {
    return (
      <div className="auth-page">

        <div className="auth-card">

          <div className="auth-logo">
            📚
          </div>

          <h1>
            Student Task Manager
          </h1>

          <p className="auth-subtitle">
            {showRegister
              ? "Create your account"
              : "Welcome back! Login to continue"}
          </p>

          {authError && (
            <div className="auth-error">
              ⚠️ {authError}
            </div>
          )}

          {authMessage && (
            <div className="auth-success">
              ✓ {authMessage}
            </div>
          )}

          <form onSubmit={handleAuth}>

            {showRegister && (
              <div className="auth-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={auth.name}
                  onChange={handleAuthChange}
                  required
                />

              </div>
            )}

            <div className="auth-group">

              <label>
                Email
              </label>

              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={auth.email}
                onChange={handleAuthChange}
                required
              />

            </div>

            <div className="auth-group">

              <label>
                Password
              </label>

              <input
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={auth.password}
                onChange={handleAuthChange}
                required
                minLength="6"
              />

            </div>

            <button
              type="submit"
              className="auth-button"
            >
              {showRegister
                ? "Create Account"
                : "Login"}
            </button>

          </form>

          <div className="auth-switch">

            {showRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() => {
                setShowRegister(!showRegister);
                setAuthError("");
                setAuthMessage("");
              }}
            >
              {showRegister
                ? " Login"
                : " Register"}
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =========================
  // DASHBOARD
  // =========================

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  return (
    <div className="app">

      <div className="container">

        <div className="header">

          <div className="logo-section">

            <h1>
              📚 Student Task Manager
            </h1>

            <p>
              Welcome back,{" "}
              {user.name || "Student"}!
            </p>

          </div>

          <div className="header-actions">

            <button
              className="add-button"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
              }}
            >
              + Add New Task
            </button>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </div>

        {/* STATISTICS */}

        <div className="stats">

          <div className="stat-card">
            <h3>{totalTasks}</h3>
            <p>Total Tasks</p>
          </div>

          <div className="stat-card">
            <h3>{pendingTasks}</h3>
            <p>Pending</p>
          </div>

          <div className="stat-card">
            <h3>{completedTasks}</h3>
            <p>Completed</p>
          </div>

          <div className="stat-card">
            <h3>{overdueTasks}</h3>
            <p>Overdue</p>
          </div>

          <div className="stat-card">
            <h3>
              {completionPercentage}%
            </h3>
            <p>Completion</p>
          </div>

        </div>

        {/* PROGRESS */}

        <div className="progress-card">

          <div className="progress-header">

            <div>

              <h3>
                📊 Overall Progress
              </h3>

              <p>
                {completedTasks} of{" "}
                {totalTasks} tasks completed
              </p>

            </div>

            <strong>
              {completionPercentage}%
            </strong>

          </div>

          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width:
                  `${completionPercentage}%`,
              }}
            />

          </div>

        </div>

        {/* DEADLINES */}

        <div className="deadline-grid">

          <DeadlineCard
            title="📅 Upcoming"
            subtitle="Deadlines after 2 days"
            tasks={upcomingTasks}
          />

          <DeadlineCard
            title="⏳ Due Soon"
            subtitle="Due within 2 days"
            tasks={dueSoonTasks}
          />

          <DeadlineCard
            title="⚠️ Overdue"
            subtitle="Past deadlines"
            tasks={overdueTasksList}
          />

        </div>

        {/* FORM */}

        {showForm && (
          <div className="form-container">

            <h2>
              {editingId
                ? "Edit Task"
                : "Add New Task"}
            </h2>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Task Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. DBMS Assignment"
                    value={task.title}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    placeholder="e.g. Database Management"
                    value={task.subject}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Deadline
                  </label>

                  <input
                    type="date"
                    name="deadline"
                    value={task.deadline}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={task.priority}
                    onChange={handleChange}
                  >

                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>

                  </select>

                </div>

              </div>

              <div className="form-buttons">

                <button
                  type="submit"
                  className="submit-btn"
                >
                  {editingId
                    ? "Update Task"
                    : "Add Task"}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        )}

        {/* SEARCH / FILTER */}

        <div className="controls">

          <div className="search-box">

            <input
              type="text"
              placeholder="🔍 Search tasks or subjects..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

          </div>

          <div className="filter">

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value)
              }
            >

              <option value="All">
                All Priorities
              </option>

              <option value="High">
                High Priority
              </option>

              <option value="Medium">
                Medium Priority
              </option>

              <option value="Low">
                Low Priority
              </option>

            </select>

          </div>

          <div className="filter">

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >

              <option value="All">
                All Status
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Completed">
                Completed
              </option>

            </select>

          </div>

          <div className="filter">

            <select
              value={subjectFilter}
              onChange={(e) =>
                setSubjectFilter(e.target.value)
              }
            >

              <option value="All">
                All Subjects
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>
              ))}

            </select>

          </div>

          <div className="filter">

            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value)
              }
            >

              <option value="none">
                Sort by Deadline
              </option>

              <option value="ascending">
                Earliest First
              </option>

              <option value="descending">
                Latest First
              </option>

            </select>

          </div>

        </div>

        {/* TASK LIST */}

        <div className="task-list">

          {filteredTasks.length === 0 ? (

            <div className="empty">

              <h3>
                No tasks found
              </h3>

              <p>
                Add a new task to get started.
              </p>

            </div>

          ) : (

            filteredTasks.map((item) => {

              const deadlineStatus =
                getDeadlineStatus(item);

              return (
                <div
                  className="task-card"
                  key={item._id}
                >

                  <div className="task-header">

                    <div>

                      <h3>
                        {item.title}
                      </h3>

                      <p className="subject">
                        {item.subject}
                      </p>

                    </div>

                    <div className="badges">

                      <span
                        className={
                          `badge ${item.priority.toLowerCase()}`
                        }
                      >
                        {item.priority}
                      </span>

                      <span
                        className={
                          `badge ${
                            item.status ===
                            "Completed"
                              ? "completed"
                              : "pending"
                          }`
                        }
                      >
                        {item.status ||
                          "Pending"}
                      </span>

                    </div>

                  </div>

                  <div className="task-info">

                    <span>
                      📅 {item.deadline}
                    </span>

                    <span
                      className={
                        deadlineStatus ===
                        "Overdue"
                          ? "overdue"
                          : deadlineStatus ===
                            "Due Soon"
                          ? "due-soon"
                          : deadlineStatus ===
                            "Upcoming"
                          ? "upcoming"
                          : ""
                      }
                    >

                      {deadlineStatus ===
                        "Overdue" &&
                        "⚠️ "}

                      {deadlineStatus ===
                        "Due Soon" &&
                        "⏳ "}

                      {deadlineStatus ===
                        "Upcoming" &&
                        "🟢 "}

                      {deadlineStatus}

                    </span>

                  </div>

                  <div className="task-actions">

                    {item.status !==
                      "Completed" && (

                      <button
                        className="complete-btn"
                        onClick={() =>
                          handleComplete(item)
                        }
                      >
                        ✓ Complete
                      </button>

                    )}

                    <button
                      className="edit-btn"
                      onClick={() =>
                        handleEdit(item)
                      }
                    >
                      ✏ Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        handleDelete(item._id)
                      }
                    >
                      🗑 Delete
                    </button>

                  </div>

                </div>
              );
            })

          )}

        </div>

      </div>

    </div>
  );
}


// =========================
// DEADLINE CARD
// =========================

function DeadlineCard({
  title,
  subtitle,
  tasks,
}) {
  return (
    <div className="deadline-card">

      <div className="deadline-card-header">

        <div>

          <h2>{title}</h2>

          <p>{subtitle}</p>

        </div>

        <span className="deadline-number">
          {tasks.length}
        </span>

      </div>

      {tasks.length === 0 ? (

        <div className="deadline-empty">
          No tasks
        </div>

      ) : (

        tasks.map((item) => (

          <div
            className="deadline-item"
            key={item._id}
          >

            <div>

              <h3>{item.title}</h3>

              <p>{item.subject}</p>

            </div>

            <span>
              📅 {item.deadline}
            </span>

          </div>

        ))

      )}

    </div>
  );
}

export default App;
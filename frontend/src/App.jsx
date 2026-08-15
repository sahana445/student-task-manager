import { useEffect, useState } from "react";
import "./App.css";

function App() {
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
  const [showForm, setShowForm] = useState(false);

  // Get tasks
  const fetchTasks = () => {
    fetch("http://localhost:5000/api/tasks")
      .then((response) => response.json())
      .then((data) => {
        setTasks(data);
      })
      .catch((error) => {
        console.error("Error fetching tasks:", error);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle form input
  const handleChange = (e) => {
    setTask({
      ...task,
      [e.target.name]: e.target.value,
    });
  };

  // Add or update task
  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingId) {
      fetch(`http://localhost:5000/api/tasks/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      })
        .then((response) => response.json())
        .then(() => {
          resetForm();
          fetchTasks();
        })
        .catch((error) => {
          console.error("Error updating task:", error);
        });
    } else {
      fetch("http://localhost:5000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      })
        .then((response) => response.json())
        .then(() => {
          resetForm();
          fetchTasks();
        })
        .catch((error) => {
          console.error("Error adding task:", error);
        });
    }
  };

  // Reset form
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

  // Edit task
  const handleEdit = (item) => {
    setTask({
      title: item.title,
      subject: item.subject,
      deadline: item.deadline,
      priority: item.priority,
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  // Delete task
  const handleDelete = (id) => {
    fetch(`http://localhost:5000/api/tasks/${id}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then(() => {
        fetchTasks();
      })
      .catch((error) => {
        console.error("Error deleting task:", error);
      });
  };

  // Mark completed
  const handleComplete = (item) => {
    fetch(`http://localhost:5000/api/tasks/${item._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: item.title,
        subject: item.subject,
        deadline: item.deadline,
        priority: item.priority,
        status: "Completed",
      }),
    })
      .then((response) => response.json())
      .then(() => {
        fetchTasks();
      })
      .catch((error) => {
        console.error("Error completing task:", error);
      });
  };

  // Deadline status
  const getDeadlineStatus = (item) => {
    if (item.status === "Completed") {
      return "Completed";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(item.deadline);
    deadline.setHours(0, 0, 0, 0);

    const difference =
      (deadline - today) / (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return "Overdue";
    }

    if (difference <= 2) {
      return "Due Soon";
    }

    return "Upcoming";
  };

  // Search + filter
  const filteredTasks = tasks.filter((item) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      item.title.toLowerCase().includes(search) ||
      item.subject.toLowerCase().includes(search);

    const matchesPriority =
      priorityFilter === "All" ||
      item.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // Statistics
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (item) => item.status === "Completed"
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  const overdueTasks = tasks.filter(
    (item) => getDeadlineStatus(item) === "Overdue"
  ).length;

  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <div className="header">
          <div className="logo-section">
            <h1>📚 Student Task Manager</h1>
            <p>Stay organized and never miss an assignment.</p>
          </div>

          <button
            className="add-button"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
            }}
          >
            + Add New Task
          </button>
        </div>

        {/* Statistics */}
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

        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="form-container">

            <h2>
              {editingId ? "Edit Task" : "Add New Task"}
            </h2>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <div className="form-group">
                  <label>Task Title</label>

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
                  <label>Subject</label>

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
                  <label>Deadline</label>

                  <input
                    type="date"
                    name="deadline"
                    value={task.deadline}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Priority</label>

                  <select
                    name="priority"
                    value={task.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

              </div>

              <div className="form-buttons">

                <button
                  type="submit"
                  className="submit-btn"
                >
                  {editingId ? "Update Task" : "Add Task"}
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

        {/* Search and Filter */}
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
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

        </div>

        {/* Task List */}
        <div className="task-list">

          {filteredTasks.length === 0 ? (
            <div className="empty">
              <h3>No tasks found</h3>
              <p>Add a new task to get started.</p>
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
                      <h3>{item.title}</h3>

                      <p className="subject">
                        {item.subject}
                      </p>
                    </div>

                    <div className="badges">

                      <span
                        className={`badge ${item.priority.toLowerCase()}`}
                      >
                        {item.priority}
                      </span>

                      <span
                        className={`badge ${
                          item.status === "Completed"
                            ? "completed"
                            : "pending"
                        }`}
                      >
                        {item.status || "Pending"}
                      </span>

                    </div>

                  </div>

                  <div className="task-info">

                    <span>
                      📅 {item.deadline}
                    </span>

                    <span
                      className={
                        deadlineStatus === "Overdue"
                          ? "overdue"
                          : deadlineStatus === "Due Soon"
                          ? "due-soon"
                          : deadlineStatus === "Upcoming"
                          ? "upcoming"
                          : ""
                      }
                    >
                      {deadlineStatus === "Overdue" && "⚠️ "}
                      {deadlineStatus === "Due Soon" && "⏳ "}
                      {deadlineStatus === "Upcoming" && "🟢 "}
                      {deadlineStatus}
                    </span>

                  </div>

                  <div className="task-actions">

                    {item.status !== "Completed" && (
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

export default App;
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/studentTaskManager")
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error);
  });

// Task Schema
const taskSchema = new mongoose.Schema({
  title: String,
  subject: String,
  deadline: String,
  priority: String,
  status: {
    type: String,
    default: "Pending",
  },
});

// Task Model
const Task = mongoose.model("Task", taskSchema);

// Test route
app.get("/", (req, res) => {
  res.send("Student Task Manager Backend is Running!");
});

// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    console.log("Error fetching tasks:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

// Add a new task
app.post("/api/tasks", async (req, res) => {
  try {
    const newTask = new Task({
      title: req.body.title,
      subject: req.body.subject,
      deadline: req.body.deadline,
      priority: req.body.priority,
      status: "Pending",
    });

    const savedTask = await newTask.save();

    console.log("New task saved:", savedTask);

    res.status(201).json(savedTask);
  } catch (error) {
    console.log("Error saving task:", error);
    res.status(500).json({ message: "Error saving task" });
  }
});

// Update a task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        subject: req.body.subject,
        deadline: req.body.deadline,
        priority: req.body.priority,
        status: req.body.status,
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    console.log("Task updated:", updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.log("Error updating task:", error);
    res.status(500).json({ message: "Error updating task" });
  }
});

// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    console.log("Task deleted:", deletedTask);

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.log("Error deleting task:", error);
    res.status(500).json({ message: "Error deleting task" });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
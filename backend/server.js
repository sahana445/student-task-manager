const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = "student_task_manager_secret";

// =========================
// DATABASE
// =========================

mongoose
  .connect("mongodb://localhost:27017/studentTaskManager")
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// =========================
// USER SCHEMA
// =========================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

// =========================
// TASK SCHEMA
// =========================

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: 2,
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },

    deadline: {
      type: String,
      required: [true, "Deadline is required"],
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Student Task Manager Backend is Running!",
  });
});

// =========================
// REGISTER
// =========================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        message: "Name must contain at least 2 characters",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// =========================
// LOGIN
// =========================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error during login",
    });
  }
});

// =========================
// AUTHENTICATION MIDDLEWARE
// =========================

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// =========================
// GET TASKS
// =========================

app.get(
  "/api/tasks",
  authenticate,
  async (req, res) => {
    try {
      const tasks = await Task.find({
        userId: req.userId,
      }).sort({
        deadline: 1,
      });

      res.json(tasks);
    } catch (error) {
      console.error(
        "Error fetching tasks:",
        error
      );

      res.status(500).json({
        message: "Unable to fetch tasks",
      });
    }
  }
);

// =========================
// ADD TASK
// =========================

app.post(
  "/api/tasks",
  authenticate,
  async (req, res) => {
    try {
      const {
        title,
        subject,
        deadline,
        priority,
      } = req.body;

      if (
        !title ||
        !subject ||
        !deadline
      ) {
        return res.status(400).json({
          message:
            "Title, subject and deadline are required",
        });
      }

      if (title.trim().length < 2) {
        return res.status(400).json({
          message:
            "Task title must contain at least 2 characters",
        });
      }

      if (
        priority &&
        !["Low", "Medium", "High"].includes(
          priority
        )
      ) {
        return res.status(400).json({
          message: "Invalid priority",
        });
      }

      const newTask = new Task({
        title: title.trim(),
        subject: subject.trim(),
        deadline,
        priority: priority || "Medium",
        status: "Pending",
        userId: req.userId,
      });

      const savedTask =
        await newTask.save();

      res.status(201).json(savedTask);
    } catch (error) {
      console.error(
        "Error adding task:",
        error
      );

      res.status(500).json({
        message: "Unable to add task",
      });
    }
  }
);

// =========================
// UPDATE TASK
// =========================

app.put(
  "/api/tasks/:id",
  authenticate,
  async (req, res) => {
    try {
      const {
        title,
        subject,
        deadline,
        priority,
        status,
      } = req.body;

      if (
        !title ||
        !subject ||
        !deadline
      ) {
        return res.status(400).json({
          message:
            "Title, subject and deadline are required",
        });
      }

      if (
        priority &&
        !["Low", "Medium", "High"].includes(
          priority
        )
      ) {
        return res.status(400).json({
          message: "Invalid priority",
        });
      }

      if (
        status &&
        !["Pending", "Completed"].includes(
          status
        )
      ) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      const updatedTask =
        await Task.findOneAndUpdate(
          {
            _id: req.params.id,
            userId: req.userId,
          },
          {
            title: title.trim(),
            subject: subject.trim(),
            deadline,
            priority: priority || "Medium",
            status: status || "Pending",
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedTask) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error(
        "Error updating task:",
        error
      );

      res.status(500).json({
        message: "Unable to update task",
      });
    }
  }
);

// =========================
// DELETE TASK
// =========================

app.delete(
  "/api/tasks/:id",
  authenticate,
  async (req, res) => {
    try {
      const deletedTask =
        await Task.findOneAndDelete({
          _id: req.params.id,
          userId: req.userId,
        });

      if (!deletedTask) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      res.json({
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.error(
        "Error deleting task:",
        error
      );

      res.status(500).json({
        message: "Unable to delete task",
      });
    }
  }
);

// =========================
// GLOBAL ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("Unexpected error:", err);

  res.status(500).json({
    message: "Something went wrong on the server",
  });
});

// =========================
// START SERVER
// =========================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});
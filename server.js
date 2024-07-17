const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs-extra");
const bcrypt = require("bcrypt");
const socketIo = require("socket.io");
const dotenv = require("dotenv");

// Initialize express app
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "build")));
dotenv.config();
const PORT = process.env.PORT || 8080;

// Create HTTP server
const http = require("http");
const server = http.createServer(app);

// Initialize socket.io
const io = socketIo(server);

// Socket.io connection handler
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ room }) => {
    socket.join(room);
    console.log("new join");

    socket.on("userConnected", ({ userConnected, room }) => {
      console.log("Room: " + room);
      console.log("Message: " + userConnected);
      socket.broadcast.to(room).emit("receiveMessage", userConnected);
    });

    socket.on("studentFileNumber", ({ fileNumber, userUploaded }) => {
      socket.broadcast.to(room).emit("userFileNumber", {
        fileNumber,
        userUploaded,
      });
    });

    socket.on("areStudentsPremittedToUploadFiles", ({ studentsCanUploadFiles }) => {
      console.log("Hey");
      console.log("Have Premission: " + studentsCanUploadFiles);
      socket.broadcast.to(room).emit("studentPremission", {
        havePremission: studentsCanUploadFiles,
      });
    });
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    multerFileName = Date.now() + path.extname(file.originalname);
    cb(null, multerFileName);
  },
});

// Configure multer for student uploads
const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "studentsUploads/");
  },
  filename: (req, file, cb) => {
    studentFileNumber = Date.now() + path.extname(file.originalname);
    cb(null, studentFileNumber);
  },
});

const upload = multer({ storage: storage });
const studentUploads = multer({ storage: storage2 });

// Set up nodemailer transporter
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
});

// Define MongoDB schemas
const userSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: [true, "Please check your data entry, no title specified"],
    },
    lastName: {
      type: String,
      required: [true, "Please check your data entry, no content specified"],
    },
  
    password: {
      type: String,
      required: [true, "Please check your data entry, no content specified"],
    },
    email: {
      type: String,
      required: [true, "Please check your data entry, no content specified"],
    },
    role: {
      type: String,
      required: [true, "Please check your data entry, no content specified"],
    },
    usage: {
      type: String,
      required: [true, "Please check your data entry, no content specified"],
    },
  });

const User = mongoose.model("users", userSchema);

const userFilesSchema = new mongoose.Schema({
    fileNumber: {
      type: String,
      required: [true, "You must provide a file number"],
    },
    userFullName: {
      type: String,
      required: [true, "You must provide user full name"],
    },
    presentationNumber: {
      type: String,
      required: [true, "You must provide a presentation number"],
    },
  });

const UserFile = mongoose.model("usersFiles", userFilesSchema);

const PresentationSchema = new mongoose.Schema({
    fileNumber: {
      type: String,
      required: [true, "Please check your data entry, no file name specified"],
    },
    fileType: {
      type: String,
      required: [true, "Please check your data entry, no file type specified"],
    },
    lecturerName: {
      type: String,
      required: [
        true,
        "Please check your data entry, no lecturer name specified",
      ],
    },
    hours: {
      type: String,
      required: [
        true,
        "Please check your data entry, no presentation hours specified",
      ],
    },
    lectureTopic: {
      type: String,
      required: [true, "Please check your data entry, no topic specified"],
    },
    lecturerEmail: {
      type: String,
      required: [
        true,
        "Please check your data entry, no lecturer email specified",
      ],
    },
    date: {
      type: String,
      required: [true, "Please check your data entry, no date specified"],
    },
  });

const Presentation = mongoose.model("presentations", PresentationSchema);

// Routes

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
      const foundedPresentationByFileName = await Presentation.findOne({
        fileName: multerFileName.slice(0, -4),
      });
  
      if (!foundedPresentationByFileName) {
        const presentation = new Presentation({
          fileNumber: multerFileName.slice(0, -4),
          fileType: multerFileName.split(".")[1],
          lecturerName: req.body.lecturerName,
          hours: req.body.hours,
          lectureTopic: req.body.topic,
          lecturerEmail: req.body.lecturerEmail,
          date: req.body.date,
        });
        presentation.save();
      }
  
      res.json({
        status: 200,
        message: "File uploaded successfully to Database",
        fileName: multerFileName.slice(0, -4),
      });
    } catch (err) {
      console.log(err);
    }
  });
  
  app.get("/upload/:fileNumber", async (req, res) => {
    const fileNumber = req.params.fileNumber;
    const foundedPresentation = await Presentation.findOne({
      fileNumber: fileNumber,
    });
    if (foundedPresentation) {
      res.json({
        status: 200,
        message: "founded presentation",
        fileType: foundedPresentation.fileType,
        lecturerName: foundedPresentation.lecturerName,
        hours: foundedPresentation.hours,
        lectureTopic: foundedPresentation.lectureTopic,
        lecturerEmail: foundedPresentation.lecturerEmail,
      });
    } else {
      res.json({
        status: 400,
        message: "This file number is not exist",
      });
    }
  });
  
  app.use("/uploads", express.static("uploads"));
  
  app.post(
    "/studentsUploads",
    studentUploads.single("uploadedfile"),
    async (req, res) => {
      //get also the full name from the user and put it into
      //the database - V
  
      try {
        const userFile = new UserFile({
          fileNumber: studentFileNumber,
          userFullName: req.body.usersendFileName,
          presentationNumber: req.body.presentationNumber,
        });
  
        userFile.save();
  
        const fileNumber = studentFileNumber;
        res.json({
          status: 200,
          message: "Student file uploaded succsessfully",
          studentFileNumber: fileNumber,
          studentFileType: fileNumber.split(".")[1],
        });
      } catch (err) {
        console.log(err);
      }
    }
  );
  
  app.get("/studentsUploads", async function (req, res) {
    const fileNumber = req.params.fileNumber;
    let newestFileDate = null;
    let newestFile = null;
    let userFullName = null;
    let presentationNumber = null;
  
    try {
      const files = await fs.promises.readdir("studentsUploads");
  
      for (const file of files) {
        const filePath = path.join("studentsUploads", file);
        const stats = await fs.promises.stat(filePath);
  
        if (!newestFileDate || stats.mtime > newestFileDate) {
          newestFileDate = stats.mtime;
          newestFile = file;
        }
      }
  
      const foundedUserFileByFileNumber = await UserFile.findOne({
        fileNumber: newestFile,
      });
  
      if (foundedUserFileByFileNumber) {
        userFullName = foundedUserFileByFileNumber.userFullName;
        presentationNumber = foundedUserFileByFileNumber.presentationNumber;
      }
  
      //also go to the dataBase and find the data of the
      //newestFile, get the student name from there and
      //send it back to the front
  
      const currentTime = new Date();
      const fourSecondsAgo = new Date(currentTime.getTime() - 4 * 1000);
  
      if (newestFileDate && newestFileDate >= fourSecondsAgo) {
        res.json({
          status: 200,
          message: "Found student file url",
          fileUrl: `http://localhost:8080/studentsUploads/${newestFile}`,
          userFullName: userFullName,
          presentationNumber: presentationNumber,
        });
      } else {
        res.status(404).json({
          status: 404,
          message:
            "No new files found in studentsUploads directory in the last two minutes",
        });
      }
    } catch (err) {
      console.error("Error reading files", err);
      res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  });
  
  app.use("/studentsUploads", express.static("studentsUploads"));
  
  app.get("/userActivePresentations/:userEmail", async function (req, res) {
    const userEmail = req.params.userEmail;
    const foundedActivePresentationsByEmail = await Presentation.find({
      lecturerEmail: userEmail,
    });
    if (foundedActivePresentationsByEmail) {
      res.json({
        status: 200,
        message: "Found student's active presentations",
        presentations: foundedActivePresentationsByEmail,
      });
    }
  });
  
  app.get("/checkIfPresentationExists/:fileNumber", async function (req, res) {
    const fileNumber = req.params.fileNumber;
    const foundedPresentationByFileNumber = await Presentation.findOne({
      fileNumber: fileNumber,
    });
    if (foundedPresentationByFileNumber) {
      res.json({
        status: 200,
        message: "Founded presentation.",
      });
    } else {
      res.json({
        status: 400,
        message: "Presentation not found.",
      });
    }
  });
  
  app.post("/deleteUserActivePresentation/", async function (req, res) {
    const presentationID = req.body.presentationID;
    const presentationToDelete = await Presentation.findOneAndDelete({
      _id: presentationID,
    });
  
    if (presentationToDelete) {
      const fileNumber = presentationToDelete.fileNumber + ".pdf";
      const filePath = path.join("uploads", fileNumber);
      const studentsUploadsPath = "studentsUploads";
      fs.unlinkSync(filePath, function (err) {
        if (err) {
          console.log(err);
        }
      });
  
      fs.emptyDir(studentsUploadsPath, (err) => {
        if (err) {
          console.error("Error emptying studentsUploads directory:", err);
        } else {
          console.log("studentsUploads directory emptied successfully.");
        }
      });
  
      res.json({
        status: 200,
        message: "Presentation deleted succsessfully",
      });
    } else {
      res.json({
        status: 400,
        message: "Presentation Not Found",
      });
    }
  });
  
  app.post("/register", async (req, res) => {
    try {
      const saltRounds = 10;
      const foundedUserByEmail = await User.findOne({ email: req.body.email });
  
      if (foundedUserByEmail) {
        res.json({ status: 409, message: "User has an account" });
        return;
      } else {
        if (req.body.password.length < 3) {
          res.json({
            status: 508,
            message: "The password must contain at least three characters",
          });
          return;
        }
  
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
          // Store hash in your password DB.
          const user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            email: req.body.email,
            role: req.body.role,
            usage: req.body.usage,
          });
  
          user.save();
          if (err) {
            console.log(err);
          }
  
          console.log("email: " + req.body.email);
  
          let mailOptions = {
            from: "omrip500@gmail.com",
            to: req.body.email,
            subject:
              "Welcome to TechLecture - Your Smart Lecture Management Platform!",
            text: `Dear ${req.body.firstName + " " + req.body.lastName},
  
              ${process.env.TEXT}`
          };
  
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log("Email sent: " + info.response);
            }
          });
  
          res.json({ status: 201, message: "User has registered" });
        });
      }
    } catch (err) {
      console.log(err);
    }
  });
  
  app.post("/login", async (req, res) => {
    try {
      const foundedUserByEmail = await User.findOne({ email: req.body.email });
      if (foundedUserByEmail) {
        bcrypt.compare(
          req.body.password,
          foundedUserByEmail.password,
          function (err, result) {
            if (result) {
              const jwtToken = jwt.sign(
                {
                  id: foundedUserByEmail.id,
                  email: foundedUserByEmail.email,
                },
                process.env.JWT_SECRET
              );
  
              res.json({
                status: 200,
                message: "Connecting user",
                token: jwtToken,
                firstName: foundedUserByEmail.firstName,
                lastName: foundedUserByEmail.lastName,
                email: foundedUserByEmail.email,
              });
            } else {
              res.json({ status: 401, message: "Wrong password" });
            }
          }
        );
      } else {
        res.json({
          status: 402,
          message: "You don't have an account, please sign up",
        });
      }
    } catch (err) {
      console.log(err);
    }
  });
  
  app.post("/contact", (req, res) => {
    let mailOptions = {
      from: "omrip500@gmail.com",
      to: "omrip500@gmail.com",
      subject: "message From Contact Us",
      text:
        "Name: " +
        req.body.name +
        "\n" +
        "Email: " +
        req.body.email +
        "\n" +
        "Message: " +
        req.body.message,
    };
  
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  });
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
  
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
  });
  
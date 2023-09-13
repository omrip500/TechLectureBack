const express = require("express");
const fileUpload = require("express-fileupload");
const router = express.Router();
const path = require("path");

const assetsFolder = path.join(__dirname, "assets");

router.use(fileUpload());

router.post("/", (req, res) => {
  // console.log(req.cookies);
  const { file } = req.files;
  const date = new Date();
  const sanitizedTitle = req.body.title.replace(/[^a-zA-Z0-9]/g, ""); // מסיר תווים שאינם אותיות גדולות/קטנות או ספרות
  const fileName = sanitizedTitle + date.getTime(); // משתמש בתאריך בפורמט מספרי יחודי

  file.mv(path.join(assetsFolder, file.name));

  res.json({ status: 200, fileName, message: "ok" });
});

module.exports = router;

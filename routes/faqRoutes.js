const express = require("express");
const faqController = require("../controllers/faqController");

const router = express.Router();

router.route("/").get(faqController.getAllFaqs);
router.route("/:id").get(faqController.getFaq);

module.exports = router;

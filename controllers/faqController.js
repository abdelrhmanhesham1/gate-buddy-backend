const Faq = require("../models/faqModel");
const factory = require("./handlerFactory");

exports.getAllFaqs = factory.getAll(Faq);
exports.getFaq = factory.getOne(Faq);

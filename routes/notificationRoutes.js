const express = require("express");
const notificationController = require("../controllers/notificationController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.post("/subscribe", notificationController.subscribeToNotifications);
router.patch("/:id/read", notificationController.markNotificationAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;

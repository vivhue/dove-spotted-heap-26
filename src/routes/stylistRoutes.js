const stylistController = require("../controllers/stylistController");

const stylistRoutes = {
  chat: stylistController.createStylistReply
};

module.exports = stylistRoutes;

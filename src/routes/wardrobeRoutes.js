const wardrobeController = require("../controllers/wardrobeController");

const wardrobeRoutes = {
  create: wardrobeController.createWardrobeItem,
  filter: wardrobeController.filterWardrobeItems,
  unworn: wardrobeController.getUnwornItems
};

module.exports = wardrobeRoutes;

const outfitController = require("../controllers/outfitController");

const outfitRoutes = {
  generate: outfitController.generateOutfit,
  surprise: outfitController.surpriseMe
};

module.exports = outfitRoutes;

const communityController = require("../controllers/communityController");

const communityRoutes = {
  createPost: communityController.createCommunityPost,
  saveOutfit: communityController.saveCommunityOutfit
};

module.exports = communityRoutes;

const CommunityPost = require("../models/CommunityPost");

function createCommunityPost({ id, userId, outfitId, caption }) {
  return new CommunityPost({
    id,
    userId,
    outfitId,
    caption
  });
}

function saveCommunityOutfit(post, userId) {
  if (!post.savedByUserIds.includes(userId)) {
    post.savedByUserIds.push(userId);
  }

  return post;
}

module.exports = {
  createCommunityPost,
  saveCommunityOutfit
};

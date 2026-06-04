class CommunityPost {
  constructor({
    id,
    userId,
    outfitId,
    caption = "",
    savedByUserIds = [],
    createdAt = new Date().toISOString()
  }) {
    this.id = id;
    this.userId = userId;
    this.outfitId = outfitId;
    this.caption = caption;
    this.savedByUserIds = savedByUserIds;
    this.createdAt = createdAt;
  }
}

module.exports = CommunityPost;

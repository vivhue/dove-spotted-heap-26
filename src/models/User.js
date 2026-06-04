class User {
  constructor({
    id,
    name,
    location = "Singapore",
    stylePreferences = [],
    wardrobeItemIds = [],
    outfitHistoryIds = [],
    savedOutfitIds = []
  }) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.stylePreferences = stylePreferences;
    this.wardrobeItemIds = wardrobeItemIds;
    this.outfitHistoryIds = outfitHistoryIds;
    this.savedOutfitIds = savedOutfitIds;
  }
}

module.exports = User;

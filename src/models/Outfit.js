class Outfit {
  constructor({
    id,
    userId,
    name,
    occasion,
    aesthetic,
    weatherPreference,
    itemIds = [],
    stylingExplanation = "",
    isShared = false,
    createdAt = new Date().toISOString()
  }) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.occasion = occasion;
    this.aesthetic = aesthetic;
    this.weatherPreference = weatherPreference;
    this.itemIds = itemIds;
    this.stylingExplanation = stylingExplanation;
    this.isShared = isShared;
    this.createdAt = createdAt;
  }
}

module.exports = Outfit;

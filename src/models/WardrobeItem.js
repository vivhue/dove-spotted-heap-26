class WardrobeItem {
  constructor({
    id,
    userId,
    name,
    imageUrl,
    colour,
    type,
    formality,
    weatherSuitability = [],
    styleTags = [],
    userTags = [],
    occasions = [],
    lastWornAt = null,
    createdAt = new Date().toISOString()
  }) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.imageUrl = imageUrl;
    this.colour = colour;
    this.type = type;
    this.formality = formality;
    this.weatherSuitability = weatherSuitability;
    this.styleTags = styleTags;
    this.userTags = userTags;
    this.occasions = occasions;
    this.lastWornAt = lastWornAt;
    this.createdAt = createdAt;
  }

  isUnwornSince(days, now = new Date()) {
    if (!this.lastWornAt) return true;

    const lastWorn = new Date(this.lastWornAt);
    const ageInMs = now.getTime() - lastWorn.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    return ageInDays >= days;
  }
}

module.exports = WardrobeItem;

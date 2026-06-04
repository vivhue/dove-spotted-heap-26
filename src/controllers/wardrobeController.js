const WardrobeItem = require("../models/WardrobeItem");

function createWardrobeItem(input) {
  return new WardrobeItem({
    id: input.id,
    userId: input.userId,
    name: input.name,
    imageUrl: input.imageUrl,
    colour: input.colour,
    type: input.type,
    formality: input.formality,
    weatherSuitability: input.weatherSuitability || [],
    styleTags: input.styleTags || [],
    userTags: input.userTags || [],
    occasions: input.occasions || []
  });
}

function filterWardrobeItems(items, filters = {}) {
  return items.filter((item) => {
    const searchableText = [
      item.name,
      item.colour,
      item.type,
      item.formality,
      ...(item.styleTags || []),
      ...(item.userTags || []),
      ...(item.occasions || []),
      ...(item.weatherSuitability || [])
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !filters.search || searchableText.includes(filters.search.toLowerCase());
    const matchesColour = !filters.colour || item.colour === filters.colour;
    const matchesType = !filters.type || item.type === filters.type;
    const matchesFormality =
      !filters.formality || item.formality === filters.formality;
    const matchesWeather =
      !filters.weatherPreference ||
      item.weatherSuitability.includes(filters.weatherPreference);
    const matchesStyle =
      !filters.styleTag || item.styleTags.includes(filters.styleTag);
    const matchesUserTag =
      !filters.userTag || item.userTags.includes(filters.userTag);
    const matchesOccasion =
      !filters.occasion || item.occasions.includes(filters.occasion);

    return (
      matchesSearch &&
      matchesColour &&
      matchesType &&
      matchesFormality &&
      matchesWeather &&
      matchesStyle &&
      matchesUserTag &&
      matchesOccasion
    );
  });
}

function getUnwornItems(items, days = 30) {
  return items.filter((item) => item.isUnwornSince(days));
}

module.exports = {
  createWardrobeItem,
  filterWardrobeItems,
  getUnwornItems
};

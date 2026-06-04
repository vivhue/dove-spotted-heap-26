const Outfit = require("../models/Outfit");

function generateOutfit({ userId, wardrobeItems, occasion, aesthetic, weatherPreference }) {
  const matchingItems = shortlistWardrobeItems({
    wardrobeItems,
    occasion,
    aesthetic,
    weatherPreference
  });

  const selectedItems = pickCompleteOutfit(matchingItems);

  return new Outfit({
    id: `outfit-${Date.now()}`,
    userId,
    name: `${aesthetic} look for ${occasion}`,
    occasion,
    aesthetic,
    weatherPreference,
    itemIds: selectedItems.map((item) => item.id),
    stylingExplanation: buildStylingExplanation(
      selectedItems,
      matchingItems,
      occasion,
      aesthetic,
      weatherPreference
    )
  });
}

function shortlistWardrobeItems({ wardrobeItems, occasion, aesthetic, weatherPreference }) {
  return wardrobeItems.filter((item) => {
    const suitsOccasion = item.occasions.includes(occasion);
    const suitsAesthetic = item.styleTags.includes(aesthetic);
    const suitsWeather =
      !weatherPreference ||
      (item.weatherSuitability || []).includes(weatherPreference);

    return suitsOccasion || suitsAesthetic || suitsWeather;
  });
}

function pickCompleteOutfit(items) {
  const priorityTypes = ["top", "bottom", "outerwear", "shoes"];
  const selectedItems = [];

  priorityTypes.forEach((type) => {
    const match = items.find((item) => item.type === type && !selectedItems.includes(item));
    if (match) selectedItems.push(match);
  });

  items.forEach((item) => {
    if (selectedItems.length < 4 && !selectedItems.includes(item)) {
      selectedItems.push(item);
    }
  });

  return selectedItems;
}

function surpriseMe({ userId, wardrobeItems }) {
  const occasions = ["CNY dinner", "job interview", "chalet", "first date", "void deck party"];
  const aesthetics = ["vintage", "Y2K", "smart casual", "streetwear"];
  const weatherOptions = ["humid-friendly", "rain-ready", "aircon-safe"];
  const occasion = pickRandom(occasions);
  const aesthetic = pickRandom(aesthetics);
  const weatherPreference = pickRandom(weatherOptions);

  return generateOutfit({ userId, wardrobeItems, occasion, aesthetic, weatherPreference });
}

function buildStylingExplanation(items, shortlistedItems, occasion, aesthetic, weatherPreference) {
  if (items.length === 0) {
    return `No matching wardrobe items were found yet for a ${aesthetic} ${occasion} look.`;
  }

  const names = items.map((item) => item.name).join(", ");
  return `The system shortlisted ${shortlistedItems.length} items for ${occasion}, ${aesthetic}, and ${weatherPreference}. The AI selected ${names} for a complete outfit.`;
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

module.exports = {
  generateOutfit,
  shortlistWardrobeItems,
  surpriseMe
};

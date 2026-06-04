function createStylistReply({ message, wardrobeItems = [], weather = "humid" }) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("tomorrow")) {
    return `For tomorrow in Singapore's ${weather} weather, pick breathable pieces and avoid heavy layering. I found ${wardrobeItems.length} wardrobe items to work with.`;
  }

  if (lowerMessage.includes("denim jacket")) {
    return "For a void deck party, style the denim jacket with a relaxed tee, clean sneakers, and lighter bottoms so the outfit feels casual but intentional.";
  }

  return "Tell me the occasion, vibe, and comfort level you want, and I will build a look from your wardrobe.";
}

module.exports = {
  createStylistReply
};

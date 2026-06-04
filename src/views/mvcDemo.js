let wardrobeItems = [
  {
    id: "item-1",
    name: "Denim jacket",
    colour: "blue",
    type: "outerwear",
    styleTags: ["streetwear", "vintage"],
    occasions: ["chalet", "void deck party"],
    weatherSuitability: ["aircon-safe", "rain-ready"],
    formality: "casual",
    lastWornAt: "2026-04-18"
  },
  {
    id: "item-2",
    name: "White linen shirt",
    colour: "white",
    type: "top",
    styleTags: ["smart casual"],
    occasions: ["job interview", "first date", "CNY dinner"],
    weatherSuitability: ["humid-friendly"],
    formality: "semi-formal",
    lastWornAt: "2026-05-29"
  },
  {
    id: "item-3",
    name: "Black wide-leg trousers",
    colour: "black",
    type: "bottom",
    styleTags: ["smart casual", "streetwear"],
    occasions: ["job interview", "first date"],
    weatherSuitability: ["humid-friendly", "aircon-safe"],
    formality: "semi-formal",
    lastWornAt: "2026-03-20"
  },
  {
    id: "item-4",
    name: "Red knit top",
    colour: "red",
    type: "top",
    styleTags: ["Y2K", "vintage"],
    occasions: ["CNY dinner", "first date"],
    weatherSuitability: ["aircon-safe"],
    formality: "dressy",
    lastWornAt: null
  },
  {
    id: "item-5",
    name: "Clean white sneakers",
    colour: "white",
    type: "shoes",
    styleTags: ["streetwear", "smart casual"],
    occasions: ["chalet", "void deck party", "first date"],
    weatherSuitability: ["humid-friendly"],
    formality: "casual",
    lastWornAt: "2026-05-12"
  }
];

let currentOutfit = null;

function mockAiTagUpload() {
  const newItem = {
    id: `item-${Date.now()}`,
    name: "Sage camp-collar shirt",
    colour: "green",
    type: "top",
    styleTags: ["smart casual", "vintage"],
    occasions: ["chalet", "first date", "void deck party"],
    weatherSuitability: ["humid-friendly"],
    formality: "casual",
    lastWornAt: null
  };

  wardrobeItems = [newItem, ...wardrobeItems];
  renderWardrobe();
  renderJourneyOutfit();
}

function filterGalleryItems() {
  const search = document.querySelector("#searchInput").value.trim().toLowerCase();
  const type = document.querySelector("#typeFilter").value;

  return wardrobeItems.filter((item) => {
    const searchableText = [
      item.name,
      item.colour,
      item.type,
      item.formality,
      ...item.styleTags,
      ...item.occasions,
      ...item.weatherSuitability
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchableText.includes(search);
    const matchesType = !type || item.type === type;

    return matchesSearch && matchesType;
  });
}

function shortlistItems({ occasion, aesthetic, weather }) {
  return wardrobeItems.filter((item) => {
    const occasionMatch = item.occasions.includes(occasion);
    const aestheticMatch = item.styleTags.includes(aesthetic);
    const weatherMatch = item.weatherSuitability.includes(weather);

    return occasionMatch || aestheticMatch || weatherMatch;
  });
}

function generateOutfit({ occasion, aesthetic, weather }) {
  const shortlistedItems = shortlistItems({ occasion, aesthetic, weather });
  const selectedItems = pickCompleteOutfit(shortlistedItems);

  return {
    name: `${aesthetic} look for ${occasion}`,
    occasion,
    aesthetic,
    weather,
    shortlistedItems,
    items: selectedItems,
    explanation: buildStylingExplanation(selectedItems, shortlistedItems, occasion, aesthetic, weather)
  };
}

function pickCompleteOutfit(items) {
  const priorityTypes = ["top", "bottom", "outerwear", "shoes"];
  const picked = [];

  priorityTypes.forEach((type) => {
    const match = items.find((item) => item.type === type && !picked.includes(item));
    if (match) picked.push(match);
  });

  items.forEach((item) => {
    if (picked.length < 4 && !picked.includes(item)) {
      picked.push(item);
    }
  });

  return picked;
}

function surpriseMe() {
  const occasions = ["CNY dinner", "job interview", "chalet", "first date", "void deck party"];
  const aesthetics = ["smart casual", "streetwear", "Y2K", "vintage"];
  const weatherOptions = ["humid-friendly", "rain-ready", "aircon-safe"];

  return generateOutfit({
    occasion: pickRandom(occasions),
    aesthetic: pickRandom(aesthetics),
    weather: pickRandom(weatherOptions)
  });
}

function buildStylingExplanation(items, shortlistedItems, occasion, aesthetic, weather) {
  if (items.length === 0) {
    return `The filter found ${shortlistedItems.length} relevant items, but there are not enough pieces yet for this outfit.`;
  }

  const names = items.map((item) => item.name).join(", ");
  return `The system first shortlisted ${shortlistedItems.length} wardrobe items for ${occasion}, ${aesthetic}, and ${weather}. The AI then selected ${names} and balanced occasion fit, comfort, and Singapore weather.`;
}

function createStylistReply(message) {
  const lowerMessage = message.toLowerCase();

  if (!currentOutfit) {
    return "Generate an outfit first, then I can refine it.";
  }

  if (lowerMessage.includes("casual")) {
    const casualSwap = wardrobeItems.find((item) => item.formality === "casual" && !currentOutfit.items.includes(item));
    if (casualSwap) {
      currentOutfit.items = [casualSwap, ...currentOutfit.items.slice(0, 3)];
      currentOutfit.explanation = `Refined to feel more casual by bringing in ${casualSwap.name}.`;
      renderOutfit(currentOutfit);
    }

    return "I made it more casual by prioritising relaxed pieces and reducing the formal feel.";
  }

  if (lowerMessage.includes("swap shoes")) {
    return "I checked your wardrobe for another shoe option. Right now, clean white sneakers are still the strongest match.";
  }

  if (lowerMessage.includes("tomorrow")) {
    return "For tomorrow in Singapore, I would keep the outfit breathable and avoid heavy layering unless you expect strong aircon.";
  }

  return "I can refine by making it more casual, smarter, rain-ready, or swapping a category like shoes or outerwear.";
}

function renderWardrobe() {
  const modelList = document.querySelector("#modelList");
  const visibleItems = filterGalleryItems();

  modelList.innerHTML = visibleItems
    .map((item) => {
      const tags = [
        item.colour,
        item.type,
        item.formality,
        ...item.styleTags,
        ...item.weatherSuitability,
        isUnwornSince(item, 30) ? "unworn" : "recently worn"
      ];

      return `
        <article class="item">
          <strong>${item.name}</strong>
          <div class="meta">
            ${tags
              .map((tag) => `<span class="${tag === "unworn" ? "tag unworn" : "tag"}">${tag}</span>`)
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderShortlist(items) {
  const shortlist = document.querySelector("#shortlistItems");

  shortlist.innerHTML = items
    .map((item) => `<div class="mini-card">${item.name}<br><strong>${item.type}</strong></div>`)
    .join("");
}

function renderOutfit(outfit) {
  const result = document.querySelector("#outfitResult");
  const itemList = outfit.items.map((item) => `<li>${item.name}</li>`).join("");

  result.innerHTML = `
    <h3>8. ${outfit.name}</h3>
    <p><strong>Weather:</strong> ${outfit.weather}</p>
    <ul>${itemList || "<li>No matching items yet</li>"}</ul>
    <p>${outfit.explanation}</p>
  `;
}

function renderJourneyOutfit() {
  const outfit = generateOutfit(getSelectedInputs());

  currentOutfit = outfit;
  renderShortlist(outfit.shortlistedItems);
  renderOutfit(outfit);
}

function getSelectedInputs() {
  return {
    occasion: document.querySelector("#occasionSelect").value,
    aesthetic: document.querySelector("#aestheticSelect").value,
    weather: document.querySelector("#weatherSelect").value
  };
}

function isUnwornSince(item, days) {
  if (!item.lastWornAt) return true;

  const now = new Date("2026-06-05T00:00:00+08:00");
  const lastWorn = new Date(item.lastWornAt);
  const ageInMs = now.getTime() - lastWorn.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  return ageInDays >= days;
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

document.querySelector("#uploadButton").addEventListener("click", mockAiTagUpload);
document.querySelector("#searchInput").addEventListener("input", renderWardrobe);
document.querySelector("#typeFilter").addEventListener("change", renderWardrobe);
document.querySelector("#generateButton").addEventListener("click", renderJourneyOutfit);

document.querySelector("#surpriseButton").addEventListener("click", () => {
  const outfit = surpriseMe();

  document.querySelector("#occasionSelect").value = outfit.occasion;
  document.querySelector("#aestheticSelect").value = outfit.aesthetic;
  document.querySelector("#weatherSelect").value = outfit.weather;

  currentOutfit = outfit;
  renderShortlist(outfit.shortlistedItems);
  renderOutfit(outfit);
});

document.querySelector("#chatButton").addEventListener("click", () => {
  const message = document.querySelector("#stylistInput").value;
  document.querySelector("#chatReply").textContent = createStylistReply(message);
});

document.querySelector("#saveButton").addEventListener("click", () => {
  document.querySelector("#saveStatus").textContent = currentOutfit
    ? `Saved "${currentOutfit.name}" to outfit history.`
    : "Generate an outfit before saving.";
});

document.querySelector("#shareButton").addEventListener("click", () => {
  document.querySelector("#saveStatus").textContent = currentOutfit
    ? `Shared "${currentOutfit.name}" to the community feed.`
    : "Generate an outfit before sharing.";
});

renderWardrobe();
renderJourneyOutfit();
document.querySelector("#chatReply").textContent = createStylistReply(
  document.querySelector("#stylistInput").value
);

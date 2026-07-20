# Training Dataset

Drop clothing photos here first if you want to build the assistant from examples before the inventory UI exists.

Suggested structure:

- `images/` for photo files
- `labels.sample.json` for item-level labels
- `outfits.sample.json` for outfit combinations
- `occasions.sample.json` for occasion-to-style notes

The app does not read this folder yet. It is a clean place to build the training set first, then wire the data into the chatbot later.

Some of the sample photos are composite outfit shots rather than single garment shots. If one image shows multiple pieces together, it is okay for the labels to point to the same file more than once, but keep the notes explicit so that the next pass knows the image is serving as a full-look reference.

If a sample image is a full outfit or multi-piece shot, set `imageRole` to `composite-look`. Use `single-item` for normal isolated garment photos.

Recommended label fields:

- `category` like `tops`, `bottoms`, `outerwear`, `shoes`, `accessories`, or `bags`
- `subtype` like `shirt`, `trouser`, `jacket`
- `imageRole`
- `color`
- `formality`
- `occasions`
- `seasons`
- `fitNotes`
- `buyLater`

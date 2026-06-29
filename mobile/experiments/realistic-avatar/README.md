# Realistic Avatar Experiment

This folder is intentionally separate from the main app. It is a safe sandbox for testing a Ready Player Me avatar flow without changing the current mannequin screens.

## What This Tests

- Create a realistic-ish human avatar through Ready Player Me.
- Receive the exported `.glb` avatar URL.
- Render that avatar with `@react-three/fiber/native`.
- Swap outfit `.glb` meshes on top of the avatar.

This is the right direction for "a version of themselves" without doing full body scanning.

## Dependencies

The app already has:

```bash
three
@react-three/fiber
@react-three/drei
```

This experiment also needs:

```bash
npx expo install expo-gl expo-asset
npm install react-native-webview
```

I did not install these yet so `package.json` stays untouched until you want to run the experiment.

## How To Try It Later

Temporarily route a test screen to:

```tsx
import { RealisticAvatarExperiment } from '../experiments/realistic-avatar/RealisticAvatarExperiment';

export default function TestAvatar() {
  return <RealisticAvatarExperiment />;
}
```

Then create a free Ready Player Me subdomain and enter it in the experiment screen.

## Important Catch

Realistic clothing try-on needs outfit meshes rigged to the same skeleton as the avatar. Ready Player Me avatars use a humanoid rig, so your best options are:

- Use Ready Player Me's wardrobe/asset system when possible.
- Rig custom clothing in Blender against an RPM-compatible skeleton, then export `.glb`.

Simple unrigged clothing meshes can display, but they will not deform correctly with body movement.

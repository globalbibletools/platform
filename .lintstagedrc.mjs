export default {
  "**/*": "prettier --write --ignore-unknown",
  "*.{ts,tsx}": () => ["npm run check-types", "npm run lint"],
};

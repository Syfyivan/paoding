import fs from "node:fs";
import path from "node:path";

export function createRecipeLibrary(directory) {
  let cache = new Map();
  return function listRecipes() {
    const nextCache = new Map();
    for (const name of fs.readdirSync(directory)) {
      if (!name.endsWith(".json")) continue;
      const file = path.join(directory, name);
      try {
        const stat = fs.statSync(file, { throwIfNoEntry: false });
        if (!stat?.isFile()) continue;
        const stamp = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
        let entry = cache.get(name);
        if (entry?.stamp !== stamp) {
          const recipe = JSON.parse(fs.readFileSync(file, "utf8"));
          recipe.id = name.slice(0, -5);
          entry = { stamp, recipe };
        }
        nextCache.set(name, entry);
      } catch {
        // A recipe can be removed, partially written, or invalid while listing.
      }
    }
    cache = nextCache;
    return Array.from(cache.values(), ({ recipe }) => recipe)
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  };
}

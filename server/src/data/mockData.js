import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const mockDirectory = path.join(currentDirectory, "mock");

const readJson = (filename) =>
  JSON.parse(
    fs.readFileSync(path.join(mockDirectory, filename), "utf8")
  );

export const feed = readJson("feed.json");
export const stories = readJson("stories.json");
export const products = readJson("products.json");
export const vendors = readJson("vendors.json");
export const creators = readJson("creators.json");

export const liveUpdates = fs
  .readFileSync(
    path.join(mockDirectory, "live-updates.jsonl"),
    "utf8"
  )
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

export const vendorMap = new Map(
  vendors.map((vendor) => [vendor.id, vendor])
);

export const productMap = new Map(
  products.map((product) => [product.id, product])
);

export const creatorMap = new Map(
  creators.map((creator) => [creator.id, creator])
);
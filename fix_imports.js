const fs = require("fs");
const path = require("path");

const filePath = path.join("app", "(tabs)", "index.tsx");
let content = fs.readFileSync(filePath, "utf8");

const newImports = [
  "addGroupItem",
  "addLocationItem",
  "addMediaItem",
  "addTextItem",
  "createEvent",
  "createProfile",
  "deleteEvent",
  "deleteItem",
  "deleteProfile",
  "exportProfile",
  "getEventStoragePaths",
  "JournalEvent",
  "JournalItem",
  "JournalProfile",
  "listEvents",
  "listItems",
  "listProfiles",
  "LocationData",
  "moveItem",
  "renameProfile",
  "reorderItems",
  "updateEvent",
  "updateItem"
].sort();

const importBlock = `import {\n  ${newImports.join(",\n  ")},\n} from "@/lib/journal-storage";`;

// Regex to find from the first import { ... } from "@/lib/journal-storage" 
// to the last occurrence of that pattern in the header if there are multiple, 
// but the prompt says replace from "import {" through the second "}".
// Looking at the file, there is one major block.

const regex = /import \{[\s\S]*?\} from "@\/lib\/journal-storage";/g;
content = content.replace(regex, importBlock);

fs.writeFileSync(filePath, content);
console.log("File updated successfully.");

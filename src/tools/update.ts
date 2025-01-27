import { saveMgekoGenreTags } from "./update-mgeko-tags";

const EXTENSIONS = ["mgeko", "mangadex", "comick"] as const;
type Extension = (typeof EXTENSIONS)[number];

function isValidExtension(extension: string): extension is Extension {
  return EXTENSIONS.includes(extension as Extension);
}

async function updateExtension(extension: Extension): Promise<boolean> {
  try {
    switch (extension) {
      case "mgeko":
        await saveMgekoGenreTags();
        return true;
      case "mangadex":
        console.error(`${extension}: Update function not implemented`);
        return false;
      case "comick":
        console.error(`${extension}: Update function not implemented`);
        return false;
    }
  } catch (error) {
    console.error(`Error updating ${extension}:`, error);
    return false;
  }
}

async function updateAllExtensions(): Promise<boolean> {
  let allSuccessful = true;

  for (const extension of EXTENSIONS) {
    const success = await updateExtension(extension);
    if (!success) {
      allSuccessful = false;
    }
  }

  return allSuccessful;
}

function printUsage() {
  console.log("Usage:");
  console.log("  update <extension>");
  console.log("  update --all");
  console.log("\nAvailable extensions:");
  EXTENSIONS.forEach((ext) => console.log(`  - ${ext}`));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Please provide an extension or --all flag.");
    printUsage();
    return 1;
  }

  const command = args[0];

  if (command === "--all") {
    console.log("Updating all extensions...");
    const success = await updateAllExtensions();
    return success ? 0 : 1;
  } else if (isValidExtension(command)) {
    console.log(`Updating extension: ${command}`);
    const success = await updateExtension(command);
    return success ? 0 : 1;
  } else {
    console.error(`Unknown extension: ${command}`);
    printUsage();
    return 1;
  }
}

main()
  .then((exitCode) => {
    console.log("Finished updating.");
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });

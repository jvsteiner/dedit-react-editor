import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create data directory for persistence
const dataDir = join(__dirname, "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

/**
 * Simple file-based persistence for development.
 * In production, you'd use SQLite, Postgres, Redis, etc.
 */
const getDocPath = (documentName) => {
  // Sanitize document name for filesystem
  const safeName = documentName.replace(/[^a-zA-Z0-9-_]/g, "_");
  return join(dataDir, `${safeName}.yjs`);
};

const server = new Server({
  port: 1234,

  // Log connections for debugging
  async onConnect(data) {
    console.log(`[Hocuspocus] Client connected to document: ${data.documentName}`);
  },

  async onDisconnect(data) {
    console.log(`[Hocuspocus] Client disconnected from document: ${data.documentName}`);
  },

  // Extensions for persistence
  extensions: [
    new Database({
      // Load document from file
      fetch: async ({ documentName }) => {
        const path = getDocPath(documentName);
        if (existsSync(path)) {
          console.log(`[Hocuspocus] Loading document: ${documentName}`);
          return readFileSync(path);
        }
        console.log(`[Hocuspocus] New document: ${documentName}`);
        return null;
      },

      // Save document to file
      store: async ({ documentName, state }) => {
        const path = getDocPath(documentName);
        console.log(`[Hocuspocus] Saving document: ${documentName}`);
        writeFileSync(path, state);
      },
    }),
  ],
});

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Hocuspocus Collaboration Server                         ║
║                                                           ║
║   WebSocket URL: ws://localhost:1234                      ║
║   Data directory: ${dataDir}
║                                                           ║
║   Ready for collaborative editing!                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

server.listen();

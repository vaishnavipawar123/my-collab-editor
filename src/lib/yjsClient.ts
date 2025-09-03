import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function initYjs(docName: string) {
  // Create a shared Yjs document
  const ydoc = new Y.Doc();

  // Connect to WebSocket server (we’ll set this up next)
  const provider = new WebsocketProvider(
    "ws://localhost:1234", // WebSocket server URL
    docName,               // unique room/doc name
    ydoc
  );

  return { ydoc, provider };
}

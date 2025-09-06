// lib/yjsClient.ts
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function initYjs(docName: string, userName: string = "Anonymous") {
  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider("ws://localhost:1234", docName, ydoc);

  // 👉 Add local awareness (each user gets a random color + name)
  provider.awareness.setLocalStateField("user", {
    name: userName,
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
  });

  return { ydoc, provider };
}

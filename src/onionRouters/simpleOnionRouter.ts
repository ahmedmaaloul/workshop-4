import bodyParser from "body-parser";
import express from "express";
// Ensure fetch is available in Node.js environment
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey, exportPrvKey } from "../crypto";

let lastReceivedEncryptedMessage: string | null = null;
let lastReceivedDecryptedMessage: string | null = null;
let lastMessageDestination: number | null = null;

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  try {
    const { publicKey, privateKey } = await generateRsaKeyPair();
    const privateKeyBase64 = await exportPrvKey(privateKey);
    const publicKeyBase64 = await exportPubKey(publicKey);

    // Registration with error handling
    const registryResponse = await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nodeId: nodeId,
        pubKey: publicKeyBase64,
      }),
    });

    if (!registryResponse.ok) {
      throw new Error(`Failed to register node: ${registryResponse.statusText}`);
    }

    onionRouter.get("/status", (req, res) => {
      res.send("live");
    });
    onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
      res.json({ result: lastReceivedEncryptedMessage });
    });
    onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
      res.json({ result: lastReceivedDecryptedMessage });
    });
    onionRouter.get("/getLastMessageDestination", (req, res) => {
      res.json({ result: lastMessageDestination });
    });
  

    onionRouter.get("/getPrivateKey", (req, res) => {
        res.json({ result: privateKeyBase64 });
    });
  } catch (error:any) {
    console.error(`Error setting up the onion router: ${error.message}`);
    process.exit(1); // Or handle the error more gracefully
  }

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WATCHED_ACCOUNTS_FILE = path.join(process.cwd(), "watched_accounts.json");

// Initialize APIs
const resend = new Resend(process.env.RESEND_API_KEY || "dummy");
// Telegram removed - email only notifications

// Initialize Nodemailer for Gmail (if provided)
const gmailTransporter = (process.env.GMAIL_USER && (process.env.GMAIL_PASS || process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD)) 
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS || process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD
      }
    })
  : null;

interface WatchedAccount {
  accountAddress: string;
  metadataBlobName: string; // legacy
  metadataBlobs?: string[];
  lastNotified?: number;
  notifiedVaults?: string[];
  extensions?: Record<string, number>; // Maps metadataBlobName to a new dropTimestamp
  passphrases?: Record<string, string>; // Maps metadataBlobName to passphrase
}

function getWatchedAccounts(): WatchedAccount[] {
  if (!fs.existsSync(WATCHED_ACCOUNTS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(WATCHED_ACCOUNTS_FILE, "utf-8"));
  } catch (e) {
    console.error("Error reading watched accounts:", e);
    return [];
  }
}

function saveWatchedAccounts(accounts: WatchedAccount[]) {
  fs.writeFileSync(WATCHED_ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

async function sendNotifications(account: WatchedAccount, vault: any, metadataBlobName: string) {
  console.log(`Triggering drop for ${account.accountAddress}, vault: ${vault.name || vault.blobName}`);
  
  // Retrieve the passphrase securely from the backend storage
  const passphrase = account.passphrases?.[metadataBlobName];
  
  for (const recipient of vault.recipients || []) {
    const downloadLink = `${process.env.APP_URL || 'http://localhost:3000'}/download/${account.accountAddress}/${vault.blobName}#key=${encodeURIComponent(recipient.encryptedKeyPackage)}`;
    
    let message = `GhostDrop Alert: A vault has been released to you.\n\nBlob ID: ${vault.blobName}\n\nDownload Link: ${downloadLink}\n\nPlease click the link to access the file.`;
    if (passphrase) {
      message += `\n\nPassphrase to decrypt: ${passphrase}`;
    } else {
      message += `\n\nPlease enter the passphrase provided by the owner to decrypt the file.`;
    }

    // Email
    if (recipient.email) {
      if (gmailTransporter) {
        try {
          await gmailTransporter.sendMail({
            from: `"GhostDrop" <${process.env.GMAIL_USER}>`,
            to: recipient.email,
            subject: "GhostDrop Vault Released",
            text: message,
          });
          console.log(`Email sent to ${recipient.email} via Gmail`);
        } catch (e) {
          console.error(`Failed to send email to ${recipient.email} via Gmail:`, e);
        }
      } else if (process.env.RESEND_API_KEY) {
        try {
          await resend.emails.send({
            from: "GhostDrop <onboarding@resend.dev>",
            to: recipient.email,
            subject: "GhostDrop Vault Released",
            text: message,
          });
          console.log(`Email sent to ${recipient.email} via Resend`);
        } catch (e) {
          console.error(`Failed to send email to ${recipient.email} via Resend:`, e);
        }
      } else {
        console.log(`[WATCHDOG] Would send email to ${recipient.email}, but neither GMAIL nor RESEND API keys are set.`);
      }
    }


  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Test endpoint to verify email notification is working
  app.post("/api/test-notifications", async (req, res) => {
    const { email } = req.body;
    const results: any = { email: null };
    const testMessage = "This is a test message from GhostDrop to verify your notification settings are working correctly.";

    if (email) {
      if (gmailTransporter) {
        try {
          await gmailTransporter.sendMail({
            from: `"GhostDrop" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "GhostDrop Test Notification",
            text: testMessage,
          });
          results.email = { success: true, provider: "gmail" };
        } catch (e: any) {
          results.email = { success: false, error: e.message, provider: "gmail" };
        }
      } else if (process.env.RESEND_API_KEY) {
        try {
          const response = await resend.emails.send({
            from: "GhostDrop <onboarding@resend.dev>",
            to: email,
            subject: "GhostDrop Test Notification",
            text: testMessage,
          });
          results.email = { success: true, provider: "resend", response };
        } catch (e: any) {
          results.email = { success: false, error: e.message, provider: "resend" };
        }
      } else {
        results.email = { success: false, error: "No email provider configured (missing GMAIL_USER/PASS or RESEND_API_KEY)" };
      }
    }

    res.json(results);
  });

  app.post("/api/watch", (req, res) => {
    const { accountAddress, metadataBlobName, passphrase } = req.body;
    if (!accountAddress || !metadataBlobName) {
      return res.status(400).json({ error: "Missing accountAddress or metadataBlobName" });
    }

    const accounts = getWatchedAccounts();
    const existingIndex = accounts.findIndex(a => a.accountAddress === accountAddress);
    
    if (existingIndex >= 0) {
      // We'll append to a list of metadata blobs instead of overwriting
      if (!accounts[existingIndex].metadataBlobs) {
        accounts[existingIndex].metadataBlobs = [accounts[existingIndex].metadataBlobName];
      }
      if (!accounts[existingIndex].metadataBlobs.includes(metadataBlobName)) {
        accounts[existingIndex].metadataBlobs.push(metadataBlobName);
      }
      if (passphrase) {
        if (!accounts[existingIndex].passphrases) accounts[existingIndex].passphrases = {};
        accounts[existingIndex].passphrases[metadataBlobName] = passphrase;
      }
    } else {
      const newAccount: WatchedAccount = { 
        accountAddress, 
        metadataBlobName,
        metadataBlobs: [metadataBlobName] 
      };
      if (passphrase) {
        newAccount.passphrases = { [metadataBlobName]: passphrase };
      }
      accounts.push(newAccount);
    }
    
    saveWatchedAccounts(accounts);
    res.json({ success: true });
  });

  app.get("/api/vaults/:accountAddress", (req, res) => {
    const accounts = getWatchedAccounts();
    const account = accounts.find(a => a.accountAddress === req.params.accountAddress);
    if (!account) {
      return res.json({ metadataBlobs: [], extensions: {} });
    }
    res.json({ 
      metadataBlobs: account.metadataBlobs || [account.metadataBlobName],
      extensions: account.extensions || {}
    });
  });

  app.post("/api/checkin", (req, res) => {
    const { accountAddress, metadataBlobName, durationMs } = req.body;
    
    if (!accountAddress || !metadataBlobName || !durationMs) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const accounts = getWatchedAccounts();
    const accountIndex = accounts.findIndex(a => a.accountAddress === accountAddress);
    
    if (accountIndex !== -1) {
      const account = accounts[accountIndex];
      if (!account.extensions) account.extensions = {};
      
      // Set new drop timestamp based on current time + original duration
      const newDropTimestamp = Date.now() + durationMs;
      account.extensions[metadataBlobName] = newDropTimestamp;
      
      // If it was previously marked as notified, we should un-mark it so it can trigger again if needed
      if (account.notifiedVaults) {
        account.notifiedVaults = account.notifiedVaults.filter(v => v !== metadataBlobName);
      }
      
      saveWatchedAccounts(accounts);
      res.json({ success: true, newDropTimestamp });
    } else {
      res.status(404).json({ error: "Account not found" });
    }
  });

  app.delete("/api/watch", (req, res) => {
    const { accountAddress, metadataBlobName } = req.body;
    if (!accountAddress || !metadataBlobName) {
      return res.status(400).json({ error: "Missing accountAddress or metadataBlobName" });
    }

    const accounts = getWatchedAccounts();
    const existingIndex = accounts.findIndex(a => a.accountAddress === accountAddress);
    
    if (existingIndex >= 0) {
      if (accounts[existingIndex].metadataBlobs) {
        accounts[existingIndex].metadataBlobs = accounts[existingIndex].metadataBlobs.filter(b => b !== metadataBlobName);
      }
      saveWatchedAccounts(accounts);
    }
    
    res.json({ success: true });
  });

  app.get("/api/trigger-watchdog", async (req, res) => {
    console.log("Manual watchdog trigger...");
    const accounts = getWatchedAccounts();
    let updated = false;
    let logs: string[] = [];

    for (const account of accounts) {
      try {
        const blobsToCheck = account.metadataBlobs || [account.metadataBlobName];
        
        for (const blobName of blobsToCheck) {
          if (!blobName) continue;
          
          const gateway = "https://api.testnet.shelby.xyz/shelby";
          const url = `${gateway}/v1/blobs/${account.accountAddress}/${blobName}`;
          logs.push(`Checking Shelby metadata: ${url}`);
          const response = await fetch(url);
          
          if (!response.ok) {
            logs.push(`Failed to fetch metadata: ${response.status}`);
            continue;
          }

          const metadata = await response.json();
          const now = Date.now();
          
          for (const vault of metadata.vaults || []) {
            const isAlreadyNotified = account.notifiedVaults?.includes(vault.blobName);
            const effectiveDropTimestamp = account.extensions?.[blobName] || vault.dropTimestamp;
            
            logs.push(`Vault ${vault.blobName}: now=${now}, drop=${effectiveDropTimestamp}, notified=${isAlreadyNotified}`);
            
            if (!isAlreadyNotified && now >= effectiveDropTimestamp) {
              logs.push(`Triggering drop for ${vault.blobName}`);
              await sendNotifications(account, vault, blobName);
              
              if (!account.notifiedVaults) account.notifiedVaults = [];
              account.notifiedVaults.push(vault.blobName);
              account.lastNotified = now;
              updated = true;
            }
          }
        }
      } catch (e: any) {
        logs.push(`Error: ${e.message}`);
      }
    }

    if (updated) {
      saveWatchedAccounts(accounts);
      logs.push("Saved updated accounts.");
    }
    
    res.json({ success: true, logs });
  });

  // Watchdog Cron Job - runs every hour (or every minute for testing, let's use every minute for prototype)
  cron.schedule("* * * * *", async () => {
    console.log("Running watchdog check...");
    const accounts = getWatchedAccounts();
    let updated = false;

    for (const account of accounts) {
      try {
        const blobsToCheck = account.metadataBlobs || [account.metadataBlobName];
        
        for (const blobName of blobsToCheck) {
          if (!blobName) continue;
          
          const gateway = "https://api.testnet.shelby.xyz/shelby";
          const url = `${gateway}/v1/blobs/${account.accountAddress}/${blobName}`;
          console.log(`Checking Shelby metadata: ${url}`);
          const response = await fetch(url);
          
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`Metadata not found for ${account.accountAddress}/${blobName}.`);
            } else {
              console.error(`Failed to fetch metadata for ${account.accountAddress}/${blobName}: ${response.statusText} (${response.status})`);
            }
            continue;
          }

          const metadata = await response.json();
          const now = Date.now();
          
          // Check each vault in the metadata
          for (const vault of metadata.vaults || []) {
            const isAlreadyNotified = account.notifiedVaults?.includes(vault.blobName);
            
            // Use the extended timestamp if it exists, otherwise use the original
            const effectiveDropTimestamp = account.extensions?.[blobName] || vault.dropTimestamp;
            
            if (!isAlreadyNotified && now >= effectiveDropTimestamp) {
              console.log(`[WATCHDOG] Vault ${vault.blobName} timer ended! Triggering drop...`);
              await sendNotifications(account, vault, blobName);
              
              if (!account.notifiedVaults) account.notifiedVaults = [];
              account.notifiedVaults.push(vault.blobName);
              account.lastNotified = now;
              updated = true;
            }
          }
        }
      } catch (e) {
        console.error(`Error processing account ${account.accountAddress}:`, e);
      }
    }

    if (updated) {
      saveWatchedAccounts(accounts);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Explicitly serve clay.wasm to avoid SPA fallback issues
    app.get('*clay.wasm', (req, res) => {
      res.setHeader('Content-Type', 'application/wasm');
      res.sendFile(path.join(process.cwd(), 'node_modules/@shelby-protocol/clay-codes/dist/clay.wasm'));
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

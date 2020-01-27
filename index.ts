import { api } from "ynab";
import redis from "redis";
import { promisify } from "util";
import request from "request-promise-native";

const ynabAccessToken: string = process.env.YNAB_API_TOKEN!;
if (!ynabAccessToken) {
  error("YNAB_API_TOKEN environment variable must be set.", true);
}

const webhookURL: string = process.env.WEBHOOK_URL!;
if (!webhookURL) {
  error("WEBHOOK_URL environment variable must be set.", true);
}

let redisURL = process.env.REDIS_URL;
if (!redisURL) {
  redisURL = "redis://localhost";
}

let budgetID = process.env.BUDGET_ID;
if (!budgetID) {
  budgetID = "last-used";
}

// Initialize YNAB API client
const ynabAPI = new api(ynabAccessToken);

// Initialize redis client
const redisClient = redis.createClient(redisURL);
redisClient.on("error", err => {
  error(err, true);
});

const keysAsync = promisify(redisClient.keys).bind(redisClient);
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

(async function() {
  const lastServerKnowledgeStorageKey = "lastServerKnowledge";
  const keys = await keysAsync(lastServerKnowledgeStorageKey);
  // Fetch lastKnownServerKnowledge from Redis

  const lastKnownServerKnowledge =
    Number(await getAsync(lastServerKnowledgeStorageKey)) || 0;
  console.log(`lastKnownServerKnowledge: ${lastKnownServerKnowledge}`);

  // Send a Delta Request to the YNAB API
  const budgetResponse = await ynabAPI.budgets.getBudgetById(
    "last-used",
    lastKnownServerKnowledge
  );
  const budgetDataDelta = budgetResponse.data.budget;
  const lastServerKnowledgeFromAPI = budgetResponse.data.server_knowledge;
  console.log(`lastServerKnowledgeFromAPI: ${lastServerKnowledgeFromAPI}`);

  if (lastServerKnowledgeFromAPI == lastKnownServerKnowledge) {
    console.log("No budget changes found.");
  } else {
    console.log("\x1b[32m%s\x1b[0m", "Incoming budget changes found!");

    // Send request to WEBHOOK_URL
    var options = {
      uri: webhookURL,
      method: "POST",
      json: budgetDataDelta
    };

    console.log(`Sending webhook request to ${webhookURL}`);
    try {
      await request.post(options);

      // Store lastServerKnowledgeFromAPI in Redis
      await setAsync(
        lastServerKnowledgeStorageKey,
        lastServerKnowledgeFromAPI.toString()
      );
    } catch (err) {
      error(
        `Error encountered posting to webhook!\nStatus:${err.statusCode}; Message: ${err.message}`
      );
    }
  }

  // Cleanup
  redisClient.quit();
})();

function error(message: string, exit = false) {
  console.log("\x1b[31m%s\x1b[0m", message);
  if (exit) {
    process.exit(1);
  }
}

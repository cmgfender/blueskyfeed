require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { BskyAgent } = require("@atproto/api");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Load Bluesky credentials
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;
const DID_WEB = "did:web:sheriffofpaddys.com";  // Root domain DID

if (!BLUESKY_HANDLE || !BLUESKY_PASSWORD) {
  console.error("ERROR: Missing Bluesky credentials. Set BLUESKY_HANDLE and BLUESKY_PASSWORD.");
  process.exit(1);
}

const agent = new BskyAgent({ service: "https://bsky.social" });

async function authenticate() {
  try {
    await agent.login({ identifier: BLUESKY_HANDLE, password: BLUESKY_PASSWORD });
    console.log("✅ Authenticated successfully!");
  } catch (error) {
    console.error("❌ Authentication failed:", error);
    process.exit(1);
  }
}

// Authenticate at startup
authenticate();

// Describe feed generator
app.get("/xrpc/app.bsky.feed.describeFeedGenerator", (req, res) => {
  res.json({
    did: DID_WEB, // Use the root domain DID
    feeds: [
      {
        uri: `at://${DID_WEB}/app.bsky.feed.generator/custom-feed`,
        name: "Sheriff's Feed",
        description: "All sources have been optically assessed for threats.",
        avatar: "https://sheriffofpaddys.com/avatar.png",
      }
    ]
  });
});

// Get feed data
app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (req, res) => {
  try {
    const usersData = JSON.parse(fs.readFileSync("allowedUsers.json", "utf8"));
    const allowedUsers = usersData.users || [];

    console.log("✅ Allowed Users:", allowedUsers);

    // Fetch Bluesky timeline
    const response = await agent.getTimeline({ limit: 50 });

    if (!response?.data?.feed) {
      throw new Error("Invalid response from Bluesky API.");
    }

    const posts = response.data.feed;
    console.log("📥 Fetched Posts:", JSON.stringify(posts, null, 2));

    // Filter posts if needed
    const enableFiltering = process.env.ENABLE_FILTERING === "true";
    let filteredFeed = posts.map(post => ({ post: post.post.uri }));

    if (enableFiltering) {
      filteredFeed = posts
        .filter(post => allowedUsers.includes(post.post.author.did))
        .map(post => ({ post: post.post.uri }));
    }

    console.log("📤 Filtered Feed:", JSON.stringify(filteredFeed, null, 2));

    res.json({ feed: filteredFeed, cursor: "next" });
  } catch (error) {
    console.error("❌ Error fetching feed:", error);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

// Keep Railway from shutting down
setInterval(() => {
  console.log("🔄 Keep-alive ping...");
}, 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Feed generator running on port ${PORT}`);
});
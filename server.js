require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { BskyAgent } = require("@atproto/api");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Load Bluesky credentials securely
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;

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

app.get("/xrpc/app.bsky.feed.describeFeedGenerator", (req, res) => {
  res.json({
    did: "did:web:feed.sheriffofpaddys.com",
    feeds: [
      {
        uri: "at://did:web:feed.sheriffofpaddys.com/app.bsky.feed.generator/custom-feed",
        name: "Sheriff's Feed",
        description: "All sources have been optically assesed for threats.",
        avatar: "https://sheriffofpaddys.com/avatar.png"
      }
    ]
  });
});

app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (req, res) => {
  try {
    // Read the list of allowed users
    const usersData = JSON.parse(fs.readFileSync("allowedUsers.json", "utf8"));
    const allowedUsers = usersData.users;

    console.log("✅ Allowed Users:", allowedUsers);

    // Fetch user's Bluesky feed
    const response = await agent.getTimeline({ limit: 50 });

    if (!response || !response.data || !response.data.feed) {
      throw new Error("Invalid response from Bluesky API.");
    }

    const posts = response.data.feed;
    console.log("📥 Fetched Posts:", JSON.stringify(posts, null, 2));

    // **Option: Enable Filtering by Allowed Users**
    const enableFiltering = false; // Change to true if you want filtering
    let filteredFeed;

    if (enableFiltering) {
      filteredFeed = posts
        .filter(post => allowedUsers.includes(post.post.author.did))
        .map(post => ({ post: post.post.uri }));
    } else {
      filteredFeed = posts.map(post => ({ post: post.post.uri }));
    }

    console.log("📤 Filtered Feed:", JSON.stringify(filteredFeed, null, 2));

    res.json({ feed: filteredFeed, cursor: "next" });
  } catch (error) {
    console.error("❌ Error fetching feed:", error);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

// Prevent Railway from shutting down due to inactivity
setInterval(() => {
  console.log("🔄 Keep-alive ping...");
}, 60 * 1000); // Every 1 minute

app.listen(PORT, () => {
  console.log(`🚀 Feed generator running on port ${PORT}`);
});
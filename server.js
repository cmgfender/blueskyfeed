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

const agent = new BskyAgent({ service: "https://bsky.social" });

async function authenticate() {
  try {
    await agent.login({ identifier: BLUESKY_HANDLE, password: BLUESKY_PASSWORD });
    console.log("Authenticated successfully!");
  } catch (error) {
    console.error("Authentication failed:", error);
  }
}

// Authenticate at startup
authenticate();

app.get("/xrpc/app.bsky.feed.describeFeedGenerator", (req, res) => {
  res.json({
    did: "did:web:sheriffofpaddys.com",
    feeds: [
      {
        uri: "at://did:web:sheriffofpaddys.com/app.bsky.feed.generator/custom-feed",
        name: "My Custom Feed",
        description: "A feed of users I like posting on main Bluesky",
        avatar: "https://sheriffofpaddys.com/avatar.png"
      }
    ]
  });
});

app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (req, res) => {
  try {
    const usersData = JSON.parse(fs.readFileSync("allowedUsers.json", "utf8"));
    const allowedUsers = usersData.users;

    const response = await agent.getTimeline({ limit: 50 });
    const posts = response.data.feed || [];

    const filteredFeed = posts
      .filter(post => allowedUsers.includes(post.post.author.did))
      .map(post => ({ post: post.post.uri }));

    res.json({ feed: filteredFeed, cursor: "next" });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

app.listen(PORT, () => {
  console.log(`Feed generator running on port ${PORT}`);
});
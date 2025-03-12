const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const fs = require("fs");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080; // Railway auto-assigns a port

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
    // Load the list of allowed users from JSON file
    const usersData = JSON.parse(fs.readFileSync("allowedUsers.json", "utf8"));
    const allowedUsers = usersData.users;

    // Fetch main Bluesky timeline
    const response = await fetch("https://bsky.social/xrpc/app.bsky.feed.getTimeline");
    const data = await response.json();

    // Filter posts from allowed users
    const filteredFeed = data.feed.filter(post =>
      allowedUsers.includes(post.author.did)
    ).map(post => ({
      post: post.uri
    }));

    res.json({ feed: filteredFeed, cursor: "next" });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Feed generator running on port ${PORT}`);
});
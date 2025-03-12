const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const feeds = {
  did: "did:web:sheriffofpaddys.com",
  feeds: [
    {
      uri: "at://did:web:sheriffofpaddys.com/app.bsky.feed.generator/general",
      name: "General Feed",
      description: "A feed of all public posts",
      avatar: "https://sheriffofpaddys.com/avatar.png"
    }
  ]
};

// Endpoint to describe the feed generator
app.get("/xrpc/app.bsky.feed.describeFeedGenerator", (req, res) => {
  res.json(feeds);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Feed generator running on port ${PORT}`);
});
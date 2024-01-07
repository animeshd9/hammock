const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const pty = require("node-pty");
const { WebSocketServer } = require("ws");
const { authMiddlewareWs } = require('./middileware')

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3333;

app.use("/terminal", express.static(path.join(__dirname, "public")));
app.use( cors({ origin: '*' }) );

const wss = new WebSocketServer({ server });

wss.on("connection", async (socket, req) => {
  try {
    await authMiddlewareWs(req)
  } catch (error) {
    socket.close();
  }

  const keepAliveInterval = setInterval(() => {
    if (socket.readyState === 1) {
      socket.send('ping');
    }
  }, 30000);

  const term = pty.spawn("bash", [], {
    name: "xterm-color",
    cwd: ".",
  });

  term.on("data", (data) => {
    socket.send(data);
  });

  socket.on("message", (data) => {
    data = data.toString('utf-8');
    data !== 'pong' ? term.write(data) : null;
  });

  socket.on("close", () => {
    term.kill();
    clearInterval(keepAliveInterval);
    console.log("Client disconnected");
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

server.listen(port, () => {
  console.log("Server listening at port", port);
});

import Koa from "koa";
import Router from "koa-router";
import http from "http";
import WebSocket from "ws";
import path from "path";
import send from "koa-send";
import { doWolfThings } from "./wolf";

const app = new Koa();
const router = new Router();

type Coordinate = {
  x: number;
  y: number;
};

interface GameMessage {
  user_id: string;
  x: number;
  y: number;
  message?: string;
}

export interface Player {
  user_id: string;
  x: number;
  y: number;
  color: string;
}

// map of user_id to Player
const playersDatabase: Record<string, Player> = {};
playersDatabase["0"] = {
  user_id: "0",
  x: 200,
  y: 200,
  color: "black",
};
const broadcast = (
  message: GameMessage,
  excludeUser: WebSocket | null = null
) => {
  wss.clients.forEach((client) => {
    if (client !== excludeUser && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

router.get("/", async (ctx) => {
  await send(ctx, "src/game.html");
});

const server = http.createServer(app.callback());
const wss = new WebSocket.Server({ noServer: true });

function heartbeat(this: any) {
  this.isAlive = true;
}

/*

*/

wss.on("connection", (ws: WebSocket & { isAlive: boolean; id: string }) => {
  ws["isAlive"] = true;
  ws.on("error", console.error);
  ws.on("pong", heartbeat);
  console.log(ws);
  // Generate a unique user_id for each connection
  const user_id = Math.random().toString(36).substring(7);
  ws.id = user_id;
  const playerColor = Math.round(Math.random() * 255);
  const playerColorStr = `rgb(${playerColor % 125}, ${playerColor}, ${
    playerColor / 2
  })`;
  playersDatabase[user_id] = {
    user_id,
    x: 50,
    y: 50,
    color: playerColorStr,
  }; // Initial position

  console.log("random num: ", playerColor);

  ws.send(
    JSON.stringify({
      user_id: user_id,
      message: "new connection established",
      color: playerColorStr,
    })
  );

  ws.on("message", (message: string) => {
    try {
      const data: GameMessage = JSON.parse(message);
      playersDatabase[data.user_id].x = data.x;
      playersDatabase[data.user_id].y = data.y;
      console.log(data.user_id, playersDatabase[data.user_id]);

      // Broadcast the updated coordinates to all other connections
      ws.send(JSON.stringify({ user_id: data.user_id, x: data.x, y: data.y }));
      broadcast({ user_id: data.user_id, x: data.x, y: data.y }, ws);
    } catch (error) {
      console.error("Invalid message format:", message);
    }
  });

  // Send initial positions of all players to the newly connected client
  Object.entries(playersDatabase).forEach(([id, position]) => {
    ws.send(
      JSON.stringify({
        user_id: id,
        x: position.x,
        y: position.y,
        color: playersDatabase[id].color,
      })
    );
  });
});

// check for closed connections
const interval = setInterval(function ping() {
  wss.clients.forEach((ws: any) => {
    if (ws["isAlive"] === false) return ws.terminate();
    delete playersDatabase[ws.id];
    broadcast({
      x: 0,
      y: 0,
      user_id: ws.id,
      message: "connection dropped",
    });

    ws.isAlive = false;
    ws.ping();
  });
}, 1000);

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = 8080;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

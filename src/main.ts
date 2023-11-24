import Koa from "koa";
import Router from "koa-router";
import http from "http";
import WebSocket from "ws";
import path from "path";
import send from "koa-send";
import { doWolfThings } from "./wolf";
import serve from "koa-static";

const app = new Koa();
const router = new Router();

export interface GameMessage {
  user_id: string;
  x: number;
  y: number;
  image: string;
  message?: string;
}

export interface Player {
  user_id: string;
  x: number;
  y: number;
  color: string;
  image: string;
  ws?: WebSocket;
  lastInputReceived?: string; // date time when the last input from a client came in
}

export const WOLF_ID = "0";

// map of user_id to Player
export const playersDatabase: Record<string, Player> = {};

// player 0 is the wolf
playersDatabase["0"] = {
  user_id: WOLF_ID,
  x: 200,
  y: 200,
  color: "black",
  image: "Wolf.png",
};
export const broadcast = (
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

console.log(path.join(__dirname, "images"));
app.use(serve(path.join(__dirname, "images")));

const server = http.createServer(app.callback());
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws: WebSocket & { isAlive: boolean; id: string }) => {
  ws["isAlive"] = true;
  ws.on("error", console.error);

  // Generate a unique user_id for each connection
  const user_id = Math.random().toString(36).substring(7);
  ws.id = user_id;
  const playerColor = Math.round(Math.random() * 255);
  const playerColorStr = `rgb(${playerColor % 125}, ${playerColor}, ${
    playerColor / 2
  })`;

  let imgForPlayer = "Pig_Blue.png";
  if (playerColor % 3 == 0) {
    imgForPlayer = "Pig_Blue.png";
  } else if (playerColor % 3 == 1) {
    //Pig_Green.png
    imgForPlayer = "Pig_Green.png";
  } else if (playerColor % 3 == 2) {
    //Pig_Red.png
    imgForPlayer = "Pig_Red.png";
  }

  playersDatabase[user_id] = {
    user_id,
    x: Math.round(Math.random() * 200),
    y: Math.round(Math.random() * 200),
    color: playerColorStr,
    ws,
    image: imgForPlayer,
  }; // Initial position

  ws.send(
    JSON.stringify({
      user_id: user_id,
      message: "new connection established",
      color: playerColorStr,
      image: imgForPlayer,
    })
  );

  ws.on("message", (message: string) => {
    try {
      const data: GameMessage = JSON.parse(message);
      playersDatabase[data.user_id].x = data.x;
      playersDatabase[data.user_id].y = data.y;
      playersDatabase[data.user_id].lastInputReceived =
        new Date().toISOString();
      console.log(data.user_id, playersDatabase[data.user_id]);

      // Broadcast the updated coordinates to all other connections
      doWolfThings(playersDatabase);
      ws.send(
        JSON.stringify({
          user_id: data.user_id,
          x: data.x,
          y: data.y,
          image: playersDatabase[data.user_id].image,
        })
      );
      broadcast(
        {
          user_id: data.user_id,
          x: data.x,
          y: data.y,
          image: playersDatabase[data.user_id].image,
        },
        ws
      );
      ws.send(
        JSON.stringify({
          user_id: WOLF_ID,
          x: playersDatabase[WOLF_ID].x,
          y: playersDatabase[WOLF_ID].y,
          image: playersDatabase[WOLF_ID].image,
        })
      );

      broadcast(
        {
          user_id: WOLF_ID,
          x: playersDatabase[WOLF_ID].x,
          y: playersDatabase[WOLF_ID].y,
          image: playersDatabase[WOLF_ID].image,
        },
        ws
      );
    } catch (error: any) {
      console.log(error.message);
      console.log(error.stack);
      console.error("Invalid message format:", String(message));
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
        image: playersDatabase[id].image,
      })
    );
  });
});

function checkForDisconnectedUsers() {
  Object.entries(playersDatabase).forEach(([user_id, player]) => {
    if (
      player.lastInputReceived &&
      new Date().getTime() - new Date(player.lastInputReceived).getTime() >
        1000 * 60 * 2 // 2 minutes
    ) {
      console.log("Disconnecting user:", player.user_id);
      delete playersDatabase[user_id];
      if (player.ws?.readyState === WebSocket.OPEN) {
        const message: GameMessage = {
          ...player,
          message: "player afk",
        };
        player.ws?.send(JSON.stringify(message));
        return player.ws?.terminate();
      }
      player.ws?.terminate();
    }
  });
}

setInterval(() => {
  checkForDisconnectedUsers();
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

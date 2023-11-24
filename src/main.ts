import Koa from "koa";
import Router from "koa-router";
import http from "http";
import WebSocket from "ws";
import path from "path";
import send from "koa-send";
import { doWolfThings } from "./wolf";
import serve from "koa-static";
import { GameMessage, Player, WOLF_ID, playersDatabase } from "./data";

const app = new Koa();
const router = new Router();

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
    imgForPlayer = "Pig_Green.png";
  } else if (playerColor % 3 == 2) {
    imgForPlayer = "Pig_Red.png";
  }

  playersDatabase[user_id] = {
    user_id,
    x: Math.round(Math.random() * 500),
    y: Math.round(Math.random() * 500),
    color: playerColorStr,
    ws,
    score: 0,
    image: imgForPlayer,
  }; // Initial position

  let msg2send: GameMessage = {
    user_id: user_id,
    msg_type: "new_connection",
    message: "new connection established",
    color: playerColorStr,
    image: imgForPlayer,
    x: playersDatabase[user_id].x,
    y: playersDatabase[user_id].y,
  };

  sendMessage(msg2send, ws);

  // broadcast new player to all other players
  broadcast(
    {
      user_id,
      x: playersDatabase[user_id].x,
      y: playersDatabase[user_id].y,
      image: playersDatabase[user_id].image,
      msg_type: "game_message",
      color: "",
      score: playersDatabase[user_id].score,
    },
    ws
  );

  ws.on("message", (message: string) => {
    try {
      const data: GameMessage = JSON.parse(message);
      playersDatabase[data.user_id].x = data.x;
      playersDatabase[data.user_id].y = data.y;
      playersDatabase[data.user_id].lastInputReceived =
        new Date().toISOString();

      console.log(
        "players database length",
        Object.values(playersDatabase).length
      );

      // move the wolf
      doWolfThings();

      // if not eaten
      if (playersDatabase[user_id]) {
        // update the player's location
        sendMessage(
          {
            user_id: data.user_id,
            x: data.x,
            y: data.y,
            image: playersDatabase[data.user_id].image,
            msg_type: "game_message",
            color: "",
          },
          ws
        );
        // broadcast the player's location to all other players
        broadcast(
          {
            user_id: data.user_id,
            x: data.x,
            y: data.y,
            image: playersDatabase[data.user_id].image,
            msg_type: "game_message",
            color: "",
            score: playersDatabase[data.user_id].score,
          },
          ws
        );
      }

      // update the wolf's location for the players connection
      sendMessage(
        {
          user_id: WOLF_ID,
          x: playersDatabase[WOLF_ID].x,
          y: playersDatabase[WOLF_ID].y,
          image: playersDatabase[WOLF_ID].image,
          msg_type: "game_message",
          color: "",
        },
        ws
      );
      // broadcast the wolf's location to all other players
      broadcast(
        {
          user_id: WOLF_ID,
          x: playersDatabase[WOLF_ID].x,
          y: playersDatabase[WOLF_ID].y,
          image: playersDatabase[WOLF_ID].image,
          msg_type: "game_message",
          color: "",
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
    const message: GameMessage = {
      user_id: id,
      x: position.x,
      y: position.y,
      color: playersDatabase[id].color,
      image: playersDatabase[id].image,
      msg_type: "game_message",
    };
    sendMessage(message, ws);
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
          msg_type: "afk_user",
          message: "player afk",
        };
        sendMessage(message, player.ws);

        return player.ws?.terminate();
      }
      player.ws?.terminate();
    }
  });
}

export function sendMessage(message: GameMessage, ws?: WebSocket) {
  if (!ws) {
    return;
  }
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
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

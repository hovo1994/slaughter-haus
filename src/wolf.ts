import {
  GameMessage,
  Player,
  WOLF_ID,
  broadcast,
  playersDatabase,
} from "./main";

function findDistanceToTarget(wolf: Player, pig: Player) {
  const dist = Math.sqrt(
    Math.pow(pig.x - wolf.x, 2) + Math.pow(pig.y - wolf.y, 2)
  );
  return dist;
}
export const WOLF_SPEED = 5;

function moveTowardsTarget(wolf: Player, player: Player) {
  let distX = player.x - wolf.x;
  let distY = player.y - wolf.y;

  if (Math.abs(distX) > Math.abs(distY)) {
    if (distX != 0) {
      wolf.x += (Math.abs(distX) / distX) * WOLF_SPEED;
    } else {
      eat(player);
    }
  } else {
    if (distY != 0) {
      wolf.y += (Math.abs(distY) / distY) * WOLF_SPEED;
    } else {
      eat(player);
    }
  }
}

// eat the pig
function eat(player: Player) {
  const message: GameMessage = {
    ...player,
    message: "you were eaten",
  };
  delete playersDatabase[player.user_id];
  player.ws?.send(JSON.stringify(message));
  const { ws, ...playerWithoutWebSocket } = player;
  const message2: GameMessage = {
    ...playerWithoutWebSocket,
    message: "other player was eaten",
  };

  broadcast(message2, player.ws);
}

export function doWolfThings(playerDatabase: Record<string, Player>) {
  const wolf = playerDatabase[WOLF_ID];
  let closestTarget = Infinity;
  let closestPlayerId = "";
  Object.entries(playerDatabase).forEach(([id, player]) => {
    if (id === WOLF_ID) {
      return;
    }
    const distance2Piggie = findDistanceToTarget(wolf, player);
    console.log("distance2Piggie", distance2Piggie);
    if (distance2Piggie <= closestTarget) {
      closestTarget = distance2Piggie;
      closestPlayerId = player.user_id;
    }
  });
  console.log("playerID: ", closestPlayerId);
  moveTowardsTarget(wolf, playerDatabase[closestPlayerId]);
}

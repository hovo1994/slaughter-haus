import { Player } from "./main";

function findDistanceToTarget(wolf: Player, pig: Player) {
  const dist = Math.sqrt(
    Math.pow(pig.x - wolf.x, 2) + Math.pow(pig.y - wolf.y, 2)
  );
  return dist;
}

function moveTowardsTarget(wolf: Player, player: Player) {}

export function doWolfThings(playerDatabase: Record<string, Player>) {
  const wolf = playerDatabase["0"];
  let closestTarget = Infinity;
  let closestPlayerId = "";
  Object.entries(playerDatabase).forEach(([id, player]) => {
    if (id === "0") {
      return;
    }
    const distance2Piggie = findDistanceToTarget(wolf, player);
    if (distance2Piggie < closestTarget) {
      closestTarget = distance2Piggie;
      closestPlayerId = player.user_id;
    }
  });
}

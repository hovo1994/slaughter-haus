import WebSocket from "ws";

export interface GameMessage {
  msg_type:
    | "game_message"
    | "new_connection"
    | "afk_user"
    | "game_over"
    | "connection_dropped"
    | "delete_other_user"
    | "score_point";
  user_id: string;
  x: number;
  y: number;
  color: string;
  image: string;
  message?: string;
  score?: number;
}

export interface Player {
  user_id: string;
  x: number;
  y: number;
  color: string;
  image: string;
  score: number;
  ws?: WebSocket;
  lastInputReceived?: string; // date time when the last input from a client came in
}

export const WOLF_ID = "0";

// map of user_id to Player
export const playersDatabase: Record<string, Player> = {};

// player 0 is the wolf
playersDatabase[WOLF_ID] = {
  user_id: WOLF_ID,
  x: 200,
  y: 200,
  score: 0,
  color: "black",
  image: "Wolf.png",
};

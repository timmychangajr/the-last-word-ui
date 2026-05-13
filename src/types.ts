export interface RoomUser {
  username: string;
  score: number;
  progress: number;
  completed_indices: number[]; 
  ready: boolean;              
  /** * The match tally (Total rounds won). 
   * Resetting 'score' each round makes this the primary 'Match' winner tracker.
  */
 wins?: number; 
}

export interface WordEntry {
  word: string;
  username: string;
  progress_at_time: number;
  health: number;
}

export interface ScoreFeedback {
  /** The unique ID (timestamp) used to ensure every log entry renders correctly */
  id: number;       
  username: string;
  points: number;
  /** Detailed text like "sacrificed 10pts to attack!" or "🎯 First Word!" */
  message: string;
  /** The specific word associated with the action */
  word: string;
}

export interface RoomUpdatePayload {
  buffer?: WordEntry[];
  users?: RoomUser[];
  winner?: string | null;
  /** Triggered by GameRoundManager when a new round starts */
  game_reset?: boolean;
  target_quote?: string;
  total_indices?: number;
  /** The specific event data for the Activity Log */
  score_feedback?: ScoreFeedback | null; 
}
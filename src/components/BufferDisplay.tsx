import React from 'react';
import './BufferDisplay.css';
import type { RoomUser, WordEntry } from '../types';

interface BufferDisplayProps {
  buffer: WordEntry[];
  users: RoomUser[];
  mainUser: string;
  handleWordClick: (wordOwner: string, slotIndex: number) => void;
}

const BufferDisplay: React.FC<BufferDisplayProps> = ({ buffer, mainUser, users, handleWordClick }) => {
  return users.map((user) => (
    <div className="buffer-container" key={user.username}>
      <span className="word-username">{user.username}</span>
      {buffer.map((entry, index) => {
        const { word, username, progress_at_time, health } = entry;
        const locked = progress_at_time < user.progress - 1;
        const highlight = mainUser === username ? 'poet' : 'noise';

        return username === user.username ? (
          <button
            key={index}
            disabled={locked}
            className={`word-entry ${highlight}`}
            onClick={() => handleWordClick(username, progress_at_time)}
          >
            <span className="word-text">{word}</span>
            {!locked && (
              <span className="word-health">
                <strong>{health}</strong> HP
              </span>
            )}
            {locked && <span className="word-health locked">locked</span>}
          </button>
        ) : null;
      })}
    </div>
  ));
};

export default BufferDisplay;

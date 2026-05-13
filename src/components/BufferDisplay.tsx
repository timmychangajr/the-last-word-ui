import React, { useEffect, useRef } from 'react';
import './BufferDisplay.css';
import type { RoomUser, WordEntry } from '../types';

interface BufferDisplayProps {
  buffer: WordEntry[];
  users: RoomUser[];
  mainUser: string;
  handleWordClick: (wordOwner: string, slotIndex: number) => void;
}

const BufferDisplay: React.FC<BufferDisplayProps> = ({ buffer, mainUser, users, handleWordClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [buffer]);

  return users.map((user) => (
    <div
      className="buffer-container"
      key={user.username}
      ref={user.username === mainUser ? scrollRef : null}>
      <span className="word-username">{user.username}</span>
      {buffer.map(entry => {
        const { word, username, progress_at_time, health } = entry;
        const locked = progress_at_time < user.progress - 1;
        const highlight = mainUser === username ? 'poet' : 'noise';

        return username === user.username ? (
          <button
            key={`${entry.word}_${entry.username}`}
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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createConsumer } from '@rails/actioncable';
import BufferDisplay from './BufferDisplay';
import BufferUserDisplay from './BufferUserDisplay';
import type { RoomUpdatePayload, RoomUser, ScoreFeedback, WordEntry } from '../types';
import './Game.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const Game: React.FC = () => {
    const [roomCode, setRoomCode] = useState('');
    const [username, setUsername] = useState('');
    const [joinRoomCode, setJoinRoomCode] = useState('');
    const [isInGame, setIsInGame] = useState(false);
    const [buffer, setBuffer] = useState<WordEntry[]>([]);
    const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
    const [wordInput, setWordInput] = useState('');
    const [targetQuote, setTargetQuote] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<string | undefined | null>(null);
    const [scoreFeedbacks, setScoreFeedbacks] = useState<ScoreFeedback[]>([]);
    const cableRef = useRef<ReturnType<typeof createConsumer> | null>(null);
    const channelRef = useRef<{ unsubscribe: () => void; perform: (action: string, data?: object) => void } | null>(null);

    const currentUser = roomUsers.find(u => u.username === username);
    const currentProgress = currentUser?.progress || 0;
    const nextRequiredWord = targetQuote.split(' ')[currentProgress];

    useEffect(() => {
        if (!cableRef.current) {
            const baseCableUrl = import.meta.env.VITE_CABLE_URL || 'ws://localhost:3000/cable';
            const finalCableUrl = baseCableUrl.endsWith('/cable') ? baseCableUrl : `${baseCableUrl}/cable`;

            cableRef.current = createConsumer(finalCableUrl);
        }
        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, []);

    const allReady = useMemo(() => {
        return roomUsers.length >= 2 && roomUsers.every(u => u.ready);
    }, [roomUsers]);
    const someReady = useMemo(() => {
        return roomUsers.length >= 2 && roomUsers.some(u => u.ready);
    }, [roomUsers]);
    const isWaitingForUser = useMemo(() => {
        return roomUsers.length >= 2 
        && roomUsers.some(u => currentUser?.username === u.username && !u.ready);
    }, [roomUsers, currentUser]);
        const isValidRoom = useMemo(() => roomUsers.length >= 2, [roomUsers])
    const isWaitingForOthers = useMemo(() => isValidRoom && !isWaitingForUser && !allReady, [isValidRoom, isWaitingForUser, allReady])

    useEffect(() => {
        if (isInGame && roomCode && cableRef.current) {
            channelRef.current = cableRef.current.subscriptions.create(
                { channel: 'RoomChannel', code: roomCode, username },
                {
                    received: (data: RoomUpdatePayload) => {
                        if (data.users) {
                            setRoomUsers([...data.users]);
                        }
                        if (data.buffer) setBuffer([...data.buffer]);
                        if (data.winner !== undefined) setWinner(data.winner);

                        if (data.game_reset) {
                            setGameOver(false);
                            setWinner(null);
                            setTargetQuote(data.target_quote || '');
                            setBuffer([]);
                            setScoreFeedbacks([]);
                        }

                        if (data.score_feedback) {
                            setScoreFeedbacks((prev) => [data.score_feedback!, ...prev].slice(0, 10));
                        }

                        if (data.winner && !gameOver) {
                            setGameOver(true);
                        }
                    },
                }
            );
        }

        return () => {
            if (channelRef.current && isInGame) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [isInGame, roomCode, username]);

    const createRoom = async () => {
        if (!username.trim()) { alert('Please enter a username'); return; }
        const response = await fetch(`${API_BASE}/rooms`, { method: 'POST' });
        const data = await response.json();
        setRoomCode(data.room_code);
        setTargetQuote(data.target_quote);
        setIsInGame(true);
    };

    const joinRoom = async () => {
        if (!username.trim()) { alert('Please enter a username'); return; }
        if (!joinRoomCode.trim() || joinRoomCode.length < 4) { alert('Please enter a valid room code'); return; }
        const response = await fetch(`${API_BASE}/rooms/${joinRoomCode}`);
        const data = await response.json();
        if (data.error) { alert(data.error ?? 'Room not found'); return; }
        setRoomCode(joinRoomCode);
        setBuffer(data.buffer);
        setTargetQuote(data.target_quote);
        setIsInGame(true);
    };

    const pushWord = () => {
        if (!wordInput.trim()) return;
        if (channelRef.current) {
            channelRef.current.perform("receive_word", { word: wordInput.trim(), username: username });
        }
        setWordInput('');
    };

    const handleWordClick = (wordOwner: string, slotIndex: number) => {
        if (channelRef.current && !winner) {
            channelRef.current.perform("penalize_word", { target_username: wordOwner, progress_at_time: slotIndex });
        }
    };

    const handleWordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === ' ') { e.preventDefault(); pushWord(); }
    };

    const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const action = joinRoomCode ? joinRoom : createRoom;
        if (e.key === 'Enter') { e.preventDefault(); action(); }
    };

    const handleJoinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); joinRoom(); }
    };

    const leaveGame = () => {
        setGameOver(false);
        setWinner(null);
        setIsInGame(false);
        setRoomCode('');
        setBuffer([]);
        setRoomUsers([]);
        setWordInput('');
        if (channelRef.current) {
            channelRef.current.perform("leave_room", { username });
            channelRef.current.unsubscribe();
        }

    };

    const markReady = () => {
        if (channelRef.current) {
            channelRef.current.perform("player_ready", { username: username });
        }
    };

    return (
        <div className="game">
            <div className='app-header'>
                <h1>The Last Word</h1>
            </div>
            {!isInGame ? (
                <div className='home'>
                    <input
                        type="text"
                        placeholder="Username (max 6 characters)"
                        maxLength={6}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={handleUsernameKeyDown}
                    />
                    {!joinRoomCode && <button onClick={createRoom}>Create Room</button>}
                    <br />
                    <input
                        type="text"
                        placeholder="Room code"
                        maxLength={4}
                        value={joinRoomCode}
                        onChange={(e) => setJoinRoomCode(e.target.value)}
                        onKeyDown={handleJoinKeyDown} />
                    <button disabled={joinRoomCode.length < 4} onClick={joinRoom}>Join Room</button>
                </div>
            ) : (
                <div className="game-container">
                    <div className='side-panel'>
                        <BufferUserDisplay users={roomUsers} mainUser={username} />
                        <div className='activity-log'>
                            <p className="log-header">Activity Log</p>
                            <div className="log-entries">
                                {scoreFeedbacks.map((feedback, idx) => (
                                    <div
                                        className={`score-feedback ${feedback.points ? (feedback.points >= 0 ? 'positive' : 'negative') : ''}`}
                                        key={idx}>
                                        <div className='points'>
                                            <div className='info'>
                                                {feedback.username && <p className="username">{feedback.username}</p>}
                                                <p className="word">{feedback.word}</p>
                                            </div>
                                            {feedback.message && <p className='message'>{feedback.message}</p>}
                                            {!!feedback.points && <p className="value">{feedback.points > 0 ? '+' : ''}{feedback.points} HP</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="word-container">
                        <p>Room Code: <strong>{roomCode}</strong></p>
                        <>
                            {!winner && allReady && <p>Sentence: <strong>{targetQuote}</strong></p>}
                            <br />
                            <div className='buffer-parent'>
                                <BufferDisplay
                                    buffer={buffer}
                                    mainUser={username}
                                    users={roomUsers}
                                    handleWordClick={handleWordClick}
                                />
                            </div>
                            {!winner && allReady && nextRequiredWord && (
                                <div className='input-container'>
                                    <input
                                        type="text"
                                        value={wordInput}
                                        onChange={(e) => setWordInput(e.target.value)}
                                        onKeyDown={handleWordKeyDown}
                                        maxLength={20}
                                        placeholder="Enter word"
                                        autoFocus
                                    />
                                    {!!wordInput && <p>[ spacebar to add ]</p>}
                                    {!wordInput && nextRequiredWord && <p>next word: <strong>{nextRequiredWord}</strong></p>}
                                </div>
                            )}
                        </>
                        {winner && (
                            <h2 className='winner'>
                                {winner.includes(',')
                                    ? (winner.split(',').includes(username) ? `🤝 IT'S A TIE! 🤝` : `🤝 Tied between: ${winner.split(',').join(' & ')} 🤝`)
                                    : (winner === username ? '🎉 YOU WON! 🎉' : `${winner} won!`)
                                }
                            </h2>
                        )}
                        <div className="ready-section">
                            {isWaitingForOthers && (
                                <p className="waiting-text">Waiting for opponents...</p>
                            )}
                            {isWaitingForUser && someReady && (
                                <p className="waiting-text">Opponents are ready...</p>
                            )}
                            {isWaitingForUser && isValidRoom && (
                                <button onClick={markReady} className="ready-btn">Ready Up</button>
                            )}
                            {!isValidRoom && (
                                <p className="waiting-text">Waiting for at least 2 players to join...</p>
                            )}

                            <button onClick={leaveGame} className="exit-btn">Leave Game</button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="game-footer">
                <div className="rules-container">
                    <h3>Game Rules</h3>
                    <div className="rules-grid">
                        <div className="rule-item">
                            <strong>The Goal:</strong> Type the sentence correctly. The player with the most health (HP) when the sentence is finished wins.
                        </div>
                        <div className="rule-item">
                            <strong>Health:</strong> Your health builds by the words you add. The longer the word, the more health.
                        </div>
                        <div className="rule-item">
                            <strong>Sleight of Hand (+2):</strong> Be the first to add the word to get a bonus.
                        </div>
                        <div className="rule-item">
                            <strong>Attack:</strong> Click on an opponent's most recent word to "destroy" it.
                        </div>
                        <div className="rule-item">
                            <strong>Defense:</strong> Opponents can attack your most recent word, type it again to gain +1 back.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Game;